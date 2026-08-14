// GIBSON — X / Twitter header (1500x500).
//
//   node scripts/promo/xheader.mjs
//
// Writes the banner plus a guides version showing what actually covers it, because an X
// header is not a rectangle you get to use:
//
//   · THE AVATAR punches a hole in the bottom-left and overlaps the banner by about half its
//     height. Anything put there is gone.
//   · THE SIDES GET CROPPED on narrow viewports — X keeps the banner 3:1 and trims the edges,
//     so roughly the middle 60% is all that is guaranteed to survive.
//   · THE BOTTOM STRIP sits under the profile block on some layouts.
//
// So the lockup lives in the centre band, clear of all three. The guides file is not for
// uploading — it is for checking, and it is why the margins are what they are.

import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CUP_GOLD_FROM, CUP_GOLD_TO, CUP_PATHS } from "../../src/lib/cup.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FONT_DIR = join(REPO, "node_modules/@fontsource/barlow-condensed/files");
const OUT_DIR = process.env.PROMO_OUT || join(REPO, "promo-out");
const W = 1500, H = 500;

const font = (w) => readFileSync(join(FONT_DIR, `barlow-condensed-latin-${w}-normal.woff2`)).toString("base64");
const markSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">`
  + `<defs><linearGradient id="hg" x1="0" y1="0" x2="1" y2="1">`
  + `<stop offset="0" stop-color="${CUP_GOLD_FROM}"/><stop offset="1" stop-color="${CUP_GOLD_TO}"/></linearGradient></defs>`
  + `<g fill="url(#hg)">${CUP_PATHS.map((d) => `<path d="${d}"/>`).join("")}</g></svg>`;

const banner = (guides) => `<html><head><style>
@font-face{font-family:BC;font-weight:800;src:url(data:font/woff2;base64,${font(800)}) format("woff2")}
@font-face{font-family:BC;font-weight:600;src:url(data:font/woff2;base64,${font(600)}) format("woff2")}
*{box-sizing:border-box}
body{margin:0;width:${W}px;height:${H}px;font-family:BC,sans-serif;overflow:hidden;position:relative;
  background:radial-gradient(ellipse at 50% 120%,#1a3a2a 0%,#10241B 45%,#0B1512 100%)}
/* Two knocked-back chevrons, the same device the share card uses. */
.chev{position:absolute;background:rgba(237,245,239,0.03);width:210px;height:900px;
  transform:rotate(26deg);border-radius:16px}
.lock{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
  display:flex;align-items:center;gap:34px}
.mark{width:196px;height:196px;flex:none}
.word{font-size:126px;font-weight:800;letter-spacing:.13em;color:#EDF5EF;line-height:.86;margin-left:6px}
.tag{font-size:33px;font-weight:800;letter-spacing:.06em;color:#FFB627;margin-top:14px}
.feat{font-size:23px;font-weight:600;letter-spacing:.09em;color:rgba(237,245,239,0.5);
  margin-top:12px;text-transform:uppercase;white-space:nowrap}
${guides ? `
.g{position:absolute;pointer-events:none}
.avatar{left:66px;bottom:-104px;width:216px;height:216px;border-radius:50%;
  background:rgba(255,0,80,0.34);border:3px solid #ff0050}
.crop{top:0;bottom:0;width:300px;background:rgba(255,0,80,0.22)}
.note{position:absolute;font:600 20px BC,sans-serif;color:#fff;background:rgba(0,0,0,.6);padding:4px 10px;border-radius:6px}
` : ""}
</style></head><body>
<div class="chev" style="right:-60px;top:-260px"></div>
<div class="chev" style="right:130px;top:-190px;opacity:.65"></div>
<div class="chev" style="left:-90px;top:-300px;opacity:.5"></div>
<div class="lock">
  <div class="mark">${markSvg}</div>
  <div>
    <div class="word">GIBSON</div>
    <div class="tag">THE IRISH LEAGUE, DONE PROPERLY</div>
    <div class="feat">Tables · Stats · Predictor · Euro Watch</div>
  </div>
</div>
${guides ? `
<div class="g avatar"></div>
<div class="g crop" style="left:0"></div>
<div class="g crop" style="right:0"></div>
<div class="note" style="left:96px;bottom:14px">avatar</div>
<div class="note" style="left:14px;top:14px">cropped on mobile</div>
<div class="note" style="right:14px;top:14px">cropped on mobile</div>
` : ""}
</body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H } });

for (const [name, guides] of [["gibson-x-header.png", false], ["gibson-x-header-guides.png", true]]) {
  await page.setContent(banner(guides));
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(join(OUT_DIR, name), await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } }));
  console.log(`${name}  ${W}x${H}`);
}
await browser.close();
