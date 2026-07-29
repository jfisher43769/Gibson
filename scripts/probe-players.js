// GIBSON player-data probe — DIAGNOSTIC ONLY. Manually run:
//   node scripts/probe-players.js
//   node scripts/probe-players.js --out=PLAYER-DATA-PROBE.md   (default filename)
//
// Answers one question: does TheSportsDB carry enough player data to build squad lists
// for the twelve Premiership clubs? It writes a human-readable report and NOTHING else.
//
// THIS SCRIPT NEVER TOUCHES data.js. It has no write path to it, imports it read-only for
// the club list, and the only file it produces is the markdown report.
//
// Request pattern is deliberately identical to api/events.js — same free-tier key ("123"),
// same User-Agent — so this probes exactly what the app itself would see, not a different
// tier with different coverage.
//
// TRUST MODEL (CLAUDE.md: feed data is untrusted, validate shape before reading it):
//   * Every response is checked for the expected container type before any field is read.
//   * Teams are filtered to idLeague === "4659". TheSportsDB has served cached English
//     Premier League data before; a probe that silently measured the wrong league would be
//     worse than no probe.
//   * Field values are only ever counted, classified, or — for the two quoted samples —
//     escaped and truncated. Nothing is parsed as code, and nothing is written to data.js.
//
// RATE LIMIT: the free tier allows 30 requests/minute. This makes 1 + N calls (N = teams),
// spaced by REQUEST_GAP_MS, which keeps it comfortably under that ceiling.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CLUBS } from "../data.js";

const BASE = "https://www.thesportsdb.com/api/v1/json/123";
const HEADERS = { "User-Agent": "GIBSON-IrishLeagueStats/1.0" };
const LEAGUE_ID = "4659";
const REQUEST_GAP_MS = 2500; // 24 req/min — under the 30/min free-tier cap with headroom
const OUT = (process.argv.find((a) => a.startsWith("--out=")) || "").split("=")[1] || "PLAYER-DATA-PROBE.md";
const OUT_PATH = fileURLToPath(new URL(`../${OUT}`, import.meta.url));

// The twelve current clubs (GLV is relegated, kept in data.js only for the 25/26 archive).
const CURRENT = Object.keys(CLUBS).filter((k) => k !== "GLV");
// First word of each club's name is a distinctive token for all twelve ("Dungannon Swifts"
// -> "dungannon"). Derived from data.js rather than hardcoded, so it can't drift from it.
const TOKEN = Object.fromEntries(CURRENT.map((c) => [c, CLUBS[c].name.split(" ")[0].toLowerCase()]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The fields a squad list would need, and how to read each from a TheSportsDB player record.
const FIELDS = [
  ["name", "strPlayer"],
  ["position", "strPosition"],
  ["date of birth", "dateBorn"],
  ["nationality", "strNationality"],
  ["squad number", "strNumber"],
  ["description", "strDescriptionEN"],
  ["image", "strThumb"],
];
const filled = (v) => v !== null && v !== undefined && String(v).trim() !== "";

async function getJson(url, label) {
  try {
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) return { error: `HTTP ${r.status}` };
    const j = await r.json();
    if (j === null || typeof j !== "object" || Array.isArray(j)) return { error: "response was not a JSON object" };
    return { json: j };
  } catch (e) {
    return { error: `request failed: ${String((e && e.message) || e)}` };
  }
}

// ---- 0. Which league id does TheSportsDB actually use for the NIFL Premiership? ---------
// The first run of this probe found that lookup_all_teams.php?id=4659 returns English
// League 1. Before anything else, establish whether 4659 is simply the WRONG ID (our bug)
// or a right id being mis-served (their bug) — those have opposite fixes, and every other
// question here depends on the answer.
//
// Reported RAW: the full unfiltered row count for each endpoint, then every Northern
// Ireland league found, before any judgement about which one we want.
const leagueProbe = { all: null, search: null, niLeagues: [], candidate: null };

console.log("Discovering leagues...");
const allLeaguesRes = await getJson(`${BASE}/all_leagues.php`, "all_leagues");
if (allLeaguesRes.error) {
  leagueProbe.all = { error: allLeaguesRes.error };
  console.log(`  all_leagues.php: ${allLeaguesRes.error}`);
} else {
  const rows = allLeaguesRes.json.leagues;
  leagueProbe.all = Array.isArray(rows)
    ? { rawCount: rows.length, rows: rows.filter((l) => l && typeof l === "object") }
    : { error: `'leagues' was ${rows === null ? "null" : typeof rows}, not an array` };
  console.log(`  all_leagues.php: ${leagueProbe.all.rawCount ?? "—"} rows`);
}

await sleep(REQUEST_GAP_MS);
const searchRes = await getJson(`${BASE}/search_all_leagues.php?c=Northern%20Ireland`, "search_leagues");
if (searchRes.error) {
  leagueProbe.search = { error: searchRes.error };
  console.log(`  search_all_leagues.php?c=Northern Ireland: ${searchRes.error}`);
} else {
  // This endpoint uses `countries` as its container, not `leagues`.
  const rows = searchRes.json.countries ?? searchRes.json.leagues;
  leagueProbe.search = Array.isArray(rows)
    ? { rawCount: rows.length, rows: rows.filter((l) => l && typeof l === "object") }
    : { error: `container was ${rows === null ? "null" : typeof rows}, not an array` };
  console.log(`  search_all_leagues.php?c=Northern Ireland: ${leagueProbe.search.rawCount ?? "—"} rows`);
}

// Pool every league either endpoint associates with Northern Ireland, and every league whose
// name looks Northern Irish, so the report can show the full field rather than one guess.
const NI_NAME = /northern ireland|nifl|irish (league|premiership)|premiership/i;
const poolRows = [...(leagueProbe.all?.rows || []), ...(leagueProbe.search?.rows || [])];
const seenLeagueIds = new Set();
for (const l of poolRows) {
  const id = l.idLeague !== undefined ? String(l.idLeague) : "";
  const name = l.strLeague !== undefined ? String(l.strLeague) : "";
  const country = l.strCountry !== undefined ? String(l.strCountry) : "";
  const isNI = country.toLowerCase() === "northern ireland" || (country === "" && NI_NAME.test(name));
  if (!isNI || !id || seenLeagueIds.has(id)) continue;
  seenLeagueIds.add(id);
  leagueProbe.niLeagues.push({ id, name, country: country || "(absent)", sport: l.strSport ? String(l.strSport) : "(absent)" });
}
// Best candidate for the top flight: a Northern Ireland league whose name reads as the
// Premiership. Reported as a candidate, not a conclusion.
leagueProbe.candidate = leagueProbe.niLeagues.find((l) => /premiership|premier/i.test(l.name))
  || leagueProbe.niLeagues[0] || null;
console.log(`  Northern Ireland leagues found: ${leagueProbe.niLeagues.length}`);
if (leagueProbe.candidate) console.log(`  candidate top flight: ${leagueProbe.candidate.id} "${leagueProbe.candidate.name}"`);

const CANDIDATE_ID = leagueProbe.candidate?.id || null;

// ---- 0b. Do the live endpoints suffer the same substitution? ----------------------------
// api/table.js and api/events.js are what the SITE depends on. If they are also being served
// another league, their idLeague guard rejects everything and the app silently falls back to
// data.js forever while appearing healthy — no error, no signal. Probe both ids, both
// endpoints, and report the raw shape of each.
const eventProbes = [];
for (const id of [LEAGUE_ID, ...(CANDIDATE_ID && CANDIDATE_ID !== LEAGUE_ID ? [CANDIDATE_ID] : [])]) {
  for (const ep of ["eventspastleague", "eventsnextleague"]) {
    await sleep(REQUEST_GAP_MS);
    const res = await getJson(`${BASE}/${ep}.php?id=${id}`, `${ep}-${id}`);
    const entry = { endpoint: ep, id };
    if (res.error) entry.error = res.error;
    else {
      const rows = res.json.events;
      if (rows === null) entry.note = "events: null (no data)";
      else if (!Array.isArray(rows)) entry.error = `'events' was ${typeof rows}, not an array`;
      else {
        const valid = rows.filter((e) => e && typeof e === "object");
        entry.rawCount = rows.length;
        entry.leagueIds = [...new Set(valid.map((e) => (e.idLeague !== undefined ? String(e.idLeague) : "(absent)")))];
        entry.leagueNames = [...new Set(valid.map((e) => (e.strLeague !== undefined ? String(e.strLeague) : "(absent)")))];
        entry.onTarget = valid.filter((e) => String(e.idLeague) === id).length;
        entry.sample = valid.slice(0, 3).map((e) => `${e.strHomeTeam ?? "?"} v ${e.strAwayTeam ?? "?"} (${e.dateEvent ?? "?"})`);
      }
    }
    eventProbes.push(entry);
    console.log(`  ${ep}.php?id=${id}: ${entry.error || entry.note || `${entry.rawCount} rows, leagues ${entry.leagueIds.join("/")}, ${entry.onTarget} on target`}`);
  }
}

// ---- 1. Teams in the league ------------------------------------------------------------
// Probe the ORIGINAL id first (that is the one the app is wired to), then the candidate.
console.log(`\nProbing teams for league ${LEAGUE_ID}...`);
await sleep(REQUEST_GAP_MS);
const teamsRes = await getJson(`${BASE}/lookup_all_teams.php?id=${LEAGUE_ID}`, "teams");
if (teamsRes.error) {
  console.error(`\n✗ Could not retrieve teams: ${teamsRes.error}. Nothing written.\n`);
  process.exit(1);
}
const rawTeams = teamsRes.json.teams;
if (!Array.isArray(rawTeams)) {
  console.error(`\n✗ 'teams' was ${rawTeams === null ? "null" : typeof rawTeams}, not an array. Nothing written.\n`);
  process.exit(1);
}

// A PROBE MUST SHOW ITS EVIDENCE. An earlier version filtered on idLeague first and
// reported "0 usable" without saying what the 24 returned rows actually were — which
// answers nothing. So: keep every structurally-valid row, record what league id each
// carries, and let the report show the discrepancy rather than swallow it.
//
// This is NOT a relaxation of CLAUDE.md rule 3. That rule governs what may be TRUSTED and
// written into the app; nothing here is written anywhere. The league-id mismatch is
// surfaced as a headline finding precisely because it would block ingestion.
const teams = rawTeams
  .filter((t) => t && typeof t === "object")
  .filter((t) => filled(t.idTeam) && filled(t.strTeam))
  .map((t) => ({ id: String(t.idTeam), name: String(t.strTeam), league: filled(t.idLeague) ? String(t.idLeague) : "(absent)", leagueName: filled(t.strLeague) ? String(t.strLeague) : "(absent)" }));

const leagueIds = [...new Set(teams.map((t) => t.league))];
const onLeague = teams.filter((t) => t.league === LEAGUE_ID).length;
console.log(`  ${rawTeams.length} rows returned, ${teams.length} structurally valid`);
console.log(`  idLeague values present: ${leagueIds.join(", ")} (${onLeague} row(s) carry ${LEAGUE_ID})`);

// Now the same call against the candidate id discovered in phase 0.
let candTeams = null;
if (CANDIDATE_ID && CANDIDATE_ID !== LEAGUE_ID) {
  await sleep(REQUEST_GAP_MS);
  console.log(`Probing teams for candidate league ${CANDIDATE_ID}...`);
  const r = await getJson(`${BASE}/lookup_all_teams.php?id=${CANDIDATE_ID}`, "cand-teams");
  if (r.error) { candTeams = { error: r.error }; }
  else if (!Array.isArray(r.json.teams)) { candTeams = { error: `'teams' was ${r.json.teams === null ? "null" : typeof r.json.teams}, not an array` }; }
  else {
    const rows = r.json.teams;
    const list = rows.filter((t) => t && typeof t === "object").filter((t) => filled(t.idTeam) && filled(t.strTeam))
      .map((t) => ({ id: String(t.idTeam), name: String(t.strTeam), league: filled(t.idLeague) ? String(t.idLeague) : "(absent)", leagueName: filled(t.strLeague) ? String(t.strLeague) : "(absent)" }));
    candTeams = { rawCount: rows.length, list, onLeague: list.filter((t) => t.league === CANDIDATE_ID).length };
  }
  console.log(`  ${candTeams.error || `${candTeams.rawCount} rows, ${candTeams.onLeague} carry ${CANDIDATE_ID}`}`);
}

// Squad lookups run against whichever source actually contains our clubs. If the candidate
// id returns the real Premiership, that is where the player data question gets answered.
const matchIn = (list) => {
  const m = {};
  for (const code of CURRENT) {
    const hit = list.find((t) => t.name.toLowerCase().includes(TOKEN[code]));
    if (hit) m[code] = hit;
  }
  return m;
};
const matchedOriginal = matchIn(teams);
const matchedCandidate = candTeams?.list ? matchIn(candTeams.list) : {};
const useCandidate = Object.keys(matchedCandidate).length > Object.keys(matchedOriginal).length;
const sourceList = useCandidate ? candTeams.list : teams;
const SOURCE_ID = useCandidate ? CANDIDATE_ID : LEAGUE_ID;
const matched = useCandidate ? matchedCandidate : matchedOriginal;
const usedTeamIds = new Set(Object.values(matched).map((t) => t.id));
const unmatchedFeedTeams = sourceList.filter((t) => !usedTeamIds.has(t.id));
console.log(`Squad lookups will use league ${SOURCE_ID} (${Object.keys(matched).length}/${CURRENT.length} clubs matched there)`);

// ---- 2. Players per team ---------------------------------------------------------------
const results = {};
for (const code of CURRENT) {
  const team = matched[code];
  if (!team) { results[code] = { error: "club not found in the teams response" }; continue; }
  await sleep(REQUEST_GAP_MS);
  process.stdout.write(`  ${code} (${team.name})... `);
  const res = await getJson(`${BASE}/lookup_all_players.php?id=${team.id}`, code);
  if (res.error) { results[code] = { team, error: res.error }; console.log(res.error); continue; }
  const list = res.json.player;
  if (list === null) { results[code] = { team, players: [], note: "API returned player: null (no squad on record)" }; console.log("0 players (null)"); continue; }
  if (!Array.isArray(list)) { results[code] = { team, error: `'player' was ${typeof list}, not an array` }; console.log("bad shape"); continue; }
  const players = list.filter((p) => p && typeof p === "object");
  results[code] = { team, players };
  console.log(`${players.length} players`);
}

// ---- 3. Field population ---------------------------------------------------------------
const allPlayers = Object.values(results).flatMap((r) => r.players || []);
const fieldStats = FIELDS.map(([label, key]) => {
  const n = allPlayers.filter((p) => filled(p[key])).length;
  return { label, key, filled: n, empty: allPlayers.length - n };
});

// Samples are ESCAPED and TRUNCATED before going anywhere near the report — this is
// untrusted third-party text and the report is a repo file.
const clean = (v, max = 160) => {
  if (!filled(v)) return "(empty)";
  const s = String(v).replace(/[\r\n]+/g, " ").replace(/`/g, "'").trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
};
const sampleFrom = Object.values(results).find((r) => (r.players || []).length);
const samples = (sampleFrom?.players || []).slice(0, 2);

// ---- 4. Verdict ------------------------------------------------------------------------
const found = CURRENT.filter((c) => matched[c]);
const missing = CURRENT.filter((c) => !matched[c]);
const withPlayers = CURRENT.filter((c) => (results[c].players || []).length > 0);
const emptyClubs = CURRENT.filter((c) => matched[c] && (results[c].players || []).length === 0);
const pct = (n) => (allPlayers.length ? Math.round((n / allPlayers.length) * 100) : 0);
const nameOk = pct(fieldStats.find((f) => f.key === "strPlayer").filled);
const posOk = pct(fieldStats.find((f) => f.key === "strPosition").filled);

let verdict;
if (withPlayers.length === 0) verdict = "**NOT USABLE.** No club returned a single player record.";
else if (withPlayers.length < CURRENT.length / 2) verdict = `**NOT USABLE as a squad source.** Only ${withPlayers.length} of ${CURRENT.length} clubs returned any players, so most club pages would still be empty.`;
else if (nameOk < 95 || posOk < 60) verdict = `**PARTIAL.** ${withPlayers.length}/${CURRENT.length} clubs have squads, but field coverage is patchy (name ${nameOk}%, position ${posOk}%) — usable as a starting point only, with per-record checking.`;
else verdict = `**USABLE as a squad-list source.** ${withPlayers.length}/${CURRENT.length} clubs returned players with name ${nameOk}% and position ${posOk}% populated.`;

// The league-id discrepancy is a blocker in its own right, independent of coverage. CLAUDE.md
// rule 3 exists because this feed has served the wrong league before; if rows queried by
// league 4659 come back tagged as something else, no amount of good player data can be
// ingested until that is understood.
if (onLeague < teams.length) {
  verdict += `\n\n⚠ **Blocking caveat regardless of the above:** only ${onLeague} of ${teams.length} rows returned by \`lookup_all_teams.php?id=${LEAGUE_ID}\` actually carry \`idLeague === "${LEAGUE_ID}"\` (values seen: ${leagueIds.map((v) => `\`${v}\``).join(", ")}). CLAUDE.md rule 3 requires that check before any of this is trusted, so this must be explained before ingestion — see the full team table below.`;
}

// ---- 5. Report -------------------------------------------------------------------------
const L = [];
L.push("# GIBSON — TheSportsDB player-data probe");
L.push("");
L.push(`Generated by \`scripts/probe-players.js\` on ${new Date().toISOString().slice(0, 10)}. **Diagnostic only — no data from this probe has been written into \`data.js\` or anywhere else in the app.**`);
L.push("");
L.push(`Source: TheSportsDB free tier (key \`123\`), league \`${LEAGUE_ID}\`, endpoints \`lookup_all_teams.php\` and \`lookup_all_players.php\`. Same key and request pattern as \`api/events.js\`, so this reflects what the app itself would see.`);
L.push("");
L.push("## Verdict");
L.push("");
L.push(verdict);
L.push("");
L.push("## 1. Which league id does TheSportsDB use for Northern Ireland?");
L.push("");
L.push(`- \`all_leagues.php\` — ${leagueProbe.all?.error ? `⚠ ${leagueProbe.all.error}` : `**${leagueProbe.all.rawCount} leagues returned in total** (raw, before any filtering)`}.`);
L.push(`- \`search_all_leagues.php?c=Northern%20Ireland\` — ${leagueProbe.search?.error ? `⚠ ${leagueProbe.search.error}` : `**${leagueProbe.search.rawCount} rows returned** (raw)`}.`);
L.push("");
if (!leagueProbe.niLeagues.length) {
  L.push("**No Northern Ireland league was found by either endpoint.**");
} else {
  L.push(`Every league either endpoint associates with Northern Ireland (${leagueProbe.niLeagues.length}):`);
  L.push("");
  L.push("| idLeague | Name | Country | Sport |");
  L.push("|---|---|---|---|");
  for (const l of leagueProbe.niLeagues) L.push(`| \`${clean(l.id, 12)}\` | ${clean(l.name, 50)} | ${clean(l.country, 30)} | ${clean(l.sport, 20)} |`);
  L.push("");
  if (leagueProbe.candidate) {
    L.push(`**Candidate top flight:** \`${clean(leagueProbe.candidate.id, 12)}\` — ${clean(leagueProbe.candidate.name, 50)}.`);
    L.push(leagueProbe.candidate.id === LEAGUE_ID
      ? `That is the id the app already uses (\`${LEAGUE_ID}\`), so the id is right and the endpoint is mis-serving it.`
      : `⚠ The app uses \`${LEAGUE_ID}\`, which is **not** this id.`);
  }
}
L.push("");
L.push("## 2. Live endpoints — is the site's own data path affected?");
L.push("");
L.push("`api/table.js` and `api/events.js` depend on these. Raw row counts and the league ids actually present in each response:");
L.push("");
L.push("| Endpoint | Requested id | Rows returned | idLeague values present | On target | strLeague |");
L.push("|---|---|---|---|---|---|");
for (const e of eventProbes) {
  const rows = e.error ? `⚠ ${clean(e.error, 30)}` : e.note ? clean(e.note, 30) : String(e.rawCount);
  const ids = e.leagueIds ? e.leagueIds.map((v) => `\`${clean(v, 12)}\``).join(", ") : "—";
  const names = e.leagueNames ? e.leagueNames.map((v) => clean(v, 30)).join(", ") : "—";
  const on = e.onTarget === undefined ? "—" : `${e.onTarget}${e.onTarget === 0 && e.rawCount ? " ⚠" : ""}`;
  L.push(`| \`${e.endpoint}.php\` | \`${e.id}\` | ${rows} | ${ids} | ${on} | ${names} |`);
}
L.push("");
for (const e of eventProbes) {
  if (e.sample?.length) { L.push(`Sample from \`${e.endpoint}.php?id=${e.id}\`: ${e.sample.map((s) => `\`${clean(s, 60)}\``).join(", ")}.`); L.push(""); }
}
L.push("## 3. Teams response");
L.push("");
L.push(`- \`lookup_all_teams.php?id=${LEAGUE_ID}\` (the id the app uses): ${rawTeams.length} rows returned, ${teams.length} structurally valid.`);
if (candTeams) {
  L.push(candTeams.error
    ? `- \`lookup_all_teams.php?id=${CANDIDATE_ID}\` (candidate): ⚠ ${candTeams.error}`
    : `- \`lookup_all_teams.php?id=${CANDIDATE_ID}\` (candidate): ${candTeams.rawCount} rows returned, ${candTeams.onLeague} carrying \`${CANDIDATE_ID}\`, ${Object.keys(matchedCandidate).length}/${CURRENT.length} of our clubs matched.`);
}
L.push(`- Squad lookups below used league \`${SOURCE_ID}\`.`);
L.push("");
L.push(`- \`idLeague\` values present: ${leagueIds.map((v) => `\`${clean(v, 20)}\``).join(", ")} — **${onLeague} of ${teams.length} rows carry \`${LEAGUE_ID}\`**.`);
L.push(`- ${found.length} of the ${CURRENT.length} current Premiership clubs matched by name.`);
if (unmatchedFeedTeams.length) L.push(`- ${unmatchedFeedTeams.length} returned team(s) matched no current club: ${unmatchedFeedTeams.map((t) => `\`${clean(t.name, 40)}\``).join(", ")}.`);
L.push("");
L.push("Every team row the endpoint returned, exactly as received:");
L.push("");
L.push("| Team name | idTeam | idLeague | strLeague |");
L.push("|---|---|---|---|");
for (const t of teams) L.push(`| ${clean(t.name, 40)} | ${clean(t.id, 12)} | \`${clean(t.league, 20)}\` | ${clean(t.leagueName, 40)} |`);
L.push("");
L.push("| Club | Found as | idTeam | idLeague | Players |");
L.push("|---|---|---|---|---|");
for (const code of CURRENT) {
  const r = results[code];
  const name = r.team ? clean(r.team.name, 40) : "— not found —";
  const id = r.team ? r.team.id : "—";
  const lg = r.team ? `\`${clean(r.team.league, 20)}\`${r.team.league === LEAGUE_ID ? "" : " ⚠"}` : "—";
  const count = r.error ? `⚠ ${clean(r.error, 40)}` : String((r.players || []).length);
  L.push(`| ${CLUBS[code].name} (${code}) | ${name} | ${id} | ${lg} | ${count} |`);
}
L.push("");
if (missing.length) { L.push(`**Not found in the teams response:** ${missing.map((c) => `${CLUBS[c].name} (${c})`).join(", ")}.`); L.push(""); }
if (emptyClubs.length) { L.push(`**Found but returned no players:** ${emptyClubs.map((c) => `${CLUBS[c].name} (${c})${results[c].note ? ` — ${results[c].note}` : ""}`).join(", ")}.`); L.push(""); }
L.push("## Field population");
L.push("");
L.push(`Across all ${allPlayers.length} player records returned:`);
L.push("");
L.push("| Field | API key | Populated | Empty | % populated |");
L.push("|---|---|---|---|---|");
for (const f of fieldStats) L.push(`| ${f.label} | \`${f.key}\` | ${f.filled} | ${f.empty} | ${pct(f.filled)}% |`);
L.push("");
L.push("## Sample records");
L.push("");
if (!samples.length) L.push("_No player records were returned, so there is nothing to sample._");
for (const p of samples) {
  L.push(`- **${clean(p.strPlayer, 60)}** — position \`${clean(p.strPosition, 40)}\`, born \`${clean(p.dateBorn, 20)}\`, nationality \`${clean(p.strNationality, 40)}\`, squad number \`${clean(p.strNumber, 10)}\`, image \`${filled(p.strThumb) ? "present" : "(empty)"}\``);
  L.push(`  - description: ${clean(p.strDescriptionEN, 200)}`);
}
L.push("");
L.push("_Sample values are third-party text, escaped and truncated for display._");
L.push("");

const report = L.join("\n");
console.log(`\n${"─".repeat(70)}\n${report}${"─".repeat(70)}`);
writeFileSync(OUT_PATH, report);
console.log(`\nReport written to ${OUT}. data.js untouched.\n`);
