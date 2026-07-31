// GIBSON fixture-change routine — reschedules, not results.
// Run by .github/workflows/fixture-refresh.yml; also runnable by hand:
//   node scripts/fixture-update.js --dry-run          (preview, writes nothing)
//   node scripts/fixture-update.js                    (applies)
//   node scripts/fixture-update.js --fixture=<f.json> (run against a saved payload)
//
// Reads upcoming league 4659 events and corrects the DATE and KICK-OFF TIME of fixtures
// already in FIXTURES_2627. Broadcast picks and European involvement move Irish League
// fixtures constantly, and a wrong kick-off time is the kind of error that has someone
// standing outside a locked ground.
//
// UPDATE ONLY. It never adds a fixture the data does not have and never deletes one the
// feed omits — the 198-fixture list is the league's published schedule, and verify.js
// asserts its shape (33 rounds, 198 matches, every club exactly 33). A feed that has
// drifted must not be able to reshape it.
//
// ---------------------------------------------------------------------------------------
// VENUE IS NOT WRITTEN, AND CANNOT BE — a deliberate gap, not an oversight.
//
// FIXTURES_2627 has no venue field. Match objects carry h, a and optionally d and t; the
// venue shown in the UI is DERIVED from the home club (src/tabs/MatchesTab.jsx: `venue:
// CLUBS[m.h].ground`). So there is nothing stored for a venue change to update. Adding a
// venue field would be worse than useless: the fixtures UI would go on rendering the home
// club's ground and ignore it, so data.js and the screen would disagree with each other.
//
// A real venue change is also editorially significant — it means a ground swap, a neutral
// venue or a stadium closure, which usually needs a note a feed cannot supply. So venue
// differences are DETECTED AND REPORTED for a human, never written.
//
// ---------------------------------------------------------------------------------------
// TRUST MODEL — CLAUDE.md: feed data is untrusted, validate shape AND plausibility:
//   * every event must carry idLeague === "4659" (rule 3 — TheSportsDB has served cached
//     English league data in place of 4659);
//   * a date outside the season window, or a kick-off outside 11:00-21:00, is reported and
//     not written — those are parse errors, not reschedules;
//   * a fixture is only updated when EXACTLY ONE stored entry has the same two clubs.
//     This league plays a 3-round-robin, so an ordered pair can legitimately appear twice
//     in the schedule; that is ambiguity, and it is reported rather than guessed at;
//   * ROUND-LEVEL date/time is never touched. A round's date is the default for every
//     fixture in it, so writing there would silently move matches the feed said nothing
//     about. Changes are always written to the individual match as `d` / `t`.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as D from "../data.js";

const DATA_PATH = fileURLToPath(new URL("../data.js", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const FIXTURE = (process.argv.find((a) => a.startsWith("--fixture=")) || "").split("=")[1];
const LEAGUE_ID = "4659";
const MIN_KICKOFF_H = 11; // earliest plausible kick-off
const MAX_KICKOFF_H = 21; // latest plausible kick-off

const fail = (msg) => { console.error(`\n✗ ${msg}\n`); process.exit(1); };

// Same mapping the other TheSportsDB consumers use. Deliberately duplicated rather than
// imported — see the note in verify.js on why api/* cannot share a repo module — and
// verify.js asserts all copies stay identical.
const CLUB_MAP = [
  ["limavady", "LIM"], ["larne", "LAR"], ["linfield", "LIN"], ["glentoran", "GLE"],
  ["coleraine", "COL"], ["cliftonville", "CLI"], ["crusaders", "CRU"], ["ballymena", "BAL"],
  ["carrick", "CAR"], ["dungannon", "DUN"], ["portadown", "POR"], ["bangor", "BAN"],
  ["glenavon", "GLV"],
];
const toCode = (name) => {
  const n = (name || "").toLowerCase();
  const hit = CLUB_MAP.find(([k]) => n.includes(k));
  return hit ? hit[1] : null;
};

// Season window, derived from SEASON.seasonStart so it survives a rollover rather than
// being a hardcoded pair of dates that quietly goes stale next August.
const SEASON_START = Date.parse(`${D.SEASON.seasonStart}T00:00:00Z`);
const WINDOW_FROM = SEASON_START - 14 * 86400000;   // a fortnight before opening night
const WINDOW_TO = SEASON_START + 300 * 86400000;    // past the post-split run-in

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-08-07" -> "Fri 7 Aug", matching how dates are written in FIXTURES_2627.
const toDisplayDate = (iso) => {
  const d = new Date(`${iso}T12:00:00Z`);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONS[d.getUTCMonth()]}`;
};
// "19:45:00" -> "7.45pm"; "15:00:00" -> "3pm". Matches the existing style (no ":00").
const toDisplayTime = (hhmmss) => {
  const [H, M] = String(hhmmss).split(":").map(Number);
  const period = H >= 12 ? "pm" : "am";
  const h12 = H % 12 === 0 ? 12 : H % 12;
  return M === 0 ? `${h12}${period}` : `${h12}.${String(M).padStart(2, "0")}${period}`;
};
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();

// ---- 1. Fetch upcoming events -----------------------------------------------------------
async function loadEvents() {
  if (FIXTURE) {
    const raw = JSON.parse(readFileSync(FIXTURE, "utf8"));
    return Array.isArray(raw) ? raw : (raw.events || []);
  }
  const url = `https://www.thesportsdb.com/api/v1/json/123/eventsnextleague.php?id=${LEAGUE_ID}`;
  const r = await fetch(url, { headers: { "User-Agent": "GIBSON-IrishLeagueStats/1.0" } });
  if (!r.ok) fail(`TheSportsDB returned ${r.status}. Nothing written.`);
  const j = await r.json();
  return (j && j.events) || [];
}

// ---- 2. Validate + normalise -------------------------------------------------------------
function normalise(events) {
  if (!Array.isArray(events)) fail("feed payload was not an array of events. Nothing written.");
  const usable = [];
  const skipped = [];
  for (const e of events) {
    const label = `${e.strHomeTeam || "?"} v ${e.strAwayTeam || "?"}`;
    if (String(e.idLeague) !== LEAGUE_ID) { skipped.push({ label, why: `wrong league (idLeague ${e.idLeague})` }); continue; }
    const h = toCode(e.strHomeTeam), a = toCode(e.strAwayTeam);
    if (!h || !a || h === a) { skipped.push({ label, why: "could not map both clubs to codes" }); continue; }

    const iso = String(e.dateEvent || "").slice(0, 10);
    const t = Date.parse(`${iso}T12:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(t)) { skipped.push({ label, why: `unusable date "${e.dateEvent}"` }); continue; }
    if (t < WINDOW_FROM || t > WINDOW_TO) { skipped.push({ label, why: `date ${iso} is outside the ${D.SEASON.current.display} season window` }); continue; }

    // Time is optional in the feed; absent simply means "no time change to consider".
    let time = null;
    const rawTime = String(e.strTime || "").slice(0, 8);
    if (/^\d{2}:\d{2}/.test(rawTime)) {
      const H = Number(rawTime.slice(0, 2));
      if (H < MIN_KICKOFF_H || H > MAX_KICKOFF_H) { skipped.push({ label, why: `kick-off ${rawTime.slice(0, 5)} is outside ${MIN_KICKOFF_H}:00–${MAX_KICKOFF_H}:00` }); continue; }
      time = rawTime;
    }
    usable.push({ h, a, iso, time, venue: norm(e.strVenue) || null, label });
  }
  return { usable, skipped };
}

// ---- 3. Match against FIXTURES_2627 ------------------------------------------------------
// Exactly one stored entry with the same two clubs, or it is reported, not guessed.
function plan(feed) {
  const changes = [];
  const skipped = [];
  for (const f of feed) {
    const hits = [];
    D.FIXTURES_2627.forEach((r, ri) => r.matches.forEach((m, mi) => {
      if (m.h === f.h && m.a === f.a) hits.push({ ri, mi, round: r.round, m, r });
    }));
    if (hits.length === 0) { skipped.push({ label: f.label, why: `no stored fixture for ${f.h} v ${f.a}` }); continue; }
    if (hits.length > 1) { skipped.push({ label: f.label, why: `${hits.length} stored fixtures for ${f.h} v ${f.a} (rounds ${hits.map((x) => x.round).join(", ")}) — ambiguous, needs a human` }); continue; }

    const { round, m, r } = hits[0];
    // Effective values: a match inherits its round's date/time unless it overrides them.
    const storedDate = norm(m.d || r.date);
    const storedTime = norm(m.t || r.time || "3pm");
    const feedDate = toDisplayDate(f.iso);
    const feedTime = f.time ? toDisplayTime(f.time) : null;

    const dateChanged = feedDate !== storedDate;
    const timeChanged = feedTime !== null && feedTime !== storedTime;

    // Venue: detected, never written — FIXTURES_2627 has no venue field and the UI derives
    // it from the home club. See the header note.
    if (f.venue) {
      const expected = norm(D.CLUBS[f.h]?.ground);
      const vLow = f.venue.toLowerCase(), eLow = expected.toLowerCase();
      if (expected && !vLow.includes(eLow) && !eLow.includes(vLow)) {
        skipped.push({ label: f.label, why: `feed venue "${f.venue}" differs from ${D.CLUBS[f.h].name}'s ground "${expected}" — venue is derived from the home club and has no stored field, so this needs a human` });
      }
    }

    if (!dateChanged && !timeChanged) continue;
    changes.push({
      ...hits[0], label: f.label,
      from: { date: storedDate, time: storedTime },
      to: { date: dateChanged ? feedDate : null, time: timeChanged ? feedTime : null },
    });
  }
  return { changes, skipped };
}

// ---- 4. Write ----------------------------------------------------------------------------
// Locates the exact match object by walking the FIXTURES_2627 literal and counting the
// `{ h: "XX", a: "YY"` openings in order, so it stays correct whether matches sit one per
// line or several. Never touches the round's own date/time.
function bounds(src) {
  const start = src.indexOf("export const FIXTURES_2627 = [");
  if (start < 0) fail("could not find FIXTURES_2627 in data.js. Nothing written.");
  const end = src.indexOf("\n];", start);
  if (end < 0) fail("could not find the end of FIXTURES_2627. Nothing written.");
  return [start, end];
}

function matchBrace(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function applyChanges(src, changes) {
  for (const c of changes) {
    const [s, e] = bounds(src);
    const needle = new RegExp(`\\{\\s*h:\\s*"${c.m.h}",\\s*a:\\s*"${c.m.a}"`, "g");
    const found = [];
    let mm;
    const block = src.slice(s, e);
    while ((mm = needle.exec(block)) !== null) found.push(s + mm.index);
    if (found.length !== 1) fail(`expected exactly one "${c.m.h} v ${c.m.a}" object in FIXTURES_2627, found ${found.length}. Nothing written.`);

    const open = found[0];
    const close = matchBrace(src, open);
    if (close < 0) fail(`unbalanced braces around ${c.m.h} v ${c.m.a}. Nothing written.`);

    const date = c.to.date || c.m.d || null;
    const time = c.to.time || c.m.t || null;
    let rebuilt = `{ h: "${c.m.h}", a: "${c.m.a}"`;
    if (date) rebuilt += `, d: ${JSON.stringify(date)}`;
    if (time) rebuilt += `, t: ${JSON.stringify(time)}`;
    rebuilt += " }";
    src = src.slice(0, open) + rebuilt + src.slice(close + 1);
  }
  return src;
}

// ---- run ---------------------------------------------------------------------------------
const raw = await loadEvents();
const { usable, skipped: badRows } = normalise(raw);
const { changes, skipped: unmatched } = plan(usable);
const skipped = [...badRows, ...unmatched];

console.log(`\nGIBSON fixture changes${DRY_RUN ? " (DRY RUN — nothing written)" : ""}`);
console.log(`  feed      : ${raw.length} events in, ${usable.length} usable`);

if (changes.length) {
  console.log("\n  changes:");
  for (const c of changes) {
    const bits = [];
    if (c.to.date) bits.push(`date ${c.from.date} -> ${c.to.date}`);
    if (c.to.time) bits.push(`time ${c.from.time} -> ${c.to.time}`);
    console.log(`    R${c.round} ${c.m.h} v ${c.m.a}: ${bits.join(", ")}`);
  }
}
if (skipped.length) {
  console.log("\n  skipped:");
  for (const s of skipped) console.log(`    ${s.label} — ${s.why}`);
}

if (!changes.length) { console.log("\nNo fixture dates or times have changed — data.js untouched.\n"); process.exit(0); }
if (DRY_RUN) { console.log("\nDry run — data.js was not modified.\n"); process.exit(0); }

writeFileSync(DATA_PATH, applyChanges(readFileSync(DATA_PATH, "utf8"), changes));
console.log(`\n✓ updated ${changes.length} fixture${changes.length === 1 ? "" : "s"} in FIXTURES_2627.`);
console.log("  Next: npm run build && node scripts/verify.js\n");
