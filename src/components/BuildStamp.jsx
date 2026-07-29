import React from "react";
// Injected at build time via vite/esbuild `define` (see vite.config.js, scripts/prerender.mjs,
// scripts/render-test.mjs) — NOT computed in the browser, so it reflects when the deployed
// bundle was built, not when a visitor loaded the page. Lets the production canary (and
// anyone else) tell a live deploy apart from a stale one stuck behind a cache.
export const BUILD_TIME = typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev";

// Version comes from package.json via the same `define` plumbing, so the footer can't
// drift from the package the way the old hand-typed "1.08 · build 23 JUL" did — that
// string sat five days and six deploys stale and made a healthy deploy look broken.
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

// "28 JUL" from the build timestamp. BUILD_TIME is a sentinel ("dev"/"render-test") when
// not built by vite, so fall back to showing that rather than an Invalid Date.
const BUILD_STAMP = (() => {
  const d = new Date(BUILD_TIME);
  if (isNaN(d.getTime())) return String(BUILD_TIME).toUpperCase();
  const M = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  return `${d.getUTCDate()} ${M[d.getUTCMonth()]}`;
})();

// The footer's version/build line. Reads the constants above rather than any hand-typed
// string, so it can never go stale against the deployed bundle.
export function BuildStamp() {
  return (
    <div style={{ textAlign: "center", padding: "26px 0 10px", fontSize: 12, color: "rgba(143,166,155,0.55)", letterSpacing: "0.12em", fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase" }}>
      GIBSON {APP_VERSION} · build {BUILD_STAMP} · 🏆
    </div>
  );
}
