

/* ================= SHARED PIECES ================= */
export const chalk = "#EDF5EF";

export const dim = "rgba(237,245,239,0.7)";

export const faint = "rgba(237,245,239,0.08)";

// The only three surface treatments in the app: flat (bordered list), card, hero (highlighted card)
export const SURFACE = {
  flat: { background: "transparent", border: `1px solid ${faint}` },
  card: { background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}` },
  hero: { background: "linear-gradient(120deg, rgba(255,182,39,0.12), transparent 60%), rgba(240,255,245,0.03)", border: `1px solid ${faint}` },
};

// Near-white overlay used for interactive chrome (buttons, icon tiles) — one fill,
// not the ten ad-hoc opacities this replaced. Card/hero backgrounds stay in SURFACE;
// data-viz strokes and CSS hover/scrollbar are intentionally separate.
export const OVERLAY = { fill: "rgba(240,255,245,0.06)" };

// Type scale — the app's intentional sizes. 12 is the accessibility floor (labels,
// captions, footnotes); everything else steps up from there. Orphan sizes (12.5,
// 13.5, 14.5, 17, 18, 19, 22) were snapped to their nearest step below.
//   12 cap · 13 small · 14 body · 15 control · 16 lead · 20 title · 24/26 head ·
//   30/34 stat · 38 wordmark · 48 scoreboard · 120 watermark
// Spacing rhythm keeps to even steps (2/4/6/8/10/12/14/16/18/20/22/24); odd
// orphans (5/7/9) were snapped to the nearest even.

// Staggered list entrance: ~30ms per row, capped at row 10. The global
// prefers-reduced-motion rule disables all animation, so no check needed here.
export const rise = (i) => ({ animation: `riseIn 0.35s ease-out ${Math.min(i, 10) * 0.03}s backwards` });

export const reducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

export const ratingColor = (r) => (r >= 8 ? "#3DDC84" : r >= 7.3 ? "#FFB627" : "#8FA69B");

export const formColor = (f) => (f === "W" ? "#3DDC84" : f === "D" ? "#FFB627" : "#E8663C");
