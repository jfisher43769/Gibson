// GIBSON — the logo breakdown carousel.
//
//   node scripts/promo/logostory.mjs
//
// Six 1080x1350 slides telling how the mark was drawn, written to promo-out/.
//
// The label positions are COMPUTED from src/lib/cup.js, not placed by eye: each callout is
// anchored to the real vertical extent of the part it names, so if the mark is ever adjusted
// again the annotations move with it instead of quietly pointing at the wrong thing.
//
// The retired mark is kept here, and only here, for the before/after. It is the one place in
// the repo that still holds it, which is the point — it is history, not geometry in use.

import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { CUP_GOLD_FROM, CUP_GOLD_TO, CUP_PARTS, CUP_PATHS, CUP_DRUM, CUP_SHARES, extentY, heightShare } from "../../src/lib/cup.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FONT_DIR = join(REPO, "node_modules/@fontsource/barlow-condensed/files");
const OUT_DIR = process.env.PROMO_OUT || join(REPO, "promo-out");
const W = 1080, H = 1350;

// The mark this replaced: a generic two-handled cup on terrace steps. Retired 13 Aug 2026.
const OLD_PATHS = [
  "M54 38 L146 38 L138 76 C133 101 118 114 100 114 C82 114 67 101 62 76 Z",
  "M56 46 C30 46 26 78 49 88 L54 78 C40 71 44 55 56 55 Z",
  "M144 46 C170 46 174 78 151 88 L146 78 C160 71 156 55 144 55 Z",
  "M92 114 L108 114 L108 129 L92 129 Z",
  "M70 132 L130 132 L130 142 L70 142 Z",
  "M57 145 L143 145 L143 155 L57 155 Z",
  "M43 158 L157 158 L157 168 L43 168 Z",
];

// Vertical anchor for each callout, taken from the geometry itself.
const partY = (paths) => { const e = extentY(paths); return (e.top + e.bottom) / 2; };
const P = CUP_PARTS;
const ANATOMY = [
  { y: partY([P.head, P.torso, P.ball, P.bootRaised]), side: -1,
    title: "The footballer", body: "A ball under his right boot. The single most recognisable thing on the trophy." },
  { y: partY([P.lidDome, P.lidRim]), side: 1,
    title: "The domed lid", body: "With its stepped rim." },
  { y: partY([P.handleLeft]), side: -1,
    title: "Handles that go all the way round", body: "Forged loops leaving the shoulder and returning lower down." },
  { y: partY([P.bowlBody]), side: 1,
    title: "The plain cartouche", body: "The smooth oval panel the presentation inscription sits on." },
  { y: partY(CUP_DRUM), side: -1,
    title: "The winners' plaques", body: "Courses of shields ringing the drum, stepping outward." },
  { y: partY([P.basePlinth]), side: 1,
    title: "The stepped plinth", body: "What gives it that bottom-heavy stance." },
];

const font = (w) => readFileSync(join(FONT_DIR, `barlow-condensed-latin-${w}-normal.woff2`)).toString("base64");
const svgOf = (paths, fill) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100%" height="100%">`
  + `<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">`
  + `<stop offset="0" stop-color="${CUP_GOLD_FROM}"/><stop offset="1" stop-color="${CUP_GOLD_TO}"/></linearGradient></defs>`
  + `<g fill="${fill || "url(#lg)"}">${paths.map((d) => `<path d="${d}"/>`).join("")}</g></svg>`;

const SHARES = Object.entries(CUP_SHARES).map(([k]) => ({ name: k, pct: heightShare(k) }));

const css = `
@font-face{font-family:BC;font-weight:800;src:url(data:font/woff2;base64,${font(800)}) format("woff2")}
@font-face{font-family:BC;font-weight:600;src:url(data:font/woff2;base64,${font(600)}) format("woff2")}
*{box-sizing:border-box}
body{margin:0;width:${W}px;height:${H}px;font-family:BC,sans-serif;overflow:hidden;
  background:radial-gradient(circle at 50% 20%,#163325 0%,#0B1512 68%);color:#EDF5EF;position:relative}
.num{position:absolute;top:52px;right:60px;font-size:26px;font-weight:600;color:rgba(237,245,239,0.4);letter-spacing:.1em}
.kicker{position:absolute;top:52px;left:60px;font-size:26px;font-weight:600;color:#FFB627;letter-spacing:.18em;text-transform:uppercase}
h1{position:absolute;top:104px;left:60px;right:60px;margin:0;font-size:76px;font-weight:800;line-height:.98;text-transform:uppercase}
.sub{position:absolute;top:auto;left:60px;right:60px;font-size:30px;font-weight:600;color:rgba(237,245,239,0.72);line-height:1.42}
.foot{position:absolute;bottom:46px;left:60px;font-size:28px;font-weight:800;color:#FFB627;letter-spacing:.06em}
.foot2{position:absolute;bottom:46px;right:60px;font-size:24px;font-weight:600;color:rgba(237,245,239,0.4)}
.mark{position:absolute}
.lab{position:absolute;width:300px}
.lab b{display:block;font-size:29px;font-weight:800;color:#FFB627;line-height:1.1;margin-bottom:6px}
.lab span{font-size:24px;font-weight:600;color:rgba(237,245,239,0.7);line-height:1.34}
.rule{position:absolute;height:2px;background:rgba(255,182,39,0.45)}
.bar{position:absolute;left:60px;right:60px;height:56px;display:flex;align-items:center;gap:18px}
.bar .n{width:210px;font-size:30px;font-weight:600;color:rgba(237,245,239,0.72);text-transform:capitalize}
.bar .t{flex:1;height:20px;background:rgba(237,245,239,0.08);border-radius:10px;overflow:hidden}
.bar .f{height:100%;background:linear-gradient(90deg,${CUP_GOLD_FROM},${CUP_GOLD_TO});border-radius:10px}
.bar .v{width:110px;text-align:right;font-size:30px;font-weight:800;color:#FFB627}
.card{position:absolute;border:2px solid rgba(237,245,239,0.12);border-radius:22px;background:rgba(240,255,245,0.03)}
.cap{position:absolute;text-align:center;font-size:26px;font-weight:600;color:rgba(237,245,239,0.55)}
.big{position:absolute;font-size:150px;font-weight:800;color:#FFB627;line-height:.9}
`;

const chrome = (n, kicker) =>
  `<div class="kicker">${kicker}</div><div class="num">${n} / 6</div>`
  + `<div class="foot">GIBSONSTATS.COM</div><div class="foot2">@GIBSONSTATS</div>`;

const SLIDES = [
  // 1 — the reveal
  `${chrome(1, "New mark")}
   <h1>We redrew<br>the badge</h1>
   <div class="mark" style="left:50%;transform:translateX(-50%);top:330px;width:560px;height:560px">${svgOf(CUP_PATHS)}</div>
   <div class="sub" style="bottom:150px;text-align:center">The old one was clip-art. This one is the actual Gibson Cup.</div>`,

  // 2 — before / after
  `${chrome(2, "Before / after")}
   <h1>Spot the<br>difference</h1>
   <div class="card" style="left:60px;top:300px;width:440px;height:560px"></div>
   <div class="mark" style="left:110px;top:340px;width:340px;height:480px;opacity:.75">${svgOf(OLD_PATHS, "#8FA69B")}</div>
   <div class="cap" style="left:60px;top:880px;width:440px">Before — a generic cup on steps</div>
   <div class="card" style="right:60px;top:300px;width:440px;height:560px;border-color:rgba(255,182,39,0.35)"></div>
   <div class="mark" style="right:110px;top:340px;width:340px;height:480px">${svgOf(CUP_PATHS)}</div>
   <div class="cap" style="right:60px;top:880px;width:440px">After — the real thing</div>
   <div class="sub" style="bottom:150px">No footballer. No plaques. Handles that stop halfway. It had none of the things that make the Gibson Cup the Gibson Cup.</div>`,

  // 3 — anatomy, labels anchored to the geometry
  (() => {
    const top = 250, size = 900;                       // the mark's box on this slide
    const toY = (cupY) => top + (cupY / 200) * size;
    const cx = W / 2;
    return `${chrome(3, "Anatomy")}
      <h1>Every part<br>is on the cup</h1>
      <div class="mark" style="left:${cx - size / 2}px;top:${top}px;width:${size}px;height:${size}px">${svgOf(CUP_PATHS)}</div>
      ${ANATOMY.map((a) => {
        const y = toY(a.y);
        const left = a.side < 0;
        const lx = left ? 46 : W - 46 - 300;
        const rx = left ? 352 : W - 352 - 96;
        return `<div class="lab" style="left:${lx}px;top:${y - 34}px;text-align:${left ? "right" : "left"}">
                  <b>${a.title}</b><span>${a.body}</span></div>
                <div class="rule" style="left:${rx}px;top:${y}px;width:96px"></div>`;
      }).join("")}`;
  })(),

  // 4 — proportions
  `${chrome(4, "Proportions")}
   <h1>Measured,<br>not eyeballed</h1>
   <div class="sub" style="top:270px">Each section's share of the height, taken off photographs of the real trophy.</div>
   ${SHARES.map((s, i) => `<div class="bar" style="top:${400 + i * 76}px">
      <div class="n">${s.name}</div>
      <div class="t"><div class="f" style="width:${(s.pct / 0.36 * 100).toFixed(1)}%"></div></div>
      <div class="v">${(s.pct * 100).toFixed(1)}%</div></div>`).join("")}
   <div class="sub" style="bottom:150px">The first attempt gave the footballer 24% of the height. He became a mascot riding a cup. He is 12.5% now.</div>`,

  // 5 — scale
  `${chrome(5, "Scale")}
   <h1>It has to<br>work tiny</h1>
   <div class="sub" style="top:280px">The gaps between the plaques ARE the detail. They close up as it shrinks, so it reads as a solid trophy at the size of a browser tab.</div>
   ${[420, 220, 120, 64, 32].reduce((acc, s, i, arr) => {
     const gap = 40;
     const total = arr.reduce((n, x) => n + x, 0) + gap * (arr.length - 1);
     const startX = (W - total) / 2;
     const x = startX + arr.slice(0, i).reduce((n, x2) => n + x2, 0) + gap * i;
     return acc + `<div class="mark" style="left:${x}px;top:${760 - s / 2}px;width:${s}px;height:${s}px">${svgOf(CUP_PATHS)}</div>`
       + `<div class="cap" style="left:${x}px;top:${810}px;width:${s}px">${s}px</div>`;
   }, "")}`,

  // 6 — close
  `${chrome(6, "Live now")}
   <h1>On the site,<br>the icons and<br>every graphic</h1>
   <div class="mark" style="left:50%;transform:translateX(-50%);top:520px;width:420px;height:420px">${svgOf(CUP_PATHS)}</div>
   <div class="sub" style="bottom:160px;text-align:center">One drawing, one file, every surface.<br>gibsonstats.com</div>`,
];

mkdirSync(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H } });

for (const [i, body] of SLIDES.entries()) {
  await page.setContent(`<html><head><style>${css}</style></head><body>${body}</body></html>`);
  await page.evaluate(() => document.fonts.ready);
  const out = join(OUT_DIR, `gibson-logostory-${i + 1}.png`);
  writeFileSync(out, await page.screenshot({ clip: { x: 0, y: 0, width: W, height: H } }));
  console.log(`slide ${i + 1}/6  ${out.split("/").pop()}`);
}
await browser.close();
