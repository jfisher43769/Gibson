// GIBSON — half-time / full-time card (1080x1350 JPEG).
//
//   node scripts/promo/status.mjs CLI HT 1-0 --home="Quinn 11'"
//   node scripts/promo/status.mjs CLI FT 2-1 --home="Quinn 11', Curran 78'" --away="Owens 62'"
//   ...add --photo=/path/to/ground.jpg to run the ground across the top
//
// Same contract as goal.mjs: pass the club, the state and the score, and everything else —
// the fixture, the opponent, both sets of colours, the ground, the round — comes from
// data.js. Scorer lines are free text because they are editorial: nobody's goals are in
// data.js while the match is still on.

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
const die = (m) => { console.error(`\n${m}\n\nUsage: node scripts/promo/status.mjs <CLUB> <HT|FT> <h>-<a> [--home="..."] [--away="..."] [--photo=...]\n`); process.exit(1); };

const [clubArg, stateArg, scoreArg] = argv.filter((a) => !a.startsWith("--"));
const club = String(clubArg || "").toUpperCase();
if (!D.CLUBS[club]) die(`Unknown club "${clubArg}". Try one of: ${Object.keys(D.CLUBS).join(", ")}`);

// Only the states a live match actually passes through, so a typo can't print a card that
// claims the wrong thing about the game.
const STATES = { HT: "HALF TIME", FT: "FULL TIME", KO: "KICK OFF" };
const state = String(stateArg || "").toUpperCase();
if (!STATES[state]) die(`State "${stateArg}" should be one of: ${Object.keys(STATES).join(", ")}`);

const sm = /^(\d{1,2})\s*[-–:]\s*(\d{1,2})$/.exec(String(scoreArg || "").trim());
if (!sm && state !== "KO") die(`Score "${scoreArg}" should look like 1-0 (home first).`);
const score = sm ? [Number(sm[1]), Number(sm[2])] : [0, 0];

const now = Number(process.env.NOW_MS) || Date.now();
let fixture = null;
for (const round of D.FIXTURES_2627) {
  for (const m of round.matches) {
    if (m.h !== club && m.a !== club) continue;
    const ms = D.fixtureKickoffMs(round, m);
    if (ms === null) continue;
    if (!fixture || Math.abs(ms - now) < Math.abs(fixture.ms - now)) {
      fixture = { ms, round: round.round, h: m.h, a: m.a };
    }
  }
}
if (!fixture) die(`No fixture found for ${D.CLUBS[club].name}.`);

const photoPath = flag("photo");
if (photoPath && !existsSync(photoPath)) die(`No such photo: ${photoPath}`);
const photoData = photoPath
  ? `data:image/${photoPath.toLowerCase().endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(photoPath).toString("base64")}`
  : "";

const facts = {
  homeClub: { code: fixture.h, ...D.CLUBS[fixture.h] },
  awayClub: { code: fixture.a, ...D.CLUBS[fixture.a] },
  leaderColor: score[0] === score[1] ? null : D.CLUBS[score[0] > score[1] ? fixture.h : fixture.a].colors[0],
  state: STATES[state],
  score, showScore: state !== "KO",
  homeScorers: flag("home") || "",
  awayScorers: flag("away") || "",
  ground: D.CLUBS[fixture.h].ground,
  round: fixture.round,
};
console.log(`${STATES[state]} — ${facts.homeClub.name} ${score[0]}-${score[1]} ${facts.awayClub.name}${photoPath ? ` (photo: ${photoPath})` : ""}`);

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
  if(o.shadow){ctx.shadowColor='rgba(0,0,0,0.65)';ctx.shadowBlur=24*S;ctx.shadowOffsetY=5*S;}
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

// The ground runs across the top as a band rather than full-bleed. The source is 800x600 —
// covering 1080x1350 would mean upscaling well past 2x and it would go to mush; a band is
// about 1.35x, which holds. Below it the card is dark, so the scoreline has somewhere solid
// to sit.
const BAND=Y(700);
function ground(){
  ctx.fillStyle='#080F0C'; ctx.fillRect(0,0,W,H);
  if(IMG){
    const need=W/BAND, iw=IMG.naturalWidth, ih=IMG.naturalHeight;
    let sw=iw, sh=iw/need;
    if(sh>ih){ sh=ih; sw=ih*need; }
    ctx.drawImage(IMG,(iw-sw)/2,(ih-sh)*0.42,sw,sh,0,0,W,BAND);
    // Darken overall so type clears, then fade the bottom edge into the card.
    ctx.fillStyle='rgba(8,15,12,0.34)'; ctx.fillRect(0,0,W,BAND);
    const fade=ctx.createLinearGradient(0,BAND*0.42,0,BAND);
    fade.addColorStop(0,'rgba(8,15,12,0)'); fade.addColorStop(0.72,'rgba(8,15,12,0.86)'); fade.addColorStop(1,'#080F0C');
    ctx.fillStyle=fade; ctx.fillRect(0,0,W,BAND);
    const top=ctx.createLinearGradient(0,0,0,Y(210));
    top.addColorStop(0,'rgba(8,15,12,0.78)'); top.addColorStop(1,'rgba(8,15,12,0)');
    ctx.fillStyle=top; ctx.fillRect(0,0,W,Y(210));
  }
  const glow=ctx.createRadialGradient(W*0.5,Y(900),10,W*0.5,Y(900),W*0.8);
  glow.addColorStop(0,'rgba(255,182,39,0.13)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  // A colour edge for whoever is ahead; nothing at all when it's level.
  if(F.leaderColor){ ctx.fillStyle=F.leaderColor; ctx.fillRect(0,0,10*S,H); }
}

function side(club,cx,y,h,scorers){
  shield(club,cx,y,h);
  const s=fit(club.name.toUpperCase(),800,220*S,30*S,1*S);
  T(club.name.toUpperCase(),cx,y+h*0.5+40*S,{size:s,weight:800,align:'center',color:CHALK,track:1*S});
  if(scorers){
    // Split on commas so a brace of goals stacks instead of running off the card.
    const lines=scorers.split(',').map(x=>x.trim()).filter(Boolean);
    lines.forEach((ln,i)=>{
      const fs=fit(ln,600,240*S,25*S,1*S);
      T(ln,cx,y+h*0.5+78*S+i*30*S,{size:fs,weight:600,align:'center',color:MUTE});
    });
  }
}

function draw(){
  ground();

  T('PREMIERSHIP · ROUND '+F.round,M,Y(96),{size:27*S,weight:600,color:'rgba(237,245,239,0.8)',track:6*S,shadow:true});
  T(F.ground.toUpperCase(),W-M,Y(96),{size:27*S,weight:600,align:'right',color:'rgba(237,245,239,0.8)',track:6*S,shadow:true});

  // The state is the headline — it is the whole reason this card exists.
  const hs=fit(F.state,800,W-M*2,150*S,6*S);
  T(F.state,W/2,Y(660),{size:hs,weight:800,align:'center',color:GOLD,track:6*S,shadow:true});

  // Height follows the deepest scorer list, so a card with one goal on it isn't mostly panel.
  const deepest=Math.max(...[F.homeScorers,F.awayScorers].map(s=>s?s.split(',').filter(x=>x.trim()).length:0),0);
  const boxY=Y(748), boxH=Y(300)+deepest*Y(34);
  panel(M,boxY,W-M*2,boxH,22*S,'rgba(6,12,10,0.62)');
  const cy=boxY+Y(126);
  side(F.homeClub,M+150*S,cy,138*S,F.homeScorers);
  side(F.awayClub,W-M-150*S,cy,138*S,F.awayScorers);
  if(F.showScore) T(F.score[0]+'–'+F.score[1],W/2,cy+12*S,{size:132*S,weight:800,align:'center',baseline:'middle',color:CHALK,shadow:true});
  else T('V',W/2,cy+12*S,{size:96*S,weight:800,align:'center',baseline:'middle',color:MUTE});

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1215),W-M*2,2*S);
  cup(M+26*S,Y(1272),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1288),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1288),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

  grain(3,0.016);
  vignette();
}
window.__render=()=>{draw();return cv.toDataURL('image/jpeg',0.94)};
window.__ready=document.fonts.ready
  .then(()=>Promise.all([document.fonts.load('800 200px "Barlow Condensed"'),document.fonts.load('600 60px "Barlow Condensed"')]))
  .then(()=>PHOTO_SRC?new Promise((res,rej)=>{
    const im=new Image();
    im.onload=()=>{IMG=im;res(true)};
    im.onerror=()=>rej(new Error('photo failed to decode'));
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
const out = join(OUT_DIR, `gibson-${state.toLowerCase()}-${fixture.h}${score[0]}${score[1]}${fixture.a}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
