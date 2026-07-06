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
};

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
  { id: 1, name: "Pat Hoban", club: "GLE", pos: "ST", num: 9, rating: 8.2, apps: 36, goals: 26, assists: 4, xg: 22.4, xa: 3.1, per90: { shots: 3.8, keyPasses: 1.0, dribbles: 0.6, tackles: 0.4 }, radar: [95, 55, 56, 48, 32, 84], form: [8.4, 7.6, 9.1, 8.0, 8.8, 7.5], shots: [{x:88,y:46,xg:.72,g:1},{x:84,y:54,xg:.35,g:1},{x:90,y:50,xg:.65,g:1},{x:79,y:42,xg:.14,g:0},{x:86,y:58,xg:.41,g:1},{x:92,y:48,xg:.78,g:0}] },
  { id: 2, name: "Andy Ryan", club: "LAR", pos: "ST", num: 10, rating: 7.9, apps: 34, goals: 19, assists: 6, xg: 16.8, xa: 4.6, per90: { shots: 3.2, keyPasses: 1.4, dribbles: 0.9, tackles: 0.5 }, radar: [86, 64, 62, 58, 34, 80], form: [7.6, 8.2, 7.8, 8.5, 7.2, 8.4], shots: [{x:85,y:50,xg:.52,g:1},{x:80,y:44,xg:.24,g:1},{x:89,y:55,xg:.68,g:0},{x:75,y:52,xg:.10,g:0},{x:87,y:47,xg:.58,g:1}] },
  { id: 3, name: "Matthew Shevlin", club: "COL", pos: "ST", num: 29, rating: 7.8, apps: 35, goals: 18, assists: 5, xg: 15.9, xa: 3.8, per90: { shots: 3.0, keyPasses: 1.2, dribbles: 1.1, tackles: 0.6 }, radar: [84, 58, 60, 62, 36, 76], form: [8.0, 7.4, 8.6, 7.1, 8.3, 7.9], shots: [{x:83,y:48,xg:.44,g:1},{x:78,y:56,xg:.18,g:0},{x:88,y:52,xg:.61,g:1},{x:81,y:40,xg:.27,g:1}] },
  { id: 4, name: "Joel Cooper", club: "LIN", pos: "LW", num: 11, rating: 7.7, apps: 33, goals: 11, assists: 12, xg: 9.4, xa: 10.2, per90: { shots: 2.4, keyPasses: 2.8, dribbles: 2.6, tackles: 0.7 }, radar: [70, 88, 78, 90, 38, 66], form: [7.8, 8.1, 6.9, 8.4, 7.6, 8.0], shots: [{x:78,y:62,xg:.20,g:1},{x:84,y:56,xg:.38,g:0},{x:72,y:60,xg:.08,g:0},{x:86,y:50,xg:.49,g:1}] },
  { id: 5, name: "Leroy Millar", club: "LAR", pos: "CM", num: 8, rating: 7.6, apps: 36, goals: 8, assists: 9, xg: 6.8, xa: 7.4, per90: { shots: 1.8, keyPasses: 2.2, dribbles: 1.4, tackles: 1.8 }, radar: [62, 78, 82, 68, 66, 84], form: [7.4, 7.9, 7.2, 8.0, 7.7, 7.5], shots: [{x:74,y:50,xg:.11,g:0},{x:80,y:46,xg:.26,g:1},{x:70,y:56,xg:.06,g:0}] },
  { id: 6, name: "Kirk Millar", club: "LIN", pos: "RW", num: 7, rating: 7.5, apps: 34, goals: 6, assists: 13, xg: 4.9, xa: 11.6, per90: { shots: 1.6, keyPasses: 3.1, dribbles: 1.8, tackles: 0.8 }, radar: [58, 92, 84, 74, 40, 62], form: [7.2, 7.8, 8.2, 7.0, 7.6, 8.1], shots: [{x:76,y:58,xg:.13,g:0},{x:82,y:52,xg:.30,g:1},{x:71,y:62,xg:.05,g:0}] },
  { id: 7, name: "Rory Hale", club: "CLI", pos: "CM", num: 8, rating: 7.4, apps: 35, goals: 7, assists: 8, xg: 5.6, xa: 6.9, per90: { shots: 1.9, keyPasses: 2.4, dribbles: 1.5, tackles: 2.1 }, radar: [60, 76, 80, 66, 72, 82], form: [7.6, 7.1, 7.8, 7.3, 8.0, 7.2], shots: [{x:72,y:48,xg:.09,g:0},{x:78,y:54,xg:.21,g:1},{x:68,y:50,xg:.04,g:0}] },
  { id: 8, name: "Chris Shields", club: "LIN", pos: "DM", num: 4, rating: 7.3, apps: 34, goals: 3, assists: 4, xg: 2.4, xa: 3.2, per90: { shots: 0.9, keyPasses: 1.3, dribbles: 0.6, tackles: 3.1 }, radar: [42, 58, 84, 48, 92, 88], form: [7.1, 7.5, 7.0, 7.6, 7.4, 7.2], shots: [{x:68,y:52,xg:.05,g:0},{x:74,y:46,xg:.10,g:1}] },
  { id: 9, name: "Jamie McDonagh", club: "CLI", pos: "RW", num: 14, rating: 7.2, apps: 32, goals: 8, assists: 9, xg: 6.7, xa: 7.8, per90: { shots: 2.1, keyPasses: 2.5, dribbles: 2.2, tackles: 0.9 }, radar: [64, 80, 72, 82, 42, 72], form: [7.0, 7.7, 7.3, 6.8, 7.9, 7.4], shots: [{x:79,y:60,xg:.17,g:1},{x:84,y:54,xg:.36,g:0},{x:73,y:58,xg:.07,g:0}] },
];

export const AXES = ["Shooting", "Creation", "Passing", "Dribbling", "Defending", "Physical"];

// Summer 2026 window tracker — real, sourced stories. Update as fresh news breaks.
// from/to use a NIFL club code, OR fromExternal/toExternal for clubs outside the league.
export const TRANSFERS = [
  { id: 1, date: "5 Jul", player: "Kevin O'Hara", fromExternal: "Hamilton Academical", to: "LAR", status: "done", note: "CONFIRMED. 38 goals in 130 for Hamilton, plus 11 assists last season. Turned down a new deal and Scottish Championship interest — in the squad for Tuesday's Tre Fiori tie, pending international clearance." },
  { id: 2, date: "Jul", player: "Andy Ryan", from: "LAR", toExternal: "Hamilton Academical", status: "departure", note: "End of an era at Inver Park: 59 goals in 95 league games, three titles in four seasons, and a hat-trick in the famous Lincoln Red Imps win. Returns to Scotland as O'Hara fills his boots." },
  { id: 3, date: "Jul", player: "McMenamin, Henderson & Doherty", fromExternal: "Triple swoop", to: "COL", status: "done", note: "Coleraine mean business: NI international Conor McMenamin headlines a treble signing alongside Jay Henderson and Ben Doherty. Bookies' title favourites for a reason." },
  { id: 4, date: "Jul", player: "McClelland, Ukek & Gibson", fromExternal: "Window roundup", to: "LAR", status: "done", note: "The champions reload: Sam McClelland, Josh Ukek and Montel Gibson all through the door ahead of the Champions League campaign." },
  { id: 5, date: "Reported", player: "Ryan Nolan", from: "LAR", to: "LIN", status: "done", note: "Linfield secure the centre-back on a permanent deal after his form at Larne." },
  { id: 6, date: "Jul", player: "Jordan Hastings", from: "LAR", to: "CAR", status: "done", note: "Young striker signs a two-year deal, reuniting with Stephen Baxter after a loan spell: \"Stephen is one of the main reasons why I have gone back.\"" },
  { id: 7, date: "Jul", player: "Josh Kee", from: "LAR", toExternal: "H&W Welders", status: "departure", note: "Midfielder returns to the Welders — managed by his father Paul — after 18 months at Inver Park." },
  { id: 8, date: "12 May", player: "Sam Taylor", fromExternal: "Tranmere Rovers", to: "LIN", status: "rumour", note: "Winger's Linfield loan from Tranmere ends as Tranmere release him — Linfield are favourites to make the move permanent." },
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
  { big: "26", label: "Pat Hoban's golden boot", sub: "Top scorer of the 2025/26 season for Glentoran" },
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
    { date: "Aug", opp: "26/27 Premiership opener", comp: "Fixture list TBA" },
  ],
  GLE: [
    { date: "Thu 9 Jul", opp: "RFS (h)", comp: "UECL Q1 · 1st leg · The Oval" },
    { date: "Thu 16 Jul", opp: "RFS (a)", comp: "UECL Q1 · 2nd leg · Riga" },
    { date: "23 Jul", opp: "Qarabağ / Vestri*", comp: "UECL Q2 · if through" },
    { date: "30 Jul", opp: "Qarabağ / Vestri*", comp: "UECL Q2 · if through" },
    { date: "Aug", opp: "26/27 Premiership opener", comp: "Fixture list TBA" },
  ],
  LIN: [
    { date: "Thu 9 Jul", opp: "Nõmme Kalju (a)", comp: "UECL Q1 · 1st leg · Tallinn" },
    { date: "Thu 16 Jul", opp: "Nõmme Kalju (h)", comp: "UECL Q1 · 2nd leg · Windsor Park" },
    { date: "23 Jul", opp: "Shelbourne*", comp: "UECL Q2 · if through" },
    { date: "30 Jul", opp: "Shelbourne*", comp: "UECL Q2 · if through" },
    { date: "Aug", opp: "26/27 Premiership opener", comp: "Fixture list TBA" },
  ],
  COL: [
    { date: "23/24 Jul", opp: "HJK Helsinki (a)", comp: "UECL Q2 · 1st leg" },
    { date: "30/31 Jul", opp: "HJK Helsinki (h)", comp: "UECL Q2 · 2nd leg · The Showgrounds" },
    { date: "6 Aug", opp: "UECL Q3*", comp: "if through" },
    { date: "13 Aug", opp: "UECL Q3*", comp: "if through" },
    { date: "Aug", opp: "26/27 Premiership opener", comp: "Fixture list TBA" },
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
  { name: "Clarke", club: "LIN", pos: [18, 76], r: 7.0 },
  { name: "Shields", club: "LIN", pos: [50, 62], r: 7.3 },
  { name: "R. Hale", club: "CLI", pos: [34, 48], r: 7.4 },
  { name: "L. Millar", club: "LAR", pos: [66, 48], r: 7.6 },
  { name: "K. Millar", club: "LIN", pos: [84, 30], r: 7.5 },
  { name: "Hoban", club: "GLE", pos: [50, 20], r: 8.2 },
  { name: "Cooper", club: "LIN", pos: [16, 30], r: 7.7 },
];

