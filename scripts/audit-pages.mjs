// GIBSON — page audit. Loads every route and sub-view in headless Chromium, twice: once with
// the live feed answering and once with it refusing, since half the app's behaviour is its
// fallback path. Checks for page errors, values that should never reach a screen (NaN,
// undefined, [object Object], Invalid Date), empty pages, and unexpected bookmaker text.
// Screenshots everything to scratch so the layout can be looked at, because text assertions
// cannot see a stranded tile or a wrapped scoreline.
//
//   node scripts/audit-pages.mjs
//
// Expected noise: /crests/CODE.png 404s. Crest probes for a real crest by loading it, so a
// club without one costs exactly one 404 by design (see Crest.jsx) — the run filters them out
// rather than reporting 250 phantom failures.
//
// Not wired into CI: it needs a built dist and takes a couple of minutes.
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = "/home/user/Gibson/dist";
const SHOTS = process.env.AUDIT_SHOTS || "/tmp/gibson-audit";
mkdirSync(SHOTS, { recursive: true });
const T = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".woff2":"font/woff2",".webmanifest":"application/manifest+json" };
const srv = createServer((q, r) => {
  const u = decodeURIComponent(q.url.split("?")[0]); let p = join(ROOT, u); const e = extname(p);
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) { if (e) { r.writeHead(404); r.end(); return; } p = join(ROOT, "index.html"); }
  r.writeHead(200, { "content-type": T[extname(p)] || "application/octet-stream" }); r.end(readFileSync(p));
}).listen(4707);

const FEED_OK = { ok: true,
  live: [{ h: "LIN", a: "BAL", hs: 1, as: 1, date: "2026-08-08", time: "14:00", status: "2H" }],
  results: [{ h: "CLI", a: "CRU", hs: 2, as: 1, date: "2026-08-07", time: "18:45" }],
  upcoming: [{ h: "BAN", a: "CLI", date: "2026-08-15", time: "14:00", round: "2" }] };
const TABLE_OK = { ok: true, season: "2026-2027", updated: "8 Aug",
  rows: ["CLI","LIN","GLE","LAR","COL","CRU","BAL","POR","CAR","DUN","BAN","LIM"].map((c, i) => ({
    club: c, p: 1, w: i === 0 ? 1 : 0, d: 0, l: i === 0 ? 0 : 1, gd: i === 0 ? 1 : -1, pts: i === 0 ? 3 : 0, form: i === 0 ? "W" : "L" })) };

// Text that should never appear on a rendered page.
const BAD = [/\bNaN\b/, /\bundefined\b/, /\[object Object\]/, /Invalid Date/, /\bInfinity\b/, /\bnull\b/];
// Crest.jsx detects a real crest by loading it, so a club without one logs one 404. By design.
const EXPECTED_NOISE = /Failed to load resource|ERR_CONNECTION_RESET|ERR_FAILED/;
const BOOKIE = /boyle\s?sports|bet365|paddy\s?power|ladbrokes|william hill|betfair|sky\s?bet|betway|virgin bet|sean graham/i;

const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const problems = [];

async function sweep(tag, feedOk) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("pageerror", (e) => errs.push(`pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") errs.push(`console: ${m.text().slice(0, 160)}`); });
  await page.route("**/api/events", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(feedOk ? FEED_OK : { ok: false }) }));
  await page.route("**/api/table", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(feedOk ? TABLE_OK : { ok: false }) }));

  const views = [
    ["home", "/", []],
    ["table", "/table", []],
    ["fixtures-club", "/fixtures", []],
    ["fixtures-round", "/fixtures", ["By round"]],
    ["europe", "/fixtures", ["Europe"]],
    ["stats-lab", "/stats", []],
    ["stats-players", "/stats", ["Players"]],
    ["stats-duel", "/stats", ["Duel"]],
    ["predictor", "/predictor", []],
  ];

  for (const [name, path, clicks] of views) {
    errs.length = 0;
    await page.goto(`http://localhost:4707${path}`, { waitUntil: "domcontentloaded" });
    for (const c of clicks) {
      const el = page.getByText(c, { exact: true }).first();
      if (await el.count()) { await el.click(); await page.waitForTimeout(600); }
    }
    await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText();
    for (const re of BAD) if (re.test(text)) problems.push(`[${tag}] ${name}: text contains ${re}`);
    if (BOOKIE.test(text)) {
      const hit = text.match(BOOKIE)[0];
      if (!/boyle\s?sports/i.test(hit)) problems.push(`[${tag}] ${name}: bookmaker reference "${hit}"`);
    }
    if (text.trim().length < 400) problems.push(`[${tag}] ${name}: page looks empty (${text.trim().length} chars)`);
    for (const e of errs) if (!EXPECTED_NOISE.test(e)) problems.push(`[${tag}] ${name}: ${e}`);
    await page.screenshot({ path: join(SHOTS, `${tag}-${name}.png`), fullPage: false });
  }

  // The More tab lives behind nav buttons rather than a route.
  await page.goto("http://localhost:4707/", { waitUntil: "domcontentloaded" });
  for (const sub of ["More"]) {
    const b = page.getByText(sub, { exact: true }).first();
    if (await b.count()) { await b.click(); await page.waitForTimeout(1500); }
  }
  for (const sub of ["Clubs", "History", "Transfers", "Support \u2665"]) {
    errs.length = 0;
    const b = page.getByText(sub, { exact: true }).first();
    if (!(await b.count())) { problems.push(`[${tag}] more: no "${sub}" sub-tab`); continue; }
    await b.click(); await page.waitForTimeout(1500);
    const text = await page.locator("body").innerText();
    for (const re of BAD) if (re.test(text)) problems.push(`[${tag}] more/${sub}: text contains ${re}`);
    for (const e of errs) if (!EXPECTED_NOISE.test(e)) problems.push(`[${tag}] more/${sub}: ${e}`);
    await page.screenshot({ path: join(SHOTS, `${tag}-more-${sub}.png`) });
  }

  // A club page, reached by tapping a crest.
  errs.length = 0;
  await page.goto("http://localhost:4707/", { waitUntil: "domcontentloaded" });
  const crest = page.getByLabel("Open Larne club page", { exact: true }).first();
  if (await crest.count()) {
    await crest.click(); await page.waitForTimeout(1200);
    const text = await page.locator("body").innerText();
    for (const re of BAD) if (re.test(text)) problems.push(`[${tag}] club/LAR: text contains ${re}`);
    for (const e of errs) if (!EXPECTED_NOISE.test(e)) problems.push(`[${tag}] club/LAR: ${e}`);
    await page.screenshot({ path: join(SHOTS, `${tag}-club-LAR.png`) });
  } else problems.push(`[${tag}] club page: no Larne crest to tap`);

  await ctx.close();
}

await sweep("feed-ok", true);
await sweep("feed-down", false);
await browser.close(); srv.close();

console.log(problems.length ? `${problems.length} PROBLEM(S):` : "No problems found across both sweeps.");
for (const p of problems) console.log(" -", p);
