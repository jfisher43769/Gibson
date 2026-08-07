// GIBSON — live goal graphic (1080x1350 JPEG, Instagram/X feed ratio).
//
//   node scripts/promo/goal.mjs <CLUB> "<scorer>" <minute> <home>-<away> [note]
//   node scripts/promo/goal.mjs CLI "Ryan Curran" 23 1-0
//   node scripts/promo/goal.mjs CRU "Jordan Owens" 67 1-1 PEN
//
// Built to be run mid-match, so it argues with you rather than rendering something wrong:
// the club must exist, the scoreline must parse, the minute must be a real minute, and the
// club must actually be playing in the fixture it picks. A goal graphic naming the wrong
// opponent is worse than no graphic, and there is no time to check one during a match.
//
// The fixture, both clubs' colours, the ground and the round all come from data.js. The only
// things you pass are the four facts a scoreboard can't know: who scored, when, and the score.

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
const [clubArg, scorerArg, minuteArg, scoreArg, noteArg] = process.argv.slice(2);
const die = (m) => { console.error(`\n${m}\n\nUsage: node scripts/promo/goal.mjs <CLUB> "<scorer>" <minute> <h>-<a> [note]\n`); process.exit(1); };

const club = String(clubArg || "").toUpperCase();
if (!D.CLUBS[club]) die(`Unknown club "${clubArg}". Try one of: ${Object.keys(D.CLUBS).join(", ")}`);
const scorer = String(scorerArg || "").trim();
if (!scorer) die("Missing scorer name.");
const minute = Number(minuteArg);
if (!Number.isInteger(minute) || minute < 1 || minute > 130) die(`Minute "${minuteArg}" isn't a real minute.`);
const sm = /^(\d{1,2})\s*[-–:]\s*(\d{1,2})$/.exec(String(scoreArg || "").trim());
if (!sm) die(`Score "${scoreArg}" should look like 1-0 (home first).`);
const score = [Number(sm[1]), Number(sm[2])];

// The fixture this club is playing: whichever of its unplayed games kicks off nearest to now.
// Mid-match that is the one on the telly; the live window means a game already under way
// still wins over next week's.
const now = Number(process.env.NOW_MS) || Date.now();
let fixture = null;
for (const round of D.FIXTURES_2627) {
  for (const m of round.matches) {
    if (Array.isArray(m.result)) continue;
    if (m.h !== club && m.a !== club) continue;
    const ms = D.fixtureKickoffMs(round, m);
    if (ms === null) continue;
    if (!fixture || Math.abs(ms - now) < Math.abs(fixture.ms - now)) {
      fixture = { ms, round: round.round, h: m.h, a: m.a, date: m.d || round.date, tv: m.tv || null };
    }
  }
}
if (!fixture) die(`No unplayed fixture found for ${D.CLUBS[club].name}.`);

const scorerIsHome = fixture.h === club;
const facts = {
  h: fixture.h, a: fixture.a,
  homeName: D.CLUBS[fixture.h].name, awayName: D.CLUBS[fixture.a].name,
  homeClub: { code: fixture.h, ...D.CLUBS[fixture.h] },
  awayClub: { code: fixture.a, ...D.CLUBS[fixture.a] },
  scorerClub: { code: club, ...D.CLUBS[club] },
  scoringSideIsHome: scorerIsHome,
  scorer, minute, score,
  // Split here in Node, not in the page. Inside the HTML template literal below, `\s` is not
  // a recognised escape and collapses to a bare "s" — /\s+/ was reaching the browser as
  // /s+/, so "Ryan Curran" never split and the full name rendered as the surname.
  scorerFirst: scorer.split(/\s+/).length > 1 ? scorer.split(/\s+/)[0] : "",
  scorerLast: scorer.split(/\s+/).slice(scorer.split(/\s+/).length > 1 ? 1 : 0).join(" "),
  note: (noteArg || "").toUpperCase().trim() || null,
  ground: D.CLUBS[fixture.h].ground,
  round: fixture.round,
  season: D.SEASON.current.display,
};
console.log(`goal — ${facts.homeName} ${score[0]}-${score[1]} ${facts.awayName}, ${scorer} ${minute}' for ${D.CLUBS[club].name}`);

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
  if(o.shadow){ctx.shadowColor='rgba(0,0,0,0.55)';ctx.shadowBlur=22*S;ctx.shadowOffsetY=5*S;}
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

// The scoring club's colours carry the graphic — the convention every club follows, and the
// reason a fan knows whose goal it is before reading a word. Knocked well back so type over
// it always clears contrast, since two clubs can wear near-identical reds.
function ground(){
  ctx.fillStyle='#080F0C'; ctx.fillRect(0,0,W,H);
  const [c1,c2]=F.scorerClub.colors;
  ctx.save();
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(W,0); ctx.lineTo(W,H*0.44); ctx.lineTo(0,H*0.60); ctx.closePath();
  const g=ctx.createLinearGradient(0,0,W,H*0.5); g.addColorStop(0,c1); g.addColorStop(1,c2);
  ctx.fillStyle=g; ctx.globalAlpha=0.92; ctx.fill();
  ctx.restore();
  ctx.fillStyle='rgba(8,15,12,0.62)'; ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(W*0.5,Y(430),10,W*0.5,Y(430),W*0.8);
  glow.addColorStop(0,'rgba(255,182,39,0.20)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  // Scoring side's colour as a hard edge down one side, so home/away is readable at a glance.
  ctx.fillStyle=c1; ctx.fillRect(F.scoringSideIsHome?0:W-10*S,0,10*S,H);
}

// A club, its shield over its name, used either side of the scoreline.
function side(club,cx,y,h,dimmed){
  ctx.save(); ctx.globalAlpha=dimmed?0.55:1;
  shield(club,cx,y,h);
  ctx.restore();
  const s=fit(club.name.toUpperCase(),800,190*S,30*S,1*S);
  T(club.name.toUpperCase(),cx,y+h*0.5+38*S,{size:s,weight:800,align:'center',color:dimmed?MUTE:CHALK,track:1*S});
}

function draw(){
  ground();

  // ---- top line: what match this is ----
  T('PREMIERSHIP · ROUND '+F.round,M,Y(96),{size:27*S,weight:600,color:MUTE,track:6*S});
  T(F.ground.toUpperCase(),W-M,Y(96),{size:27*S,weight:600,align:'right',color:MUTE,track:6*S});
  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(120),W-M*2,2*S);

  // ---- GOAL, and the minute it went in ----
  const goalWord=F.note?'GOAL · '+F.note:'GOAL';
  const gs=fit(goalWord,800,W-M*2-150*S,190*S,0);
  T(goalWord,M,Y(320),{size:gs,weight:800,color:GOLD,shadow:true});

  // Minute as a disc, the way a broadcast clock reads.
  const r=64*S, mx=W-M-r, my=Y(258);
  ctx.beginPath(); ctx.arc(mx,my,r,0,7); ctx.fillStyle=GOLD; ctx.fill();
  T(F.minute+"'",mx,my,{size:56*S,weight:800,align:'center',baseline:'middle',color:'#10241B'});

  // ---- who scored: the hero of the graphic ----
  if(F.scorerFirst) T(F.scorerFirst.toUpperCase(),M,Y(438),{size:54*S,weight:600,color:'rgba(237,245,239,0.85)',track:7*S,shadow:true});
  const ss=fit(F.scorerLast.toUpperCase(),800,W-M*2,158*S,0);
  T(F.scorerLast.toUpperCase(),M,Y(566),{size:ss,weight:800,color:CHALK,shadow:true});
  ctx.fillStyle=GOLD; ctx.fillRect(M,Y(600),140*S,7*S);

  // ---- the score as it stands ----
  const boxY=Y(750), boxH=Y(330);
  panel(M,boxY,W-M*2,boxH,22*S,'rgba(6,12,10,0.55)');
  // Shields sit above their names, so the optical centre of a side is above the box centre.
  const cy=boxY+boxH*0.44;
  side(F.homeClub,M+130*S,cy,132*S,!F.scoringSideIsHome);
  side(F.awayClub,W-M-130*S,cy,132*S,F.scoringSideIsHome);
  T(F.score[0]+'–'+F.score[1],W/2,cy+10*S,{size:126*S,weight:800,align:'center',baseline:'middle',color:CHALK,shadow:true});

  // ---- footer ----
  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1215),W-M*2,2*S);
  cup(M+26*S,Y(1272),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1288),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1288),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

  grain(5,0.018);
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
const slug = `${facts.h}${score[0]}${score[1]}${facts.a}-${minute}`;
const out = join(OUT_DIR, `gibson-goal-${slug}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
