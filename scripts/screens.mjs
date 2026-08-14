// Screenshots the built app at phone widths and measures what a green build cannot tell you.
//
//   node scripts/screens.mjs [outDir]
//
// This began as home-shot.mjs, covering the home screen alone, after a restructure of that
// screen passed build AND verify and still shipped a white page. Every fault it has caught
// since has been a fault of the same class — text sliced off a card edge, a grid 30px too wide,
// a page that mounted to nothing — and none of them were specific to Home. The club page and
// the Stats tab carry more numbers than Home does and had no such gate at all, so the harness
// now walks four routes instead of one.
//
// Checks that run on EVERY page: no page errors, something actually rendered, no club name
// clipped, nothing pushing the page sideways. Per-page checks are declared alongside the route.
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
const note = (m) => console.log(`   – ${m}`);

// ===== per-page checks =====

// Home's own acceptance criteria, from the v2 brief: the chrome must not eat the screen and a
// real number must be reachable without scrolling.
async function homeChecks(page) {
  const chromeH = await page.evaluate(() => {
    const h = document.querySelector(".gb-header"), n = document.querySelector(".gb-navwrap");
    if (!h || !n) return null;
    return Math.round(h.getBoundingClientRect().height + n.getBoundingClientRect().height);
  });
  if (chromeH === null) fail("could not find header/nav");
  else if (chromeH < 150) pass(`header + nav ${chromeH}px (under 150)`);
  else fail(`header + nav ${chromeH}px — over the 150px budget`);

  const fold = await page.evaluate((vh) => {
    const inView = (sel) => {
      for (const el of document.querySelectorAll(sel)) {
        const r = el.getBoundingClientRect();
        if (r.top >= 0 && r.bottom <= vh) return el.textContent.trim();
      }
      return null;
    };
    return { pos: inView("[data-snap-pos]"), pts: inView("[data-snap-pts]") };
  }, 800);
  if (fold.pos && fold.pts) pass(`above the fold: position "${fold.pos}", points "${fold.pts}"`);
  else fail(`above the fold: position ${fold.pos || "MISSING"}, points ${fold.pts || "MISSING"}`);

  // Every score at the same x, which is the point of using a grid for the results rows.
  const xs = await page.evaluate(() =>
    [...document.querySelectorAll(".gb-score-row")].map((r) => Math.round(r.children[2].getBoundingClientRect().left)));
  if (xs.length < 2) note(`only ${xs.length} score rows, alignment not testable`);
  else if (new Set(xs).size === 1) pass(`all ${xs.length} scores aligned at x=${xs[0]}`);
  else fail(`scores at differing x: ${[...new Set(xs)].join(", ")}`);
}

// A club that has played must show its own current-season numbers. The club page used to gate
// everything season-scoped on hand-compiled exports, so picking the current season returned an
// empty state while the Stats tab showed live figures for the same club two taps away.
function playedClubChecks(code) {
  return async (page) => {
    const panel = await page.evaluate((c) => {
      const el = document.querySelector(`[data-club-sofar="${c}"]`);
      if (!el) return null;
      return { text: el.innerText.replace(/\s+/g, " ").trim().slice(0, 90), tiles: el.querySelectorAll("div").length };
    }, code);
    if (!panel) fail(`${code}: no current-season panel on the club page`);
    else pass(`${code}: current-season panel — "${panel.text}"`);

    // The hero must lead with this season, not with April's finishing position.
    const hero = await page.evaluate(() => {
      const labels = [...document.querySelectorAll("div")]
        .filter((d) => d.children.length === 0 && /^\d{4}\/\d{2}( final)?$/.test(d.textContent.trim()))
        .map((d) => d.textContent.trim());
      return labels.slice(0, 3);
    });
    if (hero.length && !/final/.test(hero[0])) pass(`${code}: hero leads with ${hero[0]}`);
    else if (hero.length) fail(`${code}: hero leads with "${hero[0]}" — last season first`);
    else fail(`${code}: no season-labelled tile found in the hero`);
  };
}

// Larne's opener was moved to September, so they have played nothing. A position derived from
// an empty row would read "12th · 0 pts", which is a fact about the fixture list wearing the
// costume of a fact about the club. The panel must be absent, not zeroed.
async function unplayedClubChecks(page) {
  const panel = await page.evaluate(() => !!document.querySelector('[data-club-sofar="LAR"]'));
  if (panel) fail("LAR has played no games but shows a current-season panel");
  else pass("LAR (no games played) shows no invented current-season numbers");
}

async function statsChecks(page) {
  const sofar = await page.evaluate(() => {
    const el = document.querySelector("[data-season-sofar]");
    return el ? el.innerText.replace(/\s+/g, " ").trim().slice(0, 60) : null;
  });
  if (sofar) pass(`current-season panel — "${sofar}"`);
  else fail("no current-season panel on the Stats tab");

  // The two lists here printed raw three-letter codes where the row had space for the name.
  const codes = await page.evaluate(() => {
    const el = document.querySelector("[data-season-sofar]");
    if (!el) return [];
    return [...el.querySelectorAll(".gb-nm-full, .gb-nm-short")]
      .map((n) => n.textContent.trim()).filter((t) => /^[A-Z]{3}$/.test(t));
  });
  if (codes.length === 0) pass("clubs are named, not coded");
  else fail(`raw club codes on screen: ${[...new Set(codes)].join(", ")}`);
}

const PAGES = [
  { name: "home", path: "/", checks: homeChecks },
  { name: "club-linfield", path: "/club/linfield", checks: playedClubChecks("LIN") },
  { name: "club-larne", path: "/club/larne", checks: unplayedClubChecks },
  { name: "stats", path: "/stats", checks: statsChecks },
];

// ===== the walk =====

for (const width of [360, 430]) {
  for (const spec of PAGES) {
    const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`http://localhost:4177${spec.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    console.log(`\n${spec.path}  @${width}px`);
    if (errors.length) fail(`page errors: ${errors.slice(0, 2).join(" | ")}`);

    // Did anything actually render? The white-screen case looked fine to build and verify.
    const bodyText = await page.evaluate(() => document.body.innerText.trim().length);
    if (bodyText < 200) fail(`only ${bodyText} chars of text — blank screen`); else pass(`${bodyText} chars rendered`);

    // Ellipsis is a rendering fact, not a CSS declaration — measure the overflow. Player names
    // are excluded deliberately: there is no short form of "Matthew Fitzpatrick", so those rows
    // do truncate by design. Club names have a real short form and must never need one.
    const clipped = await page.evaluate(() =>
      [...document.querySelectorAll(".gb-nm-short, .gb-nm-full, .gb-snap-name")]
        .filter((el) => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.textContent.trim()));
    if (clipped.length === 0) pass("no club name is clipped");
    else fail(`clipped names: ${[...new Set(clipped)].join(", ")}`);

    // Nothing may push the page sideways. "TOMORROW · 3PM" at a fixed size did exactly that and
    // the first letter was sliced off the card — invisible to build, verify and the render test
    // alike, because all three of those pass on a page that is simply too wide.
    const over = await page.evaluate((w) => {
      const wide = [...document.querySelectorAll("body *")]
        .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < -1 || r.right > w + 1); })
        // An element inside a horizontally scrolling container is SUPPOSED to extend past the
        // viewport — that is what makes it scrollable. Only content that pushes the PAGE counts,
        // so walk up and skip anything with a scrolling ancestor. Naming the known scrollers by
        // class would have gone stale the next time one was added.
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

    // A row of headline numbers must not strand one tile alone under a row of three. This is
    // measurable and was not obvious in code review: the flex-wrap that produced it looked
    // perfectly reasonable and the comment above it claimed the opposite of what it did.
    const stranded = await page.evaluate(() =>
      [...document.querySelectorAll(".gb-stat-row")].flatMap((row) => {
        const rows = new Map();
        for (const el of row.children) {
          const top = Math.round(el.getBoundingClientRect().top);
          rows.set(top, (rows.get(top) || 0) + 1);
        }
        const counts = [...rows.values()];
        return counts.length > 1 && counts.some((n) => n === 1)
          ? [`${row.children.length} tiles wrapping ${counts.join("+")}`] : [];
      }));
    if (stranded.length === 0) pass("no stat tile is stranded on its own row");
    else fail(`stranded tiles: ${stranded.join("; ")}`);

    if (spec.checks) await spec.checks(page);

    const file = `gibson-${spec.name}-${width}.png`;
    writeFileSync(join(OUT, file), await page.screenshot({ fullPage: spec.name !== "home" }));
    console.log(`   → ${file}`);
    await page.close();
  }
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nSCREENS OK" : `\n${failures} PROBLEM(S)`);
process.exit(failures === 0 ? 0 : 1);
