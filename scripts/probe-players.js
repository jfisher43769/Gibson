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

// ---- 1. Teams in the league ------------------------------------------------------------
console.log(`Probing TheSportsDB league ${LEAGUE_ID} — teams...`);
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

const wrongLeague = rawTeams.filter((t) => t && t.idLeague !== undefined && String(t.idLeague) !== LEAGUE_ID).length;
const teams = rawTeams
  .filter((t) => t && typeof t === "object")
  .filter((t) => t.idLeague === undefined || String(t.idLeague) === LEAGUE_ID)
  .filter((t) => filled(t.idTeam) && filled(t.strTeam))
  .map((t) => ({ id: String(t.idTeam), name: String(t.strTeam) }));

console.log(`  ${rawTeams.length} rows returned, ${teams.length} usable${wrongLeague ? `, ${wrongLeague} rejected as wrong league` : ""}`);

// Map our club codes onto whatever names the feed uses.
const matched = {};
const usedTeamIds = new Set();
for (const code of CURRENT) {
  const hit = teams.find((t) => t.name.toLowerCase().includes(TOKEN[code]));
  if (hit) { matched[code] = hit; usedTeamIds.add(hit.id); }
}
const unmatchedFeedTeams = teams.filter((t) => !usedTeamIds.has(t.id));

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
L.push("## Teams response");
L.push("");
L.push(`- ${rawTeams.length} rows returned, ${teams.length} usable after shape validation.`);
if (wrongLeague) L.push(`- ⚠ ${wrongLeague} row(s) rejected for not carrying \`idLeague === "${LEAGUE_ID}"\`.`);
L.push(`- ${found.length} of the ${CURRENT.length} current Premiership clubs were matched.`);
if (unmatchedFeedTeams.length) L.push(`- ${unmatchedFeedTeams.length} team(s) in the feed matched no current club: ${unmatchedFeedTeams.map((t) => `\`${clean(t.name, 40)}\``).join(", ")}.`);
L.push("");
L.push("| Club | Found as | idTeam | Players |");
L.push("|---|---|---|---|");
for (const code of CURRENT) {
  const r = results[code];
  const name = r.team ? clean(r.team.name, 40) : "— not found —";
  const id = r.team ? r.team.id : "—";
  const count = r.error ? `⚠ ${clean(r.error, 40)}` : String((r.players || []).length);
  L.push(`| ${CLUBS[code].name} (${code}) | ${name} | ${id} | ${count} |`);
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
