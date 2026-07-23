// Render smoke test: bundles App.jsx and server-renders it once.
// Catches runtime crashes on initial render (e.g. module-scope errors) that
// `vite build` and scripts/verify.js both miss — a green build is no proof
// the app actually mounts. Run: node scripts/render-test.mjs
import { build } from "esbuild";
import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

const root = process.cwd().replace(/\\/g, "/");
const entry = join(tmpdir(), "gibson-render-entry.jsx");
const out = join(tmpdir(), "gibson-render-test.cjs");

writeFileSync(entry, `
import React from "react";
import { renderToString } from "react-dom/server";
import App from "${root}/App.jsx";
const html = renderToString(React.createElement(App));
if (html.length < 1000 || !html.includes("GIBSON")) {
  throw new Error("render output looks wrong (" + html.length + " chars)");
}
console.log("render test OK — app mounts, " + html.length + " chars of HTML");
`);

try {
  await build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    loader: { ".jsx": "jsx" },
    outfile: out,
    logLevel: "silent",
    nodePaths: [join(root, "node_modules")],
    define: { __BUILD_TIME__: JSON.stringify("render-test") },
  });
  // useLayoutEffect legitimately no-ops under renderToString; silence only that warning
  const origError = console.error;
  console.error = (...args) => {
    if (String(args[0]).includes("useLayoutEffect does nothing on the server")) return;
    origError(...args);
  };
  createRequire(import.meta.url)(out);
  console.error = origError;
} finally {
  rmSync(entry, { force: true });
  rmSync(out, { force: true });
}
