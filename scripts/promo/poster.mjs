// GIBSON — season poster (portrait PNG).
//
//   node scripts/promo/poster.mjs            # 2000x2800
//   POSTER_W=2480 POSTER_H=3508 node scripts/promo/poster.mjs   # A4 at 300dpi
//
// A GIBSON-native answer to the league's launch photograph: twelve clubs lined up either
// side of the cup. Drawn entirely from our own marks and data.js — no third-party
// photograph, and no bookmaker branding, which is why it is drawn rather than edited.
// The plinth in the press shot carries a bookmaker's logo; CLAUDE.md rule 2 keeps those off
// anything GIBSON publishes, and it cannot be cropped out of that photo because the trophy
// sits directly on top of it. Here the plinth is ours.

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FONT_DIR = join(REPO, "node_modules/@fontsource/barlow-condensed/files");
const OUT_DIR = process.env.PROMO_OUT || join(REPO, "promo-out");
const W = Number(process.env.POSTER_W) || 2000;
const H = Number(process.env.POSTER_H) || 2800;

if (!existsSync(FONT_DIR)) {
  console.error("Missing @fontsource/barlow-condensed. Run:\n  npm install --no-save @fontsource/barlow-condensed");
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

const D = await import(`file://${REPO}/data.js`);

// Clubs in the order the league finished last season, champions first — the line-up reads
// as a table rather than an arbitrary order. A promoted club with no finishing position
// goes on the end rather than being dropped.
const current = [...new Set(D.FIXTURES_2627.flatMap((r) => r.matches.flatMap((m) => [m.h, m.a])))];
const placed = D.FULL_TABLE.map((r) => r.club).filter((c) => current.includes(c));
const order = [...placed, ...current.filter((c) => !placed.includes(c))];
if (order.length !== current.length) throw new Error("club ordering lost a club");

const facts = {
  clubs: order.map((c) => ({ code: c, ...D.CLUBS[c] })),
  champion: D.FULL_TABLE[0].club,
  season: D.SEASON.current.display,
  start: D.seasonStartDisplay(),
  rounds: D.FIXTURES_2627.length,
};
console.log(`poster ${W}x${H} — ${facts.clubs.length} clubs, champions ${facts.champion}`);

const kit = readFileSync(join(HERE, "kit.js"), "utf8");
const f800 = readFileSync(join(FONT_DIR, "barlow-condensed-latin-800-normal.woff2")).toString("base64");
const f600 = readFileSync(join(FONT_DIR, "barlow-condensed-latin-600-normal.woff2")).toString("base64");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Barlow Condensed";font-weight:800;src:url(data:font/woff2;base64,${f800}) format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:600;src:url(data:font/woff2;base64,${f600}) format("woff2")}
html,body{margin:0;background:#000}canvas{display:block}
</style></head><body><canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W},H=${H};
const cv=document.getElementById('c'),ctx=cv.getContext('2d',{alpha:false});
${kit}
const F=${JSON.stringify(facts)};
const S=W/2000; // everything below is authored at 2000 wide and scales from there

// Two depths: the cup stands on the halfway line, the twelve stand nearer the camera.
const HORIZON=H*0.60, LINE_Y=H*0.715;

// ---- Ground ---------------------------------------------------------------------------
// An overcast sky over a mown pitch, suggested rather than depicted: the point is a stage
// for the shields, not a drawing of a stadium.
function ground(){
  const horizon=HORIZON;
  const sky=ctx.createLinearGradient(0,0,0,horizon);
  sky.addColorStop(0,'#0B1512'); sky.addColorStop(0.55,'#12211B'); sky.addColorStop(1,'#1B2E25');
  ctx.fillStyle=sky; ctx.fillRect(0,0,W,horizon);

  const turf=ctx.createLinearGradient(0,horizon,0,H);
  turf.addColorStop(0,'#1E3A2A'); turf.addColorStop(0.45,'#162C20'); turf.addColorStop(1,'#0C1710');
  ctx.fillStyle=turf; ctx.fillRect(0,horizon,W,H-horizon);

  // Mown stripes, converging slightly so the pitch reads as receding.
  ctx.save(); ctx.beginPath(); ctx.rect(0,horizon,W,H-horizon); ctx.clip();
  for(let i=-2;i<14;i++){
    if(i%2)continue;
    const topX=(i/12)*W, botX=((i-2.2)/12)*W*1.5;
    ctx.beginPath();
    ctx.moveTo(topX,horizon); ctx.lineTo(topX+W/12,horizon);
    ctx.lineTo(botX+W/8,H); ctx.lineTo(botX,H); ctx.closePath();
    ctx.fillStyle='rgba(255,255,255,0.018)'; ctx.fill();
  }
  ctx.restore();

  // Halfway line under the plinth, and the glow the cup throws.
  ctx.fillStyle='rgba(237,245,239,0.07)'; ctx.fillRect(0,horizon-2*S,W,3*S);
  const g=ctx.createRadialGradient(W/2,H*0.44,10,W/2,H*0.44,W*0.56);
  g.addColorStop(0,'rgba(255,182,39,0.20)'); g.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
}

// ---- The plinth -----------------------------------------------------------------------
// The press photo's plinth carries a bookmaker's logo. This one carries ours.
function plinth(cx,topY,w,h){
  const g=ctx.createLinearGradient(cx-w/2,topY,cx+w/2,topY+h);
  g.addColorStop(0,'#16261E'); g.addColorStop(0.5,'#1E3428'); g.addColorStop(1,'#101C16');
  ctx.beginPath(); ctx.roundRect(cx-w/2,topY,w,h,10*S); ctx.fillStyle=g; ctx.fill();
  ctx.lineWidth=3*S; ctx.strokeStyle='rgba(255,182,39,0.45)'; ctx.stroke();
  // Front face bevel
  ctx.beginPath(); ctx.moveTo(cx-w/2,topY); ctx.lineTo(cx+w/2,topY);
  ctx.lineWidth=2*S; ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.stroke();
  const s=fitFont('GIBSON',800,w-30*S,52*S);
  ctx.font='800 '+s+'px "Barlow Condensed"'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillStyle=GOLD; ctx.fillText('GIBSON',cx,topY+h*0.42);
  const s2=fitFont('IRISH LEAGUE STATS',600,w-30*S,24*S);
  ctx.font='600 '+s2+'px "Barlow Condensed"';
  ctx.fillStyle='rgba(237,245,239,0.5)'; ctx.fillText('IRISH LEAGUE STATS',cx,topY+h*0.68);
}

// A club "standing" on the line: shield with its name beneath, wrapped to two lines so
// Dungannon Swifts and Ballymena United do not run into their neighbours.
function standing(club,cx,baseY,shieldH,slotW,isChampion){
  if(isChampion){ // a quiet gold pool under the champions, no badge or label needed
    const g=ctx.createRadialGradient(cx,baseY+6*S,2,cx,baseY+6*S,slotW*0.62);
    g.addColorStop(0,'rgba(255,182,39,0.30)'); g.addColorStop(1,'rgba(255,182,39,0)');
    ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(cx,baseY+6*S,slotW*0.62,16*S,0,0,7); ctx.fill();
  }
  // Contact shadow so the shields sit on the grass instead of floating over it.
  ctx.save(); ctx.globalAlpha=0.5;
  ctx.beginPath(); ctx.ellipse(cx,baseY+5*S,shieldH*0.30,7*S,0,0,7);
  ctx.fillStyle='rgba(0,0,0,0.65)'; ctx.fill(); ctx.restore();

  shield(club,cx,baseY-shieldH/2,shieldH);

  // Two-word names always break, so Carrick Rangers and Ballymena United are set at the
  // same size as Larne instead of being squeezed to fit their slot on one line.
  const words=club.name.toUpperCase().split(' ');
  const lines=words.length>1?[words[0],words.slice(1).join(' ')]:[words[0]];
  lines.forEach((ln,i)=>{
    const fs=fitFont(ln,600,slotW-10*S,24*S);
    ctx.font='600 '+fs+'px "Barlow Condensed"';
    ctx.textAlign='center'; ctx.textBaseline='alphabetic';
    ctx.fillStyle=isChampion?GOLD:'rgba(237,245,239,0.78)';
    ctx.fillText(ln,cx,baseY+34*S+i*24*S);
  });
}

function draw(){
  ground();

  // ---- headline ----
  slam('TWELVE CLUBS',W/2,H*0.115,170*S,CHALK,0,800,W-140*S);
  slam('ONE CUP',W/2,H*0.192,225*S,GOLD,0,800,W-140*S);
  slam('THE IRISH LEAGUE · '+F.season,W/2,H*0.253,46*S,'rgba(237,245,239,0.7)',0,600,W-200*S,10*S);

  // ---- the cup, standing ON its plinth on the halfway line ----
  // Flanking the plinth with six shields a side caps the cup at ~680px before the shields
  // start colliding. Putting the twelve in one row downstage instead frees the full width
  // for both: a cup that dominates, and badges big enough to read.
  const plinthH=170*S, plinthW=560*S;
  const plinthTop=HORIZON-plinthH, cupSize=900*S;
  // The cup mark's base sits at 0.84 of its box, so this lands it ON the plinth rather
  // than floating above it.
  cup(W/2,plinthTop-cupSize*0.34,cupSize);
  plinth(W/2,plinthTop,plinthW,plinthH);

  // ---- the twelve, in last season's finishing order, left to right ----
  const slotW=(W-80*S)/F.clubs.length;
  F.clubs.forEach((c,i)=>{
    const cx=40*S+slotW*(i+0.5);
    standing(c,cx,LINE_Y,150*S,slotW,c.code===F.champion);
  });

  // ---- footer ----
  slam(F.rounds+' ROUNDS · STARTS '+F.start.toUpperCase(),W/2,H*0.808,54*S,CHALK,0,600,W-240*S,8*S);
  const wm=W/2+46*S;
  cup(wm-262*S,H*0.888,82*S);
  slam('GIBSONSTATS.COM',wm,H*0.888,70*S,GOLD,0,800,W*0.58);
  slam('THE HOME OF IRISH LEAGUE STATS',W/2,H*0.938,34*S,'rgba(237,245,239,0.45)',0,600,W-300*S,8*S);

  ctx.drawImage(scan,0,0); grain(7,0.020); vignette();
}

window.__render=()=>{draw();return [cv.toDataURL('image/png'),cv.toDataURL('image/jpeg',0.94)]};
window.__ready=document.fonts.ready.then(()=>document.fonts.load('800 200px "Barlow Condensed"')).then(()=>document.fonts.load('600 60px "Barlow Condensed"')).then(()=>true);
</script></body></html>`;

const PW_CHROME = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({
  ...(existsSync(PW_CHROME) ? { executablePath: PW_CHROME } : {}),
  args: ["--force-color-profile=srgb", "--disable-lcd-text"],
});
const page = await browser.newPage({ viewport: { width: Math.min(W, 1600), height: Math.min(H, 1600) }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => window.__ready);
// PNG to print from, JPEG to post from — a 2000x2800 PNG is ~5MB, which phone share sheets
// and some social uploaders choke on.
const [png, jpg] = await page.evaluate(() => window.__render());
await browser.close();
const write = (ext, url) => {
  const out = join(OUT_DIR, `gibson-poster-${W}x${H}.${ext}`);
  writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
  console.log("wrote", out);
};
write("png", png);
write("jpg", jpg);
