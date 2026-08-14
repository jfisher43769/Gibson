// GIBSON's 1X2 estimate — the model behind the numbers the Predictor labels "GIBSON estimate".
//
// These are NOT bookmaker prices and must never be presented as any (CLAUDE.md rule 2). They
// are fair odds: the three implied probabilities sum to 1.000, with no margin taken out, which
// is the honest shape for an informational number. A bookmaker's board sums to about 1.06 —
// that gap is their cut, and GIBSON has nothing to cut.
//
// ============================================================================================
// HOW IT WORKS
// ============================================================================================
//
// A log-linear Poisson model with separate attack and defence ratings — the standard Maher
// structure. Each club carries two numbers instead of one:
//
//     lambda_home = k * exp( attack_home + defence_away + LOG_HOME )
//     lambda_away = k * exp( attack_away + defence_home - LOG_HOME )
//
// and the 1X2 probabilities fall out of the score matrix those two means generate.
//
// 1. ATTACK AND DEFENCE come from last season's xG per game, blended with actual goals per
//    game at XG_WEIGHT. xG is the better guide to what a side will do next — it is the shot
//    quality they generated, not the finishing luck they had — but it is not the whole story,
//    because persistent over- or under-performance is partly real (a good finisher stays a
//    good finisher). Dungannon are why both are in there: their xG difference last season was
//    a shade positive, and their actual goal difference was minus 35.
//
// 2. SHRINKAGE toward the league average, by played / (played + RELIABILITY). Thirty-eight
//    games is a decent sample but not a large one, and the ends of the table are always
//    partly luck.
//
// 3. SQUAD VALUE tilts both ratings — a richer squad scores more and concedes fewer. It earns
//    its place by being the only input that knows about THIS summer: xG describes last
//    season's squad, and Ballymena have taken five players off Linfield since. Winsorised at
//    VALUE_CAP standard deviations, for the reason given at the code below.
//
// 4. THIS SEASON'S RESULTS are folded in as they arrive, opponent-adjusted, as a Gamma-Poisson
//    update: goals scored against goals the model expected against those particular opponents.
//    Without this the model would still be pricing on last season in April.
//
// 5. THE SCALE k is solved so the league's modelled goals per game equals the measured figure.
//
// ============================================================================================
// WHAT IS ASSUMED RATHER THAN MEASURED
// ============================================================================================
//
// LOG_HOME, XG_WEIGHT, RELIABILITY, VALUE_TILT, VALUE_CAP and PRIOR_GOALS are judgement, not
// fitted — there is no match-level history in this repo to fit them against. They are stated
// here in the open rather than buried. Goals per game is measured, from last season's recorded
// goal totals. Everything else is derived, so re-running on the same data gives the same odds.
//
// ============================================================================================
// WHAT REPLACING THE OLD MODEL DID AND DID NOT PROVE
// ============================================================================================
//
// The previous model blended points per game with squad value into ONE strength number per
// club. That is the thing worth fixing: it cannot tell apart two clubs on the same points who
// got there differently. Crusaders had the worst defence in the league last season by some way
// — 1.89 xGA per game, when nobody else was above 1.61 — and a single strength number simply
// cannot carry that, so every Crusaders fixture was priced as though they leaked goals at an
// average rate.
//
// It is worth being straight about the evidence, because the obvious test is rigged:
//
//   · Reproducing last season's table in-sample favours the OLD model, which was built from
//     points per game and then scored on points per game. It still loses on mean absolute
//     error (0.152 -> 0.135), but that comparison flatters it and should not be leaned on.
//   · Round 1 of 26/27 is genuinely out of sample and the new model is slightly ahead on both
//     log loss and Brier score. It is FIVE MATCHES. That is not evidence of anything.
//
// So: this model is better motivated, not measurably better. scripts/odds-backtest.js scores
// both against every recorded result and will answer the question properly once a real number
// of matches has been played. Until it does, the honest claim is the structural one.
//
// ============================================================================================
// A KNOWN LIMITATION, LEFT IN DELIBERATELY
// ============================================================================================
//
// The model produces about 22% draws. Last season the league drew 40 of 228, which is 17.5%.
// The gap survived the rewrite almost unchanged (23.0% before, 22.6% after), which is itself
// informative: it is not an artefact of how strength was measured, it is what independent
// Poisson does. At this league's scoring rate — 2.97 goals a game, which is high — two evenly
// matched sides draw about 24% of the time under independent scoring, and that is the number
// the matrix keeps producing.
//
// It is left alone for two reasons. First, 40 draws in 228 carries a standard error of about
// 2.5 percentage points, so 17.5% against 22% is roughly 1.8 standard errors — an unremarkable
// season, not a signal. Second, the standard fix points the wrong way: a Dixon-Coles low-score
// correction with the negative rho that leagues almost always show would RAISE the draw rate,
// not lower it. Getting to 17.5% would need a positive rho, against the grain of the published
// work on this. Chasing that would be fitting one season's noise and calling it skill.
//
// If the draw rate stays low through 26/27 as well, the backtest will show it, and then it is
// evidence and this gets revisited.

export const XG_WEIGHT = 0.70;      // xG against actual goals in the attack/defence base
export const RELIABILITY = 12;      // shrink toward average by played / (played + this)
export const VALUE_TILT = 0.07;     // log-goals of attack per 1 sd of squad value
export const VALUE_CAP = 1.5;       // sd beyond which a valuation stops being about ability
export const PRIOR_GOALS = 20;      // last season's weight, in goals, against this season's
export const LOG_HOME = 0.095;      // ~1.10x at home and 0.91x away. Assumption.
const MAX_GOALS = 10;               // score matrix depth; beyond this the probabilities are noise

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;

const zScore = (map) => {
  const v = Object.values(map);
  if (!v.length) return {};
  const m = mean(v);
  const sd = Math.sqrt(mean(v.map((x) => (x - m) ** 2))) || 1;
  return Object.fromEntries(Object.entries(map).map(([k, x]) => [k, (x - m) / sd]));
};

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
  return { value: goals / ((clubs * played) / 2), measured: true };
}

// Attack and defence per club, in log space, centred so that 0 is an average club.
// Returns null when there is nothing to rate.
export function ratings(D, { includeCurrent = true } = {}) {
  const xg = Object.fromEntries((D.XG_TEAMS || []).map((t) => [t.club, t]));
  const known = Object.keys(xg);
  if (known.length < 2) return null;

  const lg = {
    xg: mean(known.map((c) => xg[c].xg)),
    xga: mean(known.map((c) => xg[c].xga)),
    gf: mean(known.map((c) => xg[c].gf)),
    ga: mean(known.map((c) => xg[c].ga)),
  };
  const played = (D.FULL_TABLE || []).find((r) => r.p)?.p || 38;
  const shrink = played / (played + RELIABILITY);

  const att = {}, def = {};
  for (const c of known) {
    att[c] = Math.log(XG_WEIGHT * (xg[c].xg / lg.xg) + (1 - XG_WEIGHT) * (xg[c].gf / lg.gf)) * shrink;
    def[c] = Math.log(XG_WEIGHT * (xg[c].xga / lg.xga) + (1 - XG_WEIGHT) * (xg[c].ga / lg.ga)) * shrink;
  }

  // A promoted club has no record of its own, so it inherits the profile of the side that went
  // down — priced at the level of the club it replaced until it has a season of its own. That
  // is a stated prior, not a measurement.
  const relegated = (D.FULL_TABLE || []).slice(-1)[0]?.club;
  for (const c of Object.keys(D.CLUBS || {})) {
    if (c in att || !relegated || !(relegated in att)) continue;
    att[c] = att[relegated];
    def[c] = def[relegated];
  }

  // Squad value, winsorised at VALUE_CAP standard deviations. Limavady are valued at EUR 0.33m
  // in a league where nobody else is under EUR 1.6m, which puts them nearly three sd below the
  // mean — but a newly promoted squad is valued low largely because nobody has heard of its
  // players yet, not because it is three standard deviations worse at football. Uncapped, that
  // single figure priced them out of every fixture they appeared in; dropped entirely, it made
  // them near even money at home. The cap keeps the signal and discards the part of it that is
  // really about obscurity.
  const value = {};
  for (const m of D.MARKET_VALUES || []) {
    const v = Number(m.total);
    if (Number.isFinite(v) && v > 0 && m.club in att) value[m.club] = Math.log(v);
  }
  const zv = zScore(value);
  for (const c of Object.keys(att)) {
    const z = Math.max(-VALUE_CAP, Math.min(VALUE_CAP, zv[c] ?? 0));
    att[c] += VALUE_TILT * z;
    def[c] -= VALUE_TILT * z;
  }

  // This season's results, opponent-adjusted, as a Gamma-Poisson update: goals scored against
  // the goals the model expected against those particular opponents, updated by the ratio.
  //
  // Blending raw goal rates instead would be wrong twice over. It takes no account of who the
  // opponent was, and it treats a nil as evidence of a zero scoring rate — which needs an
  // arbitrary clamp to survive log(0), and which swung Linfield v Glentoran by a full point of
  // odds on one 0-3 defeat. Here a single match moves a rating by roughly its own expected
  // goals against PRIOR_GOALS, which is a few percent, and observing zero needs no special
  // case because the prior handles it.
  if (includeCurrent) {
    const gf = {}, ga = {}, xf = {}, xa = {};
    const add = (c, f, a, ef, ea) => {
      gf[c] = (gf[c] || 0) + f; ga[c] = (ga[c] || 0) + a;
      xf[c] = (xf[c] || 0) + ef; xa[c] = (xa[c] || 0) + ea;
    };
    const mu = goalsPerGame(D).value / 2;
    for (const round of D.FIXTURES_2627 || []) {
      for (const m of round.matches || []) {
        if (!Array.isArray(m.result) || !(m.h in att) || !(m.a in att)) continue;
        const [hs, as] = m.result;
        const lh = mu * Math.exp(att[m.h] + def[m.a] + LOG_HOME);
        const la = mu * Math.exp(att[m.a] + def[m.h] - LOG_HOME);
        add(m.h, hs, as, lh, la);
        add(m.a, as, hs, la, lh);
      }
    }
    for (const c of Object.keys(gf)) {
      att[c] += Math.log((PRIOR_GOALS + gf[c]) / (PRIOR_GOALS + xf[c]));
      def[c] += Math.log((PRIOR_GOALS + ga[c]) / (PRIOR_GOALS + xa[c]));
    }
  }

  const ma = mean(Object.values(att)), md = mean(Object.values(def));
  for (const c of Object.keys(att)) { att[c] -= ma; def[c] -= md; }
  return { att, def };
}

// Centring the ratings on zero does NOT make exp(attack + defence) average out to 1, because
// E[exp(x)] > exp(E[x]) — so the ratings inflate the league's goals before a ball is kicked.
// The scale is solved once across every possible fixture, which pins modelled goals per game
// to the measured figure. Without it the model ran about 4% hot.
export function goalScale(r, D) {
  const clubs = Object.keys(r.att);
  let sum = 0, n = 0;
  for (const h of clubs) for (const a of clubs) {
    if (h === a) continue;
    sum += Math.exp(r.att[h] + r.def[a] + LOG_HOME) + Math.exp(r.att[a] + r.def[h] - LOG_HOME);
    n++;
  }
  return n ? goalsPerGame(D).value / (sum / n) : 0;
}

// The two expected-goal means for one fixture. Null when either club has no rating, because a
// missing club is a data problem to fix, not a number to invent.
export function lambdas(home, away, D, opts) {
  const r = ratings(D, opts);
  if (!r || !(home in r.att) || !(away in r.att)) return null;
  const k = goalScale(r, D);
  return {
    lh: k * Math.exp(r.att[home] + r.def[away] + LOG_HOME),
    la: k * Math.exp(r.att[away] + r.def[home] - LOG_HOME),
  };
}

const pois = (k, lambda) => {
  let f = 1;
  for (let i = 2; i <= k; i++) f *= i;
  return (Math.exp(-lambda) * Math.pow(lambda, k)) / f;
};

// The 1X2 probabilities for one fixture, from the score matrix.
export function outcomeProbs(home, away, D, opts) {
  const l = lambdas(home, away, D, opts);
  if (!l) return null;
  let pH = 0, pD = 0, pA = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = pois(h, l.lh) * pois(a, l.la);
      if (h > a) pH += p; else if (h === a) pD += p; else pA += p;
    }
  }
  // The matrix is truncated at MAX_GOALS, so renormalise rather than let the rounding leak
  // into the odds as a phantom margin.
  const sum = pH + pD + pA;
  return { home: pH / sum, draw: pD / sum, away: pA / sum };
}

// Fair decimal odds for one fixture.
export function fairOdds(home, away, D, opts) {
  const p = outcomeProbs(home, away, D, opts);
  if (!p) return null;
  const price = (x) => Math.round((1 / x) * 100) / 100;
  return { home: price(p.home), draw: price(p.draw), away: price(p.away) };
}
