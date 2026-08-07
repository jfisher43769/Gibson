// GIBSON — man of the match card (1080x1350 JPEG).
//
//   node scripts/promo/motm.mjs CLI "Ben Quinn" 2-0 --photo=/path/to/headshot.jpg
//   node scripts/promo/motm.mjs CLI "Ben Quinn" 2-0 --photo=... --line="1 goal · debut"
//
// The portrait is the card. Everything else — fixture, opponent, colours, ground, round —
// comes from data.js, and --line is free text because "man of the match" is a judgement
// nobody's database holds.

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
const die = (m) => { console.error(`\n${m}\n\nUsage: node scripts/promo/motm.mjs <CLUB> "<player>" <h>-<a> [--photo=...] [--line="..."] [--title="..."]\n`); process.exit(1); };

const [clubArg, playerArg, scoreArg] = argv.filter((a) => !a.startsWith("--"));
const club = String(clubArg || "").toUpperCase();
if (!D.CLUBS[club]) die(`Unknown club "${clubArg}". Try one of: ${Object.keys(D.CLUBS).join(", ")}`);
const player = String(playerArg || "").trim();
if (!player) die("Missing player name.");
const sm = /^(\d{1,2})\s*[-–:]\s*(\d{1,2})$/.exec(String(scoreArg || "").trim());
if (!sm) die(`Score "${scoreArg}" should look like 2-0 (home first).`);
const score = [Number(sm[1]), Number(sm[2])];

// Same default crop and reasoning as goal.mjs: frame head and shoulders above the shirt's
// sponsor band, because Irish League shirts carry bookmakers (golden rule 2).
const photoPath = flag("photo");
if (photoPath && !existsSync(photoPath)) die(`No such photo: ${photoPath}`);
const photoCrop = (flag("crop") || "0.125,0,0.75").split(",").map(Number);
if (photoCrop.length !== 3 || photoCrop.some((n) => !Number.isFinite(n))) die("--crop must be three numbers, e.g. --crop=0.125,0,0.75");

const now = Number(process.env.NOW_MS) || Date.now();
let fixture = null;
for (const round of D.FIXTURES_2627) {
  for (const m of round.matches) {
    if (m.h !== club && m.a !== club) continue;
    const ms = D.fixtureKickoffMs(round, m);
    if (ms === null) continue;
    if (!fixture || Math.abs(ms - now) < Math.abs(fixture.ms - now)) fixture = { ms, round: round.round, h: m.h, a: m.a };
  }
}
if (!fixture) die(`No fixture found for ${D.CLUBS[club].name}.`);

const parts = player.split(/\s+/);
const facts = {
  homeClub: { code: fixture.h, ...D.CLUBS[fixture.h] },
  awayClub: { code: fixture.a, ...D.CLUBS[fixture.a] },
  playerClub: { code: club, ...D.CLUBS[club] },
  first: parts.length > 1 ? parts[0] : "",
  last: parts.slice(parts.length > 1 ? 1 : 0).join(" "),
  title: (flag("title") || "Man of the match").toUpperCase(),
  line: flag("line") || "",
  score,
  ground: D.CLUBS[fixture.h].ground,
  round: fixture.round,
  photoCrop,
};
console.log(`${facts.title} — ${player} (${D.CLUBS[club].name}), ${facts.homeClub.name} ${score[0]}-${score[1]} ${facts.awayClub.name}`);
if (photoPath) console.log(`portrait: ${photoPath} (crop ${photoCrop.join(",")})`);

const kit = readFileSync(join(HERE, "kit.js"), "utf8");
const font = (w) => readFileSync(join(FONT_DIR, `barlow-condensed-latin-${w}-normal.woff2`)).toString("base64");
const photoData = photoPath
  ? `data:image/${photoPath.toLowerCase().endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(photoPath).toString("base64")}`
  : "";

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Barlow Condensed";font-weight:800;src:url(data:font/woff2;base64,${font(800)}) format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:600;src:url(data:font/woff2;base64,${font(600)}) format("woff2")}
html,body{margin:0;background:#000}canvas{display:block}
</style></head><body><canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W},H=${H};
const cv=document.getElementById('c'),ctx=cv.getContext('2d',{alpha:false});
${kit}
const F=${JSON.stringify(facts)};
const PHOTO_SRC=${JSON.stringify(photoData)};
let IMG=null;
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
  if(o.shadow){ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=22*S;ctx.shadowOffsetY=5*S;}
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
  ctx.fillStyle='#080F0C'; ctx.fillRect(0,0,W,H);
  const [c1,c2]=F.playerClub.colors;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.lineTo(W,H*0.52); ctx.lineTo(0,H*0.66); ctx.closePath();
  const g=ctx.createLinearGradient(0,0,W,H*0.6); g.addColorStop(0,c1); g.addColorStop(1,c2);
  ctx.fillStyle=g; ctx.globalAlpha=0.9; ctx.fill();
  ctx.restore();
  ctx.fillStyle='rgba(8,15,12,0.60)'; ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(W*0.5,Y(500),10,W*0.5,Y(500),W*0.78);
  glow.addColorStop(0,'rgba(255,182,39,0.22)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  ctx.fillStyle=c1; ctx.fillRect(0,0,10*S,H); ctx.fillRect(W-10*S,0,10*S,H);
}

function portrait(cx,cy,r){
  ctx.save();
  ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=40*S; ctx.shadowOffsetY=12*S;
  ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.fillStyle='#0B1512'; ctx.fill();
  ctx.restore();
  if(IMG){
    ctx.save();
    ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.clip();
    const iw=IMG.naturalWidth, ih=IMG.naturalHeight;
    const side=Math.min(iw,ih)*F.photoCrop[2];
    ctx.drawImage(IMG,iw*F.photoCrop[0],ih*F.photoCrop[1],side,side,cx-r,cy-r,r*2,r*2);
    ctx.restore();
  }
  // Double ring: a thick gold band with a thin chalk inner, so the circle reads as a medal
  // rather than as a cropped photo.
  ctx.beginPath(); ctx.arc(cx,cy,r,0,7); ctx.lineWidth=10*S; ctx.strokeStyle=GOLD; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx,cy,r-10*S,0,7); ctx.lineWidth=2*S; ctx.strokeStyle='rgba(237,245,239,0.30)'; ctx.stroke();
}

function draw(){
  ground();

  T('PREMIERSHIP · ROUND '+F.round,M,Y(92),{size:27*S,weight:600,color:MUTE,track:6*S});
  T(F.ground.toUpperCase(),W-M,Y(92),{size:27*S,weight:600,align:'right',color:MUTE,track:6*S});
  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(116),W-M*2,2*S);

  const ts=fit(F.title,800,W-M*2,86*S,8*S);
  T(F.title,W/2,Y(212),{size:ts,weight:800,align:'center',color:GOLD,track:8*S,shadow:true});

  portrait(W/2,Y(492),238*S);

  if(F.first) T(F.first.toUpperCase(),W/2,Y(800),{size:50*S,weight:600,align:'center',color:'rgba(237,245,239,0.85)',track:8*S,shadow:true});
  const ls=fit(F.last.toUpperCase(),800,W-M*2,132*S,0);
  T(F.last.toUpperCase(),W/2,Y(916),{size:ls,weight:800,align:'center',color:CHALK,shadow:true});

  // Club, then whatever the owner wants said about the performance.
  T(F.playerClub.name.toUpperCase(),W/2,Y(968),{size:32*S,weight:800,align:'center',color:GOLD,track:7*S});
  if(F.line){
    const es=fit(F.line.toUpperCase(),600,W-M*2,30*S,5*S);
    T(F.line.toUpperCase(),W/2,Y(1016),{size:es,weight:600,align:'center',color:MUTE,track:5*S});
  }

  // The result the performance came in, small — the card is about the player.
  const y=Y(1120);
  const gap=26*S;
  const label=F.homeClub.name+'  '+F.score[0]+'–'+F.score[1]+'  '+F.awayClub.name;
  const size=fit(label,800,W-M*2-140*S,34*S,2*S);
  const wLabel=measure(label,size,800,2*S);
  shield(F.homeClub,W/2-wLabel/2-gap-22*S,y-6*S,58*S);
  shield(F.awayClub,W/2+wLabel/2+gap+22*S,y-6*S,58*S);
  T(label,W/2,y+4*S,{size,weight:800,align:'center',color:CHALK,track:2*S});

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1215),W-M*2,2*S);
  cup(M+26*S,Y(1272),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1288),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1288),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

  grain(6,0.018);
  vignette();
}
window.__render=()=>{draw();return cv.toDataURL('image/jpeg',0.94)};
window.__ready=document.fonts.ready
  .then(()=>Promise.all([document.fonts.load('800 200px "Barlow Condensed"'),document.fonts.load('600 60px "Barlow Condensed"')]))
  .then(()=>PHOTO_SRC?new Promise((res,rej)=>{
    const im=new Image();
    im.onload=()=>{IMG=im;res(true)};
    im.onerror=()=>rej(new Error('portrait failed to decode'));
    im.src=PHOTO_SRC;
  }):true);
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
const out = join(OUT_DIR, `gibson-motm-${club}-${facts.last.toLowerCase().replace(/\W+/g, "")}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
