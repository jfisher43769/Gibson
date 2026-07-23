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
const ENDPOINT = "https://query.wikidata.org/sparql";
const HEADERS = {
  "Accept": "application/sparql-results+json",
  // Wikidata asks all bots/scripts to identify themselves with a real UA + contact.
  "User-Agent": "GibsonStatsDataBot/1.0 (https://gibsonstats.com; contact: jfisher43769@gmail.com)",
};
// Generous NI bounding box (mainland UK/Ireland clubs sit well outside this).
const NI_BOUNDS = { latMin: 53.9, latMax: 55.5, lonMin: -8.3, lonMax: -5.3 };
const FIELDS = ["ground", "capacity", "lat", "lon", "founded", "website"];

const ROUTE_CLUBS = Object.keys(D.CLUBS).filter((k) => k !== "GLV"); // 12 current clubs

function sparqlFor(clubName) {
  const esc = clubName.replace(/"/g, '\\"');
  return `
    SELECT DISTINCT ?club ?clubLabel ?venue ?venueLabel ?capacity ?coord ?inception ?website WHERE {
      ?club wdt:P31 wd:Q476028.
      ?club rdfs:label ?label.
      FILTER(LANG(?label) = "en")
      FILTER(CONTAINS(LCASE(?label), LCASE("${esc}")))
      OPTIONAL { ?club wdt:P115 ?venue. }
      OPTIONAL { ?venue wdt:P1083 ?capacity. }
      OPTIONAL { ?venue wdt:P625 ?coord. }
      OPTIONAL { ?club wdt:P571 ?inception. }
      OPTIONAL { ?club wdt:P856 ?website. }
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
  };
}

function writeClubMeta(results) {
  const entries = results.map((r) => {
    const fields = FIELDS.map((f) => `    ${f}: ${JSON.stringify(r[f] ?? null)},`).join("\n");
    return `  ${r.code}: {\n${fields}\n    source: "Wikidata (CC0)",\n  },`;
  }).join("\n");
  const block =
    `// AUTO-GENERATED by scripts/fetch-wikidata.js — do not hand-edit, re-run the script instead.\n` +
    `// Each field is a verified Wikidata value or an explicit null (never a guess).\n` +
    `export const CLUB_META = {\n${entries}\n};\n`;

  const src = readFileSync(DATA_JS_PATH, "utf8");
  const startMarker = "// === CLUB_META START (auto-generated) ===";
  const endMarker = "// === CLUB_META END ===";
  const wrapped = `${startMarker}\n${block}${endMarker}`;

  let next;
  if (src.includes(startMarker) && src.includes(endMarker)) {
    const re = new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`);
    next = src.replace(re, wrapped);
  } else {
    next = `${src.trimEnd()}\n\n${wrapped}\n`;
  }
  writeFileSync(DATA_JS_PATH, next);
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
