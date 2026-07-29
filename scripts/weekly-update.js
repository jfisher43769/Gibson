// GIBSON weekly update — the mechanical half of the Sunday ritual (CLAUDE.md).
// Manually run, NEVER part of the build:
//   node scripts/weekly-update.js --dry-run   (preview, writes nothing)
//   node scripts/weekly-update.js             (applies)
//   node scripts/weekly-update.js --fixture=<path.json>   (run against a saved payload)
//
// What it does:
//   1. Fetches finished NIFL Premiership matches from TheSportsDB (league 4659).
//   2. Fills `result: [h, a]` on any PREDICTOR_GW fixture it can match with confidence.
//   3. Prints exactly what it filled and what it skipped, and why.
//
// WHAT IT DELIBERATELY DOES NOT DO — CLAUDE.md rule 4, editorial stays editorial:
//   * It never writes a `deadline` string, a gameweek `name`, a `comp` label, or any
//     transfer/injury/storyline. Those are the owner's words.
//   * It never creates the next gameweek. Choosing which fixtures make a gameweek is an
//     editorial call; this script only completes results for the gameweek already there.
//   * It never invents or adjusts odds.
//
// TRUST MODEL — CLAUDE.md: feed data is untrusted input, validate shape AND plausibility:
//   * Every event must carry idLeague === "4659". TheSportsDB has been observed serving
//     cached English Premier League data; that incident is why this check is not optional.
//   * Scores must be integers in a sane range. A 40-goal "result" is a parse error, not a
//     scoreline, and must never reach data.js.
//   * A fixture is only filled when EXACTLY ONE finished event matches it. Two candidates
//     (a replay, a duplicated feed row) means ambiguity — it skips and reports rather than
//     guessing which is real.
//   * Anything already carrying a result is left alone. This script never overwrites a
//     figure the owner has already put in, so re-running it is always safe.
//   * On ANY doubt it writes nothing at all and exits non-zero.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as D from "../data.js";

const DATA_PATH = fileURLToPath(new URL("../data.js", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const FIXTURE = (process.argv.find((a) => a.startsWith("--fixture=")) || "").split("=")[1];
const LEAGUE_ID = "4659";
const MAX_PLAUSIBLE_GOALS = 15; // NIFL record win is nowhere near this; beyond it, distrust the feed

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

// Same mapping the serverless functions use (api/table.js, api/events.js). Kept in step
// with them deliberately — one club-name vocabulary for every TheSportsDB consumer.
const CLUB_MAP = [
  ["limavady", "LIM"], ["larne", "LAR"], ["linfield", "LIN"], ["glentoran", "GLE"],
  ["coleraine", "COL"], ["cliftonville", "CLI"], ["crusaders", "CRU"], ["ballymena", "BAL"],
  ["carrick", "CAR"], ["dungannon", "DUN"], ["portadown", "POR"], ["bangor", "BAN"],
  ["glenavon", "GLV"],
];
const toCode = (name) => {
  const n = (name || "").toLowerCase();
  const hit = CLUB_MAP.find(([k]) => n.includes(k));
  return hit ? hit[1] : null;
};

// ---- 1. Get finished events ------------------------------------------------------------
async function loadEvents() {
  if (FIXTURE) {
    const raw = JSON.parse(readFileSync(FIXTURE, "utf8"));
    return Array.isArray(raw) ? raw : (raw.events || []);
  }
  const url = `https://www.thesportsdb.com/api/v1/json/123/eventspastleague.php?id=${LEAGUE_ID}`;
  const r = await fetch(url, { headers: { "User-Agent": "GIBSON-IrishLeagueStats/1.0" } });
  if (!r.ok) fail(`TheSportsDB returned ${r.status}. Nothing written.`);
  const j = await r.json();
  return (j && j.events) || [];
}

// ---- 2. Validate + normalise -----------------------------------------------------------
// Returns only events this script is willing to believe. Every rejection is counted so the
// summary can show that a fixture went unfilled because the feed was bad, not because the
// match wasn't played.
function normalise(events) {
  const rejected = { wrongLeague: 0, unmappedClub: 0, noScore: 0, implausible: 0 };
  if (!Array.isArray(events)) fail("feed payload was not an array of events. Nothing written.");
  const out = [];
  for (const e of events) {
    if (String(e.idLeague) !== LEAGUE_ID) { rejected.wrongLeague++; continue; }
    const h = toCode(e.strHomeTeam), a = toCode(e.strAwayTeam);
    if (!h || !a || h === a) { rejected.unmappedClub++; continue; }
    if (e.intHomeScore === null || e.intAwayScore === null ||
        e.intHomeScore === undefined || e.intAwayScore === undefined) { rejected.noScore++; continue; }
    const hs = Number(e.intHomeScore), as = Number(e.intAwayScore);
    if (!Number.isInteger(hs) || !Number.isInteger(as) || hs < 0 || as < 0 ||
        hs > MAX_PLAUSIBLE_GOALS || as > MAX_PLAUSIBLE_GOALS) { rejected.implausible++; continue; }
    out.push({ h, a, hs, as, date: e.dateEvent || "" });
  }
  return { events: out, rejected };
}

// ---- 3. Match against PREDICTOR_GW -----------------------------------------------------
// PREDICTOR_GW sides are either { club: "LAR" } or { external: "Red Star Belgrade" }.
// Only club-vs-club fixtures can be matched — a European tie against a non-NIFL side will
// never appear in a league feed, and is reported as skipped rather than silently ignored.
const sideCode = (side) => (side && side.club) || null;

function planFills(feed) {
  const plan = [];
  for (const f of D.PREDICTOR_GW.fixtures) {
    const h = sideCode(f.home), a = sideCode(f.away);
    if (f.result !== null) { plan.push({ id: f.id, skip: "already has a result" }); continue; }
    if (!h || !a) { plan.push({ id: f.id, skip: "not a league fixture (external side)" }); continue; }
    const hits = feed.filter((e) => e.h === h && e.a === a);
    if (hits.length === 0) { plan.push({ id: f.id, skip: `no finished ${h} v ${a} in the feed` }); continue; }
    if (hits.length > 1) { plan.push({ id: f.id, skip: `${hits.length} candidate results — ambiguous, needs a human` }); continue; }
    plan.push({ id: f.id, h, a, result: [hits[0].hs, hits[0].as], date: hits[0].date });
  }
  return plan;
}

// ---- 4. Rewrite data.js ----------------------------------------------------------------
// Surgical: finds the fixture by its id string and replaces only that entry's
// `result: null`. Never reformats the file or touches anything else on the line.
function applyFills(src, fills) {
  for (const fl of fills) {
    const idIdx = src.indexOf(`id: "${fl.id}"`);
    if (idIdx < 0) fail(`could not locate fixture id "${fl.id}" in data.js. Nothing written.`);
    const lineEnd = src.indexOf("\n", idIdx);
    const line = src.slice(idIdx, lineEnd);
    if (!/result:\s*null/.test(line)) fail(`fixture "${fl.id}" no longer reads "result: null" — refusing to overwrite. Nothing written.`);
    const patched = line.replace(/result:\s*null/, `result: [${fl.result[0]}, ${fl.result[1]}]`);
    src = src.slice(0, idIdx) + patched + src.slice(lineEnd);
  }
  return src;
}

// ---- run -------------------------------------------------------------------------------
const raw = await loadEvents();
const { events, rejected } = normalise(raw);
const plan = planFills(events);
const fills = plan.filter((p) => p.result);
const skips = plan.filter((p) => p.skip);

console.log(`\nGIBSON weekly update${DRY_RUN ? " (DRY RUN — nothing written)" : ""}`);
console.log(`  gameweek  : ${D.PREDICTOR_GW.name}`);
console.log(`  feed      : ${raw.length} events in, ${events.length} usable`);
const rej = Object.entries(rejected).filter(([, n]) => n > 0);
if (rej.length) console.log(`  rejected  : ${rej.map(([k, n]) => `${k}=${n}`).join(", ")}`);

if (fills.length) {
  console.log("\n  results to fill:");
  for (const f of fills) console.log(`    ${f.id}  ${f.h} ${f.result[0]}–${f.result[1]} ${f.a}   (${f.date})`);
}
if (skips.length) {
  console.log("\n  skipped:");
  for (const s of skips) console.log(`    ${s.id}  ${s.skip}`);
}

if (!fills.length) {
  console.log("\nNothing to fill — data.js untouched.\n");
  process.exit(0);
}

if (DRY_RUN) {
  console.log("\nDry run — data.js was not modified. Re-run without --dry-run to apply.\n");
  process.exit(0);
}

const src = readFileSync(DATA_PATH, "utf8");
writeFileSync(DATA_PATH, applyFills(src, fills));
console.log(`\n✓ filled ${fills.length} result${fills.length === 1 ? "" : "s"} in data.js.`);
console.log("  Next: npm run build && node scripts/verify.js && node scripts/render-test.mjs");
console.log("  Editorial (next gameweek, deadline copy, transfers) is still yours to write.\n");
