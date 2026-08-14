// GIBSON — profile pictures.
//
//   node scripts/promo/avatar.mjs
//
// Writes 1024x1024 avatars to promo-out/, plus a contact sheet showing each one circle-cropped
// at the sizes a feed actually renders them.
//
// WHY THIS IS NOT JUST THE APP ICON. Two reasons the PWA icons are the wrong file to upload:
//
//   · Every platform crops a profile picture to a CIRCLE. The app's "any" icon fills 78% of
//     its square, and the corners of the plaque drum clip when a circle is taken out of that.
//     Here the mark is sized against the inscribed circle instead of the square.
//   · The cup is much taller than it is wide — about 126 units across against 186 down. Fit it
//     by width and it overflows the circle top and bottom, so it is fitted by HEIGHT and the
//     width looks after itself.
//
// Geometry is imported from src/lib/cup.js like every other consumer. Nothing is redrawn here.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CUP_GOLD_FROM, CUP_GOLD_TO, CUP_PATHS, CUP_VIEWBOX } from "../../src/lib/cup.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.PROMO_OUT || join(HERE, "..", "..", "promo-out");
const SIZE = 1024;

// The cup's own bounding box inside the 200x200 viewBox, so it can be centred and scaled on
// what is actually drawn rather than on the box around it.
const nums = (d) => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
const BOX = CUP_PATHS.reduce((b, d) => {
  const n = nums(d);
  for (let i = 0; i + 1 < n.length; i += 2) {
    b.x0 = Math.min(b.x0, n[i]); b.x1 = Math.max(b.x1, n[i]);
    b.y0 = Math.min(b.y0, n[i + 1]); b.y1 = Math.max(b.y1, n[i + 1]);
  }
  return b;
}, { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });

// Fraction of the avatar's width the mark's HEIGHT should occupy. The inscribed circle is the
// full width, so 0.62 leaves a comfortable ring of background all the way round even at the
// corners of the drum — checked on the contact sheet, not guessed.
const FILL = 0.62;

const mark = (fill, id) => {
  const w = BOX.x1 - BOX.x0, h = BOX.y1 - BOX.y0;
  const scale = (SIZE * FILL) / h;
  const dx = SIZE / 2 - (BOX.x0 + w / 2) * scale;
  const dy = SIZE / 2 - (BOX.y0 + h / 2) * scale;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`
    + `<defs><linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1">`
    + `<stop offset="0" stop-color="${CUP_GOLD_FROM}"/><stop offset="1" stop-color="${CUP_GOLD_TO}"/>`
    + `</linearGradient></defs>`
    + `<g transform="translate(${dx} ${dy}) scale(${scale})" fill="${fill === "gold" ? `url(#g${id})` : fill}">`
    + CUP_PATHS.map((d) => `<path d="${d}"/>`).join("")
    + `</g></svg>`;
};

const VARIANTS = [
  { file: "gibson-avatar-dark.png", bg: "radial-gradient(circle at 50% 38%, #163325 0%, #0B1512 72%)", fill: "gold" },
  { file: "gibson-avatar-green.png", bg: "#10241B", fill: "gold" },
  { file: "gibson-avatar-gold.png", bg: `linear-gradient(135deg, ${CUP_GOLD_FROM} 0%, ${CUP_GOLD_TO} 100%)`, fill: "#0B1512" },
];

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();
await page.setViewportSize({ width: SIZE, height: SIZE });

const dataUris = [];
for (const [i, v] of VARIANTS.entries()) {
  await page.setContent(`<body style="margin:0;width:${SIZE}px;height:${SIZE}px;background:${v.bg}">${mark(v.fill, i)}</body>`);
  const buf = await page.screenshot({ clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
  writeFileSync(join(OUT_DIR, v.file), buf);
  dataUris.push(`data:image/png;base64,${buf.toString("base64")}`);
  console.log(`${v.file}  ${SIZE}x${SIZE}`);
}

// Contact sheet: each variant circle-cropped at the sizes a feed renders an avatar, so the
// question "does it still read at 40px in a timeline" is answered by looking rather than hoping.
const SHOW = [400, 128, 64, 40];
await page.setViewportSize({ width: 720, height: 200 * VARIANTS.length + 40 });
await page.setContent(`<body style="margin:0;background:#3a3a3a;font:12px sans-serif;color:#ddd;padding:20px">
${VARIANTS.map((v, i) => `<div style="display:flex;align-items:center;gap:24px;margin-bottom:22px">
  ${SHOW.map((s) => `<div style="text-align:center">
    <img src="${dataUris[i]}" style="width:${s}px;height:${s}px;border-radius:50%;display:block">
    <div style="margin-top:5px">${s}px</div></div>`).join("")}
  <div style="opacity:.7">${v.file}</div>
</div>`).join("")}
</body>`);
writeFileSync(join(OUT_DIR, "gibson-avatar-preview.png"), await page.screenshot({ fullPage: true }));
console.log("gibson-avatar-preview.png  (circle-cropped contact sheet)");

await browser.close();
