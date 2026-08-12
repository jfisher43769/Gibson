// GIBSON — postponement card (1080x1350 JPEG).
//
//   node scripts/promo/postponed.mjs
//   node scripts/promo/postponed.mjs --club=LAR
//
// The "don't turn up" card. Reads every fixture in FIXTURES_2627 carrying `pp` — postponed
// with no replacement date — and states which games are off, when they were due, and why.
//
// Nothing is typed: the clubs, the round, the date the match WOULD have been played and the
// reason all come from the fixture row. A card that says the wrong game is off is worse than
// no card, because someone drives to Inver Park on the strength of it.

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
const only = (flag("club") || "").toUpperCase();

// The date the match was DUE — its own `d` if it had one, otherwise the round's. `pp` means the
// kick-off no longer resolves, which is the whole point, so it is read off the row directly
// rather than through fixtureKickoffMs().
const rows = [];
for (const r of D.FIXTURES_2627) {
  for (const m of r.matches) {
    if (!D.fixturePostponed(m)) continue;
    if (only && m.h !== only && m.a !== only) continue;
    const h = D.CLUBS[m.h], a = D.CLUBS[m.a];
    if (!h || !a) continue;
    rows.push({
      home: { code: m.h, name: h.name, colors: h.colors, pattern: h.pattern },
      away: { code: m.a, name: a.name, colors: a.colors, pattern: a.pattern },
      round: r.round,
      was: String(m.d || r.date || "").toUpperCase(),
      venue: String(D.CLUB_META?.[m.h]?.ground || h.ground || "").toUpperCase(),
      why: String(m.pp || "").toUpperCase(),
    });
  }
}

if (!rows.length) {
  console.log(only ? `No postponed fixtures for ${only}.` : "No postponed fixtures — nothing to draw.");
  process.exit(0);
}

// When every postponement shares one reason, it belongs in the header rather than repeated
// down the card. Six rows all saying "Larne in Europe" is the same fact printed six times.
const reasons = [...new Set(rows.map((r) => r.why).filter(Boolean))];
const oneReason = reasons.length === 1 ? reasons[0] : "";

const facts = {
  headline: rows.length === 1 ? "POSTPONED" : "FIXTURES POSTPONED",
  oneReason,
  // Stated, not implied: nobody should have to guess whether a new date exists yet.
  note: "NEW DATES TO BE CONFIRMED",
  rows: rows.map((r) => ({ ...r, why: oneReason ? "" : r.why })),
};

console.log(facts.headline + (oneReason ? ` — ${oneReason}` : ""));
for (const r of rows) console.log(`  R${r.round}  ${r.home.name} v ${r.away.name}  (was ${r.was}, ${r.venue})`);

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
const OFF='#E8663C';

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
  if(o.shadow){ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=22*S;ctx.shadowOffsetY=4*S;}
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

function backdrop(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#160C0A'); g.addColorStop(0.5,'#0F0F0C'); g.addColorStop(1,'#060C0A');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // Warning colour, not the usual gold — this card is telling people NOT to do something, and
  // it should not look like the fixture announcement it is contradicting.
  const glow=ctx.createRadialGradient(W*0.5,Y(300),10,W*0.5,Y(300),W*0.9);
  glow.addColorStop(0,'rgba(232,102,60,0.16)'); glow.addColorStop(1,'rgba(232,102,60,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  // Diagonal hazard banding, very faint, top-left to bottom-right.
  ctx.save(); ctx.globalAlpha=0.035; ctx.fillStyle=OFF;
  for(let x=-H;x<W+H;x+=88*S){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x+30*S,0); ctx.lineTo(x+30*S+H,H); ctx.lineTo(x+H,H); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  vignette();
}

function tieRow(r,y,nameSize){
  const CR=64*S;
  shield(r.home,M+CR/2,y,CR);
  shield(r.away,W-M-CR/2,y,CR);
  const mid=W/2, gap=26*S;
  T(r.home.name.toUpperCase(),mid-gap,y+nameSize*0.34,{size:nameSize,weight:800,align:'right',track:1*S});
  T('V',mid,y+nameSize*0.30,{size:nameSize*0.5,weight:800,align:'center',color:OFF});
  T(r.away.name.toUpperCase(),mid+gap,y+nameSize*0.34,{size:nameSize,weight:800,align:'left',track:1*S});
  // What it WAS, struck through — the date people have in their heads.
  const was=['ROUND '+r.round,r.was,r.venue].filter(Boolean).join('   ·   ');
  const ws=Math.min(22*S,fit(was,600,W-M*2-CR*2-40*S,22*S,3*S));
  const wy=y+nameSize*0.34+32*S;
  const ww=T(was,mid,wy,{size:ws,weight:600,align:'center',color:MUTE,track:3*S});
  ctx.fillStyle='rgba(237,245,239,0.42)';
  ctx.fillRect(mid-ww/2,wy-ws*0.30,ww,1.5*S);
  if(r.why) T(r.why,mid,wy+26*S,{size:20*S,weight:600,align:'center',color:OFF,track:3*S});
}

function draw(){
  backdrop();

  T('GIBSON',M,Y(84),{size:26*S,weight:800,color:GOLD,track:8*S,shadow:true});
  T('FIXTURE NEWS',W-M,Y(84),{size:23*S,weight:600,align:'right',color:'rgba(237,245,239,0.75)',track:6*S,shadow:true});

  const hs=fit(F.headline,800,W-M*2,150*S,4*S);
  T(F.headline,W/2,Y(300),{size:hs,weight:800,align:'center',color:OFF,track:4*S,shadow:true});
  if(F.oneReason){
    const rs=fit(F.oneReason,600,W-M*2,30*S,7*S);
    T(F.oneReason,W/2,Y(356),{size:rs,weight:600,align:'center',color:'rgba(237,245,239,0.85)',track:7*S});
  }

  // Rows are spaced at a capped pitch and the block is CENTRED in the space available, rather
  // than stretched to fill it. Stretching put two postponements 500px apart with a void
  // between them, reading as two unrelated cards rather than one list.
  const zoneTop=Y(470), zoneBottom=Y(1060);
  const n=F.rows.length;
  const pitch=n>1?Math.min(200*S,(zoneBottom-zoneTop)/(n-1)):0;
  const top=zoneTop+((zoneBottom-zoneTop)-pitch*(n-1))/2;
  const room=(W/2)-M-64*S-26*S-16*S;
  let nameSize=38*S;
  for(const r of F.rows){
    nameSize=Math.min(nameSize,
      fit(r.home.name.toUpperCase(),800,room,38*S,1*S),
      fit(r.away.name.toUpperCase(),800,room,38*S,1*S));
  }
  F.rows.forEach((r,i)=>{
    const y=n>1?top+pitch*i:top+60*S;
    if(i){ ctx.fillStyle='rgba(237,245,239,0.07)'; ctx.fillRect(M,y-pitch/2,W-M*2,1.5*S); }
    tieRow(r,y,nameSize);
  });

  const ns=fit(F.note,800,W-M*2,40*S,4*S);
  T(F.note,W/2,Y(1130),{size:ns,weight:800,align:'center',color:GOLD,track:4*S,shadow:true});
  T('FULL FIXTURE LIST ON GIBSON',W/2,Y(1176),{size:22*S,weight:600,align:'center',color:MUTE,track:5*S});

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1240),W-M*2,2*S);
  cup(M+26*S,Y(1292),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1308),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1308),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

  grain(9,0.016);
  vignette();
}
window.__render=()=>{draw();return cv.toDataURL('image/jpeg',0.94)};
window.__ready=document.fonts.ready.then(()=>Promise.all([
  document.fonts.load('800 200px "Barlow Condensed"'),
  document.fonts.load('600 60px "Barlow Condensed"'),
])).then(()=>true);
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
const out = join(OUT_DIR, `gibson-postponed${only ? `-${only.toLowerCase()}` : ""}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
