// Build-time prerender: server-renders every route to a real static HTML file so
// crawlers (and first paint) get content, not an empty shell. Runs after `vite build`.
// Also regenerates dist/sitemap.xml from the route list. Run: node scripts/prerender.mjs
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createRequire } from "node:module";

const root = process.cwd().replace(/\\/g, "/");
const dist = join(root, "dist");
const SITE = "https://gibson-one.vercel.app";

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

// Emit <route>.html (root -> index.html). With vercel.json "cleanUrls", Vercel serves
// /table from table.html and /club/larne from club/larne.html.
let count = 0;
for (const route of mod.ALL_ROUTES) {
  const file = route === "/" ? join(dist, "index.html") : join(dist, `${route.replace(/^\//, "")}.html`);
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
console.log(`prerendered ${count} routes + sitemap (${mod.ALL_ROUTES.length} urls)`);
