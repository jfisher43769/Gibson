// GIBSON season rollover — manually run at the end of a season, NEVER part of the build:
//   node scripts/season-rollover.js --dry-run   (preview, writes nothing)
//   node scripts/season-rollover.js             (performs the rollover)
//
// What it does, in one pass over data.js:
//   1. Reads the season id currently tagged on the live stats exports (SEASON_TAGS).
//   2. Archives those live structures — table, scorers and the rest — into SEASON_ARCHIVE,
//      keyed by that season id, as a `stats` block on the entry for that season.
//   3. Resets the live structures to empty, ready for the new season.
//   4. Retags SEASON_TAGS to SEASON.current.id, so live data and SEASON.current agree.
//   5. Prints a summary of exactly what moved.
//
// SAFETY RULES (both enforced, both tested):
//   * It NEVER deletes archived data. It only ever adds a `stats` block; nothing already
//     in SEASON_ARCHIVE is removed or overwritten.
//   * It REFUSES to run twice for the same season id — if that season already carries an
//     archived `stats` block, it exits without touching the file.
//
// A note on SEASON_ARCHIVE: it is a curated EDITORIAL list (champion, cup, facts) that the
// owner writes by hand, and CLAUDE.md is explicit that editorial is never auto-generated.
// So this script only ever attaches a machine-written `stats` block (plus a `seasonId` key)
// to it. If the season has no entry yet it creates a minimal one — season, seasonId, stats
// — and deliberately leaves champion/cup/facts absent for the owner to fill in rather than
// inventing them.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as D from "../data.js";

const DATA_PATH = fileURLToPath(new URL("../data.js", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");

// The live, season-scoped stats exports and the empty value each resets to.
const LIVE_EXPORTS = {
  FULL_TABLE: "[]",
  MARKET_VALUES: "[]",
  XG_TEAMS: "[]",
  XG_PLAYERS: "[]",
  TEAM_STATS_2526: "[]",
  DISCIPLINE: "{ yellows: [], reds: [] }",
  GOALS_STATS: "[]",
  PLAYERS: "[]",
  // Object, not array — resets to an empty map. It MUST be listed here: the retag step below
  // rewrites every season id in SEASON_TAGS, so an export left out would keep last season's
  // figures under the new season's label. The club page renders nothing when a club is
  // absent, so an empty map degrades cleanly to the "ratings build up" empty state.
  CLUB_TOP_SCORERS: "{}",
};

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

// Scan forward from the opening bracket of a literal, balancing brackets while skipping
// strings, template literals and comments, and return the index just past its close.
// Regex alone can't find the end of a multi-line array/object literal reliably.
function findLiteralEnd(src, openIdx) {
  const open = src[openIdx];
  const close = open === "[" ? "]" : "}";
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (c === "/" && next === "*") { i = src.indexOf("*/", i + 2) + 1; if (i < 1) break; continue; }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      for (i++; i < src.length; i++) {
        if (src[i] === "\\") { i++; continue; }
        if (src[i] === quote) break;
      }
      continue;
    }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i + 1; }
  }
  fail(`could not find the end of the literal starting at index ${openIdx} — data.js may be malformed`);
}

// Locate `export const NAME = <literal>` and return its bounds + current text.
function locateExport(src, name) {
  const decl = new RegExp(`export const ${name}\\s*=\\s*`).exec(src);
  if (!decl) fail(`could not find "export const ${name}" in data.js`);
  const openIdx = decl.index + decl[0].length;
  if (src[openIdx] !== "[" && src[openIdx] !== "{") {
    fail(`"export const ${name}" is not an array or object literal — refusing to rewrite it`);
  }
  const end = findLiteralEnd(src, openIdx);
  return { start: decl.index, openIdx, end, literal: src.slice(openIdx, end) };
}

// ---- 1. Which season is currently live? ------------------------------------------------
const tagged = [...new Set(Object.keys(LIVE_EXPORTS).map((n) => D.SEASON_TAGS[n]))];
if (tagged.length !== 1 || !tagged[0]) {
  fail(`the live stats exports don't share a single season tag (found: ${JSON.stringify(tagged)}). ` +
       `Fix SEASON_TAGS before rolling over — a half-tagged state means a previous rollover didn't finish.`);
}
const archivingId = tagged[0];
const targetId = D.SEASON.current.id;
// Display form for the archive entry: "2025-26" -> "2025/26".
const displayFor = (id) =>
  id === D.SEASON.previous.id ? D.SEASON.previous.display
  : id === D.SEASON.current.id ? D.SEASON.current.display
  : id.replace("-", "/");
const archivingDisplay = displayFor(archivingId);

if (archivingId === targetId) {
  fail(`the live stats are already tagged "${archivingId}", which is SEASON.current. ` +
       `There is nothing to roll over — advance SEASON.current to the new season first.`);
}

// ---- 2. Refuse to run twice for the same season ----------------------------------------
const already = D.SEASON_ARCHIVE.find((s) => s.seasonId === archivingId || s.season === archivingDisplay);
if (already && already.stats) {
  fail(`season ${archivingDisplay} (${archivingId}) has already been archived — refusing to run twice. ` +
       `Archived data is never overwritten or deleted.`);
}

// ---- 3. Build the archive snapshot -----------------------------------------------------
const snapshot = {
  table: D.FULL_TABLE,
  scorers: D.XG_PLAYERS,
  players: D.PLAYERS,
  marketValues: D.MARKET_VALUES,
  xgTeams: D.XG_TEAMS,
  teamStats: D.TEAM_STATS_2526,
  goals: D.GOALS_STATS,
  discipline: D.DISCIPLINE,
};
const sizeOf = (v) => (Array.isArray(v) ? v.length : Object.values(v).reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0));
const moved = Object.entries(snapshot).map(([k, v]) => [k, sizeOf(v)]);
const totalRows = moved.reduce((n, [, c]) => n + c, 0);

if (totalRows === 0) {
  fail(`the live stats structures are already empty — nothing to archive. ` +
       `(Has a rollover already run without SEASON_TAGS being retagged?)`);
}

// ---- 4. Rewrite data.js ----------------------------------------------------------------
let src = readFileSync(DATA_PATH, "utf8");
const indent = (obj) => JSON.stringify(obj, null, 2).split("\n").map((l, i) => (i === 0 ? l : `      ${l}`)).join("\n");
const statsBlock = `    seasonId: ${JSON.stringify(archivingId)},\n    stats: ${indent(snapshot)},\n`;

const archive = locateExport(src, "SEASON_ARCHIVE");
if (already) {
  // Entry exists (editorial already written) — attach stats to it, touching nothing else.
  const entryKey = already.seasonId === archivingId
    ? new RegExp(`\\{\\s*\\n\\s*seasonId: "${archivingId}"`)
    : new RegExp(`\\{\\s*\\n\\s*season: "${archivingDisplay.replace("/", "\\/")}"`);
  const m = entryKey.exec(src.slice(archive.openIdx, archive.end));
  if (!m) fail(`found an archive entry for ${archivingDisplay} in the data but could not locate it in the source text`);
  const at = archive.openIdx + m.index + 1; // just after the entry's opening "{"
  src = src.slice(0, at) + `\n${statsBlock.replace(/\n$/, "")}` + src.slice(at);
} else {
  // No entry yet — insert a new one at the head of the array. Editorial fields are left
  // out on purpose; the owner fills in champion/cup/facts by hand.
  const entry =
    `\n  {\n    season: ${JSON.stringify(archivingDisplay)},\n${statsBlock}` +
    `    // Editorial fields (champion, cup, relegated, facts) intentionally left for the\n` +
    `    // owner to write — this script never invents them.\n  },`;
  src = src.slice(0, archive.openIdx + 1) + entry + src.slice(archive.openIdx + 1);
}

// Reset each live export to its empty form (recompute positions after each edit).
for (const [name, empty] of Object.entries(LIVE_EXPORTS)) {
  const loc = locateExport(src, name);
  src = src.slice(0, loc.openIdx) + empty + src.slice(loc.end);
}

// Retag SEASON_TAGS so live data and SEASON.current agree.
const tags = locateExport(src, "SEASON_TAGS");
src = src.slice(0, tags.openIdx) + tags.literal.split(`"${archivingId}"`).join(`"${targetId}"`) + src.slice(tags.end);

// ---- 5. Summary ------------------------------------------------------------------------
console.log(`\nGIBSON season rollover${DRY_RUN ? " (DRY RUN — nothing written)" : ""}`);
console.log(`  archiving : ${archivingDisplay}  (${archivingId})`);
console.log(`  new live  : ${displayFor(targetId)}  (${targetId})`);
console.log(`  archive   : ${already ? "attached to existing entry" : "new entry created (editorial left blank)"}\n`);
console.log("  moved into the archive:");
for (const [key, count] of moved) console.log(`    ${key.padEnd(14)} ${String(count).padStart(4)} row${count === 1 ? "" : "s"}`);
console.log(`    ${"TOTAL".padEnd(14)} ${String(totalRows).padStart(4)} rows\n`);
console.log(`  reset to empty: ${Object.keys(LIVE_EXPORTS).join(", ")}`);
console.log(`  retagged SEASON_TAGS: ${archivingId} -> ${targetId}\n`);

if (DRY_RUN) {
  console.log("Dry run — data.js was not modified. Re-run without --dry-run to apply.\n");
} else {
  writeFileSync(DATA_PATH, src);
  console.log("data.js updated. Now run: node scripts/verify.js && npm run build && node scripts/render-test.mjs\n");
}
