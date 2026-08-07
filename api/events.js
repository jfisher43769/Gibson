// GIBSON live data layer — /api/events
// Live scores, recent results and upcoming fixtures for the NIFL Premiership
// (TheSportsDB league 4659). Same philosophy as /api/table: validate hard, normalise to
// GIBSON club codes, and return {ok:false} on any doubt so the app falls back to editorial data.

const LEAGUE_ID = "4659";

const CLUB_MAP = [
  ["limavady", "LIM"],
  ["larne", "LAR"],
  ["linfield", "LIN"],
  ["glentoran", "GLE"],
  ["coleraine", "COL"],
  ["cliftonville", "CLI"],
  ["crusaders", "CRU"],
  ["ballymena", "BAL"],
  ["carrick", "CAR"],
  ["dungannon", "DUN"],
  ["portadown", "POR"],
  ["bangor", "BAN"],
  ["glenavon", "GLV"],
];

function toCode(name) {
  const n = (name || "").toLowerCase();
  const hit = CLUB_MAP.find(([k]) => n.includes(k));
  return hit ? hit[1] : null;
}

// A match is only over when the feed says so, or when enough time has passed that it cannot
// still be on. 150 minutes covers 90 + a long half-time + stoppage with room to spare.
export const MATCH_WINDOW_MS = 150 * 60 * 1000;

const FINISHED_STATUS = /^(ft|aet|pen|pens|match finished|finished|full ?time)$/i;
const LIVE_STATUS = /^(1h|2h|ht|et|live|in ?play|half ?time|\d{1,3}'?)$/i;
const NOT_STARTED_STATUS = /^(ns|not ?started|postp|postponed|canc|cancelled|abandoned|tbd)$/i;

// TheSportsDB gives UTC in strTime (strTimeLocal is the local one). A row with no usable
// kick-off gets null, and callers treat that as "can't tell from the clock".
export function kickoffMs(e) {
  const d = String(e && e.dateEvent || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = String(e && e.strTime || "").trim().slice(0, 8);
  const ms = Date.parse(`${d}T${/^\d{2}:\d{2}(:\d{2})?$/.test(t) ? (t.length === 5 ? `${t}:00` : t) : "00:00:00"}Z`);
  return Number.isFinite(ms) ? ms : null;
}

// The whole point of this file: decide whether a scoreline is final, still being played, or
// not a scoreline at all. It used to be "has a score, therefore it's a result", which put a
// match that was still on into a list headed "Latest results".
//
// Status wins when the feed gives one, because it is the only direct evidence. When it
// doesn't — TheSportsDB is community-edited and strStatus is often blank — the clock decides,
// and it decides conservatively: inside the match window a score is live, not final. Getting
// that wrong in the safe direction shows a real score labelled LIVE for a few minutes after
// full time; getting it wrong the other way publishes a half-time score as the final result.
export function classifyEvent(e, now = Date.now()) {
  if (!e || String(e.idLeague) !== LEAGUE_ID) return "skip";
  const status = String(e.strStatus || "").trim();
  const hasScore = e.intHomeScore !== null && e.intHomeScore !== undefined && e.intHomeScore !== ""
    && e.intAwayScore !== null && e.intAwayScore !== undefined && e.intAwayScore !== "";

  if (NOT_STARTED_STATUS.test(status)) return "upcoming";
  if (FINISHED_STATUS.test(status)) return hasScore ? "result" : "upcoming";
  if (LIVE_STATUS.test(status)) return hasScore ? "live" : "upcoming";

  if (!hasScore) return "upcoming";

  const ko = kickoffMs(e);
  if (ko === null) return "live";                 // a score we can't date is not a proven result
  if (now < ko) return "live";                    // scored before kick-off per the clock: don't call it final
  return now - ko > MATCH_WINDOW_MS ? "result" : "live";
}

function row(e) {
  const h = toCode(e.strHomeTeam);
  const a = toCode(e.strAwayTeam);
  if (!h || !a) return null;
  return {
    h, a,
    date: e.dateEvent || "",
    time: (e.strTime || "").slice(0, 5),
    round: e.intRound || "",
  };
}

function withScore(r, e) {
  return { ...r, hs: +e.intHomeScore, as: +e.intAwayScore };
}

export function bucket(events, now = Date.now()) {
  const live = [], results = [], upcoming = [];
  const seen = new Set();
  for (const e of events) {
    const kind = classifyEvent(e, now);
    if (kind === "skip") continue;
    const r = row(e);
    if (!r) continue;
    // The two upstream feeds overlap around a matchday, so the same tie can arrive twice.
    const key = e.idEvent || `${r.h}-${r.a}-${r.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (kind === "live") live.push({ ...withScore(r, e), status: String(e.strStatus || "").trim() || null });
    else if (kind === "result") results.push(withScore(r, e));
    else upcoming.push(r);
  }
  return { live, results, upcoming };
}

export default async function handler(req, res) {
  try {
    const base = "https://www.thesportsdb.com/api/v1/json/123";
    const [pastR, nextR] = await Promise.all([
      fetch(`${base}/eventspastleague.php?id=${LEAGUE_ID}`, { headers: { "User-Agent": "GIBSON-IrishLeagueStats/1.0" } }),
      fetch(`${base}/eventsnextleague.php?id=${LEAGUE_ID}`, { headers: { "User-Agent": "GIBSON-IrishLeagueStats/1.0" } }),
    ]);
    if (!pastR.ok || !nextR.ok) throw new Error("upstream error");
    const past = await pastR.json();
    const next = await nextR.json();

    // Both feeds go through the same classifier: around a matchday an in-play tie can turn up
    // in either one, so which endpoint it came from says nothing about whether it has finished.
    const all = [...(Array.isArray(past && past.events) ? past.events : []),
                 ...(Array.isArray(next && next.events) ? next.events : [])];
    const { live, results, upcoming } = bucket(all);

    if (live.length === 0 && results.length === 0 && upcoming.length === 0) throw new Error("no usable events");

    // Short cache while anything is in play — a five-minute-old live score is a wrong score.
    res.setHeader("Cache-Control", live.length
      ? "s-maxage=60, stale-while-revalidate=120"
      : "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ ok: true, live: live.slice(0, 12), results: results.slice(0, 12), upcoming: upcoming.slice(0, 12) });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
}
