// GIBSON — probe: where can we get per-match stats for the Irish League?
//
//   node scripts/probe-stats-sources.js
//   APIFOOTBALL_KEY=... node scripts/probe-stats-sources.js
//
// Read-only. Writes nothing, changes nothing, and is not wired into the build. It answers one
// question: for the NIFL Premiership specifically, which feeds actually carry possession /
// shots / corners per match, as opposed to just fixtures, results and a table?
//
// Small leagues are exactly where coverage thins out, and every provider's marketing says
// "1,200+ competitions". The only trustworthy answer is to ask about THIS league and look at
// what comes back, which is what this does.
//
// Nothing here is a licence to scrape. API-Football is a licensed API; TheSportsDB we already
// use. Reading numbers off a live-score website by hand is fine; automating against one is
// against their terms, and most are funded by bookmaker advertising, which GIBSON does not
// carry (CLAUDE.md golden rule 2).
//
// ---- FINDINGS, first run: 7 Aug 2026 (opening night, event 2503180) ---------------------
//   strStatus IS populated — came back "FT" on a finished match. So /api/events can rely on
//   the feed's own status to separate live from finished, and the 150-minute clock in
//   classifyEvent() is a backstop for blank rows rather than the primary mechanism. Keep both:
//   the field being present once is not a promise it always will be.
//
//   lookupeventstats exists on the free key but returned ZERO rows for league 4659. So
//   TheSportsDB does not carry possession/shots for the Irish League, and the cheap route —
//   no new key, no new dependency — is closed. Re-run this occasionally; a community-edited
//   feed can gain coverage.
//
//   API-Football untested: needs a free key in the APIFOOTBALL_KEY repository secret.

const LEAGUE_ID = "4659";                       // TheSportsDB's NIFL Premiership
const TIMEOUT_MS = 15000;

const ok = (s) => `[32m${s}[0m`;
const no = (s) => `[31m${s}[0m`;
const dim = (s) => `[2m${s}[0m`;

async function getJson(url, headers) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { "User-Agent": "GIBSON-IrishLeagueStats/1.0", ...(headers || {}) }, signal: ctrl.signal });
    const text = await r.text();
    let body = null;
    try { body = JSON.parse(text); } catch { /* not JSON — keep the raw text for the message */ }
    return { status: r.status, body, raw: text.slice(0, 200) };
  } catch (e) {
    return { status: 0, body: null, raw: String((e && e.message) || e) };
  } finally {
    clearTimeout(t);
  }
}

// Which fields in a stats payload actually matter to us. Reported individually rather than as
// a yes/no, because "has statistics" is often true while the only field populated is shots.
const WANTED = ["possession", "shots", "shots on target", "corners", "fouls", "cards"];
function summariseFields(names) {
  const lower = names.map((n) => String(n).toLowerCase());
  return WANTED.map((w) => {
    const hit = lower.some((n) => n.includes(w.split(" ")[0]) && w.split(" ").every((part) => n.includes(part)));
    return `${hit ? ok("yes") : no("no ")} ${w}`;
  });
}

// ---- TheSportsDB -------------------------------------------------------------------------
// We already call this feed for the table and for live scores, so if it carries match stats
// on the key we're using, it is by far the cheapest answer: no new dependency, no new key.
async function probeSportsDb() {
  console.log("\n=== TheSportsDB (free key 123 — the feed GIBSON already uses) ===");
  const base = "https://www.thesportsdb.com/api/v1/json/123";

  const past = await getJson(`${base}/eventspastleague.php?id=${LEAGUE_ID}`);
  if (past.status !== 200 || !past.body) {
    console.log(no(`  couldn't reach the events endpoint (status ${past.status}) — ${past.raw}`));
    return;
  }
  const events = Array.isArray(past.body.events) ? past.body.events.filter((e) => String(e.idLeague) === LEAGUE_ID) : [];
  console.log(`  recent league-${LEAGUE_ID} events: ${events.length}`);
  if (!events.length) {
    console.log(dim("  no events to probe stats with — try again after a matchday"));
    return;
  }

  const ev = events[0];
  console.log(dim(`  probing event ${ev.idEvent}: ${ev.strHomeTeam} v ${ev.strAwayTeam}, ${ev.dateEvent}`));
  console.log(`  strStatus on that event: ${ev.strStatus ? ok(`"${ev.strStatus}"`) : no("(empty)")}` +
    dim("   <- decides whether the live/finished split can use status or has to fall back to the clock"));

  const stats = await getJson(`${base}/lookupeventstats.php?id=${ev.idEvent}`);
  if (stats.status !== 200) {
    console.log(no(`  lookupeventstats: status ${stats.status}`) + dim(" — likely not on the free key"));
    return;
  }
  const rows = stats.body && Array.isArray(stats.body.eventstats) ? stats.body.eventstats : null;
  if (!rows || rows.length === 0) {
    console.log(no("  lookupeventstats returned no rows") + dim(" — endpoint exists but is empty for this league"));
    return;
  }
  const names = rows.map((r) => r.strStat);
  console.log(ok(`  lookupeventstats returned ${rows.length} rows:`), dim(names.join(", ")));
  summariseFields(names).forEach((l) => console.log(`    ${l}`));
}

// ---- API-Football ------------------------------------------------------------------------
// Its /leagues response carries a per-league `coverage` object, which is the honest answer to
// "do you cover the Irish League properly" — far better than the marketing number.
async function probeApiFootball(key) {
  console.log("\n=== API-Football (api-sports.io) ===");
  if (!key) {
    console.log(dim("  no APIFOOTBALL_KEY set — skipping."));
    console.log(dim("  Free key: https://www.api-football.com  (100 requests/day, plenty for six games a week)"));
    return;
  }
  const H = { "x-apisports-key": key };

  // The country name has to be discovered, not typed. `country=Northern%20Ireland` was
  // rejected outright — "The Country field may only contain alpha-numeric characters,
  // underscores, and dashes" — because the space survives decoding, and the probe never got
  // as far as asking about coverage. Whether their spelling is "Northern-Ireland",
  // "Northern_Ireland" or something else is exactly the kind of thing to ask rather than
  // guess, so: search /countries, then use the name it hands back verbatim.
  const countries = await getJson("https://v3.football.api-sports.io/countries?search=ireland", H);
  if (countries.status !== 200 || !countries.body) {
    console.log(no(`  /countries failed (status ${countries.status}) — ${countries.raw}`));
    return;
  }
  if (countries.body.errors && Object.keys(countries.body.errors).length) {
    console.log(no(`  /countries returned errors: ${JSON.stringify(countries.body.errors)}`));
    return;
  }
  const found = Array.isArray(countries.body.response) ? countries.body.response : [];
  const ni = found.find((c) => /^northern[\s_-]?ireland$/i.test(String(c.name || "")));
  if (!ni) {
    console.log(no("  no Northern Ireland entry in /countries"));
    console.log(dim(`  searching "ireland" returned: ${found.map((c) => c.name).join(", ") || "(nothing)"}`));
    return;
  }
  console.log(dim(`  country as API-Football spells it: "${ni.name}"${ni.code ? ` (code ${ni.code})` : ""}`));

  const leagues = await getJson(`https://v3.football.api-sports.io/leagues?country=${encodeURIComponent(ni.name)}`, H);
  if (leagues.status !== 200 || !leagues.body) {
    console.log(no(`  /leagues failed (status ${leagues.status}) — ${leagues.raw}`));
    return;
  }
  if (leagues.body.errors && Object.keys(leagues.body.errors).length) {
    console.log(no(`  API returned errors: ${JSON.stringify(leagues.body.errors)}`));
    return;
  }
  const all = Array.isArray(leagues.body.response) ? leagues.body.response : [];
  console.log(`  competitions listed for Northern Ireland: ${all.length}`);
  const prem = all.find((x) => /premiership/i.test(x.league?.name || "")) || all[0];
  if (!prem) { console.log(no("  no competitions returned")); return; }

  const id = prem.league.id;
  console.log(`  matched: ${ok(prem.league.name)} (id ${id}, type ${prem.league.type})`);

  // Seasons carry their own coverage — a league can be covered this year and not last.
  const seasons = Array.isArray(prem.seasons) ? prem.seasons : [];
  const latest = seasons[seasons.length - 1];
  const current = seasons.find((s) => s.current) || latest;
  if (!current) { console.log(no("  no seasons listed")); return; }
  const cov = current.coverage || {};
  const fx = cov.fixtures || {};
  console.log(`  season ${current.year}${current.current ? " (current)" : ""}: ${current.start} → ${current.end}`);
  const flag = (v, label) => `    ${v ? ok("yes") : no("no ")} ${label}`;
  console.log(flag(fx.statistics_fixtures, "fixtures.statistics_fixtures  <- THE ONE THAT MATTERS (team match stats)"));
  console.log(flag(fx.statistics_players, "fixtures.statistics_players   (per-player stats)"));
  console.log(flag(fx.events, "fixtures.events               (goals, cards, subs)"));
  console.log(flag(fx.lineups, "fixtures.lineups"));
  console.log(flag(cov.standings, "standings"));
  console.log(flag(cov.top_scorers, "top_scorers"));
  console.log(flag(cov.odds, "odds") + dim("   <- GIBSON must not use this: golden rule 2"));

  if (!fx.statistics_fixtures) {
    console.log(no("\n  Verdict: team match stats are NOT covered for this league/season."));
  }

  // Confirm the flags against a real payload, because a flag is a promise and a payload is
  // evidence. This used to `return` the moment statistics_fixtures was false — which is exactly
  // the case for this league, so the flags that ARE set (events, lineups) went unconfirmed and
  // the two questions they answer, scorers and appearances, stayed open. Now every covered
  // endpoint gets checked, and match stats are simply one of them.
  const fixtures = await getJson(`https://v3.football.api-sports.io/fixtures?league=${id}&season=${current.year}&last=1`, H);
  const f = fixtures.body?.response?.[0];
  if (!f) { console.log(dim("\n  no finished fixture yet to confirm anything against")); return; }
  const fid = f.fixture.id;
  console.log(`\n  confirming against ${ok(`${f.teams.home.name} v ${f.teams.away.name}`)}` +
    dim(` ${String(f.fixture.date).slice(0, 10)} · fixture ${fid} · ${f.goals.home}-${f.goals.away} (${f.fixture.status?.short})`));

  // Referee and attendance were asked about directly. Report what the fixture object itself
  // carries rather than assuming a field exists — attendance is not a coverage flag, so the
  // only way to know is to look for it.
  console.log(`    referee: ${f.fixture.referee ? ok(`"${f.fixture.referee}"`) : no("(empty)")}`);
  console.log(`    venue:   ${f.fixture.venue?.name ? ok(`"${f.fixture.venue.name}"`) : no("(empty)")}`);
  const attendKeys = [];
  const hunt = (obj, path) => {
    if (!obj || typeof obj !== "object" || path.length > 3) return;
    for (const [k, v] of Object.entries(obj)) {
      if (/attend|spectator|crowd/i.test(k)) attendKeys.push(`${[...path, k].join(".")} = ${JSON.stringify(v)}`);
      if (v && typeof v === "object") hunt(v, [...path, k]);
    }
  };
  hunt(f, []);
  console.log(`    attendance: ${attendKeys.length ? ok(attendKeys.join(", ")) : no("no attendance-like key anywhere in the fixture object")}`);

  if (fx.events) {
    const ev = await getJson(`https://v3.football.api-sports.io/fixtures/events?fixture=${fid}`, H);
    const rows = Array.isArray(ev.body?.response) ? ev.body.response : [];
    if (!rows.length) {
      console.log(no("    events:  flag says yes, but /fixtures/events came back EMPTY"));
    } else {
      const goals = rows.filter((r) => /goal/i.test(r.type || ""));
      const cards = rows.filter((r) => /card/i.test(r.type || ""));
      const subs = rows.filter((r) => /subst/i.test(r.type || ""));
      console.log(ok(`    events:  ${rows.length} rows`) + dim(` — ${goals.length} goal, ${cards.length} card, ${subs.length} subst`));
      // Print them: the whole question is whether a named player and a minute come back.
      for (const g of goals) console.log(dim(`       GOAL  ${String(g.time?.elapsed ?? "?")}'  ${g.player?.name || "(no player)"}  [${g.team?.name}] ${g.detail || ""}`));
      for (const c of cards) console.log(dim(`       CARD  ${String(c.time?.elapsed ?? "?")}'  ${c.player?.name || "(no player)"}  [${c.team?.name}] ${c.detail || ""}`));
    }
  }

  if (fx.lineups) {
    const lu = await getJson(`https://v3.football.api-sports.io/fixtures/lineups?fixture=${fid}`, H);
    const rows = Array.isArray(lu.body?.response) ? lu.body.response : [];
    if (!rows.length) {
      console.log(no("    lineups: flag says yes, but /fixtures/lineups came back EMPTY"));
    } else {
      console.log(ok(`    lineups: ${rows.length} team blocks`));
      for (const t of rows) {
        const xi = (t.startXI || []).length, subs = (t.substitutes || []).length;
        const sample = (t.startXI || []).slice(0, 3).map((p) => p.player?.name).filter(Boolean).join(", ");
        console.log(dim(`       ${t.team?.name}: formation ${t.formation || "?"}, XI ${xi}, subs ${subs}${sample ? ` — e.g. ${sample}` : ""}`));
      }
    }
  }

  if (fx.statistics_fixtures) {
    const st = await getJson(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${fid}`, H);
    const teams = Array.isArray(st.body?.response) ? st.body.response : [];
    if (!teams.length) { console.log(no("    stats:   /fixtures/statistics came back empty for it")); return; }
    const names = (teams[0].statistics || []).map((s) => s.type);
    console.log(ok(`    stats:   ${names.length} stat types`), dim(names.join(", ")));
    summariseFields(names).forEach((l) => console.log(`      ${l}`));
  }
}

console.log("GIBSON — probing per-match stat sources for the NIFL Premiership");
console.log(dim("Read-only. Nothing is written and nothing is scraped."));
await probeSportsDb();
await probeApiFootball(process.env.APIFOOTBALL_KEY);
console.log(`
=== What to do with this ===
 - If TheSportsDB's lookupeventstats returned the fields we want, use it: no new key, no new
   dependency, and /api/events already talks to that feed.
 - Otherwise, if API-Football says statistics_fixtures: yes AND the confirming payload has
   possession and shots, that's the clean automated route — it's a licensed API with a free
   tier that covers six games a week many times over.
 - If neither, keep transcribing by hand from a live-score app. That works, it's what round 1
   was done with, and scripts/promo/matchstats.mjs already refuses numbers that don't add up.
Never wire a bookmaker's odds feed into GIBSON, whatever a provider offers (golden rule 2).
`);
