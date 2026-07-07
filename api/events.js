// GIBSON live data layer — /api/events
// Recent results + upcoming fixtures for the NIFL Premiership (TheSportsDB league 4659).
// Same philosophy as /api/table: validate hard, normalise to GIBSON club codes,
// and return {ok:false} on any doubt so the app falls back to editorial data.

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

function normalise(events, withScores) {
  if (!Array.isArray(events)) return [];
  return events
    .filter((e) => String(e.idLeague) === LEAGUE_ID)
    .map((e) => {
      const h = toCode(e.strHomeTeam);
      const a = toCode(e.strAwayTeam);
      if (!h || !a) return null;
      const row = {
        h, a,
        date: e.dateEvent || "",
        time: (e.strTime || "").slice(0, 5),
        round: e.intRound || "",
      };
      if (withScores) {
        if (e.intHomeScore === null || e.intAwayScore === null) return null;
        row.hs = +e.intHomeScore;
        row.as = +e.intAwayScore;
      }
      return row;
    })
    .filter(Boolean);
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

    const results = normalise(past && past.events, true).slice(0, 12);
    const upcoming = normalise(next && next.events, false).slice(0, 12);

    if (results.length === 0 && upcoming.length === 0) throw new Error("no usable events");

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ ok: true, results, upcoming });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
}
