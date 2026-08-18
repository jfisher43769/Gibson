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

// "18 Aug, 9.12pm" — the same build timestamp, said the way a reader would say it.
//
// Belfast time, pinned with an explicit timeZone rather than the visitor's own. This audience
// is in one place, and a fan in Australia being told the results updated at 6am tomorrow is
// noise; more to the point, the prerendered HTML is generated on a UTC build machine, so
// without pinning it the server and the browser would print two different times for the same
// deploy and hydration would swap one for the other in front of the reader.
const UPDATED_HUMAN = (() => {
  const d = new Date(BUILD_TIME);
  if (isNaN(d.getTime())) return null;                 // dev/render-test sentinel: say nothing
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London", day: "numeric", month: "short",
      hour: "numeric", minute: "2-digit", hour12: true,
    }).formatToParts(d).map((x) => [x.type, x.value]));
    // en-GB gives "pm"; the house style is lower-case with a dot for the minutes.
    return `${p.day} ${p.month}, ${p.hour}.${p.minute}${(p.dayPeriod || "").toLowerCase().replace(/\s/g, "")}`;
  } catch { return null; }                             // no Intl/tz data — fall back to silence
})();

// The footer. Reads the constants above rather than any hand-typed string, so it can never go
// stale against the deployed bundle.
//
// TWO LINES, FOR TWO READERS. "GIBSON 1.3.0 · build 18 AUG" is a deploy fingerprint — it exists
// so the canary can tell a live deploy from one stuck behind a cache, and it means nothing to a
// fan checking whether tonight's score is in yet. That reader gets a plain sentence first, in
// ordinary type; the fingerprint stays underneath, quieter, for the job it was built for.
export function BuildStamp() {
  return (
    <div style={{ textAlign: "center", padding: "26px 0 10px" }}>
      {UPDATED_HUMAN && (
        <div style={{ fontSize: 12, color: "rgba(143,166,155,0.95)", marginBottom: 5 }}>
          Results updated {UPDATED_HUMAN}
        </div>
      )}
      {/* Kept at 0.85 alpha: the first draft dimmed it to 0.6 to push it behind the human line
          and dropped it to 3.26:1, which verify.js caught. Size and weight do that job instead,
          because contrast is not a lever available for de-emphasis. */}
      <div style={{ fontSize: 11, color: "rgba(143,166,155,0.85)", letterSpacing: "0.12em", fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase" }}>
        GIBSON {APP_VERSION} · build {BUILD_STAMP} · 🏆
      </div>
    </div>
  );
}
