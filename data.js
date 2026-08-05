// ============================================================================
//  GIBSON DATA FILE — THIS IS THE ONLY FILE YOU EDIT FOR CONTENT UPDATES
// ============================================================================
//  Everything the app displays lives here: table, transfers, kits, Euro ties,
//  Predictor gameweeks, prices, history. The design code in App.jsx never
//  needs touching for a content update.
//
//  GOLDEN RULES:
//  1. Every entry ends with a comma. Missing commas are the #1 build breaker.
//  2. Text goes inside "double quotes". If your text contains a quote,
//     use \" or a curly quote instead.
//  3. After editing, commit — Vercel redeploys automatically in ~1 minute.
//  4. If the site breaks after an edit, open this file on GitHub, tap
//     History, and restore the previous version. Nothing is ever lost.
// ============================================================================

/* ================= DATA — NIFL Premiership 2025/26 (demo stats) ================= */
export const CLUBS = {
  LAR: { name: "Larne", ground: "Inver Park", colors: ["#C8102E", "#FFFFFF"], pattern: "plain" },
  COL: { name: "Coleraine", ground: "The Showgrounds", colors: ["#005EB8", "#FFFFFF"], pattern: "stripes" },
  GLE: { name: "Glentoran", ground: "The Oval", colors: ["#00693E", "#C8102E"], pattern: "sleeve" },
  LIN: { name: "Linfield", ground: "Windsor Park", colors: ["#0033A0", "#FFFFFF"], pattern: "plain" },
  CLI: { name: "Cliftonville", ground: "Solitude", colors: ["#EE1C25", "#FFFFFF"], pattern: "plain" },
  DUN: { name: "Dungannon Swifts", ground: "Stangmore Park", colors: ["#1D4F91", "#FFFFFF"], pattern: "plain" },
  BAL: { name: "Ballymena United", ground: "The Showgrounds", colors: ["#6CACE4", "#FFFFFF"], pattern: "plain" },
  POR: { name: "Portadown", ground: "Shamrock Park", colors: ["#DA291C", "#000000"], pattern: "plain" },
  BAN: { name: "Bangor", ground: "Clandeboye Park", colors: ["#FDB913", "#0033A0"], pattern: "plain" },
  CAR: { name: "Carrick Rangers", ground: "Loughview Leisure", colors: ["#FFB81C", "#000000"], pattern: "stripes" },
  CRU: { name: "Crusaders", ground: "Seaview", colors: ["#D01317", "#000000"], pattern: "stripes" },
  GLV: { name: "Glenavon", ground: "Mourneview Park", colors: ["#0072CE", "#FFFFFF"], pattern: "plain" },
  LIM: { name: "Limavady United", ground: "Limavady Showgrounds", colors: ["#1D6FB8", "#FFFFFF"], pattern: "plain" },
};

// Season labelling foundation. `current` is the season about to kick off (seasonStart);
// `previous` is the completed season the site's stats still describe. SEASON_TAGS maps
// each season-scoped stats export to the season id it belongs to, so App.jsx can render a
// season label wherever that export is shown instead of hand-typed "25/26" text that can
// drift out of sync with the data. seasonLabel() is the single place that formats it.
export const SEASON = {
  current: { id: "2026-27", display: "2026/27" },
  previous: { id: "2025-26", display: "2025/26" },
  seasonStart: "2026-08-07",
};

// Every export a stats surface reads season-scoped data from, tagged with which season it
// describes. All eight are last season's completed records — the 26/27 season itself
// hasn't kicked off yet (SEASON.seasonStart), so there's nothing to tag "current" yet.
export const SEASON_TAGS = {
  FULL_TABLE: "2025-26",
  MARKET_VALUES: "2025-26",
  XG_TEAMS: "2025-26",
  XG_PLAYERS: "2025-26",
  TEAM_STATS_2526: "2025-26",
  DISCIPLINE: "2025-26",
  GOALS_STATS: "2025-26",
  PLAYERS: "2025-26",
  CLUB_TOP_SCORERS: "2025-26",
};

// Renders e.g. "2025/26 · final" for a completed season, or just "2026/27" once something
// is tagged with the current (still in-progress) season id — "final" only ever describes a
// season that's actually over.
export function seasonLabel(exportName) {
  const id = SEASON_TAGS[exportName];
  if (!id) return "";
  if (id === SEASON.current.id) return SEASON.current.display;
  const display = id === SEASON.previous.id ? SEASON.previous.display : id;
  return `${display} · final`;
}

// The season the LIVE stats exports currently hold. Before a rollover that's the last
// completed season; after scripts/season-rollover.js runs it becomes SEASON.current.
// Returns null if the tags disagree, which means a rollover didn't finish — verify.js
// fails on that rather than letting the UI guess.
export function liveSeasonId() {
  const ids = [...new Set(Object.values(SEASON_TAGS))];
  return ids.length === 1 ? ids[0] : null;
}

// How many games a club must have played before the current season's own numbers carry
// enough signal to lead with. Below this, stats surfaces show last season's completed data
// (clearly labelled) by default, with the current season one tap away.
export const EARLY_SEASON_GAMES = 5;

// Games played so far in the current season — DERIVED from results recorded against the
// fixture list, never hardcoded, so it advances on its own as results land. A fixture
// counts as played once it carries a `result: [home, away]` (same shape PREDICTOR_GW uses).
// Uses the highest count any single club has reached, i.e. "how deep into the season are
// we" — so one club with a postponed game can't hold the whole app in early-season mode.
export function currentSeasonGamesPlayed() {
  const played = {};
  for (const round of FIXTURES_2627) {
    for (const m of round.matches) {
      if (!Array.isArray(m.result)) continue;
      played[m.h] = (played[m.h] || 0) + 1;
      played[m.a] = (played[m.a] || 0) + 1;
    }
  }
  const counts = Object.values(played);
  return counts.length ? Math.max(...counts) : 0;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// "7 August", derived from SEASON.seasonStart so the strip copy can never drift from it.
export function seasonStartDisplay() {
  const d = new Date(`${SEASON.seasonStart}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTH_NAMES[d.getUTCMonth()]}`;
}

// Which season a stats surface should lead with, plus the early-season strip copy.
// Owner's call (5 Aug 2026): lead with the new season from now on, not gated on games
// played — `early`/`gamesPlayed` still drive the strip banner and NoSeasonData's copy, so a
// visitor opening 26/27 before results exist gets "kicks off 7 August" instead of a table
// that looks broken, but the SEASON toggle itself no longer waits for EARLY_SEASON_GAMES.
export function seasonStatus(now = Date.now()) {
  const gamesPlayed = currentSeasonGamesPlayed();
  const started = now >= Date.parse(`${SEASON.seasonStart}T00:00:00Z`);
  const early = gamesPlayed < EARLY_SEASON_GAMES;
  return {
    gamesPlayed,
    started,
    early,
    defaultSeason: SEASON.current.id,
    strip: started
      ? `${gamesPlayed} game${gamesPlayed === 1 ? "" : "s"} played — early days`
      : `${SEASON.current.display} starts ${seasonStartDisplay()}`,
  };
}

// ===== 26/27 BoyleSports Premiership fixtures (official, July 2026) =====
// All fixtures subject to change (broadcast selection + European involvement).
// Default kick-off 3pm Saturday unless a match specifies d (date) or t (time).
export const FIXTURES_2627 = [
  { round: 1, date: "Sat 8 Aug", matches: [
    { h: "CLI", a: "CRU", d: "Fri 7 Aug", t: "7.45pm" },
    { h: "LIN", a: "BAL" }, { h: "CAR", a: "POR" }, { h: "DUN", a: "COL" }, { h: "GLE", a: "LIM" },
    { h: "LAR", a: "BAN", d: "Tue 8 Sep" }, // rescheduled from Sun 9 Aug (NIFL, 27 Jul 2026)
  ]},
  { round: 2, date: "Sat 15 Aug", matches: [
    { h: "BAN", a: "CLI" }, { h: "COL", a: "LAR" }, { h: "CRU", a: "BAL" }, { h: "LIM", a: "CAR" }, { h: "LIN", a: "GLE" }, { h: "POR", a: "DUN" },
  ]},
  { round: 3, date: "Sat 22 Aug", matches: [
    { h: "LIN", a: "CLI", d: "Fri 21 Aug", t: "7.45pm" },
    { h: "BAL", a: "GLE" }, { h: "CAR", a: "COL" }, { h: "CRU", a: "POR" }, { h: "DUN", a: "BAN" }, { h: "LAR", a: "LIM" },
  ]},
  { round: 4, date: "Sat 29 Aug", matches: [
    { h: "BAL", a: "LAR" }, { h: "BAN", a: "CAR" }, { h: "CLI", a: "DUN" }, { h: "GLE", a: "CRU" }, { h: "LIM", a: "LIN" }, { h: "POR", a: "COL" },
  ]},
  { round: 5, date: "Sat 5 Sep", matches: [
    { h: "BAN", a: "BAL" }, { h: "CLI", a: "POR" }, { h: "COL", a: "CRU" }, { h: "LAR", a: "GLE" }, { h: "LIM", a: "DUN" }, { h: "LIN", a: "CAR" },
  ]},
  { round: 6, date: "Sat 12 Sep", matches: [
    { h: "CAR", a: "CLI" }, { h: "COL", a: "BAL" }, { h: "CRU", a: "LIM" }, { h: "DUN", a: "LIN" }, { h: "GLE", a: "BAN" }, { h: "POR", a: "LAR" },
  ]},
  { round: 7, date: "Tue 15 Sep", time: "7.45pm", matches: [
    { h: "BAL", a: "CAR" }, { h: "CRU", a: "DUN" }, { h: "GLE", a: "COL" }, { h: "LAR", a: "CLI" }, { h: "LIM", a: "BAN" }, { h: "POR", a: "LIN" },
  ]},
  { round: 8, date: "Sat 19 Sep", matches: [
    { h: "BAN", a: "POR" }, { h: "CAR", a: "LAR" }, { h: "CLI", a: "GLE" }, { h: "COL", a: "LIM" }, { h: "DUN", a: "BAL" }, { h: "LIN", a: "CRU" },
  ]},
  { round: 9, date: "Sat 26 Sep", matches: [
    { h: "BAL", a: "POR" }, { h: "COL", a: "LIN" }, { h: "CRU", a: "BAN" }, { h: "GLE", a: "CAR" }, { h: "LAR", a: "DUN" }, { h: "LIM", a: "CLI" },
  ]},
  { round: 10, date: "Sat 3 Oct", matches: [
    { h: "BAN", a: "COL" }, { h: "CAR", a: "CRU" }, { h: "CLI", a: "BAL" }, { h: "GLE", a: "DUN" }, { h: "LAR", a: "LIN" }, { h: "POR", a: "LIM" },
  ]},
  { round: 11, date: "Sat 10 Oct", matches: [
    { h: "COL", a: "CLI" }, { h: "CRU", a: "LAR" }, { h: "DUN", a: "CAR" }, { h: "LIM", a: "BAL" }, { h: "LIN", a: "BAN" }, { h: "POR", a: "GLE" },
  ]},
  { round: 12, date: "Sat 17 Oct", matches: [
    { h: "BAL", a: "CRU" }, { h: "BAN", a: "DUN" }, { h: "CAR", a: "LIN" }, { h: "CLI", a: "POR" }, { h: "GLE", a: "LIM" }, { h: "LAR", a: "COL" },
  ]},
  { round: 13, date: "Sat 24 Oct", matches: [
    { h: "BAN", a: "LAR" }, { h: "CAR", a: "LIM" }, { h: "CRU", a: "COL" }, { h: "DUN", a: "CLI" }, { h: "GLE", a: "BAL" }, { h: "POR", a: "LIN" },
  ]},
  { round: 14, date: "Sat 31 Oct", matches: [
    { h: "BAL", a: "BAN" }, { h: "CLI", a: "CAR" }, { h: "COL", a: "GLE" }, { h: "LAR", a: "POR" }, { h: "LIM", a: "CRU" }, { h: "LIN", a: "DUN" },
  ]},
  { round: 15, date: "Sat 7 Nov", matches: [
    { h: "BAN", a: "CRU" }, { h: "CAR", a: "GLE" }, { h: "CLI", a: "LAR" }, { h: "DUN", a: "LIM" }, { h: "LIN", a: "COL" }, { h: "POR", a: "BAL" },
  ]},
  { round: 16, date: "Fri 13 Nov", time: "7.45pm", matches: [
    { h: "BAL", a: "LIN" }, { h: "COL", a: "POR" }, { h: "CRU", a: "CAR" }, { h: "GLE", a: "BAN" }, { h: "LAR", a: "DUN" }, { h: "LIM", a: "CLI" },
  ]},
  { round: 17, date: "Sat 21 Nov", matches: [
    { h: "CAR", a: "COL" }, { h: "CLI", a: "GLE" }, { h: "DUN", a: "CRU" }, { h: "LAR", a: "BAL" }, { h: "LIN", a: "LIM" }, { h: "POR", a: "BAN" },
  ]},
  { round: 18, date: "Sat 28 Nov", matches: [
    { h: "BAL", a: "CLI" }, { h: "CAR", a: "BAN" }, { h: "COL", a: "DUN" }, { h: "CRU", a: "LIN" }, { h: "GLE", a: "LAR" }, { h: "LIM", a: "POR" },
  ]},
  { round: 19, date: "Sat 5 Dec", matches: [
    { h: "CAR", a: "BAL" }, { h: "CLI", a: "BAN" }, { h: "DUN", a: "GLE" }, { h: "LIM", a: "COL" }, { h: "LIN", a: "LAR" }, { h: "POR", a: "CRU" },
  ]},
  { round: 20, date: "Sat 12 Dec", matches: [
    { h: "BAL", a: "LIM" }, { h: "BAN", a: "LIN" }, { h: "CAR", a: "DUN" }, { h: "CLI", a: "COL" }, { h: "GLE", a: "POR" }, { h: "LAR", a: "CRU" },
  ]},
  { round: 21, date: "Sat 19 Dec", matches: [
    { h: "COL", a: "BAN" }, { h: "CRU", a: "GLE" }, { h: "DUN", a: "BAL" }, { h: "LIM", a: "LAR" }, { h: "LIN", a: "CLI" }, { h: "POR", a: "CAR" },
  ]},
  { round: 22, date: "Sat 26 Dec", matches: [
    { h: "BAN", a: "LIM" }, { h: "COL", a: "BAL" }, { h: "CRU", a: "CLI" }, { h: "DUN", a: "POR" }, { h: "GLE", a: "LIN" }, { h: "LAR", a: "CAR" },
  ]},
  { round: 23, date: "Tue 29 Dec", time: "7.45pm", matches: [
    { h: "BAL", a: "BAN" }, { h: "CAR", a: "GLE" }, { h: "CLI", a: "DUN" }, { h: "LIM", a: "CRU" }, { h: "LIN", a: "COL" }, { h: "POR", a: "LAR" },
  ]},
  { round: 24, date: "Sat 2 Jan", matches: [
    { h: "BAN", a: "POR" }, { h: "COL", a: "CAR" }, { h: "CRU", a: "LIN" }, { h: "DUN", a: "LIM" }, { h: "GLE", a: "CLI" }, { h: "LAR", a: "BAL" },
  ]},
  { round: 25, date: "Sat 16 Jan", matches: [
    { h: "BAL", a: "CLI" }, { h: "CAR", a: "BAN" }, { h: "CRU", a: "POR" }, { h: "DUN", a: "COL" }, { h: "GLE", a: "LAR" }, { h: "LIM", a: "LIN" },
  ]},
  { round: 26, date: "Sat 23 Jan", matches: [
    { h: "BAN", a: "DUN" }, { h: "CLI", a: "CAR" }, { h: "COL", a: "GLE" }, { h: "LAR", a: "CRU" }, { h: "BAL", a: "LIN" }, { h: "POR", a: "LIM" },
  ]},
  { round: 27, date: "Sat 30 Jan", matches: [
    { h: "CRU", a: "BAL" }, { h: "DUN", a: "CAR" }, { h: "LAR", a: "CLI" }, { h: "LIM", a: "COL" }, { h: "LIN", a: "BAN" }, { h: "POR", a: "GLE" },
  ]},
  { round: 28, date: "Sat 6 Feb", matches: [
    { h: "BAL", a: "POR" }, { h: "BAN", a: "LIM" }, { h: "CAR", a: "LAR" }, { h: "CLI", a: "LIN" }, { h: "COL", a: "CRU" }, { h: "GLE", a: "DUN" },
  ]},
  { round: 29, date: "Sat 20 Feb", matches: [
    { h: "BAL", a: "COL" }, { h: "BAN", a: "LAR" }, { h: "CRU", a: "CLI" }, { h: "LIM", a: "GLE" }, { h: "LIN", a: "CAR" }, { h: "POR", a: "DUN" },
  ]},
  { round: 30, date: "Sat 27 Feb", matches: [
    { h: "CAR", a: "BAL" }, { h: "CLI", a: "BAN" }, { h: "COL", a: "POR" }, { h: "DUN", a: "LIN" }, { h: "GLE", a: "CRU" }, { h: "LAR", a: "LIM" },
  ]},
  { round: 31, date: "Sat 6 Mar", matches: [
    { h: "BAL", a: "GLE" }, { h: "COL", a: "BAN" }, { h: "CRU", a: "DUN" }, { h: "LIM", a: "CAR" }, { h: "LIN", a: "LAR" }, { h: "POR", a: "CLI" },
  ]},
  { round: 32, date: "Sat 20 Mar", matches: [
    { h: "BAL", a: "DUN" }, { h: "BAN", a: "GLE" }, { h: "CAR", a: "CRU" }, { h: "CLI", a: "LIM" }, { h: "LAR", a: "COL" }, { h: "LIN", a: "POR" },
  ]},
  { round: 33, date: "Sat 27 Mar", matches: [
    { h: "COL", a: "CLI" }, { h: "CRU", a: "BAN" }, { h: "DUN", a: "LAR" }, { h: "GLE", a: "LIN" }, { h: "LIM", a: "BAL" }, { h: "POR", a: "CAR" },
  ]},
];
export const POST_SPLIT_DATES = ["Sat 3 Apr", "Sat 10 Apr", "Tue 13 Apr", "Sat 17 Apr", "Sat 24 Apr"];

// ===== v1.1 FULL TABLE SLOT =====
// When you have the verified final 25/26 table (screenshot the NIFL site or BBC
// and send it to Claude), fill this in and the Table tab upgrades automatically.
// Set to null to stay in season-review mode. Order = final positions 1-12.
// Shape per row: { club: "LAR", p: 38, w: 0, d: 0, l: 0, gd: 0, pts: 0, note: "C" }
// note codes: C, IC, E, EPO, PO, R — or omit for no badge.
export const FULL_TABLE = [
  { club: "LAR", p: 38, w: 25, d: 8, l: 5, gd: 47, pts: 83, note: "C" },
  { club: "COL", p: 38, w: 25, d: 5, l: 8, gd: 46, pts: 80, note: "IC" },
  { club: "GLE", p: 38, w: 23, d: 8, l: 7, gd: 35, pts: 77, note: "E" },
  { club: "LIN", p: 38, w: 19, d: 9, l: 10, gd: 28, pts: 66, note: "EPO" },
  { club: "CLI", p: 38, w: 15, d: 8, l: 15, gd: -4, pts: 53 },
  { club: "DUN", p: 38, w: 15, d: 1, l: 22, gd: -35, pts: 46 },
  { club: "CAR", p: 38, w: 15, d: 8, l: 15, gd: 6, pts: 53 },
  { club: "POR", p: 38, w: 13, d: 5, l: 20, gd: -22, pts: 44 },
  { club: "BAL", p: 38, w: 10, d: 9, l: 19, gd: -12, pts: 39 },
  { club: "BAN", p: 38, w: 10, d: 9, l: 19, gd: -24, pts: 39 },
  { club: "CRU", p: 38, w: 10, d: 6, l: 22, gd: -33, pts: 36, note: "PO" },
  { club: "GLV", p: 38, w: 8, d: 4, l: 26, gd: -32, pts: 28, note: "R" },
];
// Split-format quirk: Carrick (53 pts, +6) finished 7th despite matching Cliftonville's
// points, because the table splits into top-six and bottom-six after round 33.

// Final 25/26 placings — VERIFIED positions only (1st-4th, 11th, 12th confirmed by
// multiple sources). Mid-table final order arrives with the v1.1 archive import.
export const FINAL_PLACINGS = [
  { pos: 1, club: "LAR", note: "C" },
  { pos: 2, club: "COL", note: "IC" },
  { pos: 3, club: "GLE", note: "E" },
  { pos: 4, club: "LIN", note: "EPO" },
  { pos: 11, club: "CRU", note: "PO" },
  { pos: 12, club: "GLV", note: "R" },
];
// Alphabetical — finished 5th-10th, exact order pending archive import
export const MID_TABLE = [
  { club: "BAL" },
  { club: "BAN", tag: "Promoted this season" },
  { club: "CAR" },
  { club: "CLI" },
  { club: "DUN" },
  { club: "POR" },
];

// Radar axes: Shooting, Creation, Passing, Dribbling, Defending, Physical (0–100, demo)
export const PLAYERS = [
  { id: 1, name: "Pat Hoban", club: "GLE", pos: "ST", num: "", rating: 8.4, goals: 26, assists: 2, xg: 21.8, xa: 2.4, per90: { shots: 3.8, keyPasses: 1.0, dribbles: 0.6, tackles: 0.4 }, radar: [95, 52, 56, 46, 32, 84], form: [8.4, 7.6, 9.1, 8.0, 8.8, 7.5], shots: [{x:88,y:46,xg:.72,g:1},{x:84,y:54,xg:.35,g:1},{x:90,y:50,xg:.65,g:1},{x:79,y:42,xg:.14,g:0},{x:86,y:58,xg:.41,g:1},{x:92,y:48,xg:.78,g:0}] },
  { id: 2, name: "Matthew Fitzpatrick", club: "LIN", pos: "ST", num: "", rating: 7.8, goals: 19, assists: 6, xg: 14.6, xa: 4.9, per90: { shots: 3.1, keyPasses: 1.6, dribbles: 0.9, tackles: 0.6 }, radar: [86, 68, 64, 56, 38, 82], form: [7.8, 8.3, 7.5, 8.6, 7.9, 8.1], shots: [{x:85,y:50,xg:.48,g:1},{x:80,y:44,xg:.22,g:1},{x:88,y:56,xg:.60,g:0},{x:76,y:52,xg:.12,g:0},{x:87,y:47,xg:.52,g:1}] },
  { id: 3, name: "Fraser Bryden", club: "CRU", pos: "ST", num: "", rating: 8.1, goals: 22, assists: 0, xg: 15.2, xa: 1.1, per90: { shots: 3.4, keyPasses: 0.8, dribbles: 1.2, tackles: 0.4 }, radar: [88, 46, 54, 62, 30, 80], form: [7.6, 8.2, 7.1, 8.4, 7.8, 7.3], shots: [{x:86,y:48,xg:.55,g:1},{x:82,y:56,xg:.30,g:1},{x:90,y:52,xg:.70,g:0},{x:78,y:44,xg:.15,g:1}] },
  { id: 4, name: "Joel Cooper", club: "COL", pos: "LW", num: "", rating: 8.0, goals: 21, assists: 3, xg: 13.4, xa: 3.2, per90: { shots: 2.7, keyPasses: 2.2, dribbles: 2.5, tackles: 0.7 }, radar: [78, 76, 74, 88, 36, 68], form: [7.9, 8.2, 7.4, 8.5, 7.7, 8.0], shots: [{x:80,y:62,xg:.28,g:1},{x:84,y:56,xg:.42,g:0},{x:73,y:60,xg:.09,g:0},{x:86,y:50,xg:.51,g:1}] },
  { id: 5, name: "Eamon Fyfe", club: "POR", pos: "ST", num: "", rating: 7.3, goals: 13, assists: 5, xg: 10.1, xa: 4.2, per90: { shots: 2.6, keyPasses: 1.7, dribbles: 1.3, tackles: 0.5 }, radar: [78, 66, 62, 64, 36, 74], form: [7.4, 7.9, 7.2, 8.1, 7.6, 7.8], shots: [{x:83,y:48,xg:.40,g:1},{x:78,y:56,xg:.18,g:0},{x:87,y:52,xg:.56,g:1}] },
  { id: 6, name: "Matthew Shevlin", club: "COL", pos: "ST", num: "", rating: 7.9, goals: 20, assists: 2, xg: 12.0, xa: 2.0, per90: { shots: 2.9, keyPasses: 1.1, dribbles: 1.0, tackles: 0.5 }, radar: [82, 54, 58, 58, 34, 76], form: [7.7, 7.3, 8.1, 7.0, 7.9, 7.5], shots: [{x:84,y:50,xg:.45,g:1},{x:79,y:57,xg:.16,g:0},{x:88,y:53,xg:.62,g:1},{x:81,y:41,xg:.24,g:0}] },
  { id: 7, name: "Danny Gibson", club: "CAR", pos: "ST", num: "", rating: 7.8, goals: 19, assists: 3, xg: 10.4, xa: 2.6, per90: { shots: 2.5, keyPasses: 1.3, dribbles: 1.1, tackles: 0.6 }, radar: [78, 58, 56, 60, 36, 76], form: [7.2, 7.8, 7.4, 7.0, 8.0, 7.6], shots: [{x:82,y:52,xg:.36,g:1},{x:77,y:46,xg:.20,g:1},{x:86,y:55,xg:.50,g:0}] },
  { id: 8, name: "Paul Heatley", club: "CAR", pos: "LW", num: "", rating: 7.2, goals: 12, assists: 3, xg: 8.2, xa: 2.9, per90: { shots: 2.2, keyPasses: 1.8, dribbles: 2.0, tackles: 0.4 }, radar: [70, 68, 66, 82, 30, 58], form: [7.1, 7.6, 7.3, 7.8, 6.9, 7.4], shots: [{x:79,y:60,xg:.24,g:1},{x:84,y:54,xg:.38,g:0},{x:74,y:58,xg:.10,g:1}] },
  { id: 9, name: "Will Patching", club: "COL", pos: "CM", num: "", rating: 7.3, goals: 12, assists: 5, xg: 6.4, xa: 4.6, per90: { shots: 2.0, keyPasses: 2.5, dribbles: 1.4, tackles: 1.5 }, radar: [64, 82, 84, 68, 54, 64], form: [7.5, 7.1, 7.8, 7.3, 7.6, 7.2], shots: [{x:75,y:50,xg:.12,g:0},{x:81,y:46,xg:.28,g:1},{x:71,y:56,xg:.07,g:1}] },
  { id: 10, name: "Peter Campbell", club: "GLV", pos: "LW", num: "", rating: 7.4, goals: 2, assists: 11, xg: 3.1, xa: 8.8, per90: { shots: 1.4, keyPasses: 3.0, dribbles: 2.1, tackles: 0.6 }, radar: [50, 90, 76, 80, 34, 62], form: [7.3, 7.8, 7.1, 7.9, 7.4, 7.6], shots: [{x:76,y:58,xg:.14,g:0},{x:82,y:52,xg:.26,g:1},{x:72,y:62,xg:.06,g:0}] },
  { id: 11, name: "Andy Ryan", club: "LAR", pos: "ST", num: "", rating: 7.5, goals: 16, assists: 1, xg: 9.6, xa: 1.3, per90: { shots: 2.8, keyPasses: 1.0, dribbles: 1.4, tackles: 0.4 }, radar: [80, 52, 60, 70, 28, 74], form: [7.0, 7.6, 6.8, 7.7, 7.9, 7.1], shots: [{x:85,y:50,xg:.50,g:1},{x:80,y:44,xg:.24,g:0},{x:89,y:55,xg:.66,g:1}] },
];

export const AXES = ["Shooting", "Creation", "Passing", "Dribbling", "Defending", "Physical"];

// Summer 2026 window tracker — real, sourced stories. Update as fresh news breaks.
// from/to use a NIFL club code, OR fromExternal/toExternal for clubs outside the league.
export const TRANSFERS = [
  { id: 48, date: "Jul", player: "Cormac Austin", from: "LAR", toExternal: "UNC Wilmington Seahawks", status: "departure", note: "Defensive midfielder leaves Larne for US college soccer with UNC Wilmington." },
  { id: 47, date: "Jul", player: "Matthew Beattie", fromExternal: "Crusaders U18", to: "CRU", status: "done", note: "Central midfielder steps up from the Crusaders U18s to the first-team squad." },
  { id: 46, date: "Jul", player: "Jeremi Rodríguez", fromExternal: "UD San Fernando", to: "BAN", status: "done", note: "Jeremi Rodríguez joins Bangor from Spanish side UD San Fernando on a free, following a spell in the US." },
  { id: 45, date: "Jul", player: "Ali Gould", from: "BAL", toExternal: "Stirling Albion", status: "departure", note: "Centre-back leaves Ballymena United for Scottish side Stirling Albion, on a free." },
  { id: 44, date: "Jul", player: "Eoghan McCawl", from: "CAR", toExternal: "Dundela", status: "departure", note: "Attacking midfielder leaves Carrick Rangers for Dundela on a free." },
  { id: 42, date: "Jul", player: "Fraser Bryden", from: "CRU", toExternal: "Chesterfield", status: "departure", note: "Bryden makes the move to the EFL — the forward leaves Seaview for Chesterfield. Fee undisclosed." },
  { id: 41, date: "Jul", player: "Conor Falls", from: "CLI", to: "POR", status: "done", note: "Centre-forward swaps Solitude for Shamrock Park. Fee undisclosed." },
  { id: 40, date: "Jul", player: "Liam Jessop", fromExternal: "Chesterfield", to: "POR", status: "done", note: "Left winger joins Portadown on a free from Chesterfield." },
  { id: 39, date: "Jul", player: "Dominic Martins", fromExternal: "Blyth Town", to: "POR", status: "done", note: "Defensive midfielder joins Portadown on a free from Blyth Town." },
  { id: 38, date: "Jul", player: "Michael Leetch", fromExternal: "Ballyclare", to: "BAL", status: "done", note: "Right winger steps up to the Premiership with Ballymena United. Fee undisclosed." },
  { id: 37, date: "Jul", player: "David Taylor", from: "BAL", toExternal: "Ballyclare", status: "departure", note: "Centre-forward leaves Ballymena United for Ballyclare. Fee undisclosed." },
  { id: 36, date: "Jul", player: "Dean Ebbe", from: "BAL", toExternal: "Lucan United", status: "departure", note: "Centre-forward departs Ballymena United on a free, joining Lucan United." },
  { id: 35, date: "Jul", player: "Patrick McEleney", from: "BAL", toExternal: "Retired", status: "departure", note: "The attacking midfielder calls time on his career after leaving Ballymena United." },
  { id: 34, date: "Jul", player: "Lorcan Donnelly", from: "GLE", toExternal: "Glenavon (loan)", status: "departure", note: "Goalkeeper heads to Glenavon on loan for first-team minutes." },
  { id: 33, date: "Jul", player: "Jude Johnson", from: "GLE", toExternal: "Glenavon (loan)", status: "departure", note: "Left winger joins Glenavon on loan — the second young Glen to make the move." },
  { id: 32, date: "Jul", player: "Reece Bell & Jack Faloona", fromExternal: "Glentoran U18", to: "GLE", status: "done", note: "Two defensive midfielders promoted from the U18s to the Glentoran first-team squad." },
  { id: 30, date: "23 Jul", player: "Ollie Samuels", fromExternal: "Middlesbrough", to: "CLI", status: "done", note: "Left-back joins Cliftonville on loan from Middlesbrough." },
  { id: 29, date: "23 Jul", player: "Ryan McKay", from: "LIN", to: "CRU", status: "done", note: "Left-back moves to Seaview on loan from Linfield." },
  { id: 28, date: "23 Jul", player: "Shea Callister", fromExternal: "Derry City", to: "CRU", status: "done", note: "Goalkeeper joins Crusaders on loan from Derry City." },
  { id: 21, date: "18 Jul", player: "Conrad Hunt", fromExternal: "Watford", to: "COL", status: "done", note: "Right-back arrives at Coleraine on loan from Watford — Championship pedigree for the Bannsiders' European campaign." },
  { id: 22, date: "18 Jul", player: "Caoimhin McConnell", fromExternal: "Bryant Bulldogs", to: "BAL", status: "done", note: "Attacking midfielder joins Ballymena United on a free from the Bryant Bulldogs — the rebuild rolls on at the Showgrounds." },
  { id: 23, date: "18 Jul", player: "Dean McMaster", fromExternal: "Airdrieonians", to: "CLI", status: "done", note: "Defensive midfielder joins Cliftonville on a free from Airdrieonians." },
  { id: 24, date: "18 Jul", player: "Alex Bannon", fromExternal: "Burton Albion", to: "CLI", status: "done", note: "Centre-back arrives at Solitude on a free from Burton Albion — the Reds double up on new recruits in one window." },
  { id: 25, date: "18 Jul", player: "Callum McCay", from: "CLI", toExternal: "Moyola Park", status: "departure", note: "Defensive midfielder leaves Cliftonville for Moyola Park on a free." },
  { id: 26, date: "18 Jul", player: "Ethan Boyle", from: "CAR", toExternal: "CK United", status: "departure", note: "Right-back departs Carrick Rangers for CK United on a free." },
  { id: 27, date: "18 Jul", player: "James Knowles", from: "DUN", toExternal: "Retired", status: "departure", note: "Central midfielder hangs up the boots after leaving Dungannon Swifts." },
  { id: 20, date: "10 Jul", player: "Alfie Gaston", from: "COL", to: "LIM", status: "done", note: "Back to where he won it: Gaston returns to Limavady on a season loan after playing a key part in their Championship title. Smart move all round — the newly promoted side get a player who knows the club, Coleraine get him first-team minutes." },
  { id: 17, date: "10 Jul", player: "Zeno Ibsen Rossi & Rhys Walsh", fromExternal: "Free transfers", to: "GLE", status: "done", note: "The Glens' new arrivals confirmed on Transfermarkt — and Ibsen Rossi wasted no time, heading the opener against RFS in his first European start. Walsh arrives from Sunderland." },
  { id: 18, date: "10 Jul", player: "Owen Mahoney", from: "LAR", to: "BAL", status: "done", note: "Ballymena's rebuild continues — the midfielder becomes signing number nine, this time raiding the champions." },
  { id: 19, date: "10 Jul", player: "Jamie McGonigle", from: "COL", toExternal: "Sligo Rovers (loan)", status: "departure", note: "Correction to earlier window news: McGonigle heads OUT on loan to Sligo — with Coleraine's front line already stacked after the summer's triple swoop." },
  { id: 1, date: "5 Jul", player: "Kevin O'Hara", fromExternal: "Hamilton Academical", to: "LAR", status: "done", note: "CONFIRMED. 38 goals in 130 for Hamilton, plus 11 assists last season. Turned down a new deal and Scottish Championship interest — in the squad for Tuesday's Tre Fiori tie, pending international clearance." },
  { id: 2, date: "Jul", player: "Andy Ryan", from: "LAR", toExternal: "Hamilton Academical", status: "departure", note: "End of an era at Inver Park: 59 goals in 95 league games, three titles in four seasons, and a hat-trick in the famous Lincoln Red Imps win. Returns to Scotland as O'Hara fills his boots." },
  { id: 3, date: "Jul", player: "McMenamin, Henderson & Doherty", fromExternal: "Triple swoop", to: "COL", status: "done", note: "Coleraine mean business: NI international Conor McMenamin arrives from St Mirren, Jay Henderson from Ross County, and Ben Doherty returns from Derry City." },
  { id: 4, date: "Jul", player: "McClelland, Ukek & Gibson", fromExternal: "Window roundup", to: "LAR", status: "done", note: "The champions reload: Josh Ukek arrives from Portadown, Montel Gibson from Hednesford, and Sam McClelland returns from a career break — all ahead of the Champions League campaign." },
  { id: 5, date: "Reported", player: "Ryan Nolan", from: "LAR", to: "LIN", status: "done", note: "Linfield secure the centre-back on a permanent deal after his form at Larne." },
  { id: 6, date: "Jul", player: "Jordan Hastings", from: "LAR", to: "CAR", status: "done", note: "Young striker signs a two-year deal, reuniting with Stephen Baxter after a loan spell: \"Stephen is one of the main reasons why I have gone back.\"" },
  { id: 7, date: "Jul", player: "Josh Kee", from: "LAR", toExternal: "H&W Welders", status: "departure", note: "Midfielder returns to the Welders — managed by his father Paul — after 18 months at Inver Park." },
  { id: 8, date: "12 May", player: "Sam Taylor", fromExternal: "Tranmere Rovers", to: "LIN", status: "rumour", note: "Winger's Linfield loan from Tranmere ends as Tranmere release him — the Blues are favourites to make the move permanent." },
  { id: 9, date: "Jul", player: "Greg Sloggett", fromExternal: "Boston United", to: "GLE", status: "done", note: "Experienced midfielder adds steel to the Glens' engine room ahead of the RFS tie." },
  { id: 10, date: "Jul", player: "Sean O'Mahoney", fromExternal: "St Francis", to: "POR", status: "done", note: "Striker joins the Ports for the new campaign." },
  { id: 11, date: "Jul", player: "Dan O'Connor", fromExternal: "AFC Totton", to: "CLI", status: "done", note: "Centre-back on a free bolsters the Reds' back line." },
  { id: 12, date: "Jul", player: "McRoberts & McCullough", fromExternal: "Bangor double", to: "BAN", status: "done", note: "The Seasiders build for survival: striker Lucas McRoberts from Ayr United and left-back Steven McCullough from Portadown." },
  { id: 13, date: "Jul", player: "Daire O'Connor", from: "BAL", to: "CAR", status: "done", note: "Winger makes the short move from the Braidmen to Taylors Avenue." },
  { id: 14, date: "Jul", player: "Dylan Connolly", from: "GLE", toExternal: "Galway United", status: "departure", note: "Winger heads south of the border to the League of Ireland." },
  { id: 15, date: "Jul", player: "Allen, Archer, Whiteside, McKee & Walsh", from: "LIN", to: "BAL", status: "done", note: "The window's biggest story nobody's talking about: Ballymena sign FIVE players from Linfield in one summer. A full-scale raid on Windsor Park's fringes." },
  { id: 16, date: "Jul", player: "Kofi Moore", from: "LAR", to: "LIN", status: "done", note: "Linfield double-dip at the champions: Moore follows Ryan Nolan from Inver Park to Windsor." },
  { id: 43, date: "Jul", player: "Jonny Tuffey", from: "CRU", toExternal: "Retired", status: "departure", note: "The veteran goalkeeper hangs up the gloves after a long Irish League career. Josh Owens also retires at Seaview." },
];
export const STATUS_META = {
  done: { label: "Done deal", color: "#3DDC84" },
  rumour: { label: "Rumour", color: "#FFB627" },
  contract: { label: "New contract", color: "#5EC8F2" },
  departure: { label: "Departure", color: "#E05252" },
};

// ===== History =====
export const ROLL_OF_HONOUR = [
  { season: "2025/26", club: "LAR", note: "3rd title in 4 seasons" },
  { season: "2024/25", club: "LIN" },
  { season: "2023/24", club: "LAR" },
  { season: "2022/23", club: "LAR", note: "First ever title" },
  { season: "2021/22", club: "LIN" },
  { season: "2020/21", club: "LIN" },
  { season: "2019/20", club: "LIN" },
  { season: "2018/19", club: "LIN" },
  { season: "2017/18", club: "CRU" },
  { season: "2016/17", club: "LIN" },
  { season: "2015/16", club: "CRU" },
  { season: "2014/15", club: "CRU" },
];

export const ALL_TIME_TITLES = [
  { club: "LIN", titles: 57 },
  { club: "GLE", titles: 23 },
  { club: "CRU", titles: 7 },
  { club: "CLI", titles: 5 },
  { club: "POR", titles: 4 },
  { club: "GLV", titles: 3 },
  { club: "LAR", titles: 3 },
  { club: "COL", titles: 1 },
];

export const RECORDS = [
  { big: "1890", label: "League founded", sub: "One of the oldest national leagues in world football — the Gibson Cup its prize" },
  { big: "57", label: "Linfield league titles", sub: "A world record haul \u2014 no club anywhere has won more national championships" },
  { big: "26", label: "Pat Hoban's golden boot", sub: "Top scorer of the 2025/26 season for Glentoran — four of them penalties" },
  { big: "2023", label: "Larne's breakthrough", sub: "The Inver Reds became the league's first brand-new champions in a generation" },
  { big: "80", label: "Big Two dominance", sub: "Linfield and Glentoran own 80 of the 125 league titles ever contested" },
  { big: "24/25", label: "Larne make Euro history", sub: "First Irish League club ever to reach the league phase of a European competition" },
  { big: "0-0", label: "Charity Shield 2026", sub: "Larne beat Coleraine on penalties in the curtain-raiser \u2014 the new season's first silverware" },
  { big: "10", label: "Linfield Premiership titles", sub: "Most top-flight titles won under the Premiership era format \u2014 separate from their 57 all-time league titles. League records." },
  { big: "759", label: "Jamie Mulgrew \u2014 record Premiership appearances", sub: "The most Premiership appearances by any player in Irish League history. League records." },
  { big: "215", label: "Joe Gormley \u2014 record Premiership scorer", sub: "The most goals scored by any player in the Premiership era. League records." },
  { big: "191,138", label: "Total Premiership attendance 25/26", sub: "Averaging 1,241 fans per match across the season. Sofascore." },
];

// Season-wide attendance figures \u2014 raw structured data (kept separate from the
// RECORDS display tiles above, which summarise it for the History tab).
export const ATTENDANCE_2526 = { total: 191138, average: 1241, source: "Sofascore" };

// League lore \u2014 verified one-off facts, owner-curated (July 2026)
export const LEAGUE_LORE = [
  {
    id: "split-quirk",
    title: "Seventh with 53 points",
    fact: "Carrick Rangers finished 7th in 2025/26 with 53 points \u2014 seven more than 6th-place Dungannon Swifts on 46, and level with 5th-place Cliftonville. The split had locked them into the bottom six, and no points total could get them out.",
    source: "NIFL Premiership final table, 2025/26",
  },
  {
    id: "penalty-kick",
    title: "Armagh invented the penalty",
    fact: "The penalty kick was invented by William McCrum, a goalkeeper for Milford in County Armagh during the Irish League's first season. He proposed it in 1890, and the game's lawmakers passed it into the Laws in 1891 \u2014 every spot kick ever taken traces back to this league.",
    source: "Irish FA / IFAB historical record",
  },
  {
    id: "away-goals-first",
    title: "First out on away goals",
    fact: "Glentoran became the first club in football history eliminated by the away-goals rule, after drawing 1-1 at home and 0-0 away against Benfica in the 1967 European Cup. Benfica went all the way to the final.",
    source: "European Cup records, 1967/68",
  },
  {
    id: "belfast-celtic",
    title: "Quit the league, beat Scotland",
    fact: "Belfast Celtic resigned from the league in April 1949 \u2014 then beat Scotland 2-0 in New York that May, one of the great forgotten results in Irish football. Their old ground, Celtic Park, is now a shopping centre.",
    source: "Belfast Celtic historical record",
  },
  {
    id: "linfield-57",
    title: "A world record in blue",
    fact: "Linfield's 57 league titles are a world record \u2014 no club in any country has won more national championships. Their 1921/22 campaign remains the only seven-trophy season in football history.",
    source: "Linfield FC honours record",
  },
  {
    id: "founded-1890",
    title: "Older than Scotland's",
    fact: "The Irish League was founded in 1890, a week before Scotland's \u2014 making it the second-oldest national league on earth. Only England's Football League predates it.",
    source: "League historical record, 1890",
  },
];

// ===== The Predictor =====
// Scoring: exact score = 3 pts, correct result = 1 pt.
// When results are known, fill in `result: [home, away]` on each fixture and redeploy —
// saved predictions on each player's device are scored automatically.
export const PREDICTOR_GW = {
  id: "prem-round-1",
  name: "Round 1 · BoyleSports Premiership",
  deadline: "Cliftonville v Crusaders Fri 7.45pm · rest Sat 3pm",
  fixtures: [
    { id: "f1", home: { club: "CLI" }, away: { club: "CRU" }, comp: "Round 1 · Solitude · Fri 7 Aug, 7.45pm", result: null, odds: { home: 1.7, draw: 3.6, away: 5.0 } },
    { id: "f2", home: { club: "LIN" }, away: { club: "BAL" }, comp: "Round 1 · Windsor Park · Sat 8 Aug, 3pm", result: null, odds: { home: 1.5, draw: 4.0, away: 6.5 } },
    { id: "f3", home: { club: "CAR" }, away: { club: "POR" }, comp: "Round 1 · Loughview Leisure · Sat 8 Aug, 3pm", result: null, odds: { home: 2.0, draw: 3.3, away: 3.6 } },
    { id: "f4", home: { club: "DUN" }, away: { club: "COL" }, comp: "Round 1 · Stangmore Park · Sat 8 Aug, 3pm", result: null, odds: { home: 4.0, draw: 3.6, away: 1.85 } },
    { id: "f5", home: { club: "GLE" }, away: { club: "LIM" }, comp: "Round 1 · The Oval · Sat 8 Aug, 3pm", result: null, odds: { home: 1.4, draw: 4.5, away: 7.5 } },
  ],
};
// Larne v Bangor (originally round 1) was rescheduled to Tue 8 Sep — see FIXTURES_2627 —
// so it isn't part of this gameweek; it'll appear in whichever Predictor round covers that date.
// Odds above are GIBSON estimates derived from each club's final league position last season
// (FULL_TABLE) — not sourced from a bookmaker. Never add a bookmaker name/logo/link here.

// Safe storage wrapper — works on the live site, degrades gracefully elsewhere
export const store = {
  get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch {} },
};


// Josh's live Ko-fi page
export const KOFI_URL = "https://ko-fi.com/gibson575";

// GIBSON social accounts — linked from the app header
export const SOCIALS = {
  x: { handle: "@GibsonStats", url: "https://x.com/GibsonStats" },
  tiktok: { handle: "@gibsonstats", url: "https://www.tiktok.com/@gibsonstats" },
};


// Squad market values 26/27 — Transfermarkt, July 2026 (verified via screenshots)
export const MARKET_VALUES = [
  { club: "LAR", squad: 26, total: 3.53 },
  { club: "COL", squad: 27, total: 3.00 },
  { club: "DUN", squad: 29, total: 2.71 },
  { club: "GLE", squad: 30, total: 2.66 },
  { club: "LIN", squad: 21, total: 2.53 },
  { club: "BAL", squad: 25, total: 2.41 },
  { club: "BAN", squad: 24, total: 2.15 },
  { club: "CLI", squad: 25, total: 2.11 },
  { club: "CRU", squad: 28, total: 1.75 },
  { club: "CAR", squad: 23, total: 1.70 },
  { club: "POR", squad: 23, total: 1.61 },
  { club: "LIM", squad: 24, total: 0.33 },
];
export const LEAGUE_FACTS = {
  totalValue: "\u20ac26.46m", players: 305, foreigners: "30.2%", avgAge: "25.9",
  mvp: "Rohan Ferguson (Larne) \u00b7 \u20ac300k",
};

// Treatment table — current injuries (Transfermarkt, July 2026)
export const INJURIES = [
  { player: "Joel Cooper", club: "COL", injury: "Knee surgery" },
  { player: "James Akintunde", club: "COL", injury: "Broken ankle" },
  { player: "Kyle McClelland", club: "CLI", injury: "Broken toe" },
  { player: "Adebayo Fapetu", club: "CLI", injury: "Surgery" },
  { player: "Aaron McCarey", club: "POR", injury: "Knee surgery" },
  { player: "Seanan Clucas", club: "CAR", injury: "Knee surgery" },
  { player: "Ethan Boyle", club: "CAR", injury: "Knee surgery" },
  { player: "Nedas Maciulaitis", club: "CAR", injury: "Knee injury" },
  { player: "Steven McCullough", club: "BAN", injury: "Foot injury" },
  { player: "Patrick Solis Grogan", club: "DUN", injury: "Knock" },
  { player: "Graham Kelly", club: "LAR", injury: "Achilles tendon" },
];


// 25/26 team numbers — AiScore (verified via screenshots, Jul 2026)
export const TEAM_STATS_2526 = [
  { club: "COL", goals: 83, poss: 54.79 },
  { club: "GLE", goals: 73, poss: 53.71 },
  { club: "LAR", goals: 73, poss: 51.5 },
  { club: "CAR", goals: 65, poss: 47.69 },
  { club: "LIN", goals: 64, poss: 52.03 },
  { club: "CLI", goals: 56, poss: 48.03 },
  { club: "CRU", goals: 48, poss: 47.13 },
  { club: "DUN", goals: 48, poss: 50.49 },
  { club: "BAL", goals: 46, poss: 49.76 },
  { club: "POR", goals: 44, poss: 46.95 },
  { club: "BAN", goals: 41, poss: 45.55 },
  { club: "GLV", goals: 37, poss: 47.13 },
];

// 25/26 discipline leaders — AiScore (verified via screenshots, Jul 2026)
export const DISCIPLINE = {
  yellows: [
    { player: "Baris Altintop", club: "POR", n: 10 },
    { player: "Ben Hall", club: "LIN", n: 10 },
    { player: "Lewis Harrison", club: "BAN", n: 10 },
    { player: "Matthew Clarke", club: "BAL", n: 9 },
    { player: "James Singleton", club: "GLE", n: 9 },
    { player: "Chris Gallagher", club: "LAR", n: 9 },
  ],
  reds: [
    { player: "Dan Bent", club: "LAR", n: 2 },
    { player: "Rory Hale", club: "CLI", n: 2 },
    { player: "Lewis Harrison", club: "BAN", n: 2 },
    { player: "Shay McCartan", club: "POR", n: 2 },
    { player: "Oisin Devlin", club: "BAN", n: 2 },
  ],
};


// Full summer 2026 window, club by club — Transfermarkt (verified via screenshots, Jul 2026),
// cross-checked against BBC Sport's club-by-club window roundup (screenshots, 5 Aug 2026),
// which added entries Transfermarkt's screenshots didn't cover. Compiled from public data;
// may not be exhaustive. Format: [player, from/to club name]. Where BBC named a departure/
// arrival with no club given, that's recorded honestly as "destination/source club not
// stated" rather than guessed.
export const WINDOW = [
  { club: "LAR",
    ins: [["Josh Ukek", "Portadown"], ["Montel Gibson", "Hednesford"], ["Kevin O'Hara", "Hamilton Acad."], ["Sam McClelland", "Return from career break"]],
    outs: [["Andy Ryan", "Hamilton Acad."], ["Kofi Moore", "Linfield"], ["Ryan Nolan", "Linfield"], ["Jordan Hastings", "Carrick Rangers"], ["Josh Kee", "HW Welders"], ["Owen Mahoney", "Ballymena United"], ["C. Bolger", "Without club"], ["Cormac Austin", "UNC Wilmington Seahawks"], ["Logan Graham", "destination not stated"]] },
  { club: "LIN",
    ins: [["Ryan Nolan", "Larne"], ["Kofi Moore", "Larne"], ["Dylan Wells", "source club not stated"], ["Aidan Galvin", "source club not stated"]],
    outs: [["C. Allen", "Ballymena United"], ["J. Archer", "Ballymena United"], ["S. Whiteside", "Ballymena United"], ["C. McKee", "Ballymena United"], ["D. Walsh", "Ballymena United"], ["Ryan McKay", "Crusaders (loan)"], ["Matt Yates", "destination not stated"], ["Cameron Ballantyne", "destination not stated"], ["Alejandro Gorrin", "Retired"], ["Robbie McDaid", "destination not stated"], ["Euan East", "destination not stated"]] },
  { club: "GLE",
    ins: [["Greg Sloggett", "Boston United"], ["Zeno Ibsen Rossi", "Free agent (ex-Cliftonville)"], ["Rhys Walsh", "Sunderland"], ["Reece Bell", "Glentoran U18"], ["Jack Faloona", "Glentoran U18"]],
    outs: [["D. Amos", "Barrow"], ["Dylan Connolly", "Galway United"], ["A. Wightman", "Cliftonville"], ["C. Farley", "Warrenpoint"], ["C. Coll", "Strabane AFC"], ["C. Palmer", "Livingston"], ["Cillian McCann", "Newington"], ["Jude Johnson", "Glenavon (loan)"], ["Lorcan Donnelly", "Glenavon (loan)"]] },
  { club: "COL",
    ins: [["Jay Henderson", "Ross County"], ["Aidan Wilson", "Airdrieonians"], ["Ben Doherty", "Derry City"], ["Conor McMenamin", "St Mirren"], ["T. Brolly", "Loan return (Institute)"], ["C. McGrath", "Loan return (Moyola Park)"], ["Conrad Hunt", "Watford (loan)"]],
    outs: [["J. Glackin", "Dungannon"], ["S. Fallon", "Ballymena United"], ["G. Kelly", "Crusaders"], ["A. Tejada", "Moyola Park"], ["Jamie McGonigle", "Sligo Rovers (loan)"], ["Alfie Gaston", "Limavady United (loan)"], ["Mark Connolly", "Retired"]] },
  { club: "CRU",
    ins: [["A. Reid", "Airdrieonians"], ["G. Kelly", "Coleraine"], ["T. Maguire", "Dungannon"], ["O. Wardell", "FK Be1"], ["Shea Callister", "Derry City (loan)"], ["Ryan McKay", "Linfield (loan)"], ["Matthew Beattie", "Crusaders U18"]],
    outs: [["J. Forsythe", "Carrick Rangers"], ["Odhr\u00e1n McCart", "Moyola Park"], ["B. Hamilton", "Moyola Park"], ["Josh Owens", "Retired"], ["Jonny Tuffey", "Retired"], ["Musa Dibaga", "Dunfermline (fee undisclosed)"], ["Fraser Bryden", "Chesterfield"]] },
  { club: "CLI",
    ins: [["Ben Quinn", "Portadown"], ["A. Wightman", "Glentoran"], ["K. McClelland", "Glenavon"], ["Dan O'Connor", "AFC Totton"], ["J. Thompson", "Ballymena United"], ["Ollie Samuels", "Middlesbrough (loan)"], ["Dean McMaster", "Airdrieonians"], ["Alex Bannon", "Burton Albion"]],
    outs: [["M. Glynn", "Ballymena United"], ["J. Addis", "Ballymena United"], ["R. Jordan", "Loughgall"], ["S. Robertson", "Torquay"], ["A. Carroll", "Warrenpoint"], ["C. Pepper", "Retired"], ["Conor Falls", "Portadown"], ["Callum McCay", "Moyola Park"], ["Oisin Murray", "destination not stated"], ["Shea McGarry", "destination not stated"]] },
  { club: "DUN",
    ins: [["M. McElhatton", "Dergview"], ["J. Glackin", "Coleraine"], ["B. McKeown", "Glenavon"], ["Kris Lowe", "Glenavon"], ["R. Devlin", "Dungannon U18"], ["T. Connolly", "Loan return (Ballinamallard)"]],
    outs: [["K. Ximenes", "Oxford SFC"], ["T. Taggert", "Oxford SFC"], ["O. Crowe", "Annagh United"], ["Leon Boyd", "Limavady United"], ["C. Marron", "Newry City"], ["T. Maguire", "Crusaders"], ["J. Knowles", "Without club"], ["Daniel McCarron", "destination not stated"], ["Mal Smith", "destination not stated"]] },
  { club: "BAL",
    ins: [["C. Allen", "Linfield"], ["J. Archer", "Linfield"], ["S. Whiteside", "Linfield"], ["C. McKee", "Linfield"], ["D. Walsh", "Linfield"], ["J. Addis", "Cliftonville"], ["M. Glynn", "Cliftonville"], ["S. Fallon", "Coleraine"], ["Owen Mahoney", "Larne"], ["Michael Leetch", "Ballyclare"], ["Caoimhin McConnell", "Bryant Bulldogs"]],
    outs: [["R. McNickle", "Annagh United"], ["L. Tennant", "Portstewart"], ["S. McAuley", "Chimney Corner"], ["C. Loughran", "Portstewart"], ["A. Gawne", "Portstewart"], ["A. Jarvis", "Limavady United"], ["S. O'Donnell", "Limavady United"], ["D. Lafferty", "Limavady United"], ["Daire O'Connor", "Carrick Rangers"], ["J. Thompson", "Cliftonville"], ["Dylan McGeouch", "Gretna FC 2008"], ["Patrick McEleney", "Retired"], ["Dean Ebbe", "Lucan United"], ["David Taylor", "Ballyclare"], ["Ali Gould", "Stirling Albion"], ["Brad Wade", "destination not stated"], ["Kian Corbally", "destination not stated"], ["Jack O'Reilly", "destination not stated"], ["Calvin McCurry", "destination not stated"]] },
  { club: "CAR",
    ins: [["J. Forsythe", "Crusaders"], ["Jordan Hastings", "Larne"], ["Daire O'Connor", "Ballymena United"]],
    outs: [["Luke McCullough (loan info n/a)", "Matlock"], ["Ethan Boyle", "CK United"], ["Eoghan McCawl", "Dundela"], ["Ryan Waide", "destination not stated"], ["Reece Glendinning", "destination not stated"], ["Cameron Stewart", "Retired"], ["Matthew Olosunde", "destination not stated"], ["Keke Jeffers", "destination not stated"], ["Joshua Andrews", "destination not stated"]] },
  { club: "POR",
    ins: [["M. Carson", "Torquay"], ["R. Breen", "East Kilbride"], ["Mikey Hewitt", "Queen of the South"], ["Sean O'Mahoney", "St Francis"], ["Conor Falls", "Cliftonville"], ["Liam Jessop", "Chesterfield"], ["Dominic Martins", "Blyth Town"]],
    outs: [["Ben Quinn", "Cliftonville"], ["Josh Ukek", "Larne"], ["Zach Cowan", "Oxford SFC"], ["Steven McCullough", "Bangor"], ["J. Gibson", "Without club"], ["Shay McCartan", "Without club"], ["Josh Carson", "Retired"], ["Gideon Tetteh", "Wexford FC"]] },
  { club: "BAN",
    ins: [["Lucas McRoberts", "Ayr United"], ["Steven McCullough", "Portadown"], ["Jeremi Rodríguez", "UD San Fernando"]],
    outs: [["Ben Walker", "destination not stated"], ["Lee Axworthy", "destination not stated"], ["Kyle Owens", "destination not stated"], ["Mark Haughey", "destination not stated"], ["Michael Halliday", "Retired"], ["Robert Garrett", "Retired"]] },
  { club: "LIM",
    ins: [["A. Jarvis", "Ballymena United"], ["S. O'Donnell", "Ballymena United"], ["D. Lafferty", "Ballymena United"], ["R. Wilson", "HW Welders"], ["O. Duffy", "Strabane AFC"], ["Leon Boyd", "Dungannon"], ["S. McClintock", "Loan return (Strabane)"], ["Alfie Gaston", "Coleraine (loan)"], ["Sean Carlin", "source club not stated"]],
    outs: [["B. Baird", "Heights FC"], ["I. Parkhill", "Heights FC"], ["M. Kennedy", "Institute"], ["S. McClintock", "Strabane AFC (loan)"]] },
];


// 25/26 match goals profile per club — verified via screenshots, Jul 2026.
// avg = goals per game in their matches; o25 = % over 2.5 goals; bts = both teams scored %;
// cs = clean sheet %; htAvg = avg goals at half-time in their matches.
export const GOALS_STATS = [
  { club: "CRU", avg: 3.39, o25: 63, bts: 50, cs: 16, htAvg: 1.53 },
  { club: "CAR", avg: 3.21, o25: 61, bts: 66, cs: 21, htAvg: 1.66 },
  { club: "COL", avg: 3.16, o25: 61, bts: 58, cs: 34, htAvg: 1.39 },
  { club: "DUN", avg: 3.13, o25: 55, bts: 39, cs: 24, htAvg: 1.61 },
  { club: "CLI", avg: 3.00, o25: 58, bts: 58, cs: 26, htAvg: 1.39 },
  { club: "GLE", avg: 2.92, o25: 53, bts: 53, cs: 39, htAvg: 1.24 },
  { club: "POR", avg: 2.89, o25: 61, bts: 53, cs: 16, htAvg: 1.16 },
  { club: "BAN", avg: 2.79, o25: 53, bts: 55, cs: 16, htAvg: 1.37 },
  { club: "GLV", avg: 2.79, o25: 58, bts: 50, cs: 11, htAvg: 1.18 },
  { club: "BAL", avg: 2.74, o25: 47, bts: 55, cs: 18, htAvg: 1.29 },
  { club: "LAR", avg: 2.61, o25: 47, bts: 39, cs: 55, htAvg: 1.24 },
  { club: "LIN", avg: 2.47, o25: 47, bts: 39, cs: 42, htAvg: 0.95 },
];
export const GOALS_LEAGUE_AVG = { avg: null, o25: 55.3, bts: 51.3 };


// 25/26 xG per 90 — verified via FootyStats screenshots, 10 Jul 2026.
// xg = expected goals for; xga = against; gf/ga = actual per 90. Basis: FootyStats MP incl. play-offs.
export const XG_TEAMS = [
  { club: "COL", xg: 1.72, xga: 1.08, xgd: 0.64, gf: 2.18, ga: 0.97 },
  { club: "GLE", xg: 1.64, xga: 0.96, xgd: 0.68, gf: 1.92, ga: 1.00 },
  { club: "LIN", xg: 1.56, xga: 1.16, xgd: 0.40, gf: 1.64, ga: 0.87 },
  { club: "LAR", xg: 1.56, xga: 1.10, xgd: 0.46, gf: 1.92, ga: 0.68 },
  { club: "DUN", xg: 1.42, xga: 1.41, xgd: 0.01, gf: 1.17, ga: 2.00 },
  { club: "CLI", xg: 1.41, xga: 1.46, xgd: -0.05, gf: 1.44, ga: 1.56 },
  { club: "CAR", xg: 1.32, xga: 1.44, xgd: -0.12, gf: 1.67, ga: 1.56 },
  { club: "CRU", xg: 1.25, xga: 1.89, xgd: -0.64, gf: 1.26, ga: 2.13 },
  { club: "GLV", xg: 1.21, xga: 1.53, xgd: -0.32, gf: 0.97, ga: 1.82 },
  { club: "POR", xg: 1.19, xga: 1.61, xgd: -0.42, gf: 1.16, ga: 1.74 },
  { club: "BAL", xg: 1.17, xga: 1.45, xgd: -0.28, gf: 1.21, ga: 1.53 },
  { club: "BAN", xg: 1.12, xga: 1.60, xgd: -0.48, gf: 1.08, ga: 1.71 },
];
// Player xG (FootyStats basis — goals here are FootyStats' own counts, kept internally consistent)
export const XG_PLAYERS = [
  { name: "Patrick Hoban", club: "GLE", xg: 16.77, goals: 26 },
  { name: "Matthew Shevlin", club: "COL", xg: 13.11, goals: 20 },
  { name: "Joel Cooper", club: "COL", xg: 13.01, goals: 21 },
  { name: "Fraser Bryden", club: "CRU", xg: 12.85, goals: 22 },
  { name: "Matthew Fitzpatrick", club: "LIN", xg: 11.32, goals: 20 },
  { name: "Daniel Purkis", club: "BAN", xg: 11.06, goals: 16 },
  { name: "Paul Heatley", club: "CAR", xg: 8.32, goals: 12 },
  { name: "Andrew Ryan", club: "LAR", xg: 8.14, goals: 14 },
  { name: "Eamon Fyfe", club: "POR", xg: 7.68, goals: 14 },
  { name: "William Patching", club: "COL", xg: 7.18, goals: 12 },
];

// Club top scorer 25/26 — Transfermarkt "Top goalscorers" (owner screenshots, Jul 2026).
// Covers the clubs with no GIBSON Index and no XG_PLAYERS entries, so their Squad section
// has real content instead of only an empty state.
//
// BAN is deliberately ABSENT despite a screenshot being supplied. Bangor already has a
// league scorer in XG_PLAYERS (Daniel Purkis, 16 goals), and 16 league goals cannot fit
// inside the 10-goal ALL-COMPETITIONS total the Transfermarkt row gave for Ben Arthurs —
// so the two cannot both describe Bangor's 25/26. Rather than ship a contradiction, Bangor
// keeps its existing league+xG entry. Re-add only if the season split is confirmed.
//
// IMPORTANT — this is an ALL COMPETITIONS total (Transfermarkt's own filter), and that view
// publishes no xG. XG_PLAYERS is league-only on a FootyStats basis, so these two must never
// be merged or compared: no xG figure may be derived for these players, and none is stored.
// `apps`/`minsPerGoal` are Transfermarkt's own; goals ÷ apps reproduces their published
// goals-per-match for all five rows, which is how these readings were checked.
//
// LIM played 25/26 in the CHAMPIONSHIP (they won it and came up), so Butcher's figures are
// second-tier — `comp` carries that caveat through to the UI so it can never read as a
// Premiership return. Clubs without a `comp` played in the Premiership.
export const CLUB_TOP_SCORERS = {
  CLI: { player: "Joe Gormley", apps: 24, goals: 8, minsPerGoal: 123 },
  DUN: { player: "Junior Ogedi-Uzokwe", apps: 20, goals: 7, minsPerGoal: 242 },
  BAL: { player: "Igor Rutkowski", apps: 11, goals: 9, minsPerGoal: 102 },
  LIM: { player: "John Butcher", apps: 30, goals: 14, minsPerGoal: 163, comp: "Championship" },
};

// ===== Season Archive =====
// Verified season snapshots. Add full 12-row tables later if you source them.
export const SEASON_ARCHIVE = [
  {
    season: "2024/25",
    champion: "Linfield", champNote: "57th title \u00b7 85 pts",
    cup: "Dungannon Swifts",
    relegated: "Loughgall (22 pts)",
    promotedIn: "Portadown",
    facts: [
      "Carrick Rangers survived the relegation play-off against Annagh United.",
      "Larne, the defending champions, made history by reaching the Conference League league phase \u2014 an Irish League first.",
    ],
  },
  {
    season: "2023/24",
    champion: "Larne", champNote: "2nd consecutive title",
    runnerUp: "Linfield",
    cup: "Cliftonville",
    relegated: "Newry City",
    promotedIn: "Loughgall",
    facts: [
      "Cliftonville's Irish Cup win was their first since 1979.",
      "Crusaders won the European play-off; Ballymena United survived the relegation play-off against Institute.",
    ],
  },
  {
    season: "2022/23",
    champion: "Larne", champNote: "First title in the club's history",
    relegated: "Portadown",
    facts: [
      "Larne became the league's first brand-new champions in a generation.",
    ],
  },
];


// European qualifying 2026/27 — confirmed draws and dates (UEFA / Irish FA, June 2026)
export // Odds are informational only — plain numbers, no bookmaker branding, no affiliate links.
// Fill in as: odds: { home: 1.85, draw: 3.40, away: 4.20 }  (decimal format)
// Leave as null until you have a source you trust. See Playbook section 8.
const EURO = [
  {
    club: "LAR", comp: "Europa League", round: "Third qualifying round",
    // oppColor: owner-supplied ("Iberia play in red"), not a scraped/verified brand hex —
    // a representative red for the Home tab's next-match accent bar, not a precise kit code.
    opp: "FC Iberia 1999", oppCountry: "Georgia", oppColor: "#DC2626", odds: null,
    legs: [
      { label: "1st leg · home", date: "Tue 4 Aug · 20:00", dt: "2026-08-04T19:00:00Z", venue: "Inver Park" },
    ],
    prize: "Winner advances to the UEL play-off round; the loser drops into the UECL play-off round",
    note: "OUT OF THE CHAMPIONS LEAGUE, ON TO THE EUROPA LEAGUE: Red Star Belgrade finished the job in Belgrade, winning the second leg 5-0 (Katai 3', Arnautović 45' & 60', Loizou 49', Bukari 79') for a 9-0 aggregate. Larne's European summer continues regardless — re-seeded into UEFA Europa League Q3, hosting Georgian side FC Iberia 1999 at Inver Park on Tuesday 4 August, 8pm. Tickets on sale now.",
  },
  {
    club: "GLE", comp: "Conference League", round: "First qualifying round",
    opp: "RFS", oppCountry: "Latvia", odds: { home: 3.6, draw: 3.5, away: 1.95 },
    legs: [
      { label: "1st leg · home", date: "Thu 9 Jul · 20:30", dt: "2026-07-09T19:30:00Z", venue: "The Oval" },
      { label: "2nd leg · away", date: "Thu 16 Jul · 18:30", dt: "2026-07-16T17:30:00Z", venue: "Riga" },
    ],
    prize: "Winner faces Qarabağ or Vestri in Q2",
    note: "ELIMINATED: Beaten 2-0 in Riga, 1-4 on aggregate. Ibsen Rossi's header at the Oval was as good as it got — the Glens' European summer is over at the first hurdle.",
  },
  {
    club: "LIN", comp: "Conference League", round: "First qualifying round",
    opp: "Nõmme Kalju", oppCountry: "Estonia", odds: { home: 2.6, draw: 3.3, away: 2.5 },
    legs: [
      { label: "1st leg · away", date: "Thu 9 Jul · 18:00", dt: "2026-07-09T17:00:00Z", venue: "Tallinn" },
      { label: "2nd leg · home", date: "Thu 16 Jul · 20:45", dt: "2026-07-16T19:45:00Z", venue: "Windsor Park" },
    ],
    prize: "Winner faces Shelbourne in Q2 — an all-Ireland tie",
    note: "ELIMINATED: 2-2 at Windsor, out 2-3 on aggregate — and it's the cruellest kind. Needing one more goal, the Blues were caught by a last-minute Kalju equaliser instead.",
  },
  {
    club: "COL", comp: "Conference League", round: "Second qualifying round",
    opp: "HJK Helsinki", oppCountry: "Finland", odds: { home: 1.55, draw: 3.9, away: 5.5 },
    legs: [
      { label: "1st leg · away", date: "Thu 23 Jul · 17:00", dt: "2026-07-23T16:00:00Z", venue: "Helsinki" },
      { label: "2nd leg · home", date: "Thu 30 Jul · 19:45", dt: "2026-07-30T18:45:00Z", venue: "The Showgrounds" },
    ],
    prize: "Q2 entry as Irish Cup winners — a minimum €525,000 already banked",
    note: "ELIMINATED: Beaten 0-3 at The Showgrounds, 0-8 on aggregate — HJK Helsinki proved a class above over the two legs. Coleraine's European run ends at the second qualifying round, with the Irish Cup prize money already banked regardless.",
  },
];

// Northern Ireland's UEFA country coefficient — the rolling five-year total that
// decides how many European places the league gets and how its clubs are seeded.
export const EURO_COEFFICIENT = {
  rank: 51,
  points: 6.250,
  window: "22/23–26/27", // live 5-year rolling ranking
  previousRank: 50, // down 1 place this round — points held at 6.250 (no coefficient points from Larne's or Coleraine's midweek exits) while others below moved up
  neighbours: [
    { rank: 49, country: "Gibraltar", points: 6.707 },
    { rank: 50, country: "Luxembourg", points: 6.250 },
    { rank: 51, country: "Northern Ireland", points: 6.250 },
    { rank: 52, country: "Georgia", points: 6.125 },
    { rank: 53, country: "Montenegro", points: 5.833 },
  ],
  lastSeason: { rank: 42, points: 8.33 },
  source: "football-md.com",
  note: "Every qualifying win earns coefficient points — the country's rank decides how many European places the league gets and how its clubs are seeded. Live 5-year rolling ranking (22/23–26/27): down one place this round to 51st — level on points with 50th-placed Luxembourg (6.250) but behind on tiebreak — after Larne and Coleraine's midweek European exits earned no fresh coefficient points. 52nd-placed Georgia (6.125) is close behind.",
};

// 26/27 domestic fixtures not yet released — Europe fills the schedule for now
export const CLUB_FIXTURES = {
  LAR: [
    { date: "8 Jul", dt: "2026-07-08T18:45:00Z", res: "0–1 W", opp: "Tre Fiori (a) — Lusty 45'", comp: "UCL Q1 · 1st leg" },
    { date: "14 Jul", dt: "2026-07-14T18:45:00Z", res: "2–1 W", opp: "Tre Fiori (h)", comp: "UCL Q1 · 2nd leg · 3–1 agg" },
    { date: "21 Jul", dt: "2026-07-21T18:45:00Z", res: "0–4 L", opp: "Red Star Belgrade", comp: "UCL Q2 · 1st leg · Inver Park" },
    { date: "29 Jul", dt: "2026-07-29T18:00:00Z", res: "0–5 L", opp: "Red Star Belgrade (a) — Katai 3', Arnautović 45' & 60', Loizou 49', Bukari 79'", comp: "UCL Q2 · 2nd leg · Belgrade · 0–9 agg · eliminated" },
    { date: "4 Aug", dt: "2026-08-04T19:00:00Z", opp: "FC Iberia 1999 (h)", comp: "UEL Q3 · 1st leg · Inver Park · 8pm" },
  ],
  GLE: [
    { date: "9 Jul", dt: "2026-07-09T19:30:00Z", res: "1–2 L", opp: "RFS (h) — Ibsen Rossi 38'", comp: "UECL Q1 · 1st leg" },
    { date: "16 Jul", dt: "2026-07-16T17:30:00Z", res: "2–0 L", opp: "RFS (a)", comp: "UECL Q1 · 2nd leg · 1–4 agg · eliminated" },
  ],
  LIN: [
    { date: "9 Jul", dt: "2026-07-09T17:00:00Z", res: "0–1 L", opp: "Nõmme Kalju (a)", comp: "UECL Q1 · 1st leg" },
    { date: "16 Jul", dt: "2026-07-16T19:45:00Z", res: "2–2 D", opp: "Nõmme Kalju (h)", comp: "UECL Q1 · 2nd leg · 2–3 agg · eliminated" },
  ],
  COL: [
    { date: "23 Jul", dt: "2026-07-23T16:00:00Z", res: "0–5 L", opp: "HJK Helsinki (a)", comp: "UECL Q2 · 1st leg · 5pm" },
    { date: "30 Jul", dt: "2026-07-30T18:45:00Z", res: "0–3 L", opp: "HJK Helsinki (h)", comp: "UECL Q2 · 2nd leg · The Showgrounds · 0–8 agg · eliminated" },
  ],
};

export const SUPPORT_TIERS = [
  {
    id: "bovril", name: "Half-time Bovril", price: "£3", cadence: "one-off",
    color: "#8FA69B", emoji: "☕",
    perks: ["Buy the project a warm drink", "A genuine thank-you", "Warm glow of backing local football"],
  },
  {
    id: "season", name: "Season Ticket", price: "£4", cadence: "per month",
    color: "#FFB627", emoji: "🎟️", featured: true,
    perks: ["Name in the GIBSON credits", "Vote in monthly feature polls", "Early look at new stats before they go live"],
  },
  {
    id: "box", name: "Director's Box", price: "£8", cadence: "per month",
    color: "#3DDC84", emoji: "🥃",
    perks: ["Everything in Season Ticket", "Request any player Duel or custom stat breakdown", "Priority say on the roadmap"],
  },
];

// Illustrative Team of the Season (demo)
export const BEST_XI = [
  { name: "Johns", club: "COL", pos: [50, 92], r: 7.2 },
  { name: "Cosgrove", club: "LAR", pos: [82, 76], r: 7.1 },
  { name: "McEleney", club: "LAR", pos: [62, 80], r: 7.3 },
  { name: "Addis", club: "CLI", pos: [38, 80], r: 7.2 },
  { name: "Clarke", club: "BAL", pos: [18, 76], r: 7.0 },
  { name: "Shields", club: "LIN", pos: [50, 62], r: 7.3 },
  { name: "R. Hale", club: "CLI", pos: [34, 48], r: 7.4 },
  { name: "L. Millar", club: "LAR", pos: [66, 48], r: 7.6 },
  { name: "K. Millar", club: "LIN", pos: [84, 30], r: 7.5 },
  { name: "Hoban", club: "GLE", pos: [50, 20], r: 8.2 },
  { name: "Cooper", club: "COL", pos: [16, 30], r: 7.9 },
];

// === CLUB_META START (auto-generated) ===
// AUTO-GENERATED by scripts/fetch-wikidata.js — re-run the script to refresh.
// Each field is a verified value or an explicit null (never a guess).
// The script FILLS GAPS ONLY: an existing value always wins, and Wikidata is used only
// where a field is null. Wikidata is publicly editable and has already returned a bad
// coordinate here, so owner-verified values are never overwritten. To accept an upstream
// change, null that field and re-run.
export const CLUB_META = {
  LAR: {
    ground: "Inver Park, Larne",
    capacity: 2732,
    lat: 54.85,
    lon: -5.82694,
    founded: null,
    website: null,
    nickname: null,
    seated: 1632,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026",
  },
  COL: {
    ground: "The Showgrounds, Coleraine",
    capacity: 4843,
    lat: 55.13278,
    lon: -6.66028,
    founded: 1927,
    website: "https://colerainefc.com/",
    nickname: null,
    seated: 1607,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026; founded, website from Wikidata (CC0)",
  },
  GLE: {
    ground: "The Oval, Belfast",
    capacity: 6054,
    lat: 54.602907,
    lon: -5.891005,
    founded: 1882,
    website: "https://www.glentoran.com/",
    nickname: null,
    seated: 3991,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026; founded, website from Wikidata (CC0)",
  },
  LIN: {
    ground: "Windsor Park, Belfast",
    capacity: 18434,
    lat: 54.5825,
    lon: -5.95528,
    founded: 1886,
    website: "http://www.linfieldfc.com/",
    nickname: null,
    seated: 18434,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026; founded, website from Wikidata (CC0)",
  },
  CLI: {
    ground: "Solitude, Belfast",
    capacity: 3054,
    lat: 54.61944,
    lon: -5.94722,
    founded: null,
    website: null,
    nickname: null,
    seated: 3054,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026",
  },
  DUN: {
    ground: "Stangmore Park, Dungannon",
    capacity: 2000,
    lat: 54.4895,
    lon: -6.746,
    founded: 1949,
    website: "https://dungannonswiftsfc.com/",
    nickname: null,
    seated: 300,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026; founded, website from Wikidata (CC0)",
  },
  BAL: {
    ground: "The Showgrounds, Ballymena",
    capacity: 3824,
    lat: 54.869989,
    lon: -6.263529,
    founded: 1926,
    website: "http://www.ballymenaunitedfc.com",
    nickname: null,
    seated: 3824,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026; founded, website from Wikidata (CC0)",
  },
  POR: {
    ground: "Shamrock Park, Portadown",
    capacity: 3940,
    lat: 54.41306,
    lon: -6.45778,
    founded: null,
    website: null,
    nickname: null,
    seated: 2765,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026",
  },
  BAN: {
    ground: "Clandeboye Park, Bangor",
    capacity: 1895,
    lat: 54.65163,
    lon: -5.68448,
    founded: 1918,
    website: "https://bangorfc.com/",
    nickname: null,
    seated: 500,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026; founded, website from Wikidata (CC0)",
  },
  CAR: {
    ground: "Loughshore Hotel Arena, Carrickfergus",
    capacity: 2100,
    lat: 54.724522,
    lon: -5.804001,
    founded: 1939,
    website: "https://www.carrickrangers.co.uk/",
    nickname: null,
    seated: 380,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026; founded, website from Wikidata (CC0)",
  },
  CRU: {
    ground: "Seaview, Belfast",
    capacity: 3208,
    lat: 54.6212,
    lon: -5.9198,
    founded: 1898,
    website: "https://www.crusadersfc.com/",
    nickname: null,
    seated: 3208,
    source: "Wikipedia (ground/capacity/seated); coordinates verified by owner from Google Maps, 29 Jul 2026; founded, website from Wikidata (CC0)",
  },
  LIM: {
    ground: "The Showgrounds, Limavady",
    capacity: 1500,
    lat: 55.052522,
    lon: -6.937221,
    founded: 1884,
    // DELIBERATELY null — see LAPSED_CLUB_DOMAINS below. limavadyunitedfc.co.uk was the
    // club's site (and is still what Wikidata returns) but the domain has lapsed and now
    // serves casino affiliate content. ClubPage renders website as "Official website ↗",
    // so leaving it set pointed our visitors at it. Restore only with a URL that has been
    // opened and checked by a human.
    website: null,
    nickname: null,
    seated: 274,
    capacityUnconfirmed: true,
    source: "Wikipedia, 2025–26 NIFL Premiership season page, retrieved 23 July 2026 (capacity unconfirmed); founded from Wikidata (CC0); website withheld — domain lapsed to affiliate spam, checked 31 July 2026",
  },
};

// Domains that WERE a club's official site and are not any more. A lapsed football domain
// tends to get bought and repointed at affiliate spam, which is how limavadyunitedfc.co.uk
// came to serve "Non GamStop casino" pages while ClubPage was still linking to it as
// "Official website ↗" — squarely against rule 2, and worse than a broken link.
//
// This list exists because nulling the field alone would not hold. scripts/fetch-wikidata.js
// FILLS GAPS ONLY, so a null website is exactly the shape it refills — and Wikidata still
// carries the old URL, so the next refresh would quietly put it back. verify.js fails on any
// CLUB_META.website matching this list, which makes that refresh fail its own verify step
// instead of opening a PR that reintroduces the link.
//
// Removing an entry here is a claim that a human has opened the URL and seen a real club site.
export const LAPSED_CLUB_DOMAINS = [
  "limavadyunitedfc.co.uk", // checked 31 July 2026 — casino affiliate content, not the club
];
// === CLUB_META END ===

// Season travel, derived from CLUB_META coordinates + FIXTURES_2627 — computed here
// rather than hand-entered, so it's always in sync with the fixture list. A club's total
// is only ever a full-season figure: if any away opponent's coordinates are unknown, the
// total is left null rather than silently reporting a partial (and misleadingly low) sum.
function haversineMiles(a, b) {
  const R = 3958.8; // Earth radius, miles
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

function computeTravel() {
  const clubs = {};
  const totals = [];
  for (const code of Object.keys(CLUBS).filter((k) => k !== "GLV")) {
    const meta = CLUB_META[code];
    if (!meta || meta.lat === null || meta.lon === null) { clubs[code] = null; continue; }
    let total = 0;
    let longest = null;
    let complete = true;
    for (const round of FIXTURES_2627) {
      for (const m of round.matches) {
        if (m.a !== code) continue;
        const opp = CLUB_META[m.h];
        if (!opp || opp.lat === null || opp.lon === null) { complete = false; continue; }
        const miles = haversineMiles(meta, opp);
        total += miles;
        if (!longest || miles > longest.miles) longest = { opponent: CLUBS[m.h].name, miles: Math.round(miles) };
      }
    }
    if (!complete) { clubs[code] = null; continue; }
    const totalMiles = Math.round(total);
    clubs[code] = { totalMiles, longestTrip: longest };
    totals.push(totalMiles);
  }
  const leagueAverageMiles = totals.length ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) : null;
  return { leagueAverageMiles, clubs };
}

export const TRAVEL = computeTravel();
