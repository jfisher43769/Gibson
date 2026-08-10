// GIBSON — roll the Predictor to the next round.
//
//   node scripts/next-gameweek.js --dry-run    (preview, writes nothing)
//   node scripts/next-gameweek.js              (applies)
//   node scripts/next-gameweek.js --round=3    (a specific round, instead of the next one)
//
// The half of the Sunday ritual that weekly-update.js deliberately never did. That script
// fills results into the gameweek already there and stops, because "choosing which fixtures
// make a gameweek is an editorial call". So it is — but the call turns out to be the same
// call every week: the next round of the league, all of it, in fixture order. That is a rule,
// and a rule can be written down.
//
// WHAT IT WRITES
//   id      prem-round-N
//   name    Round N · <the competition name the current gameweek uses>
//   deadline  derived from the kick-off times on the round
//   fixtures  every match in the round, with `comp` built from round, ground and kick-off,
//             `result: null`, and odds from scripts/odds-model.js
//
// WHAT IT REFUSES TO DO
//   * Overwrite a gameweek that still has unfilled results. Rolling forward with blanks
//     behind you loses the scores people played for. Run weekly-update.js first.
//   * Invent a competition name. It reuses the one already on PREDICTOR_GW, so if the league
//     sponsor changes, the owner changes it once and this follows.
//   * Write odds for a club the model has no rating for — it stops instead.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as D from "../data.js";
import { fairOdds } from "./odds-model.js";

const DATA_PATH = fileURLToPath(new URL("../data.js", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const WANT = Number((process.argv.find((a) => a.startsWith("--round=")) || "").split("=")[1]) || null;
const fail = (m) => { console.error(`\n✗ ${m}\n`); process.exit(1); };

// ---- 1. Refuse to leave results behind -------------------------------------------------
const current = D.PREDICTOR_GW;
const unfilled = current.fixtures.filter((f) => !Array.isArray(f.result));
if (unfilled.length && !WANT) {
  fail(`"${current.name}" still has ${unfilled.length} fixture(s) with no result:\n` +
    unfilled.map((f) => `    ${f.home.club} v ${f.away.club}`).join("\n") +
    `\n  Run: node scripts/weekly-update.js --dry-run\n  Rolling on now would throw away the scores people played for.`);
}

// ---- 2. Pick the round ------------------------------------------------------------------
const currentRound = Number(/(\d+)/.exec(current.id || "")?.[1]) || 0;
const round = WANT || currentRound + 1;
const src = D.FIXTURES_2627.find((r) => r.round === round);
if (!src) fail(`No round ${round} in FIXTURES_2627 (the season has ${D.FIXTURES_2627.length} rounds).`);
// Rolling forward onto the round already loaded is a mistake; asking for it by name is not.
// Regenerating the current round is the whole point of --round=N — a fixture gets postponed
// or restored mid-week and the gameweek has to be rebuilt in place.
if (round === currentRound && !WANT) fail(`PREDICTOR_GW is already round ${round}. Use --round=${round} to rebuild it in place.`);

// ---- 3. Build the fixtures --------------------------------------------------------------
// The competition name is whatever the current gameweek calls it, minus its round prefix —
// never typed here, so a sponsor change is a one-line edit in data.js and this follows it.
const compName = String(current.name || "").replace(/^Round\s+\d+\s*·\s*/i, "").trim();
if (!compName) fail(`Can't read a competition name out of "${current.name}".`);

const fixtures = src.matches.map((m, i) => {
  const odds = fairOdds(m.h, m.a, D);
  if (!odds) fail(`No rating for ${m.h} or ${m.a} — add them to MARKET_VALUES before rolling.`);
  const ground = D.CLUBS[m.h]?.ground || "";
  const when = [m.d || src.date, m.t || src.time || D.DEFAULT_KICKOFF].filter(Boolean).join(", ");
  return {
    // Keyed by the clubs, not by position. Positional ids (f1, f2, …) are stable only while
    // the round's fixture list is, and it isn't: Larne v Bangor was postponed out of round 1
    // after publication. Remove a fixture from the middle and every id below it shifts onto a
    // different match — so a saved prediction silently ends up attached to a game the user
    // never picked, and gets scored against it. No error, just wrong.
    id: `f-${m.h}-${m.a}`,
    home: { club: m.h },
    away: { club: m.a },
    comp: [`Round ${round}`, ground, when].filter(Boolean).join(" · "),
    result: null,
    odds,
  };
});

// The deadline is the earliest kick-off in the round, described the way the round describes
// itself. When one match is out on its own — a Friday night opener — it gets named, because
// that is the one people miss.
const times = [...new Set(src.matches.map((m) => [m.d || src.date, m.t || src.time || D.DEFAULT_KICKOFF].filter(Boolean).join(" ")))];
const deadline = times.length === 1
  ? times[0]
  : `${D.CLUBS[src.matches[0].h]?.name} v ${D.CLUBS[src.matches[0].a]?.name} ${times[0]} · rest ${times[times.length - 1]}`;

const block = `export const PREDICTOR_GW = {
  id: "prem-round-${round}",
  name: "Round ${round} · ${compName}",
  deadline: "${deadline}",
  fixtures: [
${fixtures.map((f) => `    { id: "${f.id}", home: { club: "${f.home.club}" }, away: { club: "${f.away.club}" }, comp: "${f.comp}", result: null, odds: { home: ${f.odds.home}, draw: ${f.odds.draw}, away: ${f.odds.away} } },`).join("\n")}
  ],
};`;

console.log(`\nRound ${round} · ${compName}`);
console.log(`  deadline: ${deadline}`);
for (const f of fixtures) {
  console.log(`  ${f.home.club} v ${f.away.club}  ${f.odds.home} / ${f.odds.draw} / ${f.odds.away}   ${f.comp}`);
}

// ---- 4. Swap the block in ---------------------------------------------------------------
const source = readFileSync(DATA_PATH, "utf8");
const start = source.indexOf("export const PREDICTOR_GW = {");
if (start < 0) fail("Couldn't find PREDICTOR_GW in data.js.");
// Brace-matched rather than regex-matched: the block contains braces of its own, and a lazy
// regex would stop at the first "}" it met and corrupt the file.
let depth = 0, end = -1;
for (let i = source.indexOf("{", start); i < source.length; i++) {
  if (source[i] === "{") depth++;
  else if (source[i] === "}") { depth--; if (depth === 0) { end = source.indexOf(";", i) + 1; break; } }
}
if (end <= 0) fail("Couldn't find the end of the PREDICTOR_GW block.");

if (DRY_RUN) { console.log("\n(dry run — nothing written)\n"); process.exit(0); }
writeFileSync(DATA_PATH, source.slice(0, start) + block + source.slice(end));
console.log(`\n✓ data.js now carries round ${round}. Run: node scripts/verify.js && npm run build\n`);
