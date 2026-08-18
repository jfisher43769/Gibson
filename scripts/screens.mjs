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
async function homeChecks(page, vh) {
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
  }, vh);
  if (fold.pos && fold.pts) pass(`above the fold: position "${fold.pos}", points "${fold.pts}"`);
  else fail(`above the fold: position ${fold.pos || "MISSING"}, points ${fold.pts || "MISSING"}`);

  // Every score at the same x, which is the point of using a grid for the results rows.
  const xs = await page.evaluate(() =>
    [...document.querySelectorAll(".gb-score-row")].map((r) => Math.round(r.children[2].getBoundingClientRect().left)));
  if (xs.length < 2) note(`only ${xs.length} score rows, alignment not testable`);
  else if (new Set(xs).size === 1) pass(`all ${xs.length} scores aligned at x=${xs[0]}`);
  else fail(`scores at differing x: ${[...new Set(xs)].join(", ")}`);
}

// WHICH clubs get visited is derived, never named. This harness hardcoded Larne as "the club
// that has played nothing" — true for one week, and it failed the moment Larne played. A gate
// that has to be edited every time the league plays a game stops being read.
const D = await import(`file://${join(REPO, "data.js")}`);
const { CLUB_TO_SLUG } = await import(`file://${join(REPO, "src/lib/routes.js")}`);
const standings = D.currentTable();
const mostPlayed = [...standings].sort((a, b) => b.p - a.p || b.pts - a.pts)[0];
const unplayed = standings.find((r) => r.p === 0);

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

// A club with no game played must not be given a position: derived from an empty row it would
// read "12th · 0 pts", a fact about the fixture list wearing the costume of a fact about the
// club. The panel must be absent, not zeroed. Which club that is changes week to week — early
// on it was Larne, whose opener moved to September — so it is looked up, not named.
function unplayedClubChecks(code) {
  return async (page) => {
    const panel = await page.evaluate((c) => !!document.querySelector(`[data-club-sofar="${c}"]`), code);
    if (panel) fail(`${code} has played no games but shows a current-season panel`);
    else pass(`${code} (no games played) shows no invented current-season numbers`);
  };
}

// The Table view was never visited by this harness, which is how a league table stuck on a
// loading skeleton reached the owner's phone. dist has no /api/*, so the served 404 makes the
// feed fetch fail — which is exactly the case that must still render a table.
async function tableChecks(page) {
  // Counted from real table rows, not from club names appearing in the page text — those turn
  // up in the fixtures list below and made this pass against a screen showing only a skeleton.
  const rows = await page.evaluate(() => document.querySelectorAll("[data-table-row]").length);
  if (rows >= 12) pass(`table rendered with the feed HUNG (${rows} rows)`);
  else fail(`${rows} table rows with the feed hung — expected the full twelve`);

  // A skeleton still animating after the fetch has failed IS the bug. dist serves no /api, so
  // by the time this runs the request has already 404'd.
  const skel = await page.evaluate(() =>
    [...document.querySelectorAll("*")].filter((el) =>
      el.offsetParent !== null && (getComputedStyle(el).animationName || "").includes("shimmer")).length);
  if (skel === 0) pass("no loading skeleton left on screen");
  else fail(`${skel} skeleton element(s) still animating after the feed failed`);
}

// The charts had NO gate of any kind. SkillRadar, Sparkline and ShotMap render only on the
// Players and Duel sub-views, and neither has a URL, so this harness never loaded them — a
// recharts or React major bump could pass build, verify and every screen here and still ship
// blank charts. That is the white-screen class of failure this file exists for.
//
// The decisive assertion is that recharts actually PRODUCED something: an <svg> with real
// geometry inside it and a non-zero box. A library that fails to render leaves an empty
// container, which looks fine to everything except a measurement.
function chartChecks(what) {
  return async (page) => {
    const svgs = await page.evaluate(() => {
      const out = [];
      for (const svg of document.querySelectorAll("svg")) {
        const r = svg.getBoundingClientRect();
        // Crest shields are SVGs too, and tiny. Only count something chart-sized.
        if (r.width < 120 || r.height < 80) continue;
        const marks = svg.querySelectorAll("path, polygon, polyline, circle, line").length;
        out.push({ w: Math.round(r.width), h: Math.round(r.height), marks });
      }
      return out;
    });
    const drawn = svgs.filter((s) => s.marks >= 3);
    if (drawn.length === 0) {
      fail(`${what}: no chart rendered — ${svgs.length} chart-sized svg(s), none with geometry`);
    } else {
      pass(`${what}: ${drawn.length} chart(s) drawn (${drawn.map((d) => `${d.w}x${d.h}, ${d.marks} marks`).join("; ")})`);
    }
  };
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
  { name: `club-${CLUB_TO_SLUG[mostPlayed.club]}`, path: `/club/${CLUB_TO_SLUG[mostPlayed.club]}`,
    checks: playedClubChecks(mostPlayed.club) },
  // Only when the league actually still has one. Once every club has kicked off there is
  // nothing to assert, and inventing a subject would be worse than skipping.
  ...(unplayed ? [{ name: `club-${CLUB_TO_SLUG[unplayed.club]}`, path: `/club/${CLUB_TO_SLUG[unplayed.club]}`,
    checks: unplayedClubChecks(unplayed.club) }] : []),
  // The feed is STALLED here, not 404'd. dist serves no /api, so an ordinary visit gets an
  // instant error — which the old code handled fine. The bug the owner hit was a request that
  // never settles, and only a hang reproduces it.
  { name: "table", path: "/table", checks: tableChecks, stall: ["**/api/**"], settle: 7000 },
  { name: "stats", path: "/stats", checks: statsChecks },
  // No URL reaches these, so the harness taps its way in exactly as a reader would.
  { name: "players", path: "/stats", click: "Players", checks: chartChecks("Players") },
  { name: "duel", path: "/stats", click: "Duel", checks: chartChecks("Duel") },
];
console.log(`subjects: ${mostPlayed.club} (${mostPlayed.p} played)`
  + (unplayed ? `, ${unplayed.club} (none played)` : ", no unplayed club left to test"));

// ===== the walk =====

// Phone first, because that is what the owner and most readers use — but the desktop layout
// (.gb-narrow, .gb-desk-2col, the header that becomes one row at 1100) had never been measured
// at all. Every block added to a page was checked at 360 and 430 and simply assumed at 1440.
const VIEWPORTS = [
  { width: 360, height: 800, kind: "phone" },
  { width: 430, height: 800, kind: "phone" },
  { width: 1024, height: 900, kind: "desktop" },
  { width: 1440, height: 900, kind: "desktop" },
];

for (const vp of VIEWPORTS) {
  const width = vp.width;
  for (const spec of PAGES) {
    const page = await browser.newPage({ viewport: { width, height: vp.height }, deviceScaleFactor: vp.kind === "desktop" ? 1 : 2 });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    // A stalled route never reaches networkidle, which is the point — wait on load instead and
    // then sit past the client's own timeout, so what we measure is the state a reader is left
    // looking at when the feed simply never answers.
    for (const pattern of spec.stall || []) await page.route(pattern, () => { /* never fulfilled */ });
    await page.goto(`http://localhost:4177${spec.path}`, { waitUntil: spec.stall ? "load" : "networkidle" });
    await page.waitForTimeout(spec.settle || 500);

    if (spec.click) {
      const btn = page.locator(`button:text-is("${spec.click}")`).first();
      await btn.click();
      await page.waitForTimeout(900);   // recharts mounts its svg asynchronously
    }

    console.log(`\n${spec.path}${spec.click ? ` → ${spec.click}` : ""}  @${width}px ${vp.kind}`);
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

    // A stat tile must never show a unit with no number in front of it.
    //
    // Every "unknown" in this app is null by design — an omitted stat, a club with no match
    // recording both shots and on-target — and each one is a `?? "—"` away from rendering
    // wrong. REACT MAKES THIS INVISIBLE TO THE OBVIOUS CHECK: `{null}` is not the string
    // "null", it is nothing at all, so a tile grepped for "null" passes clean while painting a
    // lone "%" in 28px Barlow Condensed under the word ACCURACY. Nothing else catches it —
    // the build is green, the unit test agrees null is the correct value, and only the paint
    // is wrong. So the assertion is about the tile being legible, not about a magic word.
    const blanks = await page.evaluate(() =>
      [...document.querySelectorAll(".gb-stat-row")].flatMap((row) =>
        [...row.children].flatMap((tile) => {
          const line = tile.firstElementChild;                    // value + unit
          const name = tile.lastElementChild;                     // the caption
          if (!line || line === name) return [];
          const unit = line.querySelector("span");
          const whole = (line.textContent || "").trim();
          const value = whole.slice(0, whole.length - ((unit && unit.textContent) || "").length).trim();
          return value === "" ? [`"${name.textContent}" shows "${whole || "(empty)"}"`] : [];
        })));
    if (blanks.length === 0) pass("every stat tile shows a value, not a bare unit");
    else fail(`tiles with no number: ${blanks.slice(0, 3).join("; ")}`);

    // Kept alongside it, because the sibling failure — a null reaching the screen through a
    // template literal rather than a JSX child, where it DOES stringify — prints the word.
    const nulls = await page.evaluate(() => {
      const t = document.body.innerText;
      return [...t.matchAll(/\b(null|undefined|NaN|\[object Object\])\b/g)]
        .map((m) => t.slice(Math.max(0, m.index - 30), m.index + 20).replace(/\n+/g, " "));
    });
    if (nulls.length === 0) pass("no tile prints null, undefined or NaN");
    else fail(`absent values rendered as text: ${nulls.slice(0, 3).join(" | ")}`);

    if (spec.checks) await spec.checks(page, vp.height);

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
