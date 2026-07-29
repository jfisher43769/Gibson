// GIBSON — Wikidata club metadata fetcher.
// Manually run, NOT part of the build: node scripts/fetch-wikidata.js
//
// Queries Wikidata's public SPARQL endpoint for the twelve current NIFL Premiership
// clubs and writes CLUB_META into data.js (between the AUTO-GENERATED markers below),
// keyed by club code, with source: "Wikidata (CC0)".
//
// Golden rule (CLAUDE.md #1): never invent statistics. Every field is either a value
// this script actually verified from Wikidata, or an explicit `null` — printed in the
// summary at the end so a human can go look. The script never guesses.
//
// Disambiguation: a bare club name ("Crusaders", "Bangor") matches clubs from other
// countries too. Every candidate must be tagged instance-of "association football
// club" (Q476028); when a name matches more than one such club, this script prefers
// whichever candidate's home venue coordinates fall inside Northern Ireland's bounding
// box (see NI_BOUNDS below — keep in sync with scripts/verify.js). If that still
// doesn't narrow it to exactly one club, every field is left null and the ambiguous
// candidates are listed for manual resolution — never guessed.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as D from "../data.js";

const DATA_JS_PATH = fileURLToPath(new URL("../data.js", import.meta.url));
const DRY_RUN = process.argv.includes("--dry-run");
const ENDPOINT = "https://query.wikidata.org/sparql";
const HEADERS = {
  "Accept": "application/sparql-results+json",
  // Wikidata asks all bots/scripts to identify themselves with a real UA + contact.
  "User-Agent": "GibsonStatsDataBot/1.0 (https://gibsonstats.com; contact: jfisher43769@gmail.com)",
};
// Generous NI bounding box (mainland UK/Ireland clubs sit well outside this).
const NI_BOUNDS = { latMin: 53.9, latMax: 55.5, lonMin: -8.3, lonMax: -5.3 };
// Order here is the order written into CLUB_META. `nickname` and `manager` were added after
// the first run, so existing entries won't carry them until this script is run again — they
// are therefore NOT in verify.js's required-field list, which still guards the original six.
// Add them there only once a run has actually populated them for all twelve clubs.
const FIELDS = ["ground", "capacity", "lat", "lon", "founded", "website", "nickname", "manager"];

const ROUTE_CLUBS = Object.keys(D.CLUBS).filter((k) => k !== "GLV"); // 12 current clubs

function sparqlFor(clubName) {
  const esc = clubName.replace(/"/g, '\\"');
  // Every added property is OPTIONAL so a club missing one still resolves — Wikidata
  // coverage of Irish League clubs is patchy, and a missing nickname must never cost us
  // the ground and coordinates we came for.
  //   P1449 nickname · P286 head coach · P118 league (disambiguation only, not stored)
  return `
    SELECT DISTINCT ?club ?clubLabel ?venue ?venueLabel ?capacity ?coord ?inception ?website
                    ?nickname ?managerLabel ?leagueLabel WHERE {
      ?club wdt:P31 wd:Q476028.
      ?club rdfs:label ?label.
      FILTER(LANG(?label) = "en")
      FILTER(CONTAINS(LCASE(?label), LCASE("${esc}")))
      OPTIONAL { ?club wdt:P115 ?venue. }
      OPTIONAL { ?venue wdt:P1083 ?capacity. }
      OPTIONAL { ?venue wdt:P625 ?coord. }
      OPTIONAL { ?club wdt:P571 ?inception. }
      OPTIONAL { ?club wdt:P856 ?website. }
      OPTIONAL { ?club wdt:P1449 ?nickname. FILTER(LANG(?nickname) = "en") }
      OPTIONAL { ?club wdt:P286 ?manager. }
      OPTIONAL { ?club wdt:P118 ?league. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 30
  `;
}

async function queryWikidata(clubName) {
  const url = `${ENDPOINT}?query=${encodeURIComponent(sparqlFor(clubName))}`;
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.results.bindings;
}

function parseCoord(wktPoint) {
  const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(wktPoint || "");
  return m ? { lon: parseFloat(m[1]), lat: parseFloat(m[2]) } : null;
}

function inNI(coord) {
  return !!coord && coord.lat >= NI_BOUNDS.latMin && coord.lat <= NI_BOUNDS.latMax &&
    coord.lon >= NI_BOUNDS.lonMin && coord.lon <= NI_BOUNDS.lonMax;
}

async function resolveClub(code, name) {
  let rows;
  try {
    rows = await queryWikidata(name);
  } catch (e) {
    return { code, name, resolved: false, reason: `Wikidata query failed: ${e.message}` };
  }

  const byClub = new Map();
  for (const r of rows) {
    const qid = r.club.value;
    if (!byClub.has(qid)) byClub.set(qid, { label: r.clubLabel?.value, rows: [] });
    byClub.get(qid).rows.push(r);
  }
  let candidates = [...byClub.entries()];

  if (candidates.length > 1) {
    const inNiOnly = candidates.filter(([, c]) => c.rows.some((r) => inNI(parseCoord(r.coord?.value))));
    if (inNiOnly.length === 1) candidates = inNiOnly;
  }
  // Second disambiguator: a club whose league mentions Northern Ireland / NIFL / Irish
  // League. Catches same-named clubs elsewhere that the coordinate filter can't split
  // because Wikidata has no venue coordinate for them.
  if (candidates.length > 1) {
    const leagueHit = candidates.filter(([, c]) =>
      c.rows.some((r) => /northern ireland|nifl|irish league|irish premiership/i.test(r.leagueLabel?.value || "")));
    if (leagueHit.length === 1) candidates = leagueHit;
  }

  if (candidates.length === 0) {
    return { code, name, resolved: false, reason: "no Wikidata match found" };
  }
  if (candidates.length > 1) {
    return {
      code, name, resolved: false,
      reason: `ambiguous — ${candidates.length} candidates, none uniquely inside Northern Ireland`,
      candidates: candidates.map(([qid, c]) => ({ qid, label: c.label })),
    };
  }

  const [qid, c] = candidates[0];
  const row = c.rows.find((r) => r.venue) || c.rows[0];
  const coord = parseCoord(row.coord?.value);
  return {
    code, name, resolved: true, qid,
    ground: row.venueLabel?.value || null,
    capacity: row.capacity ? parseInt(row.capacity.value, 10) : null,
    lat: coord ? coord.lat : null,
    lon: coord ? coord.lon : null,
    founded: row.inception ? parseInt(row.inception.value.slice(0, 4), 10) : null,
    website: row.website?.value || null,
    nickname: c.rows.find((r) => r.nickname)?.nickname?.value || null,
    // Head coach is the one HIGH-CHURN field here — Wikidata can lag a sacking by weeks,
    // and a wrong manager is a visibly wrong fact. Stored so it can be surfaced, but treat
    // it as needing a glance before it goes on the site, unlike the static ground/founded.
    manager: c.rows.find((r) => r.managerLabel)?.managerLabel?.value || null,
  };
}

// FILL GAPS ONLY — an existing value always wins; a fetched value is used only where the
// field is currently null.
//
// This is deliberately NOT "freshest wins", and the first live run proved why. Wikidata is
// a public wiki that anybody can edit, and it returned a coordinate for Limavady that put
// two Northern Irish grounds 5,260 miles apart. Under a fetched-wins rule that silently
// replaced a coordinate the owner had personally checked on a map. Verified-by-owner beats
// fetched-from-a-wiki every time, so the fetch may only fill blanks.
//
// Consequence to be aware of: a value that genuinely changes upstream (a ground renamed, a
// capacity revised) will NOT be picked up while the old value sits there. To take an update,
// null that field in data.js and re-run — an explicit, reviewable act rather than a silent
// overwrite. Keys the script doesn't fetch (e.g. `seated`) are carried through untouched.
function mergeWithExisting(r) {
  const prev = D.CLUB_META?.[r.code] || {};
  const merged = { code: r.code };
  for (const f of FIELDS) merged[f] = (prev[f] ?? null) !== null ? prev[f] : (r[f] ?? null);
  // Preserve any hand-maintained keys this script has no concept of.
  for (const k of Object.keys(prev)) {
    if (k !== "source" && !(k in merged)) merged[k] = prev[k];
  }
  const kept = FIELDS.filter((f) => (prev[f] ?? null) !== null);
  const filled = FIELDS.filter((f) => (prev[f] ?? null) === null && (r[f] ?? null) !== null);
  merged.__kept = kept;
  merged.__filled = filled;
  merged.__source = !filled.length ? (prev.source || "Wikidata (CC0)")
    : kept.length ? `${prev.source || "previous source"}; ${filled.join(", ")} from Wikidata (CC0)`
    : "Wikidata (CC0)";
  return merged;
}

function writeClubMeta(rawResults) {
  const results = rawResults.map(mergeWithExisting);
  const preserved = results.filter((r) => r.__kept.length);
  const entries = results.map((r) => {
    const keys = [...FIELDS, ...Object.keys(r).filter((k) => !FIELDS.includes(k) && !k.startsWith("__") && k !== "code")];
    const fields = keys.map((f) => `    ${f}: ${JSON.stringify(r[f] ?? null)},`).join("\n");
    return `  ${r.code}: {\n${fields}\n    source: ${JSON.stringify(r.__source)},\n  },`;
  }).join("\n");
  const filledAny = results.filter((r) => r.__filled.length);
  const block =
    `// AUTO-GENERATED by scripts/fetch-wikidata.js — re-run the script to refresh.\n` +
    `// Each field is a verified value or an explicit null (never a guess).\n` +
    `// The script FILLS GAPS ONLY: an existing value always wins, and Wikidata is used only\n` +
    `// where a field is null. Wikidata is publicly editable and has already returned a bad\n` +
    `// coordinate here, so owner-verified values are never overwritten. To accept an upstream\n` +
    `// change, null that field and re-run.\n` +
    `export const CLUB_META = {\n${entries}\n};\n`;
  if (filledAny.length) {
    console.log(`\n  filled ${filledAny.reduce((n, r) => n + r.__filled.length, 0)} empty field(s):`);
    for (const r of filledAny) console.log(`    ${r.code}: ${r.__filled.join(", ")}`);
  } else {
    console.log("\n  no empty fields to fill — every field already had a value.");
  }
  if (preserved.length) {
    console.log(`\n  kept existing values (never overwritten) for ${preserved.length} club(s):`);
    for (const r of preserved) console.log(`    ${r.code}: ${r.__kept.join(", ")}`);
  }

  const src = readFileSync(DATA_JS_PATH, "utf8");
  const startMarker = "// === CLUB_META START (auto-generated) ===";
  const endMarker = "// === CLUB_META END ===";
  const wrapped = `${startMarker}\n${block}${endMarker}`;

  // Index slicing, NOT a regex. The markers contain "(auto-generated)", and building a
  // RegExp from them turned those parentheses into a capture group, so the pattern never
  // matched the literal text: includes() said yes, replace() silently changed nothing, and
  // the script reported success having written nothing. That is why this block could never
  // be refreshed. Slicing has no metacharacters to get wrong.
  let next;
  const s = src.indexOf(startMarker);
  const e = src.indexOf(endMarker);
  if (s >= 0 && e > s) {
    next = src.slice(0, s) + wrapped + src.slice(e + endMarker.length);
  } else {
    next = `${src.trimEnd()}\n\n${wrapped}\n`;
  }
  if (next === src) {
    console.log("\n  (no change — CLUB_META already matches what was resolved)");
  }
  if (DRY_RUN) {
    console.log("\nDry run — data.js NOT modified. Re-run without --dry-run to apply.");
    return false;
  }
  writeFileSync(DATA_JS_PATH, next);
  return true;
}

async function main() {
  console.log(`Resolving ${ROUTE_CLUBS.length} clubs against Wikidata...\n`);
  const results = [];
  for (const code of ROUTE_CLUBS) {
    const name = D.CLUBS[code].name;
    const r = await resolveClub(code, name);
    results.push(r);
    console.log(r.resolved ? `  ✓ ${code} (${name}) -> ${r.qid}` : `  ✗ ${code} (${name}) -> ${r.reason}`);
    // Be polite to a free public endpoint.
    await new Promise((res) => setTimeout(res, 1000));
  }

  // A run where NOTHING resolved is a broken run (no network, endpoint down, query
  // rejected) — not a discovery that Wikidata has forgotten twelve football clubs. Writing
  // then would be pure churn at best, so bail out and leave data.js exactly as it was.
  if (!results.some((r) => r.resolved)) {
    console.error(`\n✗ All ${results.length} lookups failed — refusing to touch data.js.`);
    console.error("  Check network access to query.wikidata.org and re-run.\n");
    process.exit(1);
  }

  writeClubMeta(results.map((r) => (r.resolved ? r : { code: r.code, resolved: false })));

  console.log("\n=== Missing / ambiguous fields ===");
  let anyMissing = false;
  for (const r of results) {
    if (!r.resolved) {
      anyMissing = true;
      console.log(`${r.code}: ALL fields null — ${r.reason}`);
      if (r.candidates) for (const c of r.candidates) console.log(`    candidate: ${c.qid} "${c.label}"`);
      continue;
    }
    const missing = FIELDS.filter((f) => r[f] === null);
    if (missing.length) {
      anyMissing = true;
      console.log(`${r.code}: missing ${missing.join(", ")}`);
    }
  }
  if (!anyMissing) console.log("None — every field resolved.");
  console.log(`\nWrote CLUB_META for ${results.length} clubs into data.js.`);
}

await main();
