// GIBSON data invariant checker — run before any commit: node scripts/verify.js
// NOTE: run `npm run build` first — the generated-file checks below need the files
// scripts/generate.js writes as the npm "prebuild" step (see .github/workflows/ci.yml,
// which now builds before verifying for exactly this reason).
import * as D from "../data.js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { contrastRatio, contrastText, chalk, DARK_TEXT, relativeLuminance } from "../src/lib/theme.js";
let fails = 0;
const check = (name, ok) => { console.log(ok ? "  ✓" : "  ✗ FAIL", name); if (!ok) fails++; };

console.log("GIBSON verify:");
// 13 = 12 current Premiership clubs + relegated GLV (kept so the 25/26 archive renders)
check("13 clubs registered (12 + archived GLV)", Object.keys(D.CLUBS).length === 13);
check("26/27 fixtures use exactly 12 clubs, no GLV", (() => { const s = new Set(); D.FIXTURES_2627.forEach(r => r.matches.forEach(m => { s.add(m.h); s.add(m.a); })); return s.size === 12 && !s.has("GLV"); })());
check("every club has name+ground+2 colors", Object.values(D.CLUBS).every(c => c.name && c.ground && c.colors?.length === 2));
const allMatches = D.FIXTURES_2627.flatMap(r => r.matches);
check("33 rounds", D.FIXTURES_2627.length === 33);
check("198 fixtures", allMatches.length === 198);
check("fixture clubs all valid", allMatches.every(m => D.CLUBS[m.h] && D.CLUBS[m.a]));
const counts = {};
allMatches.forEach(m => { counts[m.h] = (counts[m.h]||0)+1; counts[m.a] = (counts[m.a]||0)+1; });
check("every club plays exactly 33", Object.values(counts).every(n => n === 33));
check("predictor fixtures have odds", D.PREDICTOR_GW.fixtures.every(f => f.odds?.home && f.odds?.draw && f.odds?.away));
check("predictor results null or [h,a]", D.PREDICTOR_GW.fixtures.every(f => f.result === null || (Array.isArray(f.result) && f.result.length === 2)));
// CLAUDE.md rule 2 is app-wide: never add bookmaker names, logos, links or affiliate
// codes. The old check only scanned PREDICTOR_GW, so a bookmaker name added anywhere else
// in the data or the UI sailed straight through. Scan the whole shipped surface instead.
// DELIBERATE EXCEPTION: "BoyleSports" is the official competition name (BoyleSports
// Premiership) and is approved by the owner, so it is not in this pattern. Everything else
// stays banned — this list is the guard, so add to it rather than relaxing the check.
const BOOKMAKERS = /bet365|paddy ?power|betfair|william ?hill|betmclean|ladbrokes|sky ?bet|virgin ?bet|betfred|unibet|coral bookmakers|betway|betvictor/i;
// Every file that ships to a browser. MUST include all of src/ — the UI moved out of
// App.jsx into modules, and a list naming only App.jsx would leave these guards scanning an
// almost-empty shell while the actual UI went unchecked.
const srcRoot = new URL("../src/", import.meta.url);
const walkSrc = (dir) => {
  let out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = new URL(e.name + (e.isDirectory() ? "/" : ""), dir);
    if (e.isDirectory()) out = out.concat(walkSrc(p));
    else if (/\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
};
const shippedFiles = [
  new URL("../data.js", import.meta.url),
  new URL("../App.jsx", import.meta.url),
  new URL("../index.html", import.meta.url),
  ...(existsSync(srcRoot) ? walkSrc(srcRoot) : []),
];
const shippedSources = shippedFiles.map((p) => {
  try { return readFileSync(p, "utf8"); } catch { return ""; }
});
check("shipped-source scan covers the src/ modules, not just App.jsx", shippedFiles.length > 20);

// CLAUDE.md is loaded on EVERY task, so a stale architecture section misdirects all future
// work. It described App.jsx as "all UI" for a while after the split had moved the UI into
// src/ — the doc update was written on the original refactor branch and lost when that
// refactor was rebuilt from a newer main. Cheap structural check so it cannot drift silently.
check("CLAUDE.md describes the real architecture (src/ modules, App.jsx as shell)", (() => {
  let doc = "";
  try { doc = readFileSync(new URL("../CLAUDE.md", import.meta.url), "utf8"); } catch { return false; }
  const mentionsModules = ["src/tabs/", "src/components/", "src/lib/", "src/club/"].every((d) => doc.includes(d));
  const callsAppJsxAllUi = /`App\.jsx`\s*—\s*all UI/.test(doc);
  if (!mentionsModules) console.log("      ↳ CLAUDE.md no longer names all four src/ directories");
  if (callsAppJsxAllUi) console.log('      ↳ CLAUDE.md still calls App.jsx "all UI"');
  return mentionsModules && !callsAppJsxAllUi;
})());
check("no bookmaker names anywhere in shipped data or UI (BoyleSports competition name allowed)",
  shippedSources.every((src) => {
    const hit = src.match(BOOKMAKERS);
    if (hit) console.log(`      ↳ found: "${hit[0]}"`);
    return !hit;
  }));
// Match affiliate/tracking LINK PARAMETERS, not the English word — "not affiliated with
// the NIFL" in the disclaimer is the opposite of an affiliate link and must not trip this.
check("no affiliate/tracking link parameters in shipped data or UI",
  shippedSources.every((src) => !/[?&](aff|affid|aff_id|btag|utm_campaign|clickid)=/i.test(src)));

// Share cards and share text must stamp the canonical SITE_ORIGIN, never window.location.
// A card built on a Vercel preview URL, an old domain that still resolves, or a stale cached
// tab would otherwise burn that wrong host into a PNG the user posts publicly — unfixable
// once shared. This is exactly how the Predictor cards ended up advertising the old domain.
check("share cards use the canonical domain, not window.location", (() => {
  const offenders = shippedFiles
    .map((p, i) => [p, shippedSources[i]])
    .filter(([p, src]) => /toBlob|navigator\.share|shareText|fillText/.test(src) && /window\.location\.(host|origin|hostname)/.test(src))
    .map(([p]) => p.pathname.split("/").slice(-2).join("/"));
  if (offenders.length) console.log(`      ↳ ${offenders.join(", ")}`);
  return offenders.length === 0;
})());
// Empty is legitimate immediately after season-rollover.js (live table reset, new season not
// yet played). A populated table must still be a complete 12-row, 38-game final standings.
check("FULL_TABLE has 12 rows / 38 played", !D.FULL_TABLE || D.FULL_TABLE.length === 0 || (D.FULL_TABLE.length === 12 && D.FULL_TABLE.every(r => r.p === 38)));
check("transfer clubs valid", D.TRANSFERS.every(t => (!t.from || D.CLUBS[t.from]) && (!t.to || D.CLUBS[t.to])));
// TRANSFERS.id is used as a React key (and as the RSS guid). Duplicates make React reuse
// the wrong DOM node when the feed re-filters — two entries shared id 17 until this check.
check("TRANSFERS ids are unique (used as React keys + RSS guids)", (() => {
  const ids = D.TRANSFERS.map((t) => t.id);
  const dupes = [...new Set(ids.filter((v, i) => ids.indexOf(v) !== i))];
  if (dupes.length) console.log(`      ↳ duplicate id(s): ${dupes.join(", ")}`);
  return dupes.length === 0;
})());
check("PLAYERS ids are unique (used as React keys)", (() => {
  const ids = D.PLAYERS.map((p) => p.id);
  return new Set(ids).size === ids.length;
})());
check("WINDOW clubs valid", D.WINDOW.every(w => D.CLUBS[w.club]));

// TRANSFERS (the curated news feed) and WINDOW (the full club-by-club ledger) must agree —
// the Cliftonville incident (McMaster/Bannon/McCay shown as feed items with no WINDOW entry
// at all) is the bug class this guards against. Match loosely on surname (+ first initial
// when both sides have one), since WINDOW abbreviates first names ("J. Knowles") while
// TRANSFERS spells them out, and a combined feed entry ("Allen, Archer, Whiteside...") lists
// several players in one `player` string.
const windowByClub = Object.fromEntries(D.WINDOW.map((w) => [w.club, w]));
const nameKey = (raw) => {
  const tokens = raw.toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!tokens.length) return null;
  return { surname: tokens[tokens.length - 1], initial: tokens.length > 1 ? tokens[0][0] : null };
};
const namesMatch = (a, b) => {
  const ka = nameKey(a), kb = nameKey(b);
  if (!ka || !kb || ka.surname !== kb.surname) return false;
  return !ka.initial || !kb.initial || ka.initial === kb.initial;
};
const splitPlayers = (name) => name.split(/,| & /).map((s) => s.trim()).filter(Boolean);

const feedMismatches = [];
for (const t of D.TRANSFERS) {
  if (t.status !== "done" && t.status !== "departure") continue; // rumours/contracts aren't ledger moves
  for (const p of splitPlayers(t.player)) {
    if (t.to && !(windowByClub[t.to]?.ins.some(([n]) => namesMatch(n, p))))
      feedMismatches.push(`id${t.id} "${p}" has no WINDOW ${t.to}.ins entry`);
    if (t.from && !(windowByClub[t.from]?.outs.some(([n]) => namesMatch(n, p))))
      feedMismatches.push(`id${t.id} "${p}" has no WINDOW ${t.from}.outs entry`);
  }
}
check("every done/departure TRANSFERS item has a matching WINDOW ledger entry", feedMismatches.length === 0);
if (feedMismatches.length) console.log("      ↳ " + feedMismatches.join("\n      ↳ "));

// The reverse direction: WINDOW is the exhaustive squad ledger, TRANSFERS is a curated
// highlights feed (CLAUDE.md: "Editorial stays editorial... never auto-generate"), so most
// fringe ins/outs (loan returns, non-first-team moves) never get a news item — that's normal,
// not drift. This is a ratchet, not a zero check: it catches new WINDOW entries added without
// either a TRANSFERS item or a deliberate bump here. Raise the number only after confirming a
// new gap is a genuine non-headline move (check it against TRANSFERS first) — see the PR that
// added this check for the full list of the 82 pre-existing gaps it was set from.
// Bumped 82 -> 112 on 5 Aug 2026: BBC Sport's window roundup added 30 more ins/outs
// (mostly fringe departures with no destination given) that Transfermarkt's screenshots
// hadn't covered — none of them headline moves, so none got a TRANSFERS item either.
const WINDOW_ONLY_BASELINE = 112;
let windowOnly = 0;
for (const w of D.WINDOW) {
  for (const [name] of w.ins) if (!D.TRANSFERS.some((t) => t.to === w.club && splitPlayers(t.player).some((p) => namesMatch(p, name)))) windowOnly++;
  for (const [name] of w.outs) if (!D.TRANSFERS.some((t) => t.from === w.club && splitPlayers(t.player).some((p) => namesMatch(p, name)))) windowOnly++;
}
check(`WINDOW-only entries with no TRANSFERS item stay within the known baseline (${windowOnly}/${WINDOW_ONLY_BASELINE})`, windowOnly <= WINDOW_ONLY_BASELINE);

// The TheSportsDB club-name vocabulary exists in THREE files: api/table.js, api/events.js
// and scripts/weekly-update.js. They are not shared via an import on purpose — api/* are
// Vercel serverless functions, and making them depend on a repo module changes what gets
// bundled into the deployed function, which cannot be tested from here. The cost of that
// choice is drift: add a club to one copy and forget the others and the live table silently
// stops mapping it. This check is what pays for the duplication.
check("the three TheSportsDB CLUB_MAP copies are identical", (() => {
  const norm = (p) => {
    let src = "";
    try { src = readFileSync(new URL(p, import.meta.url), "utf8"); } catch { return null; }
    const m = src.match(/const CLUB_MAP = \[([\s\S]*?)\];/);
    return m ? m[1].replace(/\s+/g, "") : null;
  };
  const copies = { "api/table.js": norm("../api/table.js"), "api/events.js": norm("../api/events.js"), "scripts/weekly-update.js": norm("./weekly-update.js") };
  const missing = Object.entries(copies).filter(([, v]) => v === null).map(([k]) => k);
  if (missing.length) { console.log(`      ↳ could not read CLUB_MAP from: ${missing.join(", ")}`); return false; }
  const distinct = [...new Set(Object.values(copies))];
  if (distinct.length > 1) {
    console.log(`      ↳ copies differ — ${Object.entries(copies).map(([k, v]) => `${k}:${v.length}ch`).join(", ")}`);
  }
  return distinct.length === 1;
})());

// Departed-player badges. The UI marks anyone in a completed-season list who has since
// left, derived from the transfer feed — so this guards BOTH directions of that derivation.
// It exists because the promo reel shipped with two players who had already gone, and the
// same data drives the Index: a stats site that shows a departed man as current is exactly
// the trust problem golden rule 1 is about.
check("playerDeparture() flags rated players who have left, and only those", (() => {
  // Every departure in the feed that names a rated player must resolve.
  const ratedNames = [...D.PLAYERS.map((p) => p.name), ...D.XG_PLAYERS.map((p) => p.name)];
  for (const t of D.TRANSFERS) {
    if (t.status !== "departure" || !t.toExternal) continue;
    for (const one of splitPlayers(t.player)) {
      const hit = ratedNames.find((n) => namesMatch(n, one));
      if (hit && D.playerDeparture(hit) !== t.toExternal) return false;
    }
  }
  // ...and nobody is flagged who has no such departure. A false badge is the worse bug.
  return ratedNames.every((n) => {
    const to = D.playerDeparture(n);
    if (!to) return true;
    return D.TRANSFERS.some((t) => t.status === "departure" && t.toExternal === to
      && splitPlayers(t.player).some((one) => namesMatch(one, n)));
  });
})());
// A surname with no forename must never match. Proven by taking a REAL departure's surname
// and looking it up bare: it must not resolve. Asserting only that existing surname-only
// feed entries return null passes even with surname matching switched on, because no
// current departure happens to be a bare surname — that is a test of today's data, not of
// the rule. Without the rule, "Gibson" in a combined item tags Danny Gibson as departed.
check("playerDeparture() ignores surname-only names (no false departures)", (() => {
  const dep = D.TRANSFERS.find((t) => t.status === "departure" && t.toExternal && t.player.trim().includes(" "));
  if (dep && D.playerDeparture(dep.player.trim().split(/\s+/).pop()) !== null) return false;
  return D.TRANSFERS.flatMap((t) => splitPlayers(t.player))
    .filter((n) => !n.includes(" "))
    .every((n) => D.playerDeparture(n) === null);
})());


// Every CLUB_FIXTURES/EURO-leg fixture needs a machine-readable dt (used to pick the
// Home tab's next match) whose calendar day/month agrees with the human display date —
// a mismatch here means the wrong fixture could get featured as "next".
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dtMatchesDisplayDate = (f) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(f.dt || "")) return false;
  const d = new Date(f.dt);
  if (isNaN(d.getTime())) return false;
  const m = (f.date || "").match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return false;
  return d.getUTCDate() === parseInt(m[1], 10) && d.getUTCMonth() === MONTHS.indexOf(m[2]);
};
const allEuroFixtures = [...Object.values(D.CLUB_FIXTURES).flat(), ...D.EURO.flatMap(e => e.legs)];
// The Home board picks the next fixture by real kick-off time, resolved from the display
// date. These guard that resolution. The board previously hardcoded round 1's first match,
// so from the second matchday on the front page advertised a game already played — the bug
// was invisible on the day it shipped and only surfaced once the season moved on, which is
// exactly why it is pinned here rather than trusted to be noticed.
// Televised fixtures. The `tv` value is printed verbatim on the fixture list, the Home
// board and in the calendar entry, so a typo ships as a broadcaster that does not exist —
// and a bookmaker name must never end up here (CLAUDE.md rule 2). Broadcasters are added to
// this list deliberately rather than the check being relaxed.
const BROADCASTERS = ["BBC Sport NI", "BBC iPlayer", "Sky Sports", "Premier Sports", "TNT Sports", "NIFL TV"];
check("every televised fixture names a known broadcaster", (() => {
  const bad = [];
  for (const r of D.FIXTURES_2627) for (const m of r.matches) {
    if (m.tv === undefined) continue;
    if (typeof m.tv !== "string" || !BROADCASTERS.includes(m.tv)) bad.push(`r${r.round} ${m.h}v${m.a}: ${JSON.stringify(m.tv)}`);
    if (BOOKMAKERS.test(String(m.tv))) bad.push(`r${r.round} ${m.h}v${m.a}: bookmaker in tv field`);
  }
  if (bad.length) console.log("      ↳ " + bad.join("\n      ↳ "));
  return bad.length === 0;
})());
// A broadcast pick is only news because it moves the game — if one carries no explicit
// date/time it is silently claiming the round's default slot, which is usually wrong.
check("every televised fixture states its own kick-off", (() => {
  const bad = [];
  for (const r of D.FIXTURES_2627) for (const m of r.matches) {
    if (m.tv && !(m.d || m.t)) bad.push(`r${r.round} ${m.h}v${m.a}`);
  }
  if (bad.length) console.log("      ↳ " + bad.join(", "));
  return bad.length === 0;
})());

check("every FIXTURES_2627 match resolves to a real kick-off time", (() => {
  for (const r of D.FIXTURES_2627) for (const m of r.matches) {
    if (typeof D.fixtureKickoffMs(r, m) !== "number") return false;
  }
  return true;
})());
// Catches a wrong year or month: "Sat 2 Jan" resolving to a Friday means the season-year
// rollover is off, and no amount of reading the fixture list would show it.
check("every fixture's resolved weekday matches the weekday printed on it", (() => {
  const bad = [];
  for (const r of D.FIXTURES_2627) for (const m of r.matches) {
    const label = String(m.d || r.date).split(" ")[0];
    if (D.fixtureWeekdayAbbr(r, m) !== label) bad.push(`r${r.round} ${m.h}v${m.a} says ${label}`);
  }
  if (bad.length) console.log("      ↳ " + bad.slice(0, 5).join("\n      ↳ "));
  return bad.length === 0;
})());
// The bug itself lived in the COMPONENT, not the data: HomeTab indexed FIXTURES_2627[0]
// directly. Every data-level check above passes with that code in place, so this is the one
// that actually pins the fix — the board must ask for the next fixture, not assume it.
check("HomeTab picks the next fixture by time, not by indexing the fixture list", (() => {
  let src = "";
  try { src = readFileSync(new URL("../src/tabs/HomeTab.jsx", import.meta.url), "utf8"); } catch { return false; }
  const usesHelper = /nextLeagueFixture\s*\(/.test(src);
  const indexesList = /FIXTURES_2627\s*\[\s*0\s*\]/.test(src);
  if (!usesHelper) console.log("      ↳ HomeTab no longer calls nextLeagueFixture()");
  if (indexesList) console.log("      ↳ HomeTab indexes FIXTURES_2627[0] again — the board will freeze on round 1");
  return usesHelper && !indexesList;
})());
check("rounds run in chronological order", (() => {
  let prev = -Infinity;
  for (const r of D.FIXTURES_2627) {
    const ms = D.fixtureKickoffMs(r, {});
    if (ms === null || ms < prev) return false;
    prev = ms;
  }
  return true;
})());
// The whole point of the fix: the board must never name a match that has been played.
check("nextLeagueFixture() never returns a kick-off in the past", (() => {
  const probes = ["2026-08-06T22:00:00Z", "2026-08-08T16:00:00Z", "2026-10-01T12:00:00Z", "2027-02-01T12:00:00Z"];
  return probes.every((iso) => {
    const now = Date.parse(iso);
    const f = D.nextLeagueFixture(now);
    return f === null || f.kickoffMs >= now - D.LIVE_WINDOW_MS;
  });
})());
// ...and it must actually advance, rather than pinning to the opener like the old code.
check("nextLeagueFixture() advances as the season progresses", (() => {
  const a = D.nextLeagueFixture(Date.parse("2026-08-06T22:00:00Z"));
  const b = D.nextLeagueFixture(Date.parse("2026-09-20T12:00:00Z"));
  const c = D.nextLeagueFixture(Date.parse("2027-02-01T12:00:00Z"));
  return a && b && c && a.kickoffMs < b.kickoffMs && b.kickoffMs < c.kickoffMs;
})());
// Kick-offs are Northern Irish local time, so the same "3pm" is a different instant either
// side of the October clock change. A fixed offset would drift by an hour for half the season.
check("kick-off times respect the BST/GMT changeover", (() => {
  const aug = D.FIXTURES_2627.find((r) => r.date.includes("Aug"));
  const jan = D.FIXTURES_2627.find((r) => r.date.includes("Jan"));
  const hourUTC = (r) => new Date(D.fixtureKickoffMs(r, {})).getUTCHours();
  return hourUTC(aug) === 14 && hourUTC(jan) === 15; // 3pm BST = 14:00Z, 3pm GMT = 15:00Z
})());

check("every CLUB_FIXTURES/EURO fixture has a valid ISO dt matching its display date", allEuroFixtures.every(dtMatchesDisplayDate));
// Service worker must fetch page navigations fresh from the network (bypassing the HTTP
// cache), or a device gets stranded on an old build — the "new domain served the old
// page" bug. Guard the two things that fix matter: navigation handling + a no-store fetch.
const sw = (() => { try { return readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"); } catch { return ""; } })();
// "Works offline" has to include the FIRST visit. A newly registered worker does not
// control the navigation that registered it, so cache-as-you-go alone left the shell and
// the bundle uncached until a second visit — one visit then a lost signal gave a blank
// page. prerender.mjs injects the real (content-hashed) filenames into the shipped worker;
// this checks the shipped copy, because the source file legitimately has an empty list.
check("the shipped service worker precaches the shell and the hashed bundle", (() => {
  let sw = "";
  try { sw = readFileSync(new URL("../dist/sw.js", import.meta.url), "utf8"); } catch { return false; }
  const m = sw.match(/const PRECACHE = (\[[^\]]*\]);/);
  if (!m) { console.log("      ↳ no PRECACHE list in dist/sw.js — the build-time injection did not run"); return false; }
  let list = [];
  try { list = JSON.parse(m[1]); } catch { return false; }
  const hasShell = list.includes("/");
  const hasBundle = list.some((u) => /^\/assets\/.+\.(js|css)$/.test(u));
  if (!hasShell) console.log("      ↳ shell '/' not precached");
  if (!hasBundle) console.log("      ↳ no hashed asset precached — offline would render an empty shell");
  return hasShell && hasBundle;
})());

check("service worker serves page navigations network-fresh (mode navigate + no-store)",
  /mode\s*===\s*["']navigate["']/.test(sw) && /cache:\s*["']no-store["']/.test(sw));

// Build-time generated files (scripts/generate.js, run as the npm "prebuild" step) must
// exist and cover every current club — a silent generation failure would otherwise ship
// a site with a dead sitemap/RSS/calendar link and nobody would notice until a user did.
const publicPath = (p) => new URL(`../public/${p}`, import.meta.url);
check("public/sitemap.xml generated", existsSync(publicPath("sitemap.xml")));
check("public/rss.xml generated", existsSync(publicPath("rss.xml")));
check("public/calendar/all-fixtures.ics generated", existsSync(publicPath("calendar/all-fixtures.ics")));
const routeClubs = Object.keys(D.CLUBS).filter((k) => k !== "GLV");
check("every current club has a public/calendar/<CODE>.ics", routeClubs.every((code) => existsSync(publicPath(`calendar/${code}.ics`))));
// The calendars shipped with European ties ONLY — subscribing to a club gave you a few
// summer qualifiers and then nothing for the entire league season, which is the one thing
// a fixtures calendar is for. It looked fine from the outside: the files existed, the code
// path worked, every club had one. So the check has to count what is IN them.
const ROUTE_CLUBS_V = Object.keys(D.CLUBS).filter((k) => k !== "GLV");
check("every club's calendar carries all 33 of its league fixtures", (() => {
  const bad = [];
  for (const club of ROUTE_CLUBS_V) {
    let ics = "";
    try { ics = readFileSync(new URL(`../public/calendar/${club}.ics`, import.meta.url), "utf8"); } catch { bad.push(`${club} unreadable`); continue; }
    const league = (ics.match(/UID:gibson-match-/g) || []).length;
    if (league !== 33) bad.push(`${club} has ${league} league events, expected 33`);
  }
  if (bad.length) console.log("      ↳ " + bad.slice(0, 4).join("\n      ↳ "));
  return bad.length === 0;
})());
// Both clubs in a match generate an entry; the combined calendar must carry it once, or
// every league game shows up twice in anyone subscribed to all fixtures.
check("all-fixtures.ics lists each league match exactly once", (() => {
  let ics = "";
  try { ics = readFileSync(new URL("../public/calendar/all-fixtures.ics", import.meta.url), "utf8"); } catch { return false; }
  const uids = ics.match(/UID:gibson-match-[^@]+/g) || [];
  const unique = new Set(uids);
  if (uids.length !== unique.size) console.log(`      ↳ ${uids.length - unique.size} duplicate league events`);
  return uids.length === unique.size && uids.length === 198;
})());
// A calendar entry is only useful if it points at the right moment. Spot-check against the
// resolver rather than trusting the generator to have used it.
check("calendar kick-off times match the fixture resolver", (() => {
  let ics = "";
  try { ics = readFileSync(new URL("../public/calendar/all-fixtures.ics", import.meta.url), "utf8"); } catch { return false; }
  for (const r of D.FIXTURES_2627) {
    for (const m of r.matches) {
      const ms = D.fixtureKickoffMs(r, m);
      if (ms === null) return false;
      const stamp = new Date(ms).toISOString().replace(/[^0-9]/g, "");
      if (!ics.includes(`UID:gibson-match-${m.h}-${m.a}-${stamp}@`)) {
        console.log(`      ↳ missing/mistimed: ${m.h} v ${m.a} at ${new Date(ms).toISOString()}`);
        return false;
      }
    }
  }
  return true;
})());


// og:description previously stayed the generic site-wide blurb on every prerendered route
// (scripts/prerender.mjs only ever rewrote <meta name="description">) — so a shared club
// page's link preview showed "...all twelve clubs" instead of the club's own description.
// Requires npm run build to have run first, same as the sitemap checks above.
check("prerendered club route's og:description matches its own meta description (not the site default)", (() => {
  try {
    const sourceHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const genericOg = sourceHtml.match(/<meta property="og:description" content="([^"]*)"/)?.[1];
    const html = readFileSync(new URL("../dist/club/larne/index.html", import.meta.url), "utf8");
    const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1];
    const og = html.match(/<meta property="og:description" content="([^"]*)"/)?.[1];
    return !!desc && !!og && desc === og && og !== genericOg;
  } catch { return false; }
})());

// og:title had the SAME bug as og:description above and no check, which is exactly why it
// survived: prerender.mjs rewrote <title> but not og:title, so every route shipped
// index.html's generic "GIBSON — Irish League Stats". A Dungannon club page posted to X
// showed the site name with no mention of the club. The correct <title> is what hid it —
// the tab said "Dungannon Swifts", only the share card was wrong.
//
// Checks EVERY prerendered route, not one sample: the original check only looked at Larne,
// and a per-route bug can hide anywhere the sample does not reach.
check("every prerendered route's og:title matches its own <title> (not the site default)", (() => {
  try {
    const generic = readFileSync(new URL("../index.html", import.meta.url), "utf8")
      .match(/<meta property="og:title" content="([^"]*)"/)?.[1];
    const routes = ["", "table", "fixtures", "predictor", "stats", ...routeClubs.map((c) => `club/${D.CLUB_TO_SLUG?.[c] || ""}`)]
      .filter((r) => r === "" || !r.endsWith("/"));
    const bad = [];
    for (const r of routes) {
      const p = new URL(`../dist/${r ? `${r}/` : ""}index.html`, import.meta.url);
      if (!existsSync(p)) continue; // build not run yet; the sitemap checks already cover that
      const html = readFileSync(p, "utf8");
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1];
      const og = html.match(/<meta property="og:title" content="([^"]*)"/)?.[1];
      if (!title || !og || og !== title) bad.push(`/${r} (title "${title}" vs og "${og}")`);
      else if (routes.length > 1 && r !== "" && og === generic) bad.push(`/${r} still has the site-default og:title`);
    }
    if (bad.length) console.log(`      ↳ ${bad.join("; ")}`);
    return bad.length === 0;
  } catch (e) { console.log(`      ↳ ${e.message}`); return false; }
})());

// The social cards are rendered from data.js — a club's position, points and squad value all
// move during a season. @vercel/og defaults to a YEAR of immutable caching, which would leave
// intermediaries serving a stale card long after a deploy fixed it. Note that passing
// `headers` through the ImageResponse options APPENDS rather than replaces, silently
// producing two conflicting max-age values, so the response has to be rebuilt to override it.
check("OG cards are not cached immutable for a year", (() => {
  let src = "";
  try { src = readFileSync(new URL("../api/og.js", import.meta.url), "utf8"); } catch { return false; }
  const setsHeader = /headers\.set\(\s*["']Cache-Control["']/.test(src);
  if (!setsHeader) console.log("      ↳ the Cache-Control override is missing — the library's 1-year immutable default applies");
  // Inspect the CACHE VALUE itself, not the source around the set() call. An earlier version
  // of this check only pattern-matched near `Cache-Control`, so moving the directives into a
  // constant hid them from it — caught by mutation-testing the guard rather than trusting it.
  const value = src.match(/CARD_CACHE\s*=\s*["']([^"']*)["']/)?.[1] || "";
  if (!value) console.log("      ↳ could not read the CARD_CACHE value");
  const immutable = /immutable/i.test(value);
  if (immutable) console.log(`      ↳ CARD_CACHE still marks the card immutable: "${value}"`);
  const sMaxAge = Number(value.match(/s-maxage=(\d+)/)?.[1] ?? -1);
  const sane = sMaxAge >= 0 && sMaxAge <= 604800; // a week at the very most
  if (!sane) console.log(`      ↳ s-maxage is missing or too long in "${value}"`);
  return setsHeader && !!value && !immutable && sane;
})());

// CLUB_META (scripts/fetch-wikidata.js) and the TRAVEL derived from it: every field is
// either a verified value or an explicit null — a missing key entirely would mean the
// script's shape drifted; a coordinate outside Northern Ireland would mean a club got
// mismatched to the wrong Wikidata entity; a zero travel total would mean the haversine
// math (or the fixture lookup feeding it) is broken, since no NIFL away trip is 0 miles.
const CLUB_META_FIELDS = ["ground", "capacity", "lat", "lon", "founded", "website", "source"];
check("every current club has CLUB_META with all fields present (value or explicit null)",
  routeClubs.every((code) => {
    const m = D.CLUB_META?.[code];
    return m && CLUB_META_FIELDS.every((f) => f in m);
  }));
const NI_BOUNDS = { latMin: 53.9, latMax: 55.5, lonMin: -8.3, lonMax: -5.3 }; // keep in sync with scripts/fetch-wikidata.js
check("every non-null CLUB_META coordinate falls within Northern Ireland's bounds",
  routeClubs.every((code) => {
    const m = D.CLUB_META?.[code];
    if (!m || m.lat === null || m.lon === null) return true; // not yet sourced — nothing to check
    return m.lat >= NI_BOUNDS.latMin && m.lat <= NI_BOUNDS.latMax && m.lon >= NI_BOUNDS.lonMin && m.lon <= NI_BOUNDS.lonMax;
  }));
check("every non-null TRAVEL total is non-zero",
  routeClubs.every((code) => {
    const t = D.TRAVEL?.clubs?.[code];
    return !t || t.totalMiles > 0;
  }));

// TRAVEL is all-or-nothing by design: computeTravel() nulls EVERY club's total if even one
// opponent is missing coordinates, because a partial total would understate a club's season.
// So a single removed/blanked coordinate silently switches the whole feature off across the
// site rather than degrading one club. This check makes that failure loud.
check("TRAVEL is fully computed for all 12 clubs (one missing coordinate blanks them all)",
  routeClubs.every((code) => D.TRAVEL?.clubs?.[code]) && D.TRAVEL?.leagueAverageMiles > 0);

// Two clubs sharing a coordinate means a copy-paste slip, and it would silently report a
// 0-mile away trip between them.
check("no two clubs share the same ground coordinate", (() => {
  const seen = new Map();
  for (const code of routeClubs) {
    const m = D.CLUB_META?.[code];
    if (!m || m.lat === null || m.lon === null) continue;
    const key = `${m.lat},${m.lon}`;
    if (seen.has(key)) { console.log(`      ↳ ${seen.get(key)} and ${code} share ${key}`); return false; }
    seen.set(key, code);
  }
  return true;
})());

// Northern Ireland is roughly 110 miles at its longest diagonal, and no two NIFL grounds sit
// near those extremes. This catches a coordinate that survives the bounding-box check but is
// still grossly wrong — opposite-corner placements, transpositions, a ground dropped in the
// sea off Donegal. LIMIT OF THIS CHECK, stated plainly: it does NOT catch a small slip. A
// one-digit longitude error moves a ground ~36 miles and every pair stays under the limit
// (tested). Fine-grained accuracy rests on the owner verifying each coordinate against a map,
// which is how the current twelve were sourced — not on this check.
const MAX_GROUND_SEPARATION_MILES = 100;
// A club's ladies/reserve/youth side has its own Wikidata item, and the name filter is a
// substring match, so "Cliftonville" happily matches "Cliftonville Ladies" — which is exactly
// what happened, writing the Ladies website into the men's club entry. GIBSON covers the
// men's Premiership; a URL advertising another side means the wrong entity was resolved.
check("no CLUB_META website points at a ladies/reserve/youth side", (() => {
  const bad = routeClubs.filter((c) => /ladies|women|reserves?|academy|youth|under-?\d+/i.test(D.CLUB_META?.[c]?.website || ""));
  if (bad.length) console.log(`      ↳ ${bad.map((c) => `${c}: ${D.CLUB_META[c].website}`).join(", ")}`);
  return bad.length === 0;
})());

// A lapsed club domain is worse than a missing one: ClubPage renders website as "Official
// website ↗", so when limavadyunitedfc.co.uk was repointed at casino affiliate content the
// site was sending visitors there — against rule 2, and to "Non GamStop" operators, which are
// specifically the ones outside the UK self-exclusion scheme.
//
// This check is what makes nulling the field STICK. fetch-wikidata.js fills gaps only, so a
// null website is precisely the shape it refills, and Wikidata still holds the old URL. With
// this guard the next refresh fails its own verify step rather than opening a PR that quietly
// restores the link.
check("no CLUB_META website uses a domain known to have lapsed", (() => {
  const lapsed = D.LAPSED_CLUB_DOMAINS || [];
  if (!lapsed.length) return true;
  const bad = [];
  for (const c of routeClubs) {
    const site = D.CLUB_META?.[c]?.website;
    if (!site) continue;
    let host = "";
    try { host = new URL(site).hostname.replace(/^www\./, "").toLowerCase(); } catch { host = String(site).toLowerCase(); }
    if (lapsed.some((d) => host === d.toLowerCase() || host.endsWith(`.${d.toLowerCase()}`))) bad.push(`${c}: ${site}`);
  }
  if (bad.length) console.log(`      ↳ ${bad.join(", ")} — see LAPSED_CLUB_DOMAINS in data.js`);
  return bad.length === 0;
})());

// One person cannot manage two clubs at once. Wikidata returned Stephen Baxter as manager of
// both Carrick Rangers and Crusaders — one entry was simply stale. Manager is no longer
// fetched for that reason, but the check stays: if the field ever comes back, by fetch or by
// hand, a duplicate is the cheapest possible signal that one of them is out of date.
check("no two clubs list the same manager", (() => {
  const seen = new Map();
  for (const c of routeClubs) {
    const m = D.CLUB_META?.[c]?.manager;
    if (!m) continue;
    if (seen.has(m)) { console.log(`      ↳ "${m}" listed at both ${seen.get(m)} and ${c}`); return false; }
    seen.set(m, c);
  }
  return true;
})());

check(`no two grounds are further apart than ${MAX_GROUND_SEPARATION_MILES} miles`, (() => {
  const R = 3958.8, rad = (d) => (d * Math.PI) / 180;
  const pts = routeClubs.map((c) => [c, D.CLUB_META?.[c]]).filter(([, m]) => m && m.lat !== null && m.lon !== null);
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const [ca, a] = pts[i], [cb, b] = pts[j];
    const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
    const miles = R * 2 * Math.asin(Math.sqrt(s));
    if (miles > MAX_GROUND_SEPARATION_MILES) { console.log(`      ↳ ${ca}–${cb} = ${miles.toFixed(0)} mi`); return false; }
  }
  return true;
})());

// CREST PERMISSIONS. Club crests are registered trademarks, and GIBSON is an unofficial
// project with no affiliation to any club — so every real crest in public/crests/ ships only
// because that club granted permission on stated terms (CRESTS.md). This is the check that
// keeps the shipped files and the permission record from drifting apart: a crest file with
// no entry in CRESTS.md fails the build rather than quietly going live.
//
// The reverse direction is deliberately NOT an error: an entry with no file is a club whose
// permission is recorded but whose crest has been removed (or not added yet), which is a
// perfectly good state — the generated shield covers it.
check("every crest in public/crests/ has a permission entry in CRESTS.md", (() => {
  const dir = new URL("../public/crests/", import.meta.url);
  if (!existsSync(dir)) return true; // no crests dir yet is fine — shields everywhere
  let doc = "";
  try { doc = readFileSync(new URL("../CRESTS.md", import.meta.url), "utf8"); } catch {
    console.log("      ↳ CRESTS.md is missing, but public/crests/ exists");
    return false;
  }
  const files = readdirSync(dir).filter((f) => /\.png$/i.test(f));
  const undocumented = [];
  const unknownCode = [];
  for (const f of files) {
    const code = f.replace(/\.png$/i, "");
    if (!D.CLUBS[code]) { unknownCode.push(f); continue; }
    // The entry must name the club code AND record that permission was granted.
    const heading = new RegExp(`###\\s*${code}\\b[\\s\\S]*?(?=\\n###\\s|\\n##\\s|$)`).exec(doc)?.[0];
    if (!heading || !/permission granted/i.test(heading)) undocumented.push(code);
  }
  if (unknownCode.length) console.log(`      ↳ crest files whose name is not a club code: ${unknownCode.join(", ")}`);
  if (undocumented.length) console.log(`      ↳ crest shipped with no "Permission granted" entry in CRESTS.md: ${undocumented.join(", ")}`);
  return undocumented.length === 0 && unknownCode.length === 0;
})());

// A crest must be a real, non-empty PNG. A truncated or wrong-format file would render as a
// broken image where a shield used to be — worse than having no crest at all.
//
// It must ALSO have an alpha channel. Crests render straight onto the dark background with no
// container behind them (see Crest.jsx), which only works because they are cut out. An opaque
// PNG would show as a hard rectangle of whatever its background colour is — the exact thing
// the white tile was originally there to hide, and which looked worse than the problem. The
// requirement lives here, on the asset, rather than being papered over in the UI.
check("every crest file is a valid non-empty PNG with transparency", (() => {
  const dir = new URL("../public/crests/", import.meta.url);
  if (!existsSync(dir)) return true;
  const bad = [];
  const opaque = [];
  for (const f of readdirSync(dir).filter((x) => /\.png$/i.test(x))) {
    const buf = readFileSync(new URL(f, dir));
    // 8-byte PNG signature; anything under ~100 bytes cannot be a usable crest.
    const sig = buf.length > 8 && buf[0] === 0x89 && buf.slice(1, 4).toString() === "PNG";
    if (!sig || buf.length < 100) { bad.push(`${f} (${buf.length}b)`); continue; }
    // Colour type lives at byte 25 of IHDR: 6 = RGBA, 4 = grey+alpha. Palette images (3)
    // carry transparency in a tRNS chunk instead, so walk the chunks to find it.
    const colourType = buf[25];
    let hasAlpha = colourType === 6 || colourType === 4;
    if (!hasAlpha) {
      let off = 8;
      while (off < buf.length - 8) {
        const len = buf.readUInt32BE(off);
        const type = buf.slice(off + 4, off + 8).toString();
        if (type === "tRNS") { hasAlpha = true; break; }
        if (type === "IEND") break;
        off += 12 + len;
      }
    }
    if (!hasAlpha) opaque.push(`${f} (colour type ${colourType}, no tRNS)`);
  }
  if (bad.length) console.log(`      ↳ not a usable PNG: ${bad.join(", ")}`);
  if (opaque.length) console.log(`      ↳ opaque, would render as a rectangle on the dark theme: ${opaque.join(", ")}`);
  return bad.length === 0 && opaque.length === 0;
})());

// The crest lookup must stay FILE-DRIVEN. The point of resolving crests by loading
// /crests/{CODE}.png is that adding or deleting a file is the whole operation — the moment
// someone introduces a hardcoded list of which clubs have crests, that stops being true and
// the two sources start drifting.
check("crest presence is resolved by file lookup, not a hardcoded list", (() => {
  let src = "";
  try { src = readFileSync(new URL("../src/components/Crest.jsx", import.meta.url), "utf8"); } catch { return false; }
  const byLookup = /crestSrc\s*=\s*\(club\)\s*=>\s*`\/crests\/\$\{club\}\.png`/.test(src);
  if (!byLookup) console.log("      ↳ the /crests/{CODE}.png lookup is missing or changed shape");
  // A literal club code sitting next to the word "crest" in a list/array is the smell.
  const hardcoded = /(CRESTS_WITH|HAS_CREST|REAL_CRESTS|crestClubs)\s*=/.test(src);
  if (hardcoded) console.log("      ↳ found what looks like a hardcoded list of clubs with crests");
  return byLookup && !hardcoded;
})());

// Search-result imagery: a real favicon.ico + 96px icon must exist, and index.html must
// declare each icon exactly once — a duplicate/conflicting <link rel="icon"> is exactly
// the kind of thing that silently breaks which icon a browser or crawler picks.
check("public/favicon.ico exists and looks like a real ICO (not empty/corrupt)", (() => {
  try {
    const buf = readFileSync(publicPath("favicon.ico"));
    return buf.length > 100 && buf.readUInt16LE(2) === 1; // ICO type field
  } catch { return false; }
})());
check("public/icon-96.png exists", existsSync(publicPath("icon-96.png")));
const indexHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const iconHrefs = [...indexHtml.matchAll(/<link rel="icon"[^>]*href="([^"]+)"/g)].map((m) => m[1]);
check("index.html declares each <link rel=\"icon\"> href exactly once (no duplicates)",
  iconHrefs.length > 0 && new Set(iconHrefs).size === iconHrefs.length);

// Season labelling: every stats export a UI surface tags with SEASON_TAGS must actually
// exist in data.js and resolve to a non-empty label — a typo'd export name here would
// silently render an empty season label instead of failing loudly.
const STATS_EXPORTS = ["FULL_TABLE", "MARKET_VALUES", "XG_TEAMS", "XG_PLAYERS", "TEAM_STATS_2526", "DISCIPLINE", "GOALS_STATS", "PLAYERS", "CLUB_TOP_SCORERS"];
check("SEASON has current/previous/seasonStart", !!(D.SEASON?.current?.id && D.SEASON?.previous?.id && D.SEASON?.seasonStart));
check("every stats export is tagged in SEASON_TAGS with a resolvable season id",
  STATS_EXPORTS.every((name) => {
    const id = D.SEASON_TAGS?.[name];
    return id && (id === D.SEASON.current.id || id === D.SEASON.previous.id) && D[name] !== undefined;
  }));
check("seasonLabel() returns a non-empty label for every tagged stats export",
  STATS_EXPORTS.every((name) => typeof D.seasonLabel(name) === "string" && D.seasonLabel(name).length > 0));

// CLUB_TOP_SCORERS is Transfermarkt all-competitions data with NO published xG, while
// XG_PLAYERS is league-only FootyStats data. Keeping them separate is the whole point of the
// export: if an xG field ever appears here, someone has either merged the two sources or
// invented a figure (CLAUDE.md rule 1). Goals/apps must also stay internally consistent with
// the published goals-per-match, which is how the screenshot readings were verified.
check("CLUB_TOP_SCORERS entries are valid clubs with sane goals/apps and no xG", (() => {
  // Empty is legitimate: season-rollover.js resets this to {} so last season's figures can't
  // be relabelled with the new season. Any row that IS present must still be well-formed.
  const rows = Object.entries(D.CLUB_TOP_SCORERS || {});
  return rows.every(([code, s]) =>
    D.CLUBS[code] && typeof s.player === "string" && s.player.length > 0 &&
    Number.isInteger(s.apps) && s.apps > 0 &&
    Number.isInteger(s.goals) && s.goals > 0 && s.goals <= s.apps * 5 &&
    Number.isInteger(s.minsPerGoal) && s.minsPerGoal > 0 &&
    !("xg" in s) && !("xG" in s));
})());
// A club with GIBSON Index ratings or league xG scorers doesn't need this fallback block —
// two scorer lists from different sources on one page is how a reader ends up comparing an
// all-competitions total against a league-only one.
check("CLUB_TOP_SCORERS only covers clubs with no PLAYERS or XG_PLAYERS entries", (() => {
  const covered = new Set([...D.PLAYERS.map((p) => p.club), ...D.XG_PLAYERS.map((p) => p.club)]);
  const overlap = Object.keys(D.CLUB_TOP_SCORERS || {}).filter((c) => covered.has(c));
  if (overlap.length) console.log(`      ↳ also has Index/xG data: ${overlap.join(", ")}`);
  return overlap.length === 0;
})());

// Season tagging must stay airtight either side of a rollover (scripts/season-rollover.js).
// Untagged live data is the dangerous case: the UI would render numbers with no season
// attached, which is exactly how a stat ends up silently attributed to the wrong season.
check("no stats export is untagged (every live export carries a season tag)",
  STATS_EXPORTS.every((name) => typeof D.SEASON_TAGS?.[name] === "string" && D.SEASON_TAGS[name].length > 0));
check("SEASON_TAGS has no stale keys (every tag names a real export)",
  Object.keys(D.SEASON_TAGS || {}).every((name) => D[name] !== undefined));
// liveSeasonId() returns null when the tags disagree — a half-finished rollover, where
// some exports were retagged and others weren't. That must never ship.
check("all live stats exports share one season id (no half-finished rollover)", D.liveSeasonId() !== null);
// The tags on live data must name a season SEASON knows about. Pre-rollover that's
// SEASON.previous (live data is last season's completed numbers, which is the state the
// season selector is built around); once season-rollover.js runs it becomes SEASON.current.
// Anything else means SEASON and the data have drifted apart.
check("live stats season id matches SEASON.current (or SEASON.previous pre-rollover)", (() => {
  const live = D.liveSeasonId();
  return live === D.SEASON.current.id || live === D.SEASON.previous.id;
})());

// Generator scripts that rewrite a marked block in data.js must locate it by INDEX, not by
// a RegExp built from the marker text. The CLUB_META markers contain "(auto-generated)", so
// a RegExp turned those parentheses into a capture group: includes() matched, replace()
// silently no-opped, and fetch-wikidata.js reported "Wrote CLUB_META" having written
// nothing — which is why that block could never be refreshed.
check("block-rewriting scripts locate markers by index, not an unescaped RegExp", (() => {
  const offenders = ["fetch-wikidata.js", "season-rollover.js", "weekly-update.js"].filter((f) => {
    let src = "";
    try { src = readFileSync(new URL(`./${f}`, import.meta.url), "utf8"); } catch { return false; }
    return /new RegExp\(`\$\{(startMarker|endMarker)\}/.test(src);
  });
  if (offenders.length) console.log(`      ↳ ${offenders.join(", ")}`);
  return offenders.length === 0;
})());

// Data-writing scripts must be able to fail without destroying what's already in data.js.
// fetch-wikidata.js used to rewrite CLUB_META wholesale, so a run with no network replaced
// every hand-entered ground and capacity with null. It now merges and refuses to write when
// nothing resolved; these are the two markers of that behaviour.
// FILL GAPS ONLY is the load-bearing rule, not a nicety: the first live run had Wikidata
// return a coordinate placing two NI grounds 5,260 miles apart, which a fetched-wins merge
// would have written straight over an owner-verified value. The merge must therefore prefer
// the EXISTING value (`prev[f] ... : r[f]`), never the fetched one.
check("fetch-wikidata.js fills gaps only, never overwrites, and bails when nothing resolves", (() => {
  let src = "";
  try { src = readFileSync(new URL("./fetch-wikidata.js", import.meta.url), "utf8"); } catch { return false; }
  const fillsGapsOnly = /\(prev\[f\] \?\? null\) !== null \? prev\[f\] : \(r\[f\] \?\? null\)/.test(src);
  if (!fillsGapsOnly) console.log("      ↳ merge no longer prefers the existing value");
  return fillsGapsOnly && /mergeWithExisting/.test(src) && /refusing to touch data\.js/.test(src);
})());

// The results routine (scripts/weekly-update.js, run on a schedule by
// .github/workflows/results-refresh.yml) writes scorelines straight into data.js from a
// community-edited feed. Three properties keep that safe, and all three are load-bearing:
//   * it writes data.js and NOTHING else — the workflow commits only data.js, so a second
//     write target would land changes nobody reviews;
//   * every event must carry idLeague === "4659" — TheSportsDB has served cached ENGLISH
//     league data in place of 4659, which is the whole reason this guard exists;
//   * it only ever replaces `result: null`, so a figure the owner entered by hand can
//     never be overwritten by the feed.
check("results routine writes only data.js, checks idLeague, and never overwrites a result", (() => {
  let src = "";
  try { src = readFileSync(new URL("./weekly-update.js", import.meta.url), "utf8"); } catch { return false; }
  const writes = [...src.matchAll(/writeFileSync\(\s*([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
  const onlyWritesData = writes.length > 0 && writes.every((v) => v === "DATA_PATH");
  if (!onlyWritesData) console.log(`      ↳ writeFileSync targets: ${writes.join(", ") || "none found"}`);
  const checksLeague = /String\(e\.idLeague\) !== LEAGUE_ID/.test(src) && /LEAGUE_ID = "4659"/.test(src);
  if (!checksLeague) console.log("      ↳ the idLeague === 4659 guard is missing or changed shape");
  const neverOverwrites = /result:\\s\*null/.test(src) && /refusing to overwrite/.test(src);
  if (!neverOverwrites) console.log("      ↳ the 'only replace result: null' guard is missing");
  return onlyWritesData && checksLeague && neverOverwrites;
})());

// The results routine must stay OFF the build. It rewrites data.js from a live feed, so
// wiring it into build/prebuild would let a bad feed rewrite the site during a deploy,
// with no diff and no human in between.
check("results routine is never wired into the build", (() => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  return !Object.values(pkg.scripts || {}).some((s) => /weekly-update/.test(s));
})());

// Early-season rule: games played must be DERIVED from results in the fixture list, never
// hardcoded, and the threshold must actually gate which season the stats surfaces default
// to. A hardcoded count would silently freeze the app in (or out of) early-season mode.
check("EARLY_SEASON_GAMES is a sane positive threshold", Number.isInteger(D.EARLY_SEASON_GAMES) && D.EARLY_SEASON_GAMES > 0);
check("currentSeasonGamesPlayed() is derived from FIXTURES_2627 results, not hardcoded", (() => {
  const src = readFileSync(new URL("../data.js", import.meta.url), "utf8");
  const fn = src.match(/export function currentSeasonGamesPlayed\(\)[\s\S]*?\n\}/)?.[0] || "";
  // Must walk the fixture list and key off a result field — not return a literal.
  return /FIXTURES_2627/.test(fn) && /\.result/.test(fn) && !/return\s+\d+\s*;/.test(fn);
})());
check("seasonStatus() gates defaultSeason on the games-played threshold", (() => {
  const s = D.seasonStatus();
  const expected = s.gamesPlayed < D.EARLY_SEASON_GAMES ? D.SEASON.previous.id : D.SEASON.current.id;
  return s.defaultSeason === expected && s.early === (s.gamesPlayed < D.EARLY_SEASON_GAMES);
})());
// A stats surface must never open on an empty state while a completed season sits behind a
// tap. This is the check that would have caught defaulting to a season with no data in it.
check("the default season a stats surface leads with actually has data behind it", (() => {
  const s = D.seasonStatus();
  const live = D.liveSeasonId();
  // Whichever season is led with must be the one the live stats exports are tagged as,
  // unless there genuinely are no rated players yet (a fresh, un-rolled season).
  return D.PLAYERS.length === 0 || s.defaultSeason === live;
})());
check("seasonStatus() strip copy is non-empty in both pre-season and in-season states", (() => {
  const start = Date.parse(`${D.SEASON.seasonStart}T00:00:00Z`);
  const pre = D.seasonStatus(start - 86400000);
  const during = D.seasonStatus(start + 86400000);
  return pre.strip.includes(D.SEASON.current.display) && /game/.test(during.strip);
})());

// Crest text colour is now computed (contrastText), not a hand-maintained per-club
// whitelist — guard that the computed choice is actually the better of the two options,
// and that every current club clears a 3:1 floor (WCAG's "large text" minimum; crest
// codes are short and bold, never body copy).
check("crest text colour is the higher-contrast option and clears 3:1 for every current club", (() => {
  const lChalk = relativeLuminance(chalk);
  const lDark = relativeLuminance(DARK_TEXT);
  return Object.entries(D.CLUBS).filter(([code]) => code !== "GLV").every(([, c]) => {
    const lBg = relativeLuminance(c.colors[0]);
    const ratioChalk = contrastRatio(lChalk, lBg);
    const ratioDark = contrastRatio(lDark, lBg);
    const best = Math.max(ratioChalk, ratioDark);
    const chosen = contrastText(c.colors[0]);
    const chosenRatio = chosen === chalk ? ratioChalk : ratioDark;
    return chosenRatio === best && chosenRatio >= 3.0;
  });
})());

// Every social account in data.js must actually reach the header. The handles/URLs are
// content and the glyphs are UI, so they live in different files — which means adding an
// account to SOCIALS without its icon renders a link as an empty 34px square that still
// looks clickable. Cheap to get wrong, invisible in a green build.
check("every SOCIALS account has a handle, an https URL and a header icon", (() => {
  let src = "";
  try { src = readFileSync(new URL("../App.jsx", import.meta.url), "utf8"); } catch { return false; }
  const keys = Object.keys(D.SOCIALS);
  if (!keys.length) return false;
  return keys.every((k) => {
    const s = D.SOCIALS[k];
    if (!s?.handle?.startsWith("@")) return false;
    if (!/^https:\/\/[^\s"']+$/.test(s.url || "")) return false;
    // The maps are object literals in App.jsx, so the key has to appear in both.
    const inIcons = new RegExp(`SOCIAL_ICONS\\s*=\\s*\\{[\\s\\S]*?\\b${k}\\s*:`).test(src);
    const inNames = new RegExp(`SOCIAL_NAMES\\s*=\\s*\\{[^}]*?\\b${k}\\s*:`).test(src);
    return inIcons && inNames;
  });
})());

// The Home board lost its kick-off time in the rewrite that made it advance by real time:
// the board object simply stopped carrying one, and nothing failed — a fixture with no time
// looks exactly like a fixture whose time nobody set. Owner spotted it live, 7 Aug 2026.
check("every league fixture resolves to a kick-off time", (() => D.FIXTURES_2627.every((round) => {
  const first = D.fixtureKickoffMs(round, round.matches[0]);
  if (first === null) return false;
  const next = D.nextLeagueFixture(first - 1000);
  return typeof next?.time === "string" && next.time.length > 0;
}))());

check("the Home board renders the kick-off time it carries", (() => {
  let src = "";
  try { src = readFileSync(new URL("../src/tabs/HomeTab.jsx", import.meta.url), "utf8"); } catch { return false; }
  // Both branches of the board have to set it, and the JSX has to actually print it.
  const setForLeague = /time:\s*leagueFix\./.test(src);
  const setForEuro = /time:\s*londonKickoffLabel\(/.test(src);
  // Printed, not merely guarded on — `{board.time && ...}` alone would satisfy a looser test
  // while rendering nothing. Allows a formatting call on the way out.
  const rendered = /\{\s*board\.time(?:\.[A-Za-z]+\(\))?\s*\}/.test(src);
  return setForLeague && setForEuro && rendered;
})());

// A European tie stores UTC, so rendering it in Belfast time is a DST question, not a
// formatting one: the same 19:00Z is 8pm in August and 7pm in December.
check("londonKickoffLabel() resolves UTC to Belfast wall time either side of the clocks", (() => (
  D.londonKickoffLabel("2026-08-04T19:00:00Z") === "8pm"
  && D.londonKickoffLabel("2026-12-04T19:00:00Z") === "7pm"
  && D.londonKickoffLabel("2026-08-04T18:45:00Z") === "7.45pm"
  && D.londonKickoffLabel("nonsense") === null
))());

// The board leads with crests now. A club code where a crest belongs is the regression to
// catch, since both render without error and only one of them looks like the rest of the app.
check("the Home board leads each side with a crest, not a club code", (() => {
  let src = "";
  try { src = readFileSync(new URL("../src/tabs/HomeTab.jsx", import.meta.url), "utf8"); } catch { return false; }
  return /<BoardSide\b/.test(src) && /<Crest\s+club=\{crest\}/.test(src);
})());

// /api/events used to treat "has a score" as "is a result", so a match still being played
// appeared under "Latest results" with its half-time score presented as final. Owner spotted
// it live during Cliftonville v Crusaders on opening night, 7 Aug 2026.
{
  const ev = await import("../api/events.js");
  const KO = Date.parse("2026-08-07T18:45:00Z");
  const mk = (o) => ({ idLeague: "4659", strHomeTeam: "Cliftonville", strAwayTeam: "Crusaders",
    dateEvent: "2026-08-07", strTime: "18:45:00", intHomeScore: 1, intAwayScore: 0, ...o });

  check("a match in play is never classified as a result", (() => {
    const inPlay = [
      [mk({}), KO + 20 * 60 * 1000],                        // 20 minutes in, no status
      [mk({ strStatus: "1H" }), KO + 20 * 60 * 1000],
      [mk({ strStatus: "HT" }), KO + 50 * 60 * 1000],
      [mk({ strStatus: "2H" }), KO + 70 * 60 * 1000],
      [mk({ strStatus: "" }), KO + 100 * 60 * 1000],         // still inside the match window
      [mk({ dateEvent: "", strTime: "" }), KO],              // undateable score proves nothing
    ];
    return inPlay.every(([e, now]) => ev.classifyEvent(e, now) === "live");
  })());

  check("a finished match is classified as a result", (() => (
    ev.classifyEvent(mk({ strStatus: "FT" }), KO + 60 * 60 * 1000) === "result"
    && ev.classifyEvent(mk({ strStatus: "Match Finished" }), KO + 60 * 60 * 1000) === "result"
    // No status, but far enough past kick-off that it cannot still be on.
    && ev.classifyEvent(mk({}), KO + ev.MATCH_WINDOW_MS + 60 * 1000) === "result"
  ))());

  check("a fixture with no score is never a result or a live score", (() => (
    ev.classifyEvent(mk({ intHomeScore: null, intAwayScore: null }), KO + 20 * 60 * 1000) === "upcoming"
    && ev.classifyEvent(mk({ strStatus: "NS", intHomeScore: null, intAwayScore: null }), KO - 3600e3) === "upcoming"
    && ev.classifyEvent(mk({ strStatus: "Postponed", intHomeScore: null, intAwayScore: null }), KO) === "upcoming"
  ))());

  // Golden rule 3: the feed has served English league rows in place of 4659 before.
  check("events from another league are dropped whatever their status", (() => (
    ev.classifyEvent(mk({ idLeague: "4328", strStatus: "FT" }), KO + 60 * 60 * 1000) === "skip"
  ))());

  check("the same tie arriving from both upstream feeds is only listed once", (() => {
    const e = mk({ idEvent: "123", strStatus: "FT" });
    const b = ev.bucket([e, { ...e }], KO + 60 * 60 * 1000);
    return b.results.length === 1 && b.live.length === 0;
  })());
}

// The Home board advertised "NEXT MATCH · 7 AUG · 7.45PM" for a game that had already kicked
// off, because it only ever read the fixture list. Owner asked for the live score to be on the
// front page, 7 Aug 2026.
check("the Home board shows the live score once its fixture kicks off", (() => {
  let src = "";
  try { src = readFileSync(new URL("../src/tabs/HomeTab.jsx", import.meta.url), "utf8"); } catch { return false; }
  const asks = /findLive\(\s*live\.data/.test(src) && /useLiveEvents\(\)/.test(src);
  const showsScore = /\{liveMatch\.hs\}.–.\{liveMatch\.as\}|\{liveMatch\.hs\}[^}]*\{liveMatch\.as\}/.test(src);
  return asks && showsScore;
})());

// Two components each fetching /api/events is how one of them ends up a version behind and
// the front page contradicts the fixtures list.
check("live scores are fetched through one shared hook, not per tab", (() => {
  const files = ["../src/tabs/HomeTab.jsx", "../src/tabs/MatchesTab.jsx"];
  for (const f of files) {
    let src = "";
    try { src = readFileSync(new URL(f, import.meta.url), "utf8"); } catch { return false; }
    if (/fetch\(\s*["'`]\/api\/events/.test(src)) return false;
    if (!/useLiveEvents\(\)/.test(src)) return false;
  }
  let hook = "";
  try { hook = readFileSync(new URL("../src/lib/live.js", import.meta.url), "utf8"); } catch { return false; }
  return /fetch\(\s*["'`]\/api\/events/.test(hook);
})());

// The match-card scripts picked "the nearest UNPLAYED fixture", so the moment a result was
// written into data.js they silently jumped to that club's next game and drew a card for the
// wrong match — a full-time card headed Bangor v Cliftonville. Which fixture a card is about
// must not change because someone recorded the score. Found on opening night, 7 Aug 2026.
check("match-card scripts pick a fixture by time, not by whether it has a result", (() => {
  // Every script that locates a fixture. matchstats.mjs was missed on the first pass and
  // duly drew a card headed "Bangor 2-1 Cliftonville" the next time a result was recorded —
  // the check was right and its file list was wrong, which is its own kind of bug.
  const files = ["../scripts/promo/goal.mjs", "../scripts/promo/status.mjs",
    "../scripts/promo/motm.mjs", "../scripts/promo/matchstats.mjs"];
  return files.every((f) => {
    let src = "";
    try { src = readFileSync(new URL(f, import.meta.url), "utf8"); } catch { return false; }
    const picksByTime = /Math\.abs\(ms - now\) < Math\.abs\(fixture\.ms - now\)/.test(src);
    // The fixture loop must not skip played matches. Guarded narrowly so an unrelated use of
    // `result` elsewhere in these files doesn't trip it.
    const skipsPlayed = /if \(Array\.isArray\(m\.result\)\) continue;/.test(src);
    return picksByTime && !skipsPlayed;
  });
})());

// The table has to go live off our own recorded results, not wait for a community feed.
check("currentTable() derives standings from recorded results", (() => {
  const rows = D.currentTable();
  const clubs = [...new Set(D.FIXTURES_2627.flatMap((r) => r.matches.flatMap((m) => [m.h, m.a])))];
  if (rows.length !== clubs.length) return false;
  // Every club present from the start, points/GD consistent with the results recorded.
  let p = 0, pts = 0, gf = 0, ga = 0;
  for (const r of rows) { p += r.p; pts += r.pts; gf += r.gf; ga += r.ga; if (r.gd !== r.gf - r.ga) return false; }
  const played = D.FIXTURES_2627.flatMap((r) => r.matches).filter((m) => Array.isArray(m.result));
  // Two clubs per match, and every match awards exactly 3 points (win) or 2 (draw).
  if (p !== played.length * 2) return false;
  if (gf !== ga) return false;
  const expected = played.reduce((n, m) => n + (m.result[0] === m.result[1] ? 2 : 3), 0);
  if (pts !== expected) return false;
  // Sorted by points, then goal difference, then goals for.
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1], b = rows[i];
    if (a.pts < b.pts) return false;
    if (a.pts === b.pts && a.gd < b.gd) return false;
    if (a.pts === b.pts && a.gd === b.gd && a.gf < b.gf) return false;
  }
  return true;
})());

// Fixture rows showed only the fixture, so a played match still read as "Cliftonville V
// Crusaders" days later. Both views now show the score, and a match in play shows the feed's
// score over the recorded one — data.js can't be edited mid-match, and a stale scoreline next
// to a game in progress is worse than none. Owner asked for it, 7 Aug 2026.
check("fixture rows show the score once a match has been played", (() => {
  let src = "";
  try { src = readFileSync(new URL("../src/tabs/MatchesTab.jsx", import.meta.url), "utf8"); } catch { return false; }
  // Both renderers derive a `played` scoreline, and both prefer the live feed over m.result.
  const derivations = src.match(/const played\s*=\s*inPlay\s*\?/g) || [];
  if (derivations.length < 2) return false;
  // The by-round row must stop printing a bare "V" for a match that has a score.
  const roundRow = /\{played \? `\$\{played\[0\]\}.\$\{played\[1\]\}` : "V"\}/.test(src);
  // The by-club row is scored from that club's point of view, with a W/D/L marker.
  const clubRow = /f\.home \? played\[0\] : played\[1\]/.test(src) && /formColor\(outcome\)/.test(src);
  return roundRow && clubRow;
})());

// The 26/27 derived-stats layer. No free feed carries possession or shots for this league,
// so what arithmetic gives us for nothing has to be right.
check("currentSeasonStats() reconciles with the recorded results", (() => {
  const s = D.currentSeasonStats();
  const played = D.FIXTURES_2627.flatMap((r) => r.matches).filter((m) => Array.isArray(m.result));
  if (s.matches !== played.length) return false;
  if (s.league.homeWins + s.league.draws + s.league.awayWins !== s.matches) return false;
  const totalGoals = played.reduce((n, m) => n + m.result[0] + m.result[1], 0);
  if (s.league.goals !== totalGoals) return false;
  // Expected splits read straight off the fixture list, so "home" has to mean actually at
  // home. Checking only that home + away totals the whole is too weak: filing an away game
  // under home keeps every total right and was not caught until it was deliberately tried.
  const expect = {};
  for (const m of played) {
    expect[m.h] = expect[m.h] || { hp: 0, ap: 0, hgf: 0, agf: 0 };
    expect[m.a] = expect[m.a] || { hp: 0, ap: 0, hgf: 0, agf: 0 };
    expect[m.h].hp += 1; expect[m.h].hgf += m.result[0];
    expect[m.a].ap += 1; expect[m.a].agf += m.result[1];
  }
  let gf = 0, ga = 0;
  for (const c of s.clubs) {
    if (c.home.p + c.away.p !== c.p) return false;
    if (c.home.pts + c.away.pts !== c.pts) return false;
    if (c.home.gf + c.away.gf !== c.gf) return false;
    if (c.home.ga + c.away.ga !== c.ga) return false;
    const e = expect[c.club] || { hp: 0, ap: 0, hgf: 0, agf: 0 };
    if (c.home.p !== e.hp || c.away.p !== e.ap) return false;
    if (c.home.gf !== e.hgf || c.away.gf !== e.agf) return false;
    gf += c.gf; ga += c.ga;
  }
  // Every goal scored is a goal conceded, and both equal the league total.
  return gf === ga && gf === totalGoals;
})());

// The one that earns its keep: a scorer list that doesn't add up to the scoreline is either a
// missing goal or one credited to the wrong club, and neither is visible by eye.
check("MATCH_EVENTS goals add up to the recorded scoreline", (() => D.MATCH_EVENTS.every((ev) => {
  const round = D.FIXTURES_2627.find((r) => r.round === ev.round);
  const fixture = round && round.matches.find((m) => m.h === ev.h && m.a === ev.a);
  if (!fixture) return false;                       // an entry for a fixture that doesn't exist
  if (!Array.isArray(fixture.result)) return false; // scorers recorded for an unplayed match
  const goals = ev.goals || [];
  // Own goals would credit the other club, so every goal must name a club in this fixture.
  if (!goals.every((g) => g.club === ev.h || g.club === ev.a)) return false;
  if (!goals.every((g) => g.player && Number.isInteger(g.minute) && g.minute > 0 && g.minute <= 120)) return false;
  const h = goals.filter((g) => g.club === ev.h).length;
  const a = goals.filter((g) => g.club === ev.a).length;
  return h === fixture.result[0] && a === fixture.result[1];
}))());

check("topScorers() counts every recorded goal exactly once", (() => {
  const total = D.MATCH_EVENTS.reduce((n, m) => n + (m.goals || []).length, 0);
  const counted = D.topScorers(999).reduce((n, r) => n + r.goals, 0);
  if (counted !== total) return false;
  const rows = D.topScorers(999);
  for (let i = 1; i < rows.length; i++) if (rows[i - 1].goals < rows[i].goals) return false;
  // Stoppage time lands past the 90, not before it.
  return D.goalMinutes().length === total;
})());

// Hand-entered match stats. Same three rules the matchstats graphic enforces, because the
// numbers come from the same place — a phone screenshot read at speed.
check("MATCH_STATS entries are internally consistent and map to played fixtures", (() => D.MATCH_STATS.every((s) => {
  const round = D.FIXTURES_2627.find((r) => r.round === s.round);
  const fixture = round && round.matches.find((m) => m.h === s.h && m.a === s.a);
  if (!fixture || !Array.isArray(fixture.result)) return false;
  const pairs = [s.poss, s.shots, s.sot, s.corners, s.yellows];
  if (!pairs.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => Number.isFinite(n) && n >= 0))) return false;
  if (s.poss[0] + s.poss[1] !== 100) return false;          // possession is a share of one ball
  return [0, 1].every((i) => s.sot[i] <= s.shots[i]);       // can't hit the target more than you shoot
}))());

// The guard that makes partial hand-entered data safe to hold: a total is only ever built
// when every played match has been written up. Without this, a top-scorer table assembled
// from half the fixtures reads as authoritative while understating everyone else.
check("aggregates over hand-entered data are gated on complete coverage", (() => {
  const c = D.recordedCoverage();
  if (c.eventsComplete !== (c.played > 0 && c.events === c.played)) return false;
  if (c.statsComplete !== (c.played > 0 && c.stats === c.played)) return false;
  let src = "";
  try { src = readFileSync(new URL("../src/components/SeasonSoFar.jsx", import.meta.url), "utf8"); } catch { return false; }
  // Possession/shooting is the only hand-entered total the panel shows, and it must be behind
  // its completeness flag. Scorers are not shown at all: graphics aren't made for every match,
  // so MATCH_EVENTS is always a subset and any scorer total would understate the rest.
  const statsGated = /cover\.statsComplete\s*\?\s*aggregateMatchStats\(/.test(src);
  const noScorerTotals = !/topScorers\(/.test(src);
  return statsGated && noScorerTotals;
})());

// "Opening night" was keyed off round === 1, so once the Friday opener had been played the
// board went on calling a 3pm Saturday game opening night. It belongs to exactly one fixture
// in a season, and only if that fixture is actually in the evening. Owner spotted it live.
check("only the season opener is called opening night", (() => {
  const opener = D.seasonOpener();
  if (!opener) return false;
  const all = D.FIXTURES_2627.flatMap((r) => r.matches.map((m) => ({ round: r.round, h: m.h, a: m.a })));
  // Exactly one fixture may carry an "opening" label, and it must be the earliest kick-off.
  const opening = all.filter((f) => /opening/i.test(D.leagueFixtureLabel(f)));
  if (opening.length !== 1) return false;
  const [o] = opening;
  if (o.round !== opener.round || o.h !== opener.h || o.a !== opener.a) return false;
  // Night only if it is actually at night; an afternoon opener is opening day.
  const label = D.leagueFixtureLabel(o);
  if (opener.evening !== /night/i.test(label)) return false;
  // Every other fixture is named by its round, and a played one by its state.
  const other = all.find((f) => f.round === opener.round && (f.h !== opener.h || f.a !== opener.a));
  if (other && D.leagueFixtureLabel(other) !== `Premiership round ${other.round}`) return false;
  // The UI must go through the helper rather than testing the round number itself.
  let src = "";
  try { src = readFileSync(new URL("../src/tabs/HomeTab.jsx", import.meta.url), "utf8"); } catch { return false; }
  return !/round === 1 \?/.test(src) && /leagueFixtureLabel\(/.test(src);
})());

// Results dates were sliced out of an ISO string as "08-07", which is month-day and reads as
// 8 July to anyone here. Owner spotted it, 7 Aug 2026.
check("dates in results lists are day/month, not month/day", (() => {
  if (D.dayMonth("2026-08-07") !== "07/08") return false;      // the exact case that was wrong
  if (D.dayMonth("2026-12-25") !== "25/12") return false;
  if (D.dayMonth(Date.parse("2026-01-03T15:00:00Z")) !== "03/01") return false;
  if (D.dayMonth("nonsense") !== "") return false;
  // And nothing may go back to slicing an ISO date by hand.
  for (const f of ["../src/tabs/MatchesTab.jsx", "../src/tabs/HomeTab.jsx", "../src/components/ScoreRow.jsx"]) {
    let src = "";
    try { src = readFileSync(new URL(f, import.meta.url), "utf8"); } catch { return false; }
    if (/\.date\.slice\(5\)/.test(src)) return false;
  }
  return true;
})());

check("recentResults() returns recorded results, newest first", (() => {
  const rows = D.recentResults(50);
  const played = D.FIXTURES_2627.flatMap((r) => r.matches).filter((m) => Array.isArray(m.result));
  if (rows.length !== played.length) return false;
  for (let i = 1; i < rows.length; i++) if (rows[i - 1].kickoffMs < rows[i].kickoffMs) return false;
  return rows.every((r) => Number.isFinite(r.hs) && Number.isFinite(r.as) && D.CLUBS[r.h] && D.CLUBS[r.a]);
})());

// One row component, used by both tabs. Two copies is how the front page and the fixtures
// list end up disagreeing about what a scoreline looks like.
check("the score row is defined once and shared", (() => {
  let comp = "";
  try { comp = readFileSync(new URL("../src/components/ScoreRow.jsx", import.meta.url), "utf8"); } catch { return false; }
  if (!/export function ScoreRow/.test(comp)) return false;
  for (const f of ["../src/tabs/MatchesTab.jsx", "../src/tabs/HomeTab.jsx"]) {
    let src = "";
    try { src = readFileSync(new URL(f, import.meta.url), "utf8"); } catch { return false; }
    if (/function ScoreRow\s*\(/.test(src)) return false;                 // no local redefinition
    if (!/from "\.\.\/components\/ScoreRow\.jsx"/.test(src)) return false;
  }
  return true;
})());

// Per-match detail, opened from a fixture row. The owner is sending stats for every match, so
// the app should show them rather than only feeding the graphics.
check("matchDetail() returns what was recorded, and nothing when nothing was", (() => {
  // Every match we have stats or scorers for must resolve, and carry only recorded rows.
  for (const s of D.MATCH_STATS) {
    const d = D.matchDetail(s.round, s.h, s.a);
    if (!d || d.rows.length === 0) return false;
    if (!d.rows.every((r) => Array.isArray(r.pair) && r.pair.length === 2)) return false;
    if (d.rows.filter((r) => r.suffix === "%").length !== 1) return false;   // possession only
  }
  for (const e of D.MATCH_EVENTS) {
    const d = D.matchDetail(e.round, e.h, e.a);
    if (!d || !d.goals || d.goals.length !== e.goals.length) return false;
  }
  // A fixture nobody has written up returns null, which is what keeps its row un-tappable.
  const bare = D.FIXTURES_2627.flatMap((r) => r.matches.map((m) => ({ round: r.round, ...m })))
    .find((m) => !D.MATCH_STATS.some((s) => s.round === m.round && s.h === m.h && s.a === m.a)
      && !D.MATCH_EVENTS.some((e) => e.round === m.round && e.h === m.h && e.a === m.a));
  if (bare && D.matchDetail(bare.round, bare.h, bare.a) !== null) return false;
  return D.goalMinuteLabel({ minute: 90, added: 2 }) === "90+2'"
    && D.goalMinuteLabel({ minute: 61 }) === "61'"
    && D.goalMinuteLabel(null) === "";
})());

check("every list that shows a played match only offers stats when there are some", (() => {
  // Fixtures (by round, by club) and the front page's latest results. Each derives `detail`
  // and hangs the toggle, the panel and the click handler off it, so a match nobody wrote up
  // is never tappable — the front page also sees feed-only rows, which have no round at all.
  const want = { "../src/tabs/MatchesTab.jsx": 2, "../src/tabs/HomeTab.jsx": 1 };
  for (const [file, n] of Object.entries(want)) {
    let src = "";
    try { src = readFileSync(new URL(file, import.meta.url), "utf8"); } catch { return false; }
    if ((src.match(/matchDetail\(/g) || []).length < n) return false;
    if ((src.match(/<MatchDetail\s/g) || []).length < n) return false;
    if ((src.match(/onClick=\{detail \?/g) || []).length < n) return false;
    if (!/<StatsAffordance /.test(src)) return false;
  }
  // The affordance itself is defined once, not re-styled per view.
  let comp = "";
  try { comp = readFileSync(new URL("../src/components/MatchDetail.jsx", import.meta.url), "utf8"); } catch { return false; }
  return /export function StatsAffordance/.test(comp);
})());

// Cliftonville against Crusaders is red against red, so club colour cannot carry a
// head-to-head — the same reason the matchday graphics use gold and sky.
check("match stat bars use the home/away pairing, not club colours", (() => {
  let src = "";
  try { src = readFileSync(new URL("../src/components/MatchDetail.jsx", import.meta.url), "utf8"); } catch { return false; }
  if (/CLUBS\[[^\]]+\]\.colors/.test(src)) return false;
  return /HOME = "#FFB627"/.test(src) && /AWAY = "#5EC8F2"/.test(src);
})());

console.log(fails === 0 ? "ALL CHECKS PASS" : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
