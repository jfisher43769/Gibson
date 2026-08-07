// GIBSON — social banner (X header, 1500x500 by default).
//
//   node scripts/promo/banner.mjs
//   node scripts/promo/banner.mjs --guides      # overlay the unsafe zones to check a redesign
//   BANNER_W=1500 BANNER_H=500 node scripts/promo/banner.mjs
//
// An X header is not a rectangle you can fill. Two things eat it:
//   - the profile picture overlaps the bottom-left corner
//   - narrow viewports crop top and bottom, keeping the middle band
// So everything that must be read lives in the horizontal middle and clear of the left, and
// the corners get texture only. --guides draws those zones so the next person can see them.

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FONT_DIR = join(REPO, "node_modules/@fontsource/barlow-condensed/files");
const OUT_DIR = process.env.PROMO_OUT || join(REPO, "promo-out");
const W = Number(process.env.BANNER_W) || 1500;
const H = Number(process.env.BANNER_H) || 500;
const GUIDES = process.argv.includes("--guides");

if (!existsSync(FONT_DIR)) {
  console.error("Missing @fontsource/barlow-condensed. Run:\n  npm install --no-save @fontsource/barlow-condensed");
  process.exit(1);
}

const D = await import(`file://${REPO}/data.js`);

// The twelve current clubs, in last season's finishing order, for the colour bar along the
// bottom. Same source as the poster, so the banner reshuffles itself when the league does.
const current = [...new Set(D.FIXTURES_2627.flatMap((r) => r.matches.flatMap((m) => [m.h, m.a])))];
const finished = new Map(D.FULL_TABLE.map((r, i) => [r.club, i + 1]).filter(([c]) => current.includes(c)));
const ranked = [...current].sort((a, b) => (finished.get(a) || 99) - (finished.get(b) || 99));

const facts = {
  clubs: ranked.map((c) => ({ code: c, ...D.CLUBS[c] })),
  season: D.SEASON.current.display,
  guides: GUIDES,
};
for (const c of facts.clubs) if (!c.colors) throw new Error(`club ${c.code} has no colours`);
console.log(`banner ${W}x${H} — ${facts.clubs.length} clubs, season ${facts.season}${GUIDES ? " (with guides)" : ""}`);

const kit = readFileSync(join(HERE, "kit.js"), "utf8");
const font = (w) => readFileSync(join(FONT_DIR, `barlow-condensed-latin-${w}-normal.woff2`)).toString("base64");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Barlow Condensed";font-weight:800;src:url(data:font/woff2;base64,${font(800)}) format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:600;src:url(data:font/woff2;base64,${font(600)}) format("woff2")}
html,body{margin:0;background:#000}canvas{display:block}
</style></head><body><canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W},H=${H};
const cv=document.getElementById('c'),ctx=cv.getContext('2d',{alpha:false});
${kit}
const F=${JSON.stringify(facts)};
const S=W/1500, Y=v=>v*(H/500);

// Avatar overlaps bottom-left; narrow viewports keep roughly the middle 70% vertically.
const AVATAR={cx:150*S,cy:Y(500),r:126*S};
const SAFE={top:Y(74),bottom:Y(426)};

function measure(s,size,weight,track){
  ctx.font=weight+' '+size+'px "Barlow Condensed"';
  let w=0; for(const c of [...s]) w+=ctx.measureText(c).width+track;
  return [...s].length?w-track:0;
}
function T(s,x,y,o){
  o=o||{};
  const size=o.size||40*S, weight=o.weight||600, track=o.track||0;
  const w=measure(s,size,weight,track);
  ctx.textBaseline=o.baseline||'alphabetic';
  ctx.save();
  ctx.fillStyle=o.color||CHALK;
  if(o.grad){ const g=ctx.createLinearGradient(x,0,x+w,0); g.addColorStop(0,'#EDF5EF'); g.addColorStop(1,GOLD); ctx.fillStyle=g; }
  let px=o.align==='right'?x-w:o.align==='center'?x-w/2:x;
  for(const c of [...s]){ ctx.fillText(c,px,y); px+=ctx.measureText(c).width+track; }
  ctx.restore();
  return w;
}

function ground(){
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'#060F0C'); g.addColorStop(0.55,'#0C1A15'); g.addColorStop(1,'#050B09');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(W*0.72,Y(210),10,W*0.72,Y(210),W*0.55);
  glow.addColorStop(0,'rgba(255,182,39,0.18)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
}

// The cup as a ghost off the right edge — texture in a corner that gets cropped anyway.
function ghostCup(cx,cy,size,alpha){
  const sc=size/200;
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.translate(cx-size/2,cy-size/2); ctx.scale(sc,sc);
  ctx.fillStyle=GOLD;
  CUP.forEach(p=>ctx.fill(p));
  ctx.fillRect(92,114,16,15); ctx.fillRect(70,132,60,10); ctx.fillRect(57,145,86,10); ctx.fillRect(43,158,114,10);
  ctx.restore();
}

// Twelve club colours as one continuous bar. It reads as a graphic device at a glance and as
// the league to anyone who knows the kits, and it survives being cropped from either end.
function clubBar(y,h){
  const n=F.clubs.length, seg=W/n;
  F.clubs.forEach((c,i)=>{
    ctx.fillStyle=c.colors[0]; ctx.fillRect(i*seg,y,seg+1,h);
    ctx.fillStyle=c.colors[1]; ctx.fillRect(i*seg,y+h*0.66,seg+1,h*0.34);
  });
  // Only a light knock-back: this bar is the single piece of colour on the banner, and
  // dimming it to match the rest of the design defeats the point of having it.
  ctx.fillStyle='rgba(6,15,12,0.14)'; ctx.fillRect(0,y,W,h);
}

function draw(){
  ground();
  ghostCup(W*0.86,Y(232),Y(470),0.085);

  // Lockup sits right of the avatar and inside the vertical safe band.
  const x=364*S;
  cup(x+34*S,Y(196),Y(112));
  T('GIBSON',x+98*S,Y(232),{size:Y(132),weight:800,grad:true,track:2*S});
  T('THE HOME OF IRISH LEAGUE STATS',x+102*S,Y(288),{size:Y(34),weight:600,color:'rgba(237,245,239,0.62)',track:Y(11)});
  T('IRISH LEAGUE · '+F.season+' · GIBSONSTATS.COM',x+102*S,Y(340),{size:Y(30),weight:800,color:GOLD,track:Y(6)});

  clubBar(H-Y(30),Y(30));

  grain(4,0.014);
  // Vignette by hand rather than kit.vignette(): that one is tuned for a portrait card and
  // crushes the corners of a 3:1 strip.
  const v=ctx.createRadialGradient(W/2,H/2,H*0.30,W/2,H/2,W*0.62);
  v.addColorStop(0,'rgba(0,0,0,0)'); v.addColorStop(1,'rgba(0,0,0,0.45)');
  ctx.fillStyle=v; ctx.fillRect(0,0,W,H);

  if(F.guides){
    ctx.save();
    ctx.strokeStyle='rgba(255,0,90,0.9)'; ctx.lineWidth=3*S; ctx.setLineDash([10*S,8*S]);
    ctx.beginPath(); ctx.arc(AVATAR.cx,AVATAR.cy,AVATAR.r,0,7); ctx.stroke();
    ctx.strokeStyle='rgba(0,233,255,0.9)';
    ctx.strokeRect(0,SAFE.top,W,SAFE.bottom-SAFE.top);
    ctx.restore();
    T('AVATAR',AVATAR.cx,AVATAR.cy-AVATAR.r-10*S,{size:Y(22),weight:800,align:'center',color:'#FF005A'});
    T('SAFE BAND',W-14*S,SAFE.top+Y(26),{size:Y(22),weight:800,align:'right',color:'#00E9FF'});
  }
}
window.__render=()=>{draw();return [cv.toDataURL('image/png'),cv.toDataURL('image/jpeg',0.95)]};
window.__ready=document.fonts.ready
  .then(()=>Promise.all([document.fonts.load('800 200px "Barlow Condensed"'),document.fonts.load('600 60px "Barlow Condensed"')]))
  .then(()=>true);
</script></body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
const PW_CHROME = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({
  ...(existsSync(PW_CHROME) ? { executablePath: PW_CHROME } : {}),
  args: ["--force-color-profile=srgb", "--disable-lcd-text"],
});
const page = await browser.newPage({ viewport: { width: Math.min(W, 1500), height: Math.min(H, 900) }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => window.__ready);
const [png, jpg] = await page.evaluate(() => window.__render());
await browser.close();
const suffix = GUIDES ? "-guides" : "";
for (const [ext, url] of [["png", png], ["jpg", jpg]]) {
  const out = join(OUT_DIR, `gibson-x-banner-${W}x${H}${suffix}.${ext}`);
  writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
  console.log("wrote", out);
}
