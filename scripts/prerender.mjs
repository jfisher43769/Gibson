// Build-time prerender: server-renders every route to a real static HTML file so
// crawlers (and first paint) get content, not an empty shell. Runs after `vite build`.
// sitemap.xml/rss.xml/calendar/*.ics are generated separately by scripts/generate.js
// (the npm "prebuild" step) into public/, which vite build already copies into dist/ —
// this script only touches the per-route HTML. Run: node scripts/prerender.mjs
//
// Hosting model: DIRECTORY-INDEX files, zero Vercel config. A route like /table is
// written to dist/table/index.html, /club/larne to dist/club/larne/index.html. Vercel
// (and any static host) serves <dir>/index.html at /<dir> natively — no vercel.json,
// no cleanUrls rewrites. The root stays dist/index.html and is never overwritten by a
// sub-route, so nothing here can affect how / is served.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";

const root = process.cwd().replace(/\\/g, "/");
const dist = join(root, "dist");
const SITE = "https://gibsonstats.com";

// 1. Bundle a Node-side render module that exposes renderRoute + the route metadata.
const entry = join(tmpdir(), "gibson-prerender-entry.jsx");
const out = join(tmpdir(), "gibson-prerender.cjs");
writeFileSync(entry, `
import React from "react";
import { renderToString } from "react-dom/server";
import App from "${root}/App.jsx";
import { ALL_ROUTES, metaForPath, jsonLdForPath, ogImageForPath } from "${root}/src/lib/routes.js";
export function renderRoute(path) {
  globalThis.__GIBSON_ROUTE__ = path;
  const html = renderToString(React.createElement(App));
  delete globalThis.__GIBSON_ROUTE__;
  return html;
}
export { ALL_ROUTES, metaForPath, jsonLdForPath, ogImageForPath };
`);

await build({
  entryPoints: [entry], bundle: true, platform: "node", format: "cjs",
  loader: { ".jsx": "jsx" }, outfile: out, logLevel: "silent",
  nodePaths: [join(root, "node_modules")],
  // Same build-time stamp vite.config.js injects into the client bundle (App.jsx
  // BUILD_TIME) — a few ms apart from vite's own build() call within the same CI run,
  // which doesn't matter for a canary that only needs day/hour-scale staleness detection.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_VERSION__: JSON.stringify(createRequire(import.meta.url)(join(root, "package.json")).version),
  },
});

// useLayoutEffect legitimately no-ops under renderToString; silence only that warning,
// for the whole render phase (not just the require).
const origError = console.error;
console.error = (...a) => { if (String(a[0]).includes("useLayoutEffect does nothing on the server")) return; origError(...a); };
const mod = createRequire(import.meta.url)(out);

const template = readFileSync(join(dist, "index.html"), "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function pageHtml(path) {
  const html = mod.renderRoute(path);
  const meta = mod.metaForPath(path);
  const ld = mod.jsonLdForPath(path);
  let doc = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`)
    .replace(/<meta name="description" content="[\s\S]*?"\s*\/>/, `<meta name="description" content="${esc(meta.description)}" />`)
    // og:title was missing here, so every route shipped index.html's generic
    // "GIBSON — Irish League Stats" while <title> was correct. Shared links all showed the
    // site name instead of the page — a Dungannon card on X read "GIBSON — Irish League
    // Stats" with no mention of the club. The <title> being right is what hid it.
    .replace(/<meta property="og:title" content="[\s\S]*?"\s*\/>/, `<meta property="og:title" content="${esc(meta.title)}" />`)
    .replace(/<meta property="og:description" content="[\s\S]*?"\s*\/>/, `<meta property="og:description" content="${esc(meta.description)}" />`);
  // Per-route social card: every route (including root, ?type=home) points og:image and
  // twitter:image at the dynamic /api/og card — a relative fallback like og-card.png
  // doesn't reliably resolve for social scrapers without an og:url to resolve it against,
  // which is exactly why the root card previously didn't work.
  const ogImg = mod.ogImageForPath(path);
  if (ogImg) {
    doc = doc
      .replace(/<meta property="og:image" content="[\s\S]*?"\s*\/>/, `<meta property="og:image" content="${esc(ogImg)}" />`)
      .replace(/<meta name="twitter:image" content="[\s\S]*?"\s*\/>/, `<meta name="twitter:image" content="${esc(ogImg)}" />`);
  }
  const routeUrl = `${SITE}${path === "/" ? "/" : path}`;
  let head = `<link rel="canonical" href="${routeUrl}" />\n    <meta property="og:url" content="${routeUrl}" />`;
  if (ld) head += `\n    <script type="application/ld+json">${JSON.stringify(ld)}</script>`;
  doc = doc.replace("</head>", `    ${head}\n  </head>`);
  // Inject the rendered app into #root — crawlers see content; the client re-renders on load.
  doc = doc.replace('<div id="root"></div>', `<div id="root">${html}</div>`);
  return doc;
}

// Emit directory-index files: "/" -> dist/index.html, "/table" -> dist/table/index.html,
// "/club/larne" -> dist/club/larne/index.html. Vercel serves each at its clean path with
// no config. The root file is the one vite already produced; we overwrite it in place with
// the same document, prerendered.
let count = 0;
for (const route of mod.ALL_ROUTES) {
  const file = route === "/"
    ? join(dist, "index.html")
    : join(dist, route.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, pageHtml(route));
  count++;
}

console.error = origError;

// Regression guard (the root-404 incident): the site went down when a build shipped a
// broken/empty root. Fail the build — so nothing deploys — unless the root and a sample
// sub-route both carry real prerendered content. A failed build keeps the last good
// deploy live; a silent empty root is what 404s production.
const rootContent = (p) => {
  const m = readFileSync(p, "utf8").match(/<div id="root">([\s\S]*?)<\/div>\s*<script/);
  return m ? m[1].length : 0;
};
const rootLen = rootContent(join(dist, "index.html"));
const sampleLen = rootContent(join(dist, "table", "index.html"));
if (rootLen < 1000 || sampleLen < 1000) {
  throw new Error(`prerender guard failed: root=${rootLen} table=${sampleLen} chars in #root (need >=1000). Refusing to ship an empty shell.`);
}

// ---- Service-worker precache list -----------------------------------------------------
// The bundle filename carries a content hash that only exists after vite builds, so the
// list cannot live in public/sw.js. Inject it here, into the copy that ships.
//
// This is what makes "works offline" true on a FIRST visit: a newly registered worker does
// not control the navigation that registered it, so without a precache the shell and the
// bundle are never stored, and losing signal after one visit gives a blank page.
{
  const swPath = join(dist, "sw.js");
  const assets = readdirSync(join(dist, "assets"))
    .filter((f) => /\.(js|css)$/.test(f))
    .map((f) => `/assets/${f}`);
  const precache = ["/", ...assets, "/manifest.webmanifest", "/favicon.ico", "/icon-192.png", "/icon-512.png"]
    .filter((u) => u === "/" || existsSync(join(dist, u.replace(/^\//, ""))));
  let sw = readFileSync(swPath, "utf8");
  const replaced = sw.replace(/const PRECACHE = \[\];/, `const PRECACHE = ${JSON.stringify(precache)};`);
  if (replaced === sw) {
    throw new Error("prerender: could not inject PRECACHE into sw.js — the placeholder is gone, so the app would ship without offline support on a first visit.");
  }
  writeFileSync(swPath, replaced);
  console.log(`service worker precache: ${precache.length} entries (${assets.length} hashed asset(s))`);
}

console.log(`prerendered ${count} routes + sitemap (${mod.ALL_ROUTES.length} urls); root ${rootLen} chars OK`);
