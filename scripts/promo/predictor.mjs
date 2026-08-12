// GIBSON — Predictor gameweek card (1080x1350 JPEG).
//
//   node scripts/promo/predictor.mjs
//   node scripts/promo/predictor.mjs --odds        # include the model's prices
//
// The "come and play" card: which fixtures are in this week's gameweek, how scoring works, and
// the deadline. Everything is read from PREDICTOR_GW — the round, the six ties, the deadline —
// so once next-gameweek.js has rolled the week over, this is a one-command job with nothing to
// type. A card that names a fixture the Predictor isn't actually offering sends people to an
// app that disagrees with it.
//
// The competition's sponsor name is deliberately NOT printed. It is a bookmaker's name, and
// CLAUDE.md rule 2 draws the line at bookmaker branding — appearing as a league name inside the
// app is a call the owner has made and documented, but a promotional graphic is advertising,
// and this one carries odds when --odds is passed. "NIFL Premiership" identifies it fine.
//
// Odds are off by default for the same reason: the card's job is "come and play", and a social
// post does not need eighteen prices on it. With --odds they are drawn as the model's implied
// favourite per tie, under the "GIBSON ESTIMATE" label that rule 2 requires.

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
const withOdds = argv.includes("--odds");

const gw = D.PREDICTOR_GW;
if (!gw || !Array.isArray(gw.fixtures) || !gw.fixtures.length) {
  console.error("PREDICTOR_GW has no fixtures — nothing to draw.");
  process.exit(1);
}

// A gameweek that has already been played is not something to advertise picks for. Say so
// rather than inviting people to a deadline that has passed.
const anyResult = gw.fixtures.some((f) => Array.isArray(f.result));
if (anyResult) {
  const done = gw.fixtures.filter((f) => Array.isArray(f.result)).length;
  console.warn(`  ! ${done} of ${gw.fixtures.length} fixtures already have results — this gameweek has been played.`);
  console.warn("    Roll it over first:  node scripts/next-gameweek.js");
}

// Round number out of the gameweek's own name ("Round 2 · …"), so the headline can be the thing
// people recognise. Falls back to the whole name if it isn't phrased that way.
const roundMatch = /round\s+(\d+)/i.exec(String(gw.name || ""));
const headline = roundMatch ? `ROUND ${roundMatch[1]}` : String(gw.name || "").toUpperCase();

// Every fixture's ground and kick-off sit in `comp` ("Round 2 · Windsor Park · Sat 15 Aug, 3pm").
// When all six share one kick-off — which is the norm for a Saturday round — it is stated once
// at the top instead of six times down the card.
const kickoffs = [...new Set(gw.fixtures.map((f) => String(f.comp || "").split("·").slice(2).join("·").trim()).filter(Boolean))];
const oneKickoff = kickoffs.length === 1 ? kickoffs[0] : "";

const rows = gw.fixtures.map((f) => {
  const h = D.CLUBS[f.home?.club], a = D.CLUBS[f.away?.club];
  if (!h || !a) return null;
  // Ground is the middle segment of `comp`. Only used when the fixtures don't share a time,
  // in which case each row has to carry its own detail.
  const parts = String(f.comp || "").split("·").map((s) => s.trim());
  let pick = "";
  if (withOdds && f.odds) {
    // The model's favourite, named — not a price to bet at. Shortest of the three is the
    // likeliest outcome under the same numbers the app shows.
    const { home, draw, away } = f.odds;
    const best = Math.min(home, draw, away);
    pick = best === draw ? `DRAW ${draw.toFixed(2)}`
      : `${(best === home ? f.home.club : f.away.club)} ${best.toFixed(2)}`;
  }
  return {
    home: { code: f.home.club, name: h.name, colors: h.colors, pattern: h.pattern },
    away: { code: f.away.club, name: a.name, colors: a.colors, pattern: a.pattern },
    when: oneKickoff ? "" : (parts[2] || ""),
    ground: parts[1] || "",
    pick,
  };
}).filter(Boolean);

if (rows.length !== gw.fixtures.length) {
  console.warn(`  ! ${gw.fixtures.length - rows.length} fixture(s) name a club that isn't in CLUBS — dropped`);
}

const facts = {
  headline,
  count: `${rows.length} ${rows.length === 1 ? "FIXTURE" : "FIXTURES"}`,
  // NIFL, not the sponsor — see the note at the top of this file.
  comp: "NIFL PREMIERSHIP",
  deadline: String(gw.deadline || "").toUpperCase(),
  // Read off PredictorTab's own wording so the card and the app can't describe scoring
  // differently. Max is fixtures x 3, the same sum the tab banks a season total from.
  scoring: "EXACT SCORE 3 PTS  ·  CORRECT RESULT 1 PT",
  max: `${rows.length * 3} POINTS ON THE TABLE`,
  // Suppressed when it is the same moment as the deadline, which is the norm for a Saturday
  // round — "SAT 15 AUG, 3PM" above the fixtures and "PICKS IN BY SAT 15 AUG 3PM" below them
  // is one fact printed twice. Compared on alphanumerics so a stray comma doesn't defeat it.
  oneKickoff: (() => {
    const flat = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
    return flat(oneKickoff) === flat(gw.deadline) ? "" : oneKickoff.toUpperCase();
  })(),
  withOdds,
  rows,
};

console.log(`${facts.comp} — ${facts.headline}`);
console.log(`  ${facts.count}${facts.oneKickoff ? " · " + facts.oneKickoff : ""}`);
console.log(`  deadline ${facts.deadline} · ${facts.max}`);
for (const r of rows) console.log(`  ${r.home.name} v ${r.away.name}${r.pick ? "   [" + r.pick + "]" : ""}`);

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
  g.addColorStop(0,'#0A1611'); g.addColorStop(0.55,'#0B1815'); g.addColorStop(1,'#060C0A');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  // The target: a faint ring behind the headline, because the Predictor's mark in the app is a
  // target emoji and this is the same idea drawn properly.
  const cx=W*0.5, cy=Y(300);
  for(const rr of [420,300,180,80]){
    ctx.beginPath(); ctx.arc(cx,cy,rr*S,0,Math.PI*2);
    ctx.lineWidth=2*S; ctx.strokeStyle='rgba(255,182,39,0.07)'; ctx.stroke();
  }
  const glow=ctx.createRadialGradient(cx,cy,10,cx,cy,W*0.8);
  glow.addColorStop(0,'rgba(255,182,39,0.13)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  vignette();
}

// One tie: crest, name, crest — with the two names meeting in the middle either side of a
// small gold "V". Sized from the longest name across ALL rows so every row shares one scale;
// per-row sizing made a short fixture look like the big game of the week.
function tieRow(r,y,nameSize,h){
  const CR=64*S;
  shield(r.home,M+CR/2,y,CR);
  shield(r.away,W-M-CR/2,y,CR);
  const mid=W/2, gap=26*S;
  T(r.home.name.toUpperCase(),mid-gap,y+nameSize*0.34,{size:nameSize,weight:800,align:'right',track:1*S});
  T('V',mid,y+nameSize*0.30,{size:nameSize*0.5,weight:800,align:'center',color:GOLD});
  T(r.away.name.toUpperCase(),mid+gap,y+nameSize*0.34,{size:nameSize,weight:800,align:'left',track:1*S});
  // Only when the round is spread over more than one kick-off, or the model's call is asked for.
  const sub=[r.when,r.pick].filter(Boolean).join('   ·   ');
  if(sub) T(sub,mid,y+nameSize*0.34+30*S,{size:22*S,weight:600,align:'center',color:MUTE,track:3*S});
}

function draw(){
  backdrop();

  T('GIBSON',M,Y(84),{size:26*S,weight:800,color:GOLD,track:8*S,shadow:true});
  T('THE PREDICTOR',W-M,Y(84),{size:23*S,weight:600,align:'right',color:'rgba(237,245,239,0.75)',track:6*S,shadow:true});

  // Headline: the round, big and centred inside the target rings.
  const hs=fit(F.headline,800,W-M*2,190*S,4*S);
  T(F.headline,W/2,Y(330),{size:hs,weight:800,align:'center',track:4*S,shadow:true});
  const sub=[F.comp,F.count].filter(Boolean).join('   ·   ');
  const ss=fit(sub,600,W-M*2,26*S,7*S);
  T(sub,W/2,Y(390),{size:ss,weight:600,align:'center',color:'rgba(237,245,239,0.8)',track:7*S});
  if(F.oneKickoff){
    const ks=fit(F.oneKickoff,800,W-M*2,30*S,4*S);
    T(F.oneKickoff,W/2,Y(438),{size:ks,weight:800,align:'center',color:GOLD,track:4*S});
  }

  // The fixtures. Rows are evenly spaced between a fixed top and bottom, so six ties and four
  // ties both fill the card instead of leaving a hole where the missing rows were.
  const top=Y(512), bottom=Y(1006);
  const n=F.rows.length;
  const pitch=n>1?(bottom-top)/(n-1):0;
  // One scale for every name on the card, from whichever is longest.
  const room=(W/2)-M-64*S-26*S-16*S;
  let nameSize=38*S;
  for(const r of F.rows){
    nameSize=Math.min(nameSize,
      fit(r.home.name.toUpperCase(),800,room,38*S,1*S),
      fit(r.away.name.toUpperCase(),800,room,38*S,1*S));
  }
  F.rows.forEach((r,i)=>{
    const y=n>1?top+pitch*i:(top+bottom)/2;
    if(i) { ctx.fillStyle='rgba(237,245,239,0.07)'; ctx.fillRect(M,y-pitch/2,W-M*2,1.5*S); }
    tieRow(r,y,nameSize,pitch);
  });

  // How it scores, then the deadline — the deadline last and in gold, because it is the only
  // thing on the card that asks the reader to do something before a time.
  const sc=fit(F.scoring,600,W-M*2,24*S,4*S);
  T(F.scoring,W/2,Y(1118),{size:sc,weight:600,align:'center',color:'rgba(237,245,239,0.62)',track:4*S});
  const dl='PICKS IN BY '+F.deadline;
  const ds=fit(dl,800,W-M*2,44*S,3*S);
  T(dl,W/2,Y(1174),{size:ds,weight:800,align:'center',color:GOLD,track:3*S,shadow:true});
  const ms=fit(F.max,600,W-M*2,22*S,5*S);
  T(F.max,W/2,Y(1206),{size:ms,weight:600,align:'center',color:MUTE,track:5*S});

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1240),W-M*2,2*S);
  cup(M+26*S,Y(1292),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1308),{size:42*S,weight:800,color:GOLD,track:2*S});
  // Rule 2: prices are the app's own estimate and are labelled as such wherever they appear.
  T(F.withOdds?'GIBSON ESTIMATE':'@GIBSONSTATS',W-M,Y(1308),
    {size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

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
const slug = String(gw.id || facts.headline).toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "");
const out = join(OUT_DIR, `gibson-predictor-${slug}${withOdds ? "-odds" : ""}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
