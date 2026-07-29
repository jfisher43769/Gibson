// GIBSON data invariant checker — run before any commit: node scripts/verify.js
// NOTE: run `npm run build` first — the generated-file checks below need the files
// scripts/generate.js writes as the npm "prebuild" step (see .github/workflows/ci.yml,
// which now builds before verifying for exactly this reason).
import * as D from "../data.js";
import { readFileSync, existsSync } from "node:fs";
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
const shippedSources = ["../data.js", "../App.jsx", "../index.html"].map((p) => {
  try { return readFileSync(new URL(p, import.meta.url), "utf8"); } catch { return ""; }
});
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
const WINDOW_ONLY_BASELINE = 82;
let windowOnly = 0;
for (const w of D.WINDOW) {
  for (const [name] of w.ins) if (!D.TRANSFERS.some((t) => t.to === w.club && splitPlayers(t.player).some((p) => namesMatch(p, name)))) windowOnly++;
  for (const [name] of w.outs) if (!D.TRANSFERS.some((t) => t.from === w.club && splitPlayers(t.player).some((p) => namesMatch(p, name)))) windowOnly++;
}
check(`WINDOW-only entries with no TRANSFERS item stay within the known baseline (${windowOnly}/${WINDOW_ONLY_BASELINE})`, windowOnly <= WINDOW_ONLY_BASELINE);

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
check("every CLUB_FIXTURES/EURO fixture has a valid ISO dt matching its display date", allEuroFixtures.every(dtMatchesDisplayDate));
// Service worker must fetch page navigations fresh from the network (bypassing the HTTP
// cache), or a device gets stranded on an old build — the "new domain served the old
// page" bug. Guard the two things that fix matter: navigation handling + a no-store fetch.
const sw = (() => { try { return readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"); } catch { return ""; } })();
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
check("seasonStatus() strip copy is non-empty in both pre-season and in-season states", (() => {
  const start = Date.parse(`${D.SEASON.seasonStart}T00:00:00Z`);
  const pre = D.seasonStatus(start - 86400000);
  const during = D.seasonStatus(start + 86400000);
  return pre.strip.includes(D.SEASON.current.display) && /game/.test(during.strip);
})());

console.log(fails === 0 ? "ALL CHECKS PASS" : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
