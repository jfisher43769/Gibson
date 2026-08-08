// GIBSON — feature announcement card (1080x1350 JPEG).
//
//   node scripts/promo/announce.mjs
//   node scripts/promo/announce.mjs --match=DUN-COL
//   node scripts/promo/announce.mjs --head="MATCH STATS" --sub="Tap any result."
//
// The other cards in here report a match. This one announces something the app can now do,
// and it argues for it the only way a stats site should: by showing a real match's real
// numbers, pulled from data.js through the same matchDetail() the app itself renders. There
// is no sample data and no mock-up — if the numbers on the card are wrong, the app is wrong
// too, which is the point.
//
// The demonstration match defaults to the most recently played one that has stats recorded,
// so the card is current without being told. --match=HOME-AWAY picks a specific one.

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
const die = (m) => { console.error(`\n${m}\n\nUsage: node scripts/promo/announce.mjs [--match=HOME-AWAY] [--head="..."] [--sub="..."]\n`); process.exit(1); };

const NOW = Number(process.env.NOW_MS) || Date.now();

// Every played fixture that has stats behind it, most recent first. Built from the fixture
// list rather than from MATCH_STATS so the kick-off time — and therefore "most recent" — comes
// from the same place the rest of the repo gets it.
const candidates = [];
for (const round of D.FIXTURES_2627) {
  for (const m of round.matches) {
    if (!Array.isArray(m.result)) continue;
    const detail = D.matchDetail(round.round, m.h, m.a);
    if (!detail || !detail.rows.length) continue;
    candidates.push({ round: round.round, h: m.h, a: m.a, result: m.result, rows: detail.rows, ms: D.fixtureKickoffMs(round, m) ?? -Infinity });
  }
}
if (!candidates.length) die("No played match has stats recorded yet — there is nothing to announce.");
candidates.sort((x, y) => y.ms - x.ms);

const want = flag("match");
let pick = candidates[0];
if (want) {
  const parts = want.toUpperCase().split(/[-–:]/).map((s) => s.trim());
  if (parts.length !== 2) die(`--match should look like --match=DUN-COL (home first), not "${want}".`);
  const [h, a] = parts;
  if (!D.CLUBS[h]) die(`Unknown club "${parts[0]}".`);
  if (!D.CLUBS[a]) die(`Unknown club "${parts[1]}".`);
  const found = candidates.filter((c) => c.h === h && c.a === a);
  if (!found.length) die(`${D.CLUBS[h].name} v ${D.CLUBS[a].name} has no recorded stats to show. Check the order — home club first.`);
  // Twelve clubs meet three times, so a pairing can exist in more than one round. Nearest to
  // now is the one somebody asking today means.
  found.sort((x, y) => Math.abs(x.ms - NOW) - Math.abs(y.ms - NOW));
  pick = found[0];
}

// Six bars is what the panel holds legibly. Taking the first six keeps the app's own order —
// possession, shots, on target, corners, cards — rather than reordering for the card.
const rows = pick.rows.slice(0, 6).map((r) => ({
  label: r.label.toUpperCase(),
  h: r.pair[0],
  a: r.pair[1],
  suffix: r.suffix || "",
}));

// The coverage line is a claim about the season, so it is counted, never asserted. "Every
// match so far" only appears when that is literally true of what has been recorded.
const cov = D.recordedCoverage();
const coverage = cov.statsComplete
  ? `EVERY PREMIERSHIP MATCH SO FAR · ${cov.played} OF ${cov.played}`
  : `${cov.stats} OF ${cov.played} MATCHES COVERED SO FAR`;

const facts = {
  head: (flag("head") || "MATCH STATS").toUpperCase(),
  sub: (flag("sub") || "Tap any result to open the numbers").toUpperCase(),
  eyebrow: "NEW ON GIBSON",
  // SEASON.current.display, not seasonLabel() — that takes an export name and returns "" for
  // anything else, which is how the season vanished from the header on the first render.
  season: String(D.SEASON.current.display).toUpperCase(),
  affordance: "MATCH STATS",           // the app's own label, so the card teaches the real gesture
  round: pick.round,
  score: pick.result,
  homeClub: { code: pick.h, ...D.CLUBS[pick.h] },
  awayClub: { code: pick.a, ...D.CLUBS[pick.a] },
  rows, coverage,
};

console.log(`${facts.head} — showing ${facts.homeClub.name} ${facts.score[0]}-${facts.score[1]} ${facts.awayClub.name} (round ${facts.round}), ${rows.length} stat rows`);
console.log(`  ${coverage.toLowerCase()}`);

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
  const glow=ctx.createRadialGradient(W*0.5,Y(250),10,W*0.5,Y(250),W*0.95);
  glow.addColorStop(0,'rgba(255,182,39,0.15)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
}

// Drawn rather than typed: U+25BC is not in Barlow Condensed, so a glyph would fall back to
// whatever font the render box happens to have and change shape between machines.
function caret(cx,cy,w){
  const h=w*0.62;
  ctx.beginPath();
  ctx.moveTo(cx-w/2,cy-h/2); ctx.lineTo(cx+w/2,cy-h/2); ctx.lineTo(cx,cy+h/2);
  ctx.closePath(); ctx.fillStyle=GOLD; ctx.fill();
}

// Same split bar the app draws, and the same gold/sky pairing every head-to-head in this repo
// uses — club colours can't carry a duel when both clubs wear red.
function statRow(r,y){
  const homeBig=r.h>r.a, awayBig=r.a>r.h;
  const bx=M+34*S, bw=W-M*2-68*S;
  T(r.h+r.suffix,bx,y,{size:42*S,weight:800,color:homeBig?GOLD:CHALK});
  T(r.label,W/2,y-3*S,{size:25*S,weight:600,align:'center',color:MUTE,track:5*S});
  T(r.a+r.suffix,bx+bw,y,{size:42*S,weight:800,align:'right',color:awayBig?SKY:CHALK});

  const by=y+18*S, bh=13*S, tot=r.h+r.a;
  ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,bh/2);
  ctx.fillStyle='rgba(237,245,239,0.10)'; ctx.fill();
  if(tot<=0) return;                       // 0-0 leaves the track empty rather than faking a split
  const gap=r.h>0&&r.a>0?6*S:0;
  const hw=(bw-gap)*(r.h/tot), aw=(bw-gap)-hw;
  if(hw>0){ ctx.beginPath(); ctx.roundRect(bx,by,hw,bh,bh/2); ctx.fillStyle=GOLD; ctx.fill(); }
  if(aw>0){ ctx.beginPath(); ctx.roundRect(bx+hw+gap,by,aw,bh,bh/2); ctx.fillStyle=SKY; ctx.fill(); }
}

// The result line as the app lists it: crest, club, score, club, crest — with the gold
// "MATCH STATS" affordance underneath, which is the thing being announced.
function resultRow(top){
  const cy=top+62*S, ch=74*S;
  shield(F.homeClub,M+72*S,cy,ch);
  shield(F.awayClub,W-M-72*S,cy,ch);

  const nameW=W/2-M-190*S;
  const hs=fit(F.homeClub.name.toUpperCase(),800,nameW,40*S,1*S);
  const as=fit(F.awayClub.name.toUpperCase(),800,nameW,40*S,1*S);
  T(F.homeClub.name.toUpperCase(),M+126*S,cy,{size:hs,weight:800,baseline:'middle',track:1*S});
  T(F.awayClub.name.toUpperCase(),W-M-126*S,cy,{size:as,weight:800,align:'right',baseline:'middle',track:1*S});
  T(F.score[0]+'–'+F.score[1],W/2,cy,{size:62*S,weight:800,align:'center',baseline:'middle',color:GOLD,shadow:true});

  const label=F.affordance, ly=top+128*S;
  const lw=measure(label,24*S,800,5*S);
  T(label,W/2-14*S,ly,{size:24*S,weight:800,align:'center',color:GOLD,track:5*S});
  caret(W/2+lw/2+4*S,ly-7*S,20*S);
}

function draw(){
  ground();

  T(F.eyebrow,M,Y(90),{size:27*S,weight:800,color:GOLD,track:8*S});
  T(F.season,W-M,Y(90),{size:27*S,weight:600,align:'right',color:MUTE,track:6*S});
  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(114),W-M*2,2*S);

  const hs=fit(F.head,800,W-M*2,140*S,4*S);
  T(F.head,W/2,Y(258),{size:hs,weight:800,align:'center',color:GOLD,track:4*S,shadow:true});
  const ss=fit(F.sub,600,W-M*2,32*S,6*S);
  T(F.sub,W/2,Y(312),{size:ss,weight:600,align:'center',color:CHALK,track:6*S});

  // One panel, because in the app it is one card: the result you tapped and what opened.
  // Its height follows the row count. Dividing a fixed height by the rows instead left a
  // panel-width hole under the last bar whenever a match had fewer stats recorded than the
  // maximum — Linfield v Ballymena, with no card row, ended a quarter empty.
  const pTop=Y(366), first=236*S, tail=44*S, LIMIT=Y(1146);
  const n=F.rows.length;
  const span=LIMIT-tail-31*S-(pTop+first);
  const pitch=n>1?Math.max(90*S,Math.min(155*S,span/(n-1))):0;
  const pBot=pTop+first+pitch*(n-1)+31*S+tail;
  panel(M,pTop,W-M*2,pBot-pTop,32*S);
  resultRow(pTop+22*S);

  ctx.fillStyle='rgba(237,245,239,0.14)'; ctx.fillRect(M+34*S,pTop+164*S,W-M*2-68*S,2*S);
  F.rows.forEach((r,i)=>statRow(r,pTop+first+pitch*i));

  T(F.coverage,W/2,Y(1192),{size:25*S,weight:600,align:'center',color:MUTE,track:5*S});

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1222),W-M*2,2*S);
  cup(M+26*S,Y(1278),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1294),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1294),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

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
const slug = facts.head.toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "");
const out = join(OUT_DIR, `gibson-announce-${slug}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
