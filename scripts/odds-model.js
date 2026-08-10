// GIBSON's 1X2 estimate — the model behind the numbers the Predictor labels "GIBSON estimate".
//
// These are NOT bookmaker prices and must never be presented as any (CLAUDE.md rule 2). They
// are fair odds: the three implied probabilities sum to 1.000, with no margin taken out, which
// is the honest shape for an informational number. A bookmaker's board sums to about 1.06 —
// that gap is their cut, and GIBSON has nothing to cut.
//
// HOW IT WORKS
//
// 1. Strength blends two things, each z-scored so they're on one scale:
//      - last season's points per game, which is what actually happened;
//      - squad market value, log-scaled, because value is multiplicative — €0.33m to €1.6m is
//        a bigger football gap than €2.5m to €3.5m.
//    Weighted toward points, because on their own the market values barely separate this
//    league: eleven of the twelve sit between €1.6m and €3.5m, which is half a goal of
//    supremacy across almost the whole division. A value-only version made Dungannon
//    favourites at home to Coleraine, who won there 3-1 on the opening weekend.
//    A promoted club has no record to read, so it inherits the points per game of the club it
//    replaced — priced at the level of the side that went down until it has a season of its
//    own. That is a stated prior, not a measurement.
// 2. The rating difference becomes a goal supremacy, plus a home advantage.
// 3. Supremacy and the league's goals-per-game split into two Poisson means, and the 1X2
//    probabilities fall out of the score matrix.
//
// WHAT IS ASSUMED RATHER THAN MEASURED
//
// HOME_ADV, STRENGTH_SCALE and PPG_WEIGHT are judgement, not fitted. They are the three dials
// the whole estimate turns on, so they are stated here in the open rather than buried. Goals
// per game is measured, from last season's recorded goal totals.
//
// A KNOWN LIMITATION, LEFT IN DELIBERATELY
//
// The model averages about 22% draws. Last season the league drew 40 of 228, which is 17.5%.
// It is tempting to widen STRENGTH_SCALE until those agree, and that was tried: the draw rate
// can be matched exactly, but only by making mismatches near-certain — Larne at home to
// Limavady came out 1.04, with the away side at 230.0. Adding a supremacy cap to tame the
// tail then priced 47-61% of all fixtures identically at the cap, which is worse again: half
// the league sharing one price is not a model, it's a shrug.
//
// So it is left alone, because 40 draws in 228 matches carries a standard error of about
// 2.5 percentage points. 17.5% against 22% is roughly 1.8 standard errors — an unremarkable
// season, not a signal. Chasing it would be fitting one season's noise and calling it skill.
// If the draw rate stays low across 26/27 too, that becomes evidence and this gets revisited.
//
// Everything else is derived, so re-running this on the same data always gives the same odds.

export const HOME_ADV = 0.30;       // goals. Assumption.
export const STRENGTH_SCALE = 0.55; // goals of supremacy per 1.0 of z-scored strength. Assumption.
export const PPG_WEIGHT = 0.65;     // how far the blend leans on results over money. Assumption.
const MAX_GOALS = 10;               // score matrix depth; beyond this the probabilities are noise
const MIN_LAMBDA = 0.15;            // a team is never literally incapable of scoring

// Last season's actual goals per game, from the recorded per-club goal totals. Falls back to a
// stated constant only if that data is ever emptied — and says so rather than pretending.
export function goalsPerGame(D) {
  const rows = D.TEAM_STATS_2526 || [];
  const clubs = rows.length;
  if (clubs < 2) return { value: 2.6, measured: false };
  const goals = rows.reduce((n, r) => n + (Number(r.goals) || 0), 0);
  // Each club plays (clubs - 1) * 2 fixtures in a double round, and the league's real format
  // adds the post-split rounds — so use the recorded `p` from the table when it's there.
  const played = (D.FULL_TABLE || []).find((r) => r.p)?.p || (clubs - 1) * 2;
  const matches = (clubs * played) / 2;
  return { value: goals / matches, measured: true };
}

const zScore = (map) => {
  const vals = Object.values(map);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, (v - mean) / sd]));
};

// One strength number per club, blending last season's points per game with squad value.
export function ratings(D) {
  const clubs = Object.keys(D.CLUBS || {}).filter((c) => (D.MARKET_VALUES || []).some((m) => m.club === c));

  const value = {};
  for (const m of D.MARKET_VALUES || []) {
    const v = Number(m.total);
    if (Number.isFinite(v) && v > 0 && clubs.includes(m.club)) value[m.club] = Math.log(v);
  }

  const ppg = {};
  for (const r of D.FULL_TABLE || []) {
    if (r.p > 0 && clubs.includes(r.club)) ppg[r.club] = r.pts / r.p;
  }
  // Promoted clubs inherit the weakest recorded points per game — the level of the side they
  // came up in place of. Without this they'd be rated on money alone while everyone else was
  // rated on results, which is two different models wearing one name.
  const weakest = Math.min(...Object.values(ppg));
  for (const c of clubs) if (!(c in ppg)) ppg[c] = weakest;

  const zv = zScore(value), zp = zScore(ppg);
  const out = {};
  for (const c of clubs) {
    if (!(c in zv) || !(c in zp)) continue;
    out[c] = PPG_WEIGHT * zp[c] + (1 - PPG_WEIGHT) * zv[c];
  }
  return out;
}

const pois = (k, lambda) => {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / f;
};

// Fair decimal odds for one fixture. Returns null when either club has no rating, because a
// missing club is a data problem to fix, not a number to invent.
export function fairOdds(home, away, D) {
  const r = ratings(D);
  if (!(home in r) || !(away in r)) return null;

  const total = goalsPerGame(D).value;
  const supremacy = STRENGTH_SCALE * (r[home] - r[away]) + HOME_ADV;
  const lh = Math.max(MIN_LAMBDA, (total + supremacy) / 2);
  const la = Math.max(MIN_LAMBDA, (total - supremacy) / 2);

  let pH = 0, pD = 0, pA = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = pois(h, lh) * pois(a, la);
      if (h > a) pH += p; else if (h === a) pD += p; else pA += p;
    }
  }
  // The matrix is truncated at MAX_GOALS, so renormalise rather than let the rounding leak
  // into the odds as a phantom margin.
  const sum = pH + pD + pA;
  pH /= sum; pD /= sum; pA /= sum;

  const price = (p) => Math.round((1 / p) * 100) / 100;
  return { home: price(pH), draw: price(pD), away: price(pA) };
}
