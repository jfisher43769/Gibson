// Build-time generation: writes public/sitemap.xml, public/rss.xml and
// public/calendar/*.ics fresh on every build, from the same route list and club data
// the app itself uses — so none of these can drift from what's actually live.
// Runs automatically before every build via the npm "prebuild" lifecycle hook.
// Run directly: node scripts/generate.js
import { build } from "esbuild";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";
import * as D from "../data.js";

const root = process.cwd().replace(/\\/g, "/");
const publicDir = join(root, "public");
const calendarDir = join(publicDir, "calendar");
mkdirSync(calendarDir, { recursive: true });

// ---- 1. Pull the canonical route list + slug map out of App.jsx --------------------
// Single source of truth: reusing App.jsx's own ROUTE_CLUBS/CLUB_TO_SLUG/SITE_ORIGIN
// means this script can never compute a different slug than the routing that actually
// serves the page.
const entry = join(tmpdir(), "gibson-generate-entry.jsx");
const out = join(tmpdir(), "gibson-generate.cjs");
writeFileSync(entry, `export { ALL_ROUTES, ROUTE_CLUBS, CLUB_TO_SLUG, SITE_ORIGIN } from "${root}/App.jsx";\n`);
await build({
  entryPoints: [entry], bundle: true, platform: "node", format: "cjs",
  loader: { ".jsx": "jsx" }, outfile: out, logLevel: "silent",
  nodePaths: [join(root, "node_modules")],
});
const { ALL_ROUTES, ROUTE_CLUBS, CLUB_TO_SLUG, SITE_ORIGIN } = createRequire(import.meta.url)(out);
rmSync(entry, { force: true });
rmSync(out, { force: true });

const clubUrl = (code) => `${SITE_ORIGIN}/club/${CLUB_TO_SLUG[code]}`;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---- 2. sitemap.xml — every route, replacing the hand-maintained file --------------
const sitemapUrls = ALL_ROUTES.map((r) => {
  const loc = `${SITE_ORIGIN}${r === "/" ? "/" : r}`;
  const freq = r === "/" ? "<changefreq>daily</changefreq><priority>1.0</priority>" : "<changefreq>weekly</changefreq><priority>0.8</priority>";
  return `  <url><loc>${loc}</loc>${freq}</url>`;
}).join("\n");
writeFileSync(
  join(publicDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemapUrls}\n</urlset>\n`
);

// ---- 3. rss.xml — recent transfers + recent results, merged and date-sorted --------
// Transfer dates in data.js are informal ("18 Jul", "Jul", "Reported", "12 May") since
// they're written for human reading in-app, not for machine feeds. Only entries with a
// parseable day+month become RSS items — inventing a fake date for "Reported" would be
// exactly the kind of fabricated data CLAUDE.md rules out, so those are skipped here
// rather than guessed at.
const MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
function parseDayMonth(s) {
  const m = String(s || "").match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const month = MONTHS[m[2]];
  if (month === undefined) return null;
  // All TRANSFERS dates are 2026 summer-window activity (unlike fixture dates, which span
  // the 26/27 season into 2027) — there's no month-based year rollover here.
  return new Date(Date.UTC(2026, month, day, 12, 0, 0)); // midday UTC — no kickoff time implied
}

function transferItem(t) {
  const date = parseDayMonth(t.date);
  if (!date) return null;
  const toName = t.to ? D.CLUBS[t.to]?.name : t.toExternal;
  const fromName = t.from ? D.CLUBS[t.from]?.name : t.fromExternal;
  const club = t.to || t.from; // in-league club this story concerns, for the RSS link
  let title;
  if (t.status === "departure") title = `${t.player}: ${fromName} → ${toName || "departs"}`;
  else if (t.status === "rumour") title = `Rumour: ${t.player} to ${toName}`;
  else title = `${t.player} joins ${toName || fromName}`;
  return { date, title, link: club ? clubUrl(club) : SITE_ORIGIN, description: t.note, guid: `gibson-transfer-${t.id}` };
}

function resultItems() {
  const items = [];
  for (const club of Object.keys(D.CLUB_FIXTURES)) {
    for (const f of D.CLUB_FIXTURES[club]) {
      if (!f.res || !f.dt) continue; // only played fixtures with a real result
      items.push({
        date: new Date(f.dt),
        title: `${D.CLUBS[club].name} ${f.res} — ${f.opp}`,
        link: clubUrl(club),
        description: f.comp,
        guid: `gibson-result-${club}-${f.dt}`,
      });
    }
  }
  return items;
}

const feedItems = [...D.TRANSFERS.map(transferItem).filter(Boolean), ...resultItems()]
  .sort((a, b) => b.date - a.date)
  .slice(0, 30);

const rssItems = feedItems.map((it) => [
  "  <item>",
  `    <title>${esc(it.title)}</title>`,
  `    <link>${esc(it.link)}</link>`,
  `    <guid isPermaLink="false">${esc(it.guid)}</guid>`,
  it.description ? `    <description>${esc(it.description)}</description>` : null,
  `    <pubDate>${it.date.toUTCString()}</pubDate>`,
  "  </item>",
].filter(Boolean).join("\n")).join("\n");

writeFileSync(
  join(publicDir, "rss.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel>\n` +
  `  <title>GIBSON — Transfers &amp; Results</title>\n` +
  `  <link>${SITE_ORIGIN}</link>\n` +
  `  <description>Latest NIFL Premiership transfer news and results, tracked by GIBSON.</description>\n` +
  `${rssItems}\n` +
  `</channel></rss>\n`
);

// ---- 4. Per-club + combined .ics calendars -----------------------------------------
// EURO legs carry a venue; CLUB_FIXTURES entries (the ones actually rendered per club)
// don't, but every CLUB_FIXTURES entry corresponds to exactly one EURO leg for the same
// club+kickoff — so venue can be looked up by that pair rather than duplicated in data.js.
const venueByKey = {};
for (const tie of D.EURO) {
  for (const leg of tie.legs) {
    if (leg.dt) venueByKey[`${tie.club}|${leg.dt}`] = leg.venue;
  }
}

const icsEscape = (s) => String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
const p2 = (n) => String(n).padStart(2, "0");
const icsDate = (d) => `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}T${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}${p2(d.getUTCSeconds())}Z`;

function fixturesFor(club) {
  return (D.CLUB_FIXTURES[club] || [])
    .filter((f) => f.dt && !f.opp.includes("*")) // provisional "if through" slots aren't real events yet
    .map((f) => ({
      club,
      dt: f.dt,
      summary: `${D.CLUBS[club].name} v ${f.opp} — ${f.comp}`,
      location: venueByKey[`${club}|${f.dt}`] || null,
      url: clubUrl(club),
    }));
}

function icsCalendar(events, calName) {
  const now = icsDate(new Date());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GIBSON//NIFL Fixtures//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(calName)}`,
  ];
  for (const e of events) {
    const start = new Date(e.dt);
    const end = new Date(start.getTime() + 2 * 60 * 60 * 1000); // 2-hour duration
    lines.push(
      "BEGIN:VEVENT",
      `UID:gibson-${e.club}-${e.dt.replace(/[^0-9]/g, "")}@gibsonstats.com`,
      `DTSTAMP:${now}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${icsEscape(e.summary)}`,
    );
    if (e.location) lines.push(`LOCATION:${icsEscape(e.location)}`);
    lines.push(`URL:${e.url}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

for (const club of ROUTE_CLUBS) {
  writeFileSync(join(calendarDir, `${club}.ics`), icsCalendar(fixturesFor(club), `${D.CLUBS[club].name} Fixtures — GIBSON`));
}
const allFixtures = ROUTE_CLUBS.flatMap(fixturesFor).sort((a, b) => new Date(a.dt) - new Date(b.dt));
writeFileSync(join(calendarDir, "all-fixtures.ics"), icsCalendar(allFixtures, "GIBSON — All NIFL Fixtures"));

console.log(`generated: sitemap.xml (${ALL_ROUTES.length} routes), rss.xml (${feedItems.length} items), calendar/*.ics (${ROUTE_CLUBS.length} clubs + all-fixtures)`);
