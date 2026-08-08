// GIBSON — multi-match round-up card (1080x1350 JPEG).
//
//   node scripts/promo/roundup.mjs HT "LIN 1-0 BAL" "CAR 0-0 POR" "DUN 2-1 COL" "GLE 1-1 LIM"
//   node scripts/promo/roundup.mjs FT "LIN 2-1 BAL" "CAR 0-0 POR"
//
// status.mjs covers one match; this covers an afternoon. Six 3pm kick-offs is the normal
// shape of an Irish League Saturday, so the half-time and full-time posts want every score on
// one card rather than six cards nobody scrolls through.
//
// Each argument is "HOME score-score AWAY" using GIBSON club codes. Everything else — the
// round, the date, the club names and colours — is looked up, and a pairing that isn't a real
// fixture stops the render rather than being drawn.

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
const die = (m) => { console.error(`\n${m}\n\nUsage: node scripts/promo/roundup.mjs <HT|FT|LIVE> "HOME 1-0 AWAY" ["HOME 2-2 AWAY" ...]\n`); process.exit(1); };

const positional = argv.filter((a) => !a.startsWith("--"));
const STATES = { HT: "HALF TIME", FT: "FULL TIME", LIVE: "LIVE SCORES" };
const state = String(positional[0] || "").toUpperCase();
if (!STATES[state]) die(`State "${positional[0]}" should be one of: ${Object.keys(STATES).join(", ")}`);

const scorelines = positional.slice(1);
if (!scorelines.length) die("Give at least one scoreline, e.g. \"LIN 1-0 BAL\".");
if (scorelines.length > 6) die(`${scorelines.length} matches won't fit legibly — 6 is the most (a full Premiership round).`);

// Every pairing must be a real fixture — but note what that can and cannot catch. Twelve
// clubs meeting three times means EVERY ordered pair happens at some point in a season, so
// this cannot tell you a pairing is wrong; it only rejects a club that isn't in the fixture
// list at all (a relegated side, say). What does the real work is resolving to the fixture
// nearest today and then refusing a card that spans rounds: type one wrong pair on a Saturday
// and it lands in a different round from the others, and the render stops.
const NOW = Number(process.env.NOW_MS) || Date.now();
function findFixture(h, a) {
  let best = null;
  for (const round of D.FIXTURES_2627) {
    for (const m of round.matches) {
      if (m.h !== h || m.a !== a) continue;
      const ms = D.fixtureKickoffMs(round, m);
      const dist = ms === null ? Infinity : Math.abs(ms - NOW);
      if (!best || dist < best.dist) best = { round: round.round, date: m.d || round.date, dist };
    }
  }
  return best;
}

const seen = new Set();
const matches = scorelines.map((raw) => {
  const m = /^\s*([A-Za-z]{3})\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+([A-Za-z]{3})\s*$/.exec(raw);
  if (!m) die(`Can't read "${raw}" — expected e.g. "LIN 1-0 BAL".`);
  const h = m[1].toUpperCase(), a = m[4].toUpperCase();
  if (!D.CLUBS[h]) die(`Unknown club "${m[1]}" in "${raw}".`);
  if (!D.CLUBS[a]) die(`Unknown club "${m[4]}" in "${raw}".`);
  if (h === a) die(`"${raw}" has the same club on both sides.`);
  for (const c of [h, a]) {
    if (seen.has(c)) die(`${D.CLUBS[c].name} appears in more than one match — a club only plays once a round.`);
    seen.add(c);
  }
  const fx = findFixture(h, a);
  if (!fx) die(`${D.CLUBS[h].name} v ${D.CLUBS[a].name} isn't a fixture. Check the order — home club first.`);
  return { h, a, hs: Number(m[2]), as: Number(m[3]), round: fx.round, date: fx.date };
});

// One card is one round. Mixing rounds would need two headers and means somebody mistyped.
const rounds = [...new Set(matches.map((m) => m.round))];
if (rounds.length > 1) die(`These matches span rounds ${rounds.join(" and ")} — a round-up card covers one round.`);

const facts = {
  state: STATES[state],
  round: rounds[0],
  date: String(matches[0].date || "").toUpperCase(),
  matches: matches.map((m) => ({
    ...m,
    homeClub: { code: m.h, ...D.CLUBS[m.h] },
    awayClub: { code: m.a, ...D.CLUBS[m.a] },
  })),
};
console.log(`${facts.state} — round ${facts.round}, ${matches.length} match${matches.length === 1 ? "" : "es"}`);
for (const m of matches) console.log(`  ${D.CLUBS[m.h].name} ${m.hs}-${m.as} ${D.CLUBS[m.a].name}`);

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
const S=W/1080, Y=v=>v*(H/1350), M=56*S;
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
  const glow=ctx.createRadialGradient(W*0.5,Y(250),10,W*0.5,Y(250),W*0.9);
  glow.addColorStop(0,'rgba(255,182,39,0.16)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
}

// One match: crest, name, score, name, crest. The leading club's name is lifted out of the
// muted tone so the card can be read at a glance without doing the arithmetic.
function matchRow(m,y,h){
  panel(M,y,W-M*2,h,18*S,'rgba(6,12,10,0.55)');
  const cy=y+h/2;
  const shieldH=Math.min(72*S,h*0.62);
  shield(m.homeClub,M+56*S,cy,shieldH);
  shield(m.awayClub,W-M-56*S,cy,shieldH);

  const homeWin=m.hs>m.as, awayWin=m.as>m.hs;
  const nameW=(W-M*2)*0.30;
  const hs=fit(m.homeClub.name.toUpperCase(),800,nameW,30*S,0);
  T(m.homeClub.name.toUpperCase(),M+104*S,cy+10*S,{size:hs,weight:800,color:homeWin?CHALK:MUTE});
  const as=fit(m.awayClub.name.toUpperCase(),800,nameW,30*S,0);
  T(m.awayClub.name.toUpperCase(),W-M-104*S,cy+10*S,{size:as,weight:800,align:'right',color:awayWin?CHALK:MUTE});

  T(m.hs+'–'+m.as,W/2,cy+14*S,{size:54*S,weight:800,align:'center',color:GOLD,shadow:true});
}

function draw(){
  ground();

  T('PREMIERSHIP · ROUND '+F.round,M,Y(94),{size:27*S,weight:600,color:MUTE,track:6*S});
  T(F.date,W-M,Y(94),{size:27*S,weight:600,align:'right',color:MUTE,track:6*S});
  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(118),W-M*2,2*S);

  const ts=fit(F.state,800,W-M*2,132*S,8*S);
  T(F.state,W/2,Y(238),{size:ts,weight:800,align:'center',color:GOLD,track:8*S,shadow:true});

  // Rows are capped rather than stretched to fill. Dividing the whole space between four
  // matches gave 200px-tall panels with 90px of content floating in the middle; a fixed
  // comfortable height and a centred block reads as a list instead of as padding.
  const zoneTop=Y(300), zoneBottom=Y(1180), gap=14*S;
  const avail=zoneBottom-zoneTop;
  const h=Math.min(148*S,(avail-gap*(F.matches.length-1))/F.matches.length);
  const blockH=h*F.matches.length+gap*(F.matches.length-1);
  const top=zoneTop+(avail-blockH)/2;
  F.matches.forEach((m,i)=>matchRow(m,top+(h+gap)*i,h));

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1215),W-M*2,2*S);
  cup(M+26*S,Y(1272),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1288),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1288),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

  grain(8,0.016);
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
const out = join(OUT_DIR, `gibson-roundup-${state.toLowerCase()}-r${facts.round}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
