// GIBSON live data layer — /api/table
// Fetches the NIFL Premiership table from TheSportsDB (league 4659), validates it
// hard, and normalises to GIBSON club codes. On ANY doubt it returns {ok:false}
// and the app silently falls back to the editorial data in data.js.

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

export default async function handler(req, res) {
  try {
    const r = await fetch(
      `https://www.thesportsdb.com/api/v1/json/123/lookuptable.php?l=${LEAGUE_ID}`,
      { headers: { "User-Agent": "GIBSON-IrishLeagueStats/1.0" } }
    );
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const j = await r.json();
    const t = j && j.table;

    if (!Array.isArray(t) || t.length < 10) throw new Error("bad payload");
    // Critical guard: TheSportsDB has been observed serving cached EXAMPLE data
    // (English Premier League) to some clients. Never trust the wrong league.
    if (String(t[0].idLeague) !== LEAGUE_ID) throw new Error("wrong league returned");

    const rows = t
      .map((x) => {
        const name = (x.strTeam || "").toLowerCase();
        const hit = CLUB_MAP.find(([k]) => name.includes(k));
        if (!hit) return null;
        return {
          club: hit[1],
          p: +x.intPlayed || 0,
          w: +x.intWin || 0,
          d: +x.intDraw || 0,
          l: +x.intLoss || 0,
          gd: +x.intGoalDifference || 0,
          pts: +x.intPoints || 0,
          form: (x.strForm || "").slice(-5),
        };
      })
      .filter(Boolean);

    if (rows.length < 10) throw new Error("club name mapping failed");

    // 5-minute edge cache: kind to the free API, fresh enough for a league table
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      ok: true,
      season: t[0].strSeason || "",
      updated: (t[0].dateUpdated || "").slice(0, 10),
      rows,
    });
  } catch (e) {
    // Fail soft, always: the app keeps its editorial table.
    return res.status(200).json({ ok: false, error: String((e && e.message) || e) });
  }
}
