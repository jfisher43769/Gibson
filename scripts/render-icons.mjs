// Renders the PWA icons and the static share card from src/lib/cup.js.
//
// These are committed PNGs, so redrawing the mark in code is only half the job — an
// installed app keeps showing whatever is on the home screen until the icon file itself
// changes. Generating them from the same geometry the app draws means the icon, the
// header mark and the share cards cannot disagree.
//
// Run after any change to src/lib/cup.js:  node scripts/render-icons.mjs
import { createHash } from "node:crypto";
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { cupPathsLiteral, cupSvg } from "../src/lib/cup.js";

const PUBLIC = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const BG = "#0B1512";

// maskable icons get cropped to a circle by the launcher, so the mark sits inside the
// safe zone (80% of the width) with the background bled to the edges.
const TARGETS = [
  { file: "icon-96.png", size: 96, scale: 0.78, bg: BG },
  { file: "icon-192.png", size: 192, scale: 0.78, bg: BG },
  { file: "icon-512.png", size: 512, scale: 0.78, bg: BG },
  { file: "icon-maskable-512.png", size: 512, scale: 0.56, bg: BG },
  { file: "gibson-mark.png", size: 1024, scale: 0.82, bg: "transparent" },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage();

for (const t of TARGETS) {
  const inner = Math.round(t.size * t.scale);
  await page.setViewportSize({ width: t.size, height: t.size });
  await page.setContent(
    `<body style="margin:0;width:${t.size}px;height:${t.size}px;background:${t.bg};`
    + `display:flex;align-items:center;justify-content:center">${cupSvg(inner)}</body>`
  );
  writeFileSync(join(PUBLIC, t.file), await page.screenshot({
    omitBackground: t.bg === "transparent",
    clip: { x: 0, y: 0, width: t.size, height: t.size },
  }));
  console.log(`${t.file}  ${t.size}x${t.size}`);
}

// ---- The static share card -------------------------------------------------------
// The fallback used where a crawler will not call /api/og. It carries the mark, so it
// goes stale the moment the mark changes — which is exactly what happened to it before.
const FONTS = join(dirname(fileURLToPath(import.meta.url)), "..", "node_modules/@fontsource/barlow-condensed/files");
const font = (w) => readFileSync(join(FONTS, `barlow-condensed-latin-${w}-normal.woff2`)).toString("base64");

await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(`<html><head><style>
@font-face{font-family:BC;font-weight:800;src:url(data:font/woff2;base64,${font(800)}) format("woff2")}
@font-face{font-family:BC;font-weight:600;src:url(data:font/woff2;base64,${font(600)}) format("woff2")}
body{margin:0;width:1200px;height:630px;font-family:BC,sans-serif;overflow:hidden;
  background:linear-gradient(135deg,#10241B 0%,#0B1512 60%,#0B1512 100%);position:relative}
.chev{position:absolute;background:rgba(237,245,239,0.035);width:230px;height:760px;
  transform:rotate(28deg);border-radius:14px}
.row{position:absolute;inset:0;display:flex;align-items:center;gap:56px;padding:0 88px}
h1{font-size:118px;font-weight:800;letter-spacing:.14em;color:#EDF5EF;margin:0;line-height:.92}
.tag{font-size:44px;font-weight:800;letter-spacing:.045em;color:#FFB627;margin-top:14px}
.feat{font-size:30px;font-weight:600;letter-spacing:.05em;color:rgba(237,245,239,0.62);
  margin-top:26px;line-height:1.42;text-transform:uppercase}
.badge{display:inline-block;margin-top:26px;padding:11px 30px;border:2px solid #3DDC84;
  border-radius:999px;font-size:28px;font-weight:800;letter-spacing:.05em;color:#3DDC84}
</style></head><body>
<div class="chev" style="right:-40px;top:-230px"></div>
<div class="chev" style="right:150px;top:-120px;opacity:.6"></div>
<div class="row">
  ${cupSvg(250, "-og")}
  <div>
    <h1>GIBSON</h1>
    <div class="tag">THE IRISH LEAGUE, DONE PROPERLY</div>
    <div class="feat">Tables · Stats Lab · Predictor · Euro Watch<br>Transfer ledger · Every fixture · Every club</div>
    <div><span class="badge">FREE · BUILT BY A FAN</span></div>
  </div>
</div></body></html>`);
await page.evaluate(() => document.fonts.ready);
writeFileSync(join(PUBLIC, "og-card.png"), await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } }));
console.log("og-card.png  1200x630");

// ---- favicon.ico -----------------------------------------------------------------
// A browser tab is the smallest place the mark appears and the one people see most.
// Hand-packed: an ICO is a 6-byte header, a 16-byte directory entry per size, and then
// the PNG payloads — no image library needed for PNG-in-ICO, which every browser reads.
const icoSizes = [16, 32, 48];
const pngs = [];
for (const s of icoSizes) {
  await page.setViewportSize({ width: s, height: s });
  await page.setContent(`<body style="margin:0;width:${s}px;height:${s}px;background:${BG};`
    + `display:flex;align-items:center;justify-content:center">${cupSvg(Math.round(s * 0.86), "-ico" + s)}</body>`);
  pngs.push(await page.screenshot({ clip: { x: 0, y: 0, width: s, height: s } }));
}
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(icoSizes.length, 4);
let offset = 6 + 16 * icoSizes.length;
const dir = icoSizes.map((s, i) => {
  const e = Buffer.alloc(16);
  e[0] = s === 256 ? 0 : s; e[1] = s === 256 ? 0 : s; e[2] = 0; e[3] = 0;
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
writeFileSync(join(PUBLIC, "favicon.ico"), Buffer.concat([header, ...dir, ...pngs]));
console.log(`favicon.ico  ${icoSizes.join("/")}`);

// A fingerprint of the geometry these images were rendered from. verify.js compares it
// to the live geometry, so redrawing the mark and forgetting to re-run this script fails
// the build instead of shipping an app whose icon is a different trophy from its header.
writeFileSync(join(PUBLIC, "mark.hash"), createHash("sha256").update(cupPathsLiteral()).digest("hex") + "\n");
console.log("mark.hash");

await browser.close();
