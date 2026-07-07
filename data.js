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
  BAL: { name: "Ballymena Utd", ground: "The Showgrounds", colors: ["#6CACE4", "#FFFFFF"], pattern: "plain" },
  POR: { name: "Portadown", ground: "Shamrock Park", colors: ["#DA291C", "#000000"], pattern: "plain" },
  BAN: { name: "Bangor", ground: "Clandeboye Park", colors: ["#FDB913", "#0033A0"], pattern: "plain" },
  CAR: { name: "Carrick Rangers", ground: "Loughview Leisure", colors: ["#FFB81C", "#000000"], pattern: "stripes" },
  CRU: { name: "Crusaders", ground: "Seaview", colors: ["#D01317", "#000000"], pattern: "stripes" },
  GLV: { name: "Glenavon", ground: "Mourneview Park", colors: ["#0072CE", "#FFFFFF"], pattern: "plain" },
  LIM: { name: "Limavady United", ground: "Limavady Showgrounds", colors: ["#1D6FB8", "#FFFFFF"], pattern: "plain" },
};


// ===== 26/27 BoyleSports Premiership fixtures (official, July 2026) =====
// All fixtures subject to change (broadcast selection + European involvement).
// Default kick-off 3pm Saturday unless a match specifies d (date) or t (time).
export const FIXTURES_2627 = [
  { round: 1, date: "Sat 8 Aug", matches: [
    { h: "CLI", a: "CRU", d: "Fri 7 Aug", t: "7.45pm" },
    { h: "LIN", a: "BAL" }, { h: "CAR", a: "POR" }, { h: "DUN", a: "COL" }, { h: "GLE", a: "LIM" },
    { h: "LAR", a: "BAN", d: "Sun 9 Aug" },
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
  { id: 17, date: "Jul", player: "Jonny Tuffey", from: "CRU", toExternal: "Retired", status: "departure", note: "The veteran goalkeeper hangs up the gloves after a long Irish League career. Josh Owens also retires at Seaview." },
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
];

// ===== The Predictor =====
// Scoring: exact score = 3 pts, correct result = 1 pt.
// When results are known, fill in `result: [home, away]` on each fixture and redeploy —
// saved predictions on each player's device are scored automatically.
export const PREDICTOR_GW = {
  id: "euro-week-1",
  name: "Euro Week 1",
  deadline: "First legs · 7–9 July",
  fixtures: [
    { id: "f1", home: { external: "Tre Fiori" }, away: { club: "LAR" }, comp: "UCL Q1 · Tue", result: null, odds: { home: 12.0, draw: 6.0, away: 1.15 } },
    { id: "f2", home: { club: "GLE" }, away: { external: "RFS" }, comp: "UECL Q1 · Thu", result: null, odds: { home: 3.6, draw: 3.5, away: 1.95 } },
    { id: "f3", home: { external: "Nõmme Kalju" }, away: { club: "LIN" }, comp: "UECL Q1 · Thu", result: null, odds: { home: 2.6, draw: 3.3, away: 2.5 } },
  ],
};

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


// Full summer 2026 window, club by club — Transfermarkt (verified via screenshots, Jul 2026).
// Compiled from public data; may not be exhaustive. Format: [player, from/to club name].
export const WINDOW = [
  { club: "LAR",
    ins: [["Josh Ukek", "Portadown"], ["Montel Gibson", "Hednesford"], ["Kevin O'Hara", "Hamilton Acad."], ["Sam McClelland", "Return from career break"]],
    outs: [["Andy Ryan", "Hamilton Acad."], ["Kofi Moore", "Linfield"], ["Ryan Nolan", "Linfield"], ["Jordan Hastings", "Carrick Rangers"], ["Josh Kee", "HW Welders"], ["C. Bolger", "Without club"]] },
  { club: "LIN",
    ins: [["Ryan Nolan", "Larne"], ["Kofi Moore", "Larne"]],
    outs: [["C. Allen", "Ballymena Utd"], ["J. Archer", "Ballymena Utd"], ["S. Whiteside", "Ballymena Utd"], ["C. McKee", "Ballymena Utd"], ["D. Walsh", "Ballymena Utd"]] },
  { club: "GLE",
    ins: [["Greg Sloggett", "Boston United"]],
    outs: [["D. Amos", "Barrow"], ["Dylan Connolly", "Galway United"], ["A. Wightman", "Cliftonville"], ["C. Farley", "Warrenpoint"], ["C. Coll", "Strabane AFC"], ["C. Palmer", "Livingston"], ["Cillian McCann", "Newington"]] },
  { club: "COL",
    ins: [["Jay Henderson", "Ross County"], ["Aidan Wilson", "Airdrieonians"], ["Ben Doherty", "Derry City"], ["Conor McMenamin", "St Mirren"], ["T. Brolly", "Loan return (Institute)"], ["C. McGrath", "Loan return (Moyola Park)"], ["J. McGonigle", "Loan return (Sligo Rovers)"]],
    outs: [["J. Glackin", "Dungannon"], ["S. Fallon", "Ballymena Utd"], ["G. Kelly", "Crusaders"], ["A. Tejada", "Moyola Park"]] },
  { club: "CRU",
    ins: [["A. Reid", "Airdrieonians"], ["G. Kelly", "Coleraine"], ["T. Maguire", "Dungannon"], ["O. Wardell", "FK Be1"]],
    outs: [["J. Forsythe", "Carrick Rangers"], ["Odhr\u00e1n McCart", "Moyola Park"], ["B. Hamilton", "Moyola Park"], ["Josh Owens", "Retired"], ["Jonny Tuffey", "Retired"]] },
  { club: "CLI",
    ins: [["Ben Quinn", "Portadown"], ["A. Wightman", "Glentoran"], ["K. McClelland", "Glenavon"], ["Dan O'Connor", "AFC Totton"], ["J. Thompson", "Ballymena Utd"]],
    outs: [["M. Glynn", "Ballymena Utd"], ["J. Addis", "Ballymena Utd"], ["R. Jordan", "Loughgall"], ["S. Robertson", "Torquay"], ["A. Carroll", "Warrenpoint"], ["C. Pepper", "Retired"]] },
  { club: "DUN",
    ins: [["M. McElhatton", "Dergview"], ["J. Glackin", "Coleraine"], ["B. McKeown", "Glenavon"], ["Kris Lowe", "Glenavon"], ["R. Devlin", "Dungannon U18"], ["T. Connolly", "Loan return (Ballinamallard)"]],
    outs: [["K. Ximenes", "Oxford SFC"], ["T. Taggert", "Oxford SFC"], ["O. Crowe", "Annagh United"], ["Leon Boyd", "Limavady United"], ["C. Marron", "Newry City"], ["T. Maguire", "Crusaders"], ["J. Knowles", "Without club"]] },
  { club: "BAL",
    ins: [["C. Allen", "Linfield"], ["J. Archer", "Linfield"], ["S. Whiteside", "Linfield"], ["C. McKee", "Linfield"], ["D. Walsh", "Linfield"], ["J. Addis", "Cliftonville"], ["M. Glynn", "Cliftonville"], ["S. Fallon", "Coleraine"]],
    outs: [["R. McNickle", "Annagh United"], ["L. Tennant", "Portstewart"], ["S. McAuley", "Chimney Corner"], ["C. Loughran", "Portstewart"], ["A. Gawne", "Portstewart"], ["A. Jarvis", "Limavady United"], ["S. O'Donnell", "Limavady United"], ["D. Lafferty", "Limavady United"], ["Daire O'Connor", "Carrick Rangers"], ["J. Thompson", "Cliftonville"]] },
  { club: "CAR",
    ins: [["J. Forsythe", "Crusaders"], ["Jordan Hastings", "Larne"], ["Daire O'Connor", "Ballymena Utd"]],
    outs: [["Luke McCullough (loan info n/a)", "Matlock"]] },
  { club: "POR",
    ins: [["M. Carson", "Torquay"], ["R. Breen", "East Kilbride"], ["Mikey Hewitt", "Queen of the South"], ["Sean O'Mahoney", "St Francis"]],
    outs: [["Ben Quinn", "Cliftonville"], ["Josh Ukek", "Larne"], ["Zach Cowan", "Oxford SFC"], ["Steven McCullough", "Bangor"], ["J. Gibson", "Without club"], ["Shay McCartan", "Without club"], ["Josh Carson", "Retired"]] },
  { club: "BAN",
    ins: [["Lucas McRoberts", "Ayr United"], ["Steven McCullough", "Portadown"]],
    outs: [] },
  { club: "LIM",
    ins: [["A. Jarvis", "Ballymena Utd"], ["S. O'Donnell", "Ballymena Utd"], ["D. Lafferty", "Ballymena Utd"], ["R. Wilson", "HW Welders"], ["O. Duffy", "Strabane AFC"], ["Leon Boyd", "Dungannon"], ["S. McClintock", "Loan return (Strabane)"]],
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
    club: "LAR", comp: "Champions League", round: "First qualifying round",
    opp: "Tre Fiori", oppCountry: "San Marino", odds: { home: 12.0, draw: 6.0, away: 1.15 },
    legs: [
      { label: "1st leg · away", date: "Tue 7/8 Jul", venue: "San Marino" },
      { label: "2nd leg · home", date: "14/15 Jul", venue: "Windsor Park" },
    ],
    prize: "Winner faces Red Star Belgrade in Q2 (21/22 & 28/29 Jul)",
    note: "Larne play European home games at Windsor Park, and arrive with silverware already won — Friday's Charity Shield, on penalties against Coleraine. Tre Fiori have never won a European qualifying match. Even defeat isn't the end: the loser drops into Conference League Q3.",
  },
  {
    club: "GLE", comp: "Conference League", round: "First qualifying round",
    opp: "RFS", oppCountry: "Latvia", odds: { home: 3.6, draw: 3.5, away: 1.95 },
    legs: [
      { label: "1st leg · home", date: "Thu 9 Jul · 20:30", venue: "The Oval" },
      { label: "2nd leg · away", date: "Thu 16 Jul · 18:30", venue: "Riga" },
    ],
    prize: "Winner faces Qarabağ or Vestri in Q2",
    note: "The toughest draw of the four — RFS beat Larne 7-0 on aggregate in 2024 and reached the Europa League.",
  },
  {
    club: "LIN", comp: "Conference League", round: "First qualifying round",
    opp: "Nõmme Kalju", oppCountry: "Estonia", odds: { home: 2.6, draw: 3.3, away: 2.5 },
    legs: [
      { label: "1st leg · away", date: "Thu 9 Jul · 18:00", venue: "Tallinn" },
      { label: "2nd leg · home", date: "Thu 16 Jul · 20:45", venue: "Windsor Park" },
    ],
    prize: "Winner faces Shelbourne in Q2 — an all-Ireland tie",
    note: "Shelbourne knocked the Blues out of Europe twice last season. Revenge is on the table.",
  },
  {
    club: "COL", comp: "Conference League", round: "Second qualifying round",
    opp: "HJK Helsinki", oppCountry: "Finland", odds: { home: 1.55, draw: 3.9, away: 5.5 },
    legs: [
      { label: "1st leg · away", date: "23/24 Jul", venue: "Helsinki" },
      { label: "2nd leg · home", date: "30/31 Jul", venue: "The Showgrounds" },
    ],
    prize: "Q2 entry as Irish Cup winners — a minimum €525,000 already banked",
    note: "Family affair: Coleraine's Kodi Lyons-Foster could line up against his brother Brooklyn, who's on HJK's books.",
  },
];

// 26/27 domestic fixtures not yet released — Europe fills the schedule for now
export const CLUB_FIXTURES = {
  LAR: [
    { date: "Tue 7/8 Jul", opp: "Tre Fiori (a)", comp: "UCL Q1 · 1st leg" },
    { date: "14/15 Jul", opp: "Tre Fiori (h)", comp: "UCL Q1 · 2nd leg · Windsor Park" },
    { date: "21/22 Jul", opp: "Red Star Belgrade*", comp: "UCL Q2 · if through" },
    { date: "28/29 Jul", opp: "Red Star Belgrade*", comp: "UCL Q2 · if through" },
  ],
  GLE: [
    { date: "Thu 9 Jul", opp: "RFS (h)", comp: "UECL Q1 · 1st leg · The Oval" },
    { date: "Thu 16 Jul", opp: "RFS (a)", comp: "UECL Q1 · 2nd leg · Riga" },
    { date: "23 Jul", opp: "Qarabağ / Vestri*", comp: "UECL Q2 · if through" },
    { date: "30 Jul", opp: "Qarabağ / Vestri*", comp: "UECL Q2 · if through" },
  ],
  LIN: [
    { date: "Thu 9 Jul", opp: "Nõmme Kalju (a)", comp: "UECL Q1 · 1st leg · Tallinn" },
    { date: "Thu 16 Jul", opp: "Nõmme Kalju (h)", comp: "UECL Q1 · 2nd leg · Windsor Park" },
    { date: "23 Jul", opp: "Shelbourne*", comp: "UECL Q2 · if through" },
    { date: "30 Jul", opp: "Shelbourne*", comp: "UECL Q2 · if through" },
  ],
  COL: [
    { date: "23/24 Jul", opp: "HJK Helsinki (a)", comp: "UECL Q2 · 1st leg" },
    { date: "30/31 Jul", opp: "HJK Helsinki (h)", comp: "UECL Q2 · 2nd leg · The Showgrounds" },
    { date: "6 Aug", opp: "UECL Q3*", comp: "if through" },
    { date: "13 Aug", opp: "UECL Q3*", comp: "if through" },
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

