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
    // Checked on EVERY row, not just the first — CLAUDE.md rule 3 is about the rows, and a
    // payload that is right at the top and wrong further down is exactly what a cache mixing
    // two leagues looks like.
    if (t.some((x) => String(x.idLeague) !== LEAGUE_ID)) throw new Error("wrong league returned");

    // A whole number, or null. `+x || 0` quietly turned every unparseable value into a zero,
    // which reads as a real "played 0" rather than "we don't know".
    const int = (v) => {
      const s = String(v === null || v === undefined ? "" : v).trim();
      return /^-?\d{1,4}$/.test(s) ? Number(s) : null;
    };

    const rows = t
      .map((x) => {
        const name = (x.strTeam || "").toLowerCase();
        const hit = CLUB_MAP.find(([k]) => name.includes(k));
        if (!hit) return null;
        const p = int(x.intPlayed), w = int(x.intWin), d = int(x.intDraw), l = int(x.intLoss);
        const gd = int(x.intGoalDifference), pts = int(x.intPoints);
        if ([p, w, d, l, gd, pts].some((n) => n === null)) return null;
        if (p < 0 || w < 0 || d < 0 || l < 0 || p > 60) return null;
        // A league table is arithmetic, so it can check itself. These two identities hold in
        // every league that awards 3-1-0, and a payload that fails them is corrupt however
        // numeric it looks.
        if (w + d + l !== p) return null;
        if (pts !== w * 3 + d) return null;
        return {
          club: hit[1], p, w, d, l, gd, pts,
          // Form is rendered as W/D/L badges, so anything else is dropped rather than drawn.
          form: (String(x.strForm || "").match(/[WDL]/g) || []).slice(-5).join(""),
        };
      })
      .filter(Boolean);

    if (rows.length < 10) throw new Error("club name mapping or row validation failed");
    // Two rows for one club means the payload is mixing seasons or leagues.
    if (new Set(rows.map((r) => r.club)).size !== rows.length) throw new Error("duplicate clubs in table");

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
