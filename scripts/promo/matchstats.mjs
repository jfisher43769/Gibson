// GIBSON — match stats card (1080x1350 JPEG).
//
//   node scripts/promo/matchstats.mjs CLI "FIRST HALF" 1-0 \
//     --stats="Possession,63,37,%;Total shots,4,7;Shots on target,2,5;Corners,1,0;Yellow cards,1,1"
//
// Rows are "label,home,away[,suffix]" separated by semicolons. Home first, always, to match
// how every scoreline in this repo is written.
//
// Bars are gold for home and sky for away rather than club colours, because two clubs can
// wear the same one — Cliftonville v Crusaders is red against red — so club colour cannot
// carry a head-to-head. Same pairing the app's Duel view uses, and the club names carry a
// matching underline so the legend is never in doubt.

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FONT_DIR = join(REPO, "node_modules/@fontsource/barlow-condensed/files");
const OUT_DIR = process.env.PROMO_OUT || join(REPO, "promo-out");
const W = Number(process.env.GOAL_W) || 1080;
const H = Number(process.env.GOAL_H) || 1350;

if (!existsSync(FONT_DIR)) {
  console.error("Missing @fontsource/barlow-condensed. Run:\n  npm install --no-save @fontsource/barlow-condensed");
  process.exit(1);
}

const D = await import(`file://${REPO}/data.js`);
const argv = process.argv.slice(2);
const flag = (n) => { const h = argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };
const die = (m) => { console.error(`\n${m}\n\nUsage: node scripts/promo/matchstats.mjs <CLUB> "<title>" <h>-<a> --stats="label,home,away[,suffix];..."\n`); process.exit(1); };

const [clubArg, titleArg, scoreArg] = argv.filter((a) => !a.startsWith("--"));
const club = String(clubArg || "").toUpperCase();
if (!D.CLUBS[club]) die(`Unknown club "${clubArg}". Try one of: ${Object.keys(D.CLUBS).join(", ")}`);
const title = String(titleArg || "FIRST HALF").toUpperCase();
const sm = /^(\d{1,2})\s*[-–:]\s*(\d{1,2})$/.exec(String(scoreArg || "").trim());
if (!sm) die(`Score "${scoreArg}" should look like 1-0 (home first).`);
const score = [Number(sm[1]), Number(sm[2])];

const raw = flag("stats");
if (!raw) die("Missing --stats.");
const rows = raw.split(";").map((r) => r.trim()).filter(Boolean).map((r) => {
  const [label, h, a, suffix = ""] = r.split(",").map((x) => x.trim());
  const hv = Number(h), av = Number(a);
  if (!label || !Number.isFinite(hv) || !Number.isFinite(av)) die(`Can't read stat row "${r}" — expected label,home,away[,suffix]`);
  if (hv < 0 || av < 0) die(`Negative value in "${r}"`);
  return { label: label.toUpperCase(), h: hv, a: av, suffix };
});
if (!rows.length) die("No stat rows parsed.");
// Percentage pairs that don't total 100 are almost always a transcription slip off a
// screenshot, and a stats card exists to be trusted — so it stops rather than publishing it.
for (const r of rows) {
  if (r.suffix === "%" && r.h + r.a !== 100) die(`"${r.label}" is ${r.h}% + ${r.a}% = ${r.h + r.a}%, which doesn't add to 100.`);
}
if (rows.length > 7) die(`${rows.length} rows won't fit legibly — 7 is the most.`);

const now = Number(process.env.NOW_MS) || Date.now();
let fixture = null;
for (const round of D.FIXTURES_2627) {
  for (const m of round.matches) {
    if (Array.isArray(m.result)) continue;
    if (m.h !== club && m.a !== club) continue;
    const ms = D.fixtureKickoffMs(round, m);
    if (ms === null) continue;
    if (!fixture || Math.abs(ms - now) < Math.abs(fixture.ms - now)) fixture = { ms, round: round.round, h: m.h, a: m.a };
  }
}
if (!fixture) die(`No unplayed fixture found for ${D.CLUBS[club].name}.`);

const facts = {
  homeClub: { code: fixture.h, ...D.CLUBS[fixture.h] },
  awayClub: { code: fixture.a, ...D.CLUBS[fixture.a] },
  title, score, rows,
  ground: D.CLUBS[fixture.h].ground,
  round: fixture.round,
};
console.log(`${title} stats — ${facts.homeClub.name} ${score[0]}-${score[1]} ${facts.awayClub.name}, ${rows.length} rows`);

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
const S=W/1080, Y=v=>v*(H/1350), M=64*S;
const MUTE='rgba(237,245,239,0.55)';

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
  if(o.shadow){ctx.shadowColor='rgba(0,0,0,0.55)';ctx.shadowBlur=20*S;ctx.shadowOffsetY=4*S;}
  ctx.fillStyle=o.color||CHALK;
  let px=o.align==='right'?x-w:o.align==='center'?x-w/2:x;
  for(const c of [...s]){ ctx.fillText(c,px,y); px+=ctx.measureText(c).width+track; }
  ctx.restore();
  return w;
}
function fit(s,weight,maxW,start,track){
  let size=start;
  while(size>8 && measure(s,size,weight,track||0)>maxW) size-=Math.max(1,size*0.02);
  return size;
}

function ground(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0A1611'); g.addColorStop(0.5,'#0B1815'); g.addColorStop(1,'#060C0A');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(W*0.5,Y(300),10,W*0.5,Y(300),W*0.9);
  glow.addColorStop(0,'rgba(255,182,39,0.13)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
}

// One stat: the two values either side of its name, and a bar split in proportion. The larger
// side is highlighted, since on a stats card the comparison is the whole point.
function statRow(r,y,rowH){
  const homeBig=r.h>r.a, awayBig=r.a>r.h;
  T(r.h+r.suffix,M,y,{size:46*S,weight:800,color:homeBig?GOLD:CHALK});
  T(r.label,W/2,y-4*S,{size:29*S,weight:600,align:'center',color:MUTE,track:5*S});
  T(r.a+r.suffix,W-M,y,{size:46*S,weight:800,align:'right',color:awayBig?SKY:CHALK});

  const bx=M, by=y+20*S, bw=W-M*2, bh=15*S, tot=r.h+r.a;
  ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,bh/2);
  ctx.fillStyle='rgba(237,245,239,0.10)'; ctx.fill();
  if(tot<=0) return;                       // 0-0 leaves the track empty rather than faking a split
  const gap=r.h>0&&r.a>0?6*S:0;
  const hw=(bw-gap)*(r.h/tot), aw=(bw-gap)-hw;
  if(hw>0){ ctx.beginPath(); ctx.roundRect(bx,by,hw,bh,bh/2); ctx.fillStyle=GOLD; ctx.fill(); }
  if(aw>0){ ctx.beginPath(); ctx.roundRect(bx+hw+gap,by,aw,bh,bh/2); ctx.fillStyle=SKY; ctx.fill(); }
}

// Club identity with a rule beneath in its bar colour — that rule is the legend.
function head(club,cx,y,h,colour){
  shield(club,cx,y,h);
  const s=fit(club.name.toUpperCase(),800,230*S,28*S,1*S);
  T(club.name.toUpperCase(),cx,y+h*0.5+34*S,{size:s,weight:800,align:'center',color:CHALK,track:1*S});
  ctx.fillStyle=colour; ctx.fillRect(cx-38*S,y+h*0.5+48*S,76*S,6*S);
}

function draw(){
  ground();

  T('PREMIERSHIP · ROUND '+F.round,M,Y(90),{size:27*S,weight:600,color:MUTE,track:6*S});
  T(F.ground.toUpperCase(),W-M,Y(90),{size:27*S,weight:600,align:'right',color:MUTE,track:6*S});
  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(114),W-M*2,2*S);

  const ts=fit(F.title,800,W-M*2,104*S,5*S);
  T(F.title,W/2,Y(212),{size:ts,weight:800,align:'center',color:GOLD,track:5*S,shadow:true});

  head(F.homeClub,M+150*S,Y(330),120*S,GOLD);
  head(F.awayClub,W-M-150*S,Y(330),120*S,SKY);
  T(F.score[0]+'–'+F.score[1],W/2,Y(340),{size:104*S,weight:800,align:'center',baseline:'middle',color:CHALK,shadow:true});

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(464),W-M*2,2*S);

  // Rows share whatever is left between the rule and the footer, so 5 rows breathe and 7 fit.
  const top=Y(536), bottom=Y(1180), rowH=(bottom-top)/F.rows.length;
  F.rows.forEach((r,i)=>statRow(r,top+rowH*i,rowH));

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1215),W-M*2,2*S);
  cup(M+26*S,Y(1272),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1288),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1288),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

  grain(9,0.016);
  vignette();
}
window.__render=()=>{draw();return cv.toDataURL('image/jpeg',0.94)};
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
const page = await browser.newPage({ viewport: { width: W, height: Math.min(H, 1200) }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => window.__ready);
const url = await page.evaluate(() => window.__render());
await browser.close();
const out = join(OUT_DIR, `gibson-stats-${fixture.h}${score[0]}${score[1]}${fixture.a}-${title.toLowerCase().replace(/\W+/g, "")}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
