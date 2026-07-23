// Build-time prerender: server-renders every route to a real static HTML file so
// crawlers (and first paint) get content, not an empty shell. Runs after `vite build`.
// Also regenerates dist/sitemap.xml from the route list. Run: node scripts/prerender.mjs
//
// Hosting model: DIRECTORY-INDEX files, zero Vercel config. A route like /table is
// written to dist/table/index.html, /club/larne to dist/club/larne/index.html. Vercel
// (and any static host) serves <dir>/index.html at /<dir> natively — no vercel.json,
// no cleanUrls rewrites. The root stays dist/index.html and is never overwritten by a
// sub-route, so nothing here can affect how / is served.
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
import App, { ALL_ROUTES, metaForPath, jsonLdForPath } from "${root}/App.jsx";
export function renderRoute(path) {
  globalThis.__GIBSON_ROUTE__ = path;
  const html = renderToString(React.createElement(App));
  delete globalThis.__GIBSON_ROUTE__;
  return html;
}
export { ALL_ROUTES, metaForPath, jsonLdForPath };
`);

await build({
  entryPoints: [entry], bundle: true, platform: "node", format: "cjs",
  loader: { ".jsx": "jsx" }, outfile: out, logLevel: "silent",
  nodePaths: [join(root, "node_modules")],
  // Same build-time stamp vite.config.js injects into the client bundle (App.jsx
  // BUILD_TIME) — a few ms apart from vite's own build() call within the same CI run,
  // which doesn't matter for a canary that only needs day/hour-scale staleness detection.
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
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
    .replace(/<meta name="description" content="[\s\S]*?"\s*\/>/, `<meta name="description" content="${esc(meta.description)}" />`);
  let head = `<link rel="canonical" href="${SITE}${path === "/" ? "/" : path}" />`;
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

// 2. Regenerate the sitemap from the same route list (stays in sync with the clubs).
const urls = mod.ALL_ROUTES.map((r) => {
  const loc = `${SITE}${r === "/" ? "/" : r}`;
  const meta = r === "/" ? "<changefreq>daily</changefreq><priority>1.0</priority>" : "<changefreq>weekly</changefreq><priority>0.8</priority>";
  return `  <url><loc>${loc}</loc>${meta}</url>`;
}).join("\n");
writeFileSync(join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);

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

console.log(`prerendered ${count} routes + sitemap (${mod.ALL_ROUTES.length} urls); root ${rootLen} chars OK`);
