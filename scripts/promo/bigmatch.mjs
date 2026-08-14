// GIBSON — big-match card (1080x1350 still).
//
//   node scripts/promo/bigmatch.mjs [HOME] [AWAY]
//
// With no arguments it takes the shortest-priced fixture in the current Predictor gameweek —
// the model's idea of the week's most one-sided tie. Pass two club codes for any other.
//
// NO CRESTS AND NO SHIELDS. The club badges are used on the site under written permission for
// unaltered reproduction there; a promo card posted to social is a different context, and the
// drawn shield reads as a badge too. So this card carries the tie on club colour and type
// alone, which for a Big Two derby is the stronger design anyway.
//
// Every number is read from data.js — last season's table and goal profile, xG, all-time
// titles, the fixture's own venue and kick-off, and the round already played. Nothing is
// asserted here by hand (CLAUDE.md golden rule 1). The preflight throws rather than render a
// card with a hole in it.
//
// Odds shown are GIBSON estimates and are labelled as such on screen. Never add a bookmaker
// name, logo or link to this file (CLAUDE.md golden rule 2).

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FONT_DIR = join(REPO, "node_modules/@fontsource/barlow-condensed/files");
const OUT_DIR = process.env.PROMO_OUT || join(REPO, "promo-out");
const W = 1080, H = 1350;

if (!existsSync(FONT_DIR)) {
  console.error("Missing @fontsource/barlow-condensed. Run:\n  npm install --no-save @fontsource/barlow-condensed");
  process.exit(1);
}
const D = await import(`file://${REPO}/data.js`);
const fail = (m) => { console.error("✗ " + m); process.exit(1); };

// ---- Pick the fixture -------------------------------------------------------------------
const [argH, argA] = process.argv.slice(2).map((s) => s && s.toUpperCase());
const gw = D.PREDICTOR_GW.fixtures;
const pick = argH
  ? gw.find((f) => f.home.club === argH && f.away.club === argA)
  : [...gw].sort((a, b) => Math.min(a.odds.home, a.odds.away) - Math.min(b.odds.home, b.odds.away))[0];
if (!pick) fail(`No fixture ${argH} v ${argA} in ${D.PREDICTOR_GW.name}.`);
const HOME = pick.home.club, AWAY = pick.away.club;

// ---- Gather the facts, or refuse --------------------------------------------------------
// A club missing from any of these is a data gap to fill, not a blank to render around.
const side = (code) => {
  const club = D.CLUBS[code] || fail(`unknown club ${code}`);
  const idx = D.FULL_TABLE.findIndex((r) => r.club === code);
  const row = idx >= 0 ? D.FULL_TABLE[idx] : null;
  const xg = D.XG_TEAMS.find((t) => t.club === code);
  const titles = D.ALL_TIME_TITLES.find((t) => t.club === code);
  // Their result in the rounds already played, if any.
  let form = null;
  for (const rd of D.FIXTURES_2627) for (const m of rd.matches) {
    if (!Array.isArray(m.result) || (m.h !== code && m.a !== code)) continue;
    const home = m.h === code;
    const [hs, as] = m.result;
    const us = home ? hs : as, them = home ? as : hs;
    form = { text: `${us}-${them} ${home ? "v" : "at"} ${D.CLUBS[home ? m.a : m.h].name}`, w: us > them, d: us === them };
  }
  return {
    code, name: club.name.toUpperCase(), colors: club.colors,
    pos: idx >= 0 ? idx + 1 : null,
    ppg: row ? row.pts / row.p : null,
    gf: xg ? xg.gf : null, ga: xg ? xg.ga : null, xg: xg ? xg.xg : null, xga: xg ? xg.xga : null,
    titles: titles ? titles.titles : null, form,
  };
};
const h = side(HOME), a = side(AWAY);
for (const s of [h, a]) {
  if (s.gf === null || s.xg === null) fail(`${s.code} has no recorded goal profile — nothing to compare.`);
}

// The fixture's own comp string already carries round, venue and kick-off; split it rather
// than retyping any of it here.
const parts = pick.comp.split(" · ");
const F = {
  round: parts[0] || D.PREDICTOR_GW.name,
  venue: parts[1] || D.CLUBS[HOME].ground,
  when: (parts[2] || D.PREDICTOR_GW.deadline || "").toUpperCase(),
  odds: pick.odds,
  // Combined titles is a real headline for a derby, but only when both sides have a count.
  combined: h.titles !== null && a.titles !== null ? h.titles + a.titles : null,
  everContested: (() => {
    const rec = D.RECORDS.find((r) => /titles ever contested/i.test(r.sub || ""));
    const m = rec && /(\d+)\s+league titles ever contested/i.exec(rec.sub);
    return m ? Number(m[1]) : null;
  })(),
  h, a,
};

console.log(`${h.name} v ${a.name} — ${F.round} · ${F.venue} · ${F.when}`);
console.log(`  GIBSON estimate ${F.odds.home} / ${F.odds.draw} / ${F.odds.away}`);
if (F.combined) console.log(`  combined titles ${F.combined}${F.everContested ? ` of ${F.everContested}` : ""}`);

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
const F=${JSON.stringify(F)};

// Diagonal colour fields: home's colour sweeping from the left, away's from the right, both
// knocked well back so the type over them always clears contrast. This is what carries the
// club identity in place of a badge.
function fields(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#10241B');g.addColorStop(0.55,'#0B1512');g.addColorStop(1,'#0B1512');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);

  const band=(color,dir)=>{
    ctx.save();ctx.beginPath();
    if(dir<0){ctx.moveTo(0,140);ctx.lineTo(W*0.62,140);ctx.lineTo(W*0.44,614);ctx.lineTo(0,614);}
    else{ctx.moveTo(W*0.66,140);ctx.lineTo(W,140);ctx.lineTo(W,614);ctx.lineTo(W*0.48,614);}
    ctx.closePath();ctx.clip();
    const gg=ctx.createLinearGradient(dir<0?0:W,0,dir<0?W*0.7:W*0.3,H*0.5);
    gg.addColorStop(0,color+'55');gg.addColorStop(1,color+'08');
    ctx.fillStyle=gg;ctx.fillRect(0,0,W,H);ctx.restore();
  };
  band(F.h.colors[0],-1);
  band(F.a.colors[0],1);

  // A single hairline down the split, in each club's secondary.
  ctx.save();ctx.lineWidth=3;
  const grad=ctx.createLinearGradient(0,140,0,614);
  grad.addColorStop(0,F.h.colors[1]+'00');grad.addColorStop(0.5,F.h.colors[1]+'90');grad.addColorStop(1,F.a.colors[1]+'00');
  ctx.strokeStyle=grad;ctx.beginPath();ctx.moveTo(W*0.64,140);ctx.lineTo(W*0.46,614);ctx.stroke();ctx.restore();
}

// Label centred, the two values pushed well clear of it. The first version centred all
// three and the numbers sat on top of the label.
function statRow(y,label,hv,av,hWins){
  rowText(label.toUpperCase(),W/2,y,25,'rgba(237,245,239,0.5)',600,'center');
  const gold='#FFB627',plain='#EDF5EF';
  rowText(hv,W/2-165,y,42,hWins===true?gold:plain,800,'right');
  rowText(av,W/2+165,y,42,hWins===false?gold:plain,800,'left');
}

function draw(){
  fields();

  // ---- header
  rowText(F.round.toUpperCase(),60,84,30,'rgba(237,245,239,0.62)',600,'left');
  rowText(F.when,W-60,84,30,'#FFB627',800,'right');
  ctx.strokeStyle='rgba(237,245,239,0.14)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(60,118);ctx.lineTo(W-60,118);ctx.stroke();

  // ---- the tie
  slam(F.h.name,W/2,262,124,'#EDF5EF',0,800,W-150);
  rowText('V',W/2,358,52,'#FFB627',800,'center');
  slam(F.a.name,W/2,452,124,'#EDF5EF',0,800,W-150);
  rowText(F.venue.toUpperCase(),W/2,540,29,'rgba(237,245,239,0.6)',600,'center');

  // ---- this season so far, as one line rather than its own block
  if(F.h.form||F.a.form){
    const seg=(s)=>s.form?s.form.text:'yet to play';
    const col=(s)=>!s.form?'rgba(237,245,239,0.45)':s.form.w?'#3DDC84':s.form.d?'#FFB627':'#E8663C';
    ctx.font='600 26px "Barlow Condensed"';
    const l=seg(F.h),r=seg(F.a),dot='   ·   ';
    const wl=ctx.measureText(l).width,wd=ctx.measureText(dot).width,wr=ctx.measureText(r).width;
    let x=W/2-(wl+wd+wr)/2;
    ctx.textAlign='left';ctx.textBaseline='middle';
    ctx.fillStyle=col(F.h);ctx.fillText(l,x,588);x+=wl;
    ctx.fillStyle='rgba(237,245,239,0.35)';ctx.fillText(dot,x,588);x+=wd;
    ctx.fillStyle=col(F.a);ctx.fillText(r,x,588);
  }

  // ---- the derby fact, when there is one
  if(F.combined&&F.everContested){
    panel(60,624,W-120,140,20,'rgba(255,182,39,0.09)');
    rowText(String(F.combined),W/2,684,84,'#FFB627',800,'center');
    rowText('OF THE '+F.everContested+' LEAGUE TITLES EVER CONTESTED',W/2,738,27,'#EDF5EF',600,'center');
  }

  // ---- last season, side by side
  rowText('LAST SEASON',W/2,806,25,'rgba(237,245,239,0.4)',600,'center');
  const pos=(p)=>p?p+(p%10===1&&p!==11?'ST':p%10===2&&p!==12?'ND':p%10===3&&p!==13?'RD':'TH'):'—';
  let y=856;
  statRow(y,'finished',pos(F.h.pos),pos(F.a.pos),F.h.pos&&F.a.pos?F.h.pos<F.a.pos:null);y+=54;
  statRow(y,'points / game',F.h.ppg?F.h.ppg.toFixed(2):'—',F.a.ppg?F.a.ppg.toFixed(2):'—',F.h.ppg&&F.a.ppg?F.h.ppg>F.a.ppg:null);y+=54;
  statRow(y,'scored / game',F.h.gf.toFixed(2),F.a.gf.toFixed(2),F.h.gf>F.a.gf);y+=54;
  statRow(y,'conceded / game',F.h.ga.toFixed(2),F.a.ga.toFixed(2),F.h.ga<F.a.ga);y+=54;
  statRow(y,'expected goals',F.h.xg.toFixed(2),F.a.xg.toFixed(2),F.h.xg>F.a.xg);

  // ---- GIBSON estimate. Plain numbers, labelled. No bookmaker, ever.
  panel(60,1104,W-120,138,20);
  rowText('GIBSON ESTIMATE',W/2,1138,23,'rgba(237,245,239,0.5)',600,'center');
  const col=[W*0.26,W*0.5,W*0.74];
  const lab=[F.h.name.split(' ')[0],'DRAW',F.a.name.split(' ')[0]];
  const val=[F.odds.home,F.odds.draw,F.odds.away];
  for(let i=0;i<3;i++){
    rowText(lab[i],col[i],1178,23,'rgba(237,245,239,0.6)',600,'center');
    rowText(val[i].toFixed(2),col[i],1216,42,'#FFB627',800,'center');
  }

  // ---- footer
  rowText('GIBSONSTATS.COM',60,H-46,32,'#FFB627',800,'left');
  rowText('@GIBSONSTATS',W-60,H-46,26,'rgba(237,245,239,0.45)',600,'right');

  grain(4,0.014);
  vignette();
}
window.__render=()=>{draw();return cv.toDataURL('image/jpeg',0.94)};
window.__ready=document.fonts.ready
  .then(()=>Promise.all([document.fonts.load('800 130px "Barlow Condensed"'),document.fonts.load('600 30px "Barlow Condensed"')]))
  .then(()=>true);
</script></body></html>`;

mkdirSync(OUT_DIR, { recursive: true });
const PW_CHROME = process.env.CHROMIUM_PATH || "/opt/pw-browsers/chromium";
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

const out = join(OUT_DIR, `gibson-bigmatch-${HOME.toLowerCase()}-${AWAY.toLowerCase()}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
