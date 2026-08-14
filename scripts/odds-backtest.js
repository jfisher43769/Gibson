// Scores the odds model against every result the site has recorded.
//
// The model's own file argues it is better motivated than the one it replaced. It cannot
// argue it is better calibrated, because when it shipped there were five matches to test it
// on. This is what turns that into an answerable question: run it whenever you like, and by
// midwinter it is reporting on a real number of matches instead of a rounding error.
//
//   node scripts/odds-backtest.js
//
// WHAT THE NUMBERS MEAN
//
//   log loss   average -ln(probability the model gave the outcome that happened). Lower is
//              better. Three-way guessing scores ln(3) = 1.099, so anything at or above that
//              means the model is adding nothing. It punishes confident wrong calls hard,
//              which is the point — an estimate that says 85% and is wrong should hurt.
//   Brier      average squared error across the three outcomes. Lower is better; 0.667 is
//              what you get by saying 1/3, 1/3, 1/3 every week.
//   calibration buckets predictions by the probability given and compares it to how often
//              those things actually happened. A model can rank fixtures well and still be
//              systematically overconfident; only this shows it.
//
// A NOTE ON HONESTY
//
// Ratings are built from last season plus every result recorded SO FAR, and this scores them
// against those same results — so it is not a clean walk-forward test, and it flatters the
// model slightly on the matches that fed it. Rebuilding the ratings as of each matchday would
// fix that, and is worth doing once there are enough rounds for it to matter. Until then the
// bias is stated rather than hidden: with PRIOR_GOALS at 20, one match barely moves its own
// prediction, so the effect is small early and grows. Do not quote these as clean out-of-
// sample figures.
import * as D from "../data.js";
import { outcomeProbs } from "./odds-model.js";

const played = [];
for (const round of D.FIXTURES_2627 || []) {
  for (const m of round.matches || []) {
    if (Array.isArray(m.result) && m.result.length === 2) played.push({ round: round.round, ...m });
  }
}

if (played.length === 0) {
  console.log("No results recorded yet — nothing to score.");
  process.exit(0);
}

const OUTCOMES = ["home", "draw", "away"];
const rows = [];
let ll = 0, brier = 0, skipped = 0;

for (const m of played) {
  const p = outcomeProbs(m.h, m.a, D);
  if (!p) { skipped++; continue; }
  const [hs, as] = m.result;
  const actual = hs > as ? "home" : hs === as ? "draw" : "away";
  const got = p[actual];
  ll += -Math.log(got);
  for (const o of OUTCOMES) brier += (p[o] - (o === actual ? 1 : 0)) ** 2;
  rows.push({ ...m, p, actual, got });
}

const n = rows.length;
console.log(`\nGIBSON odds model — backtest over ${n} recorded match${n === 1 ? "" : "es"}`
  + (skipped ? `  (${skipped} skipped: no rating)` : ""));

if (n < 30) {
  console.log(`\n  ⚠  ${n} matches is too few to draw a conclusion from. Reported so the figure`);
  console.log(`     is on the record and moving, not so it settles anything. Come back at 60+.`);
}

console.log(`\n  log loss   ${(ll / n).toFixed(4)}   (guessing = 1.0986)`);
console.log(`  Brier      ${(brier / n).toFixed(4)}   (guessing = 0.6667)`);

// Favourite strike rate: of the fixtures where the model had a clear favourite, how often did
// that favourite win? A blunter measure than log loss, and the one people actually ask about.
const withFav = rows.filter((r) => Math.max(r.p.home, r.p.away) >= 0.5);
if (withFav.length) {
  const hit = withFav.filter((r) => (r.p.home > r.p.away ? "home" : "away") === r.actual).length;
  console.log(`  favourites ${hit}/${withFav.length} correct when priced at 50%+`);
}

// Calibration. Wide buckets on purpose: narrow ones on a small sample report noise as insight.
console.log(`\n  calibration (every predicted outcome, bucketed by the probability given)`);
const buckets = [[0, 0.2], [0.2, 0.35], [0.35, 0.5], [0.5, 0.7], [0.7, 1.01]];
for (const [lo, hi] of buckets) {
  let count = 0, happened = 0, sumP = 0;
  for (const r of rows) for (const o of OUTCOMES) {
    if (r.p[o] < lo || r.p[o] >= hi) continue;
    count++; sumP += r.p[o];
    if (r.actual === o) happened++;
  }
  if (!count) continue;
  const said = (sumP / count) * 100, real = (happened / count) * 100;
  const flag = count < 10 ? "  (thin)" : Math.abs(said - real) > 15 ? "  ←" : "";
  console.log(`    ${(lo * 100).toFixed(0).padStart(3)}-${(hi * 100).toFixed(0).padEnd(3)}%  `
    + `said ${said.toFixed(1).padStart(5)}%   happened ${real.toFixed(1).padStart(5)}%   n=${String(count).padStart(3)}${flag}`);
}

// The draw rate is the model's one documented weakness, so it gets reported every run.
const saidDraw = rows.reduce((s, r) => s + r.p.draw, 0) / n;
const wereDraws = rows.filter((r) => r.actual === "draw").length;
console.log(`\n  draws      model says ${(saidDraw * 100).toFixed(1)}%   actual ${(wereDraws / n * 100).toFixed(1)}% (${wereDraws}/${n})`);
const se = Math.sqrt((saidDraw * (1 - saidDraw)) / n) * 100;
const gap = Math.abs(saidDraw * 100 - (wereDraws / n) * 100);
console.log(`             gap ${gap.toFixed(1)}pp against a standard error of ${se.toFixed(1)}pp`
  + `  → ${(gap / se).toFixed(1)} SE${gap / se > 2 ? "  ← worth revisiting the model" : ", unremarkable"}`);

console.log(`\n  worst calls (model was most confident and wrong)`);
for (const r of [...rows].sort((a, b) => a.got - b.got).slice(0, 5)) {
  console.log(`    R${String(r.round).padStart(2)}  ${D.CLUBS[r.h]?.name} ${r.result[0]}-${r.result[1]} ${D.CLUBS[r.a]?.name}`
    + `   gave ${(r.got * 100).toFixed(1)}% to ${r.actual}`);
}
console.log("");
