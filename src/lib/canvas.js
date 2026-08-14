import { CUP_GOLD_FROM, CUP_GOLD_TO, CUP_PATHS } from "./cup.js";
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// The Gibson Cup, onto a canvas. The share cards users generate from the Predictor are posted
// publicly, so they carry the real mark for the same reason every promo card does — they were
// drawing a 🏆 emoji, which is a generic trophy and somebody else's artwork.
//
// Geometry comes from src/lib/cup.js like every other consumer; nothing is redrawn here. Sized
// against the 200x200 viewBox exactly as the promo kits do, so a mark at a given size matches
// between an in-app share card and a generated one.
export function drawCup(ctx, cx, cy, size) {
  const sc = size / 200;
  ctx.save();
  ctx.translate(cx - size / 2, cy - size / 2);
  ctx.scale(sc, sc);
  const g = ctx.createLinearGradient(0, 0, 200, 200);
  g.addColorStop(0, CUP_GOLD_FROM);
  g.addColorStop(1, CUP_GOLD_TO);
  ctx.fillStyle = g;
  for (const d of CUP_PATHS) ctx.fill(new Path2D(d));
  ctx.restore();
}

// A footer lockup: the mark, then "GIBSON · domain", centred as one unit. Returns nothing —
// it draws. Kept here rather than in each card so the two Predictor cards cannot drift apart.
export function drawFooterLockup(ctx, centreX, baselineY, label, font, color, markSize) {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const gap = Math.round(markSize * 0.28);
  const width = markSize + gap + ctx.measureText(label).width;
  const x = centreX - width / 2;
  // The mark's optical centre sits a little above the text baseline, not on it.
  drawCup(ctx, x + markSize / 2, baselineY - markSize * 0.34, markSize);
  ctx.fillStyle = color;
  ctx.fillText(label, x + markSize + gap, baselineY);
  ctx.restore();
}
