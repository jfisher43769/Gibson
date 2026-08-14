// Screenshots the built Home screen at phone widths and measures the acceptance criteria.
//
//   node scripts/home-shot.mjs [outDir]
//
// A restructure of the default screen once passed build AND verify and still shipped a white
// page, so the gate that matters here is looking at it. This serves dist/, loads Home at 360
// and 430, writes a PNG of each, and reports the numbers the brief asks for rather than
// leaving them to be eyeballed:
//
//   · header + nav height (must be under 150px)
//   · whether a league position and a points total are above the fold
//   · any club name rendered with an ellipsis
//   · whether every score sits at the same x
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join } from "node:path";

const REPO = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(REPO, "dist");
const OUT = process.argv[2] || join(REPO, "promo-out");
if (!existsSync(DIST)) { console.error("No dist/ — run npm run build first."); process.exit(1); }
mkdirSync(OUT, { recursive: true });

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".json": "application/json", ".webmanifest": "application/manifest+json" };
const server = createServer(async (req, res) => {
  const url = req.url.split("?")[0];
  // /api/* are serverless functions that do not exist in dist. Falling through to index.html
  // handed the app HTML where it expected JSON, which surfaced as a page error that had
  // nothing to do with the page — the app's own fallback handles a failed fetch correctly.
  if (url.startsWith("/api/")) { res.writeHead(404).end("no api in dist"); return; }
  // Only extension-less paths are SPA routes. Falling back for ANYTHING handed the browser
  // HTML in place of /_vercel/insights/script.js, which then failed to parse as JS and looked
  // like a page error the app had caused. A missing asset must 404, the way a real host does.
  const spa = extname(url) === "";
  const candidates = spa ? [join(DIST, url), join(DIST, url, "index.html"), join(DIST, "index.html")] : [join(DIST, url)];
  for (const p of candidates) {
    try {
      const body = await readFile(p);
      res.writeHead(200, { "Content-Type": TYPES[extname(p)] || "application/octet-stream" });
      return res.end(body);
    } catch { /* try the next candidate */ }
  }
  res.writeHead(404).end("not found");
});
await new Promise((r) => server.listen(4177, r));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
let failures = 0;
const fail = (m) => { failures++; console.log(`   ✗ ${m}`); };
const pass = (m) => console.log(`   ✓ ${m}`);

for (const width of [360, 430]) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:4177/", { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  console.log(`\n${width}px`);
  if (errors.length) fail(`page errors: ${errors.slice(0, 2).join(" | ")}`);

  // Did anything actually render? The white-screen case looked fine to build and verify.
  const bodyText = await page.evaluate(() => document.body.innerText.trim().length);
  if (bodyText < 200) fail(`only ${bodyText} chars of text — blank screen`); else pass(`${bodyText} chars rendered`);

  const chromeH = await page.evaluate(() => {
    const h = document.querySelector(".gb-header"), n = document.querySelector(".gb-navwrap");
    if (!h || !n) return null;
    return Math.round(h.getBoundingClientRect().height + n.getBoundingClientRect().height);
  });
  if (chromeH === null) fail("could not find header/nav");
  else if (chromeH < 150) pass(`header + nav ${chromeH}px (under 150)`);
  else fail(`header + nav ${chromeH}px — over the 150px budget`);

  // A position and a points total, both inside the first viewport.
  const fold = await page.evaluate((vh) => {
    const out = { pos: null, pts: null };
    for (const el of document.querySelectorAll("[data-snap-pos]")) {
      const r = el.getBoundingClientRect();
      if (r.top >= 0 && r.bottom <= vh) { out.pos = el.textContent.trim(); break; }
    }
    for (const el of document.querySelectorAll("[data-snap-pts]")) {
      const r = el.getBoundingClientRect();
      if (r.top >= 0 && r.bottom <= vh) { out.pts = el.textContent.trim(); break; }
    }
    return out;
  }, 800);
  if (fold.pos && fold.pts) pass(`above the fold: position "${fold.pos}", points "${fold.pts}"`);
  else fail(`above the fold: position ${fold.pos || "MISSING"}, points ${fold.pts || "MISSING"}`);

  // Ellipsis is a rendering fact, not a CSS declaration — measure the overflow.
  const clipped = await page.evaluate(() =>
    [...document.querySelectorAll(".gb-nm-short, .gb-nm-full, .gb-snap-name")]
      .filter((el) => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1)
      .map((el) => el.textContent.trim()));
  if (clipped.length === 0) pass("no club name is clipped");
  else fail(`clipped names: ${[...new Set(clipped)].join(", ")}`);

  // Nothing may push the page sideways. "TOMORROW · 3PM" at a fixed size did exactly that
  // and the first letter was sliced off the card — invisible to build, verify and the render
  // test alike, because all three of those pass on a page that is simply too wide.
  const over = await page.evaluate((w) => {
    const wide = [...document.querySelectorAll("body *")]
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > w + 1); })
      // An element inside a horizontally scrolling container is SUPPOSED to extend past the
      // viewport — that is what makes it scrollable. Only content that pushes the PAGE counts,
      // so walk up and skip anything with a scrolling ancestor. Naming the two known scrollers
      // by class would have gone stale the next time one was added.
      .filter((el) => {
        for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === "auto" || ox === "scroll") return false;
        }
        return true;
      })
      .map((el) => (el.textContent || "").trim().slice(0, 32));
    return { scrollW: document.documentElement.scrollWidth, wide: [...new Set(wide)].slice(0, 4) };
  }, width);
  if (over.scrollW <= width + 1 && over.wide.length === 0) pass("nothing overflows the viewport");
  else fail(`overflow: scrollWidth ${over.scrollW} vs ${width}${over.wide.length ? ` — ${over.wide.join(" | ")}` : ""}`);

  // Every score at the same x, which is the point of the grid.
  const xs = await page.evaluate(() =>
    [...document.querySelectorAll(".gb-score-row")].map((r) => Math.round(r.children[2].getBoundingClientRect().left)));
  if (xs.length < 2) console.log(`   – only ${xs.length} score rows, alignment not testable`);
  else if (new Set(xs).size === 1) pass(`all ${xs.length} scores aligned at x=${xs[0]}`);
  else fail(`scores at differing x: ${[...new Set(xs)].join(", ")}`);

  writeFileSync(join(OUT, `gibson-home-${width}.png`), await page.screenshot());
  console.log(`   → gibson-home-${width}.png`);
  await page.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nHOME SCREEN OK" : `\n${failures} PROBLEM(S)`);
process.exit(failures === 0 ? 0 : 1);
