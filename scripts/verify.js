// GIBSON data invariant checker — run before any commit: node scripts/verify.js
import * as D from "../data.js";
import { readFileSync } from "node:fs";
let fails = 0;
const check = (name, ok) => { console.log(ok ? "  ✓" : "  ✗ FAIL", name); if (!ok) fails++; };

console.log("GIBSON verify:");
// 13 = 12 current Premiership clubs + relegated GLV (kept so the 25/26 archive renders)
check("13 clubs registered (12 + archived GLV)", Object.keys(D.CLUBS).length === 13);
check("26/27 fixtures use exactly 12 clubs, no GLV", (() => { const s = new Set(); D.FIXTURES_2627.forEach(r => r.matches.forEach(m => { s.add(m.h); s.add(m.a); })); return s.size === 12 && !s.has("GLV"); })());
check("every club has name+ground+2 colors", Object.values(D.CLUBS).every(c => c.name && c.ground && c.colors?.length === 2));
const allMatches = D.FIXTURES_2627.flatMap(r => r.matches);
check("33 rounds", D.FIXTURES_2627.length === 33);
check("198 fixtures", allMatches.length === 198);
check("fixture clubs all valid", allMatches.every(m => D.CLUBS[m.h] && D.CLUBS[m.a]));
const counts = {};
allMatches.forEach(m => { counts[m.h] = (counts[m.h]||0)+1; counts[m.a] = (counts[m.a]||0)+1; });
check("every club plays exactly 33", Object.values(counts).every(n => n === 33));
check("predictor fixtures have odds", D.PREDICTOR_GW.fixtures.every(f => f.odds?.home && f.odds?.draw && f.odds?.away));
check("predictor results null or [h,a]", D.PREDICTOR_GW.fixtures.every(f => f.result === null || (Array.isArray(f.result) && f.result.length === 2)));
check("no bookmaker names in odds notes", !JSON.stringify(D.PREDICTOR_GW).match(/bet365|paddy ?power|betfair|william ?hill|betmclean|ladbrokes/i));
check("FULL_TABLE has 12 rows / 38 played", !D.FULL_TABLE || (D.FULL_TABLE.length === 12 && D.FULL_TABLE.every(r => r.p === 38)));
check("transfer clubs valid", D.TRANSFERS.every(t => (!t.from || D.CLUBS[t.from]) && (!t.to || D.CLUBS[t.to])));
check("WINDOW clubs valid", D.WINDOW.every(w => D.CLUBS[w.club]));

// Every CLUB_FIXTURES/EURO-leg fixture needs a machine-readable dt (used to pick the
// Home tab's next match) whose calendar day/month agrees with the human display date —
// a mismatch here means the wrong fixture could get featured as "next".
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const dtMatchesDisplayDate = (f) => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(f.dt || "")) return false;
  const d = new Date(f.dt);
  if (isNaN(d.getTime())) return false;
  const m = (f.date || "").match(/(\d{1,2})\s+([A-Za-z]{3})/);
  if (!m) return false;
  return d.getUTCDate() === parseInt(m[1], 10) && d.getUTCMonth() === MONTHS.indexOf(m[2]);
};
const allEuroFixtures = [...Object.values(D.CLUB_FIXTURES).flat(), ...D.EURO.flatMap(e => e.legs)];
check("every CLUB_FIXTURES/EURO fixture has a valid ISO dt matching its display date", allEuroFixtures.every(dtMatchesDisplayDate));
// Service worker must fetch page navigations fresh from the network (bypassing the HTTP
// cache), or a device gets stranded on an old build — the "new domain served the old
// page" bug. Guard the two things that fix matter: navigation handling + a no-store fetch.
const sw = (() => { try { return readFileSync(new URL("../public/sw.js", import.meta.url), "utf8"); } catch { return ""; } })();
check("service worker serves page navigations network-fresh (mode navigate + no-store)",
  /mode\s*===\s*["']navigate["']/.test(sw) && /cache:\s*["']no-store["']/.test(sw));

console.log(fails === 0 ? "ALL CHECKS PASS" : `${fails} FAILURES`);
process.exit(fails === 0 ? 0 : 1);
