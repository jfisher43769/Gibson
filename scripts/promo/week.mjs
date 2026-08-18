// GIBSON — week-ahead promo (1080x1920 MP4).
//
//   node scripts/promo/week.mjs
//   NOW_MS=... node scripts/promo/week.mjs      # render as if it were another moment
//
// What is on this week, and what the app does with it. matchday.mjs covers a single
// afternoon and features.mjs tours the app in the abstract; this is the one that goes out on
// a Monday or Tuesday — the European tie, the league round, and three things the app can do
// SHOWN WITH THIS WEEK'S ACTUAL NUMBERS rather than described.
//
// That last part is the point. A feature card reading "leading scorers" is a claim; one
// reading "Heatley 2, Stewart 2, McKee 2" is the feature working. Every panel here is filled
// from data.js at render time, so the video cannot advertise something the app does not show
// (CLAUDE.md golden rule 1).
//
// Fixtures are selected with the SAME nextLeagueFixture() + one-week filter cards.mjs and
// matchday.mjs use, so all three agree about which games are coming and a fixture moved
// months ahead is excluded by the null-kickoff guard rather than advertised.
//
// No odds, and so no bookmaker anything (golden rule 2). The Predictor beat says what the
// Predictor is and what a correct score is worth; it prints no prices.

import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const NM = join(REPO, "node_modules");
const FFMPEG = join(NM, "ffmpeg-static/ffmpeg");
const FONT_DIR = join(NM, "@fontsource/barlow-condensed/files");
const OUT_DIR = process.env.PROMO_OUT || join(REPO, "promo-out");
const W = 1080, H = 1920, FPS = 30;

for (const [path, pkg] of [[FFMPEG, "ffmpeg-static"], [FONT_DIR, "@fontsource/barlow-condensed"]]) {
  if (!existsSync(path)) {
    console.error(`Missing ${pkg}. Run:\n  npm install --no-save ffmpeg-static @fontsource/barlow-condensed`);
    process.exit(1);
  }
}
mkdirSync(OUT_DIR, { recursive: true });

const D = await import(`file://${REPO}/data.js`);
const now = Number(process.env.NOW_MS) || Date.now();
const WEEK_MS = 7 * 24 * 3600 * 1000;

const clubOf = (c) => {
  if (!D.CLUBS[c]) throw new Error(`unknown club code ${c}`);
  return { code: c, ...D.CLUBS[c] };
};

// ---- The league round ------------------------------------------------------------------
const next = D.nextLeagueFixture(now);
if (!next) throw new Error("no upcoming league fixture — nothing to make a week from");
const round = D.FIXTURES_2627.find((r) => r.round === next.round);
const fixtures = round.matches
  .map((m) => ({ ...m, ms: D.fixtureKickoffMs(round, m) }))
  .filter((m) => m.ms !== null && !Array.isArray(m.result)
    && m.ms >= now - D.LIVE_WINDOW_MS && m.ms <= next.kickoffMs + WEEK_MS)
  .sort((x, y) => x.ms - y.ms);
if (!fixtures.length) throw new Error(`round ${round.round} has no fixtures inside the week`);

const dayOf = (s) => String(s).split(" ")[0].toUpperCase();
const dateOf = (s) => String(s).replace(/^\w+\s+/, "").toUpperCase();
const rows = fixtures.map((m) => ({
  h: clubOf(m.h), a: clubOf(m.a),
  time: (m.t || round.time || "3pm").toUpperCase(),
  day: dayOf(m.d || round.date), date: dateOf(m.d || round.date),
}));
const times = [...new Set(rows.map((r) => r.time))];
const uniformTime = times.length === 1 ? times[0] : null;

// ---- The European tie, if one falls inside the week ------------------------------------
// Read from EURO rather than CLUB_FIXTURES so the leg label, opponent country and prize come
// with it. timeTbc is honoured: an unconfirmed kick-off is printed as TBC, never as a time
// derived from the placeholder standing in for it.
const euro = (() => {
  for (const tie of D.EURO) {
    for (const leg of tie.legs || []) {
      const ms = Date.parse(leg.dt);
      if (!Number.isFinite(ms) || ms < now - D.LIVE_WINDOW_MS || ms > now + WEEK_MS) continue;
      if (leg.res) continue;                       // already played
      return {
        club: clubOf(tie.club), opp: tie.opp, oppCountry: tie.oppCountry || "",
        comp: tie.comp, roundName: tie.round, label: leg.label,
        // EURO's `date` carries a 24h time once a kick-off is confirmed ("Thu 20 Aug · 17:00"),
        // and the card renders its own from dt. Printing both gave "THU 20 AUG · 17:00 · 5PM",
        // the same fact twice in two formats — so the day is stripped back to a day.
        date: leg.date.replace(/\s*·\s*\d{1,2}[:.]\d{2}\s*$/, "").toUpperCase(),
        venue: leg.venue || "",
        time: leg.timeTbc ? null : D.londonKickoffLabel(leg.dt),
        timeTbc: Boolean(leg.timeTbc),
        prize: tie.prize || "",
      };
    }
  }
  return null;
})();

// ---- Three features, each carrying this week's real numbers ----------------------------
const table = D.currentTable();
const stage = D.tableStage();
const scorers = D.TOP_SCORERS_2627.slice(0, 3).map((p) => ({
  player: p.player, club: clubOf(p.club), goals: p.goals,
}));
const topFour = table.slice(0, 4).map((r, i) => ({
  pos: i + 1, club: clubOf(r.club), pts: r.pts,
  gd: `${r.gd > 0 ? "+" : r.gd < 0 ? "−" : ""}${Math.abs(r.gd)}`,
}));

const facts = {
  round: round.round, rows, uniformTime, euro, scorers, topFour,
  season: D.SEASON.current.display,
  stageLabel: stage ? `${stage.complete ? "AFTER " : ""}ROUND ${stage.round}` : "",
  predictorTies: D.PREDICTOR_GW.fixtures.length,
  clubCount: Object.keys(D.CLUBS).filter((k) => k !== "GLV").length,
};

console.log(`week ahead: round ${facts.round}, ${rows.length} league fixture(s)`);
if (euro) console.log(`   europe: ${euro.club.name} v ${euro.opp} — ${euro.label}, ${euro.date} ${euro.time || "TBC"}`);
else console.log("   europe: nothing inside the week");
console.log(`   scorers: ${scorers.map((s) => `${s.player} ${s.goals}`).join(", ")}`);
console.log(`   table: ${topFour.map((r) => `${r.pos} ${r.club.code} ${r.pts}`).join(", ")}`);

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
const PX=90,PW=W-180;

function kicker(p,txt){
  const k=outExpo(cl(p/0.14));
  ctx.save();ctx.globalAlpha=k*0.55;
  slam(txt,W/2,H*0.075,40,CHALK,0,600,W-220,16);ctx.restore();
}
function title(p,txt,col){
  const k=outBack(cl((p-0.03)/0.20));
  ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate(0,(1-k)*24);
  slam(txt,W/2,H*0.145,92,col||GOLD,(1-k)*14,800,W-140);ctx.restore();
}

// One fixture row: shields at the edges, names meeting a gold V. Same shape matchday.mjs uses.
function fixtureRow(y,r,k,showTime){
  if(k<=0)return;
  ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate((1-k)*30,0);
  const rowH=118;
  panel(PX,y-rowH/2,PW,rowH,26);
  shield(r.h,PX+58,y,80);
  shield(r.a,PX+PW-58,y,80);
  const mid=W/2, half=PW/2-145;
  const hs=fitFont(r.h.short.toUpperCase(),800,half,44);
  ctx.font='800 '+hs+'px "Barlow Condensed"';ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillStyle=CHALK;ctx.fillText(r.h.short.toUpperCase(),mid-38,y);
  const as=fitFont(r.a.short.toUpperCase(),800,half,44);
  ctx.font='800 '+as+'px "Barlow Condensed"';ctx.textAlign='left';
  ctx.fillText(r.a.short.toUpperCase(),mid+38,y);
  rowText('V',mid,y+1,38,GOLD,800,'center');
  if(showTime)rowText(r.time,PX+PW-112,y+36,25,'rgba(237,245,239,0.55)',600,'right');
  ctx.restore();
}

// A feature beat: what it is, one line on why, and a panel of REAL rows underneath.
function beat(p,head,sub,accent,drawPanel){
  kicker(p,'ON GIBSON');
  title(p,head,accent);
  const q=outExpo(cl((p-0.16)/0.24));
  if(q>0){ctx.save();ctx.globalAlpha=q;
    slam(sub,W/2,H*0.235,44,'rgba(237,245,239,0.8)',0,600,W-180,4);ctx.restore()}
  drawPanel(p);
}
function statRow(y,k,crestClub,left,right,rightCol){
  if(k<=0)return;
  ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate((1-k)*26,0);
  panel(PX,y-52,PW,104,24);
  if(crestClub)shield(crestClub,PX+62,y,74);
  const s=fitFont(left,800,PW-320,46);
  ctx.font='800 '+s+'px "Barlow Condensed"';ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillStyle=CHALK;ctx.fillText(left,PX+118,y);
  rowText(right,PX+PW-40,y,54,rightCol||GOLD,800,'right');
  ctx.restore();
}

const HOOK=[0,3000], EURO_T=[3000,8400], LEAGUE=[8400,14400];
const B1=[14400,18600], B2=[18600,22800], B3=[22800,27000], SIGN=[27000,30800];
const T={hook:HOOK,euro:EURO_T,league:LEAGUE,b1:B1,b2:B2,b3:B3,sign:SIGN};
const ORDER=F.euro?['hook','euro','league','b1','b2','b3','sign']:['hook','league','b1','b2','b3','sign'];
const END=T.sign[1];
const CUTS=ORDER.map(k=>T[k][0]);
const pOf=(t,k)=>(t-T[k][0])/(T[k][1]-T[k][0]);
const sceneAt=(t)=>ORDER.find(k=>t<T[k][1])||'sign';

function draw(t){
  const fr=Math.round(t/1000*${FPS});
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  let sx=0,sy=0;
  for(const c of CUTS){const d=t-c;if(d>=0&&d<150){const q=1-d/150,r=rng(fr*13+c);sx+=(r()-.5)*24*q;sy+=(r()-.5)*24*q}}
  ctx.save();ctx.translate(sx,sy);
  const SC=sceneAt(t);

  if(SC==='hook'){
    const p=pOf(t,'hook');
    const c1=F.euro?F.euro.club.colors[0]:F.rows[0].h.colors[0];
    const c2=F.rows[0].a.colors[0];
    sweep(cl(p*1.4),c1,c2);
    const k=outBack(cl((p-0.04)/0.30));
    ctx.save();ctx.globalAlpha=cl(k*1.4);
    slam(F.season,W/2,H*0.33,66,GOLD,0,600,W-260,20);
    slam('THIS WEEK',W/2,H*0.455,195,CHALK,(1-k)*22);
    ctx.restore();
    const q=cl((p-0.50)*2.4);
    if(q>0){ctx.save();ctx.globalAlpha=q;
      const bits=[];
      if(F.euro)bits.push('EUROPE');
      bits.push('ROUND '+F.round);
      slam(bits.join(' · '),W/2,H*0.575,54,GOLD,0,800,W-200,6);
      slam('AND EVERY NUMBER BEHIND IT',W/2,H*0.665,44,'rgba(237,245,239,0.8)',0,600,W-220,6);
      ctx.restore()}
  }
  else if(SC==='euro'){
    const p=pOf(t,'euro');
    // Competition only. slam() fits the font BEFORE adding letter-tracking, so a long tracked
    // kicker runs past the width it was measured against and off both edges — "CONFERENCE
    // LEAGUE · PLAY-OFF ROUND" did exactly that. The round moves down to the leg line.
    kicker(p,F.euro.comp.toUpperCase());
    const k=outBack(cl((p-0.05)/0.28));
    ctx.save();ctx.globalAlpha=cl(k*1.4);
    ctx.save();ctx.translate(W*0.28,H*0.30);ctx.scale(k,k);shield(F.euro.club,0,0,250);ctx.restore();
    slam('V',W/2,H*0.30,86,GOLD,0);
    // The opponent has no crest and no confirmed colours — a name, not an invented badge.
    slam(F.euro.opp.toUpperCase(),W*0.72,H*0.30,52,CHALK,0,800,W*0.42);
    slam(F.euro.club.name.toUpperCase(),W/2,H*0.475,110,CHALK,(1-k)*16);
    ctx.restore();
    const q=outExpo(cl((p-0.30)/0.24));
    if(q>0){ctx.save();ctx.globalAlpha=q;
      slam(F.euro.roundName.toUpperCase()+' · '+F.euro.label.toUpperCase(),W/2,H*0.585,52,GOLD,0,800,W-200,4);
      slam(F.euro.date+(F.euro.time?' · '+F.euro.time.toUpperCase():' · TIME TBC')
        +(F.euro.venue?' · '+F.euro.venue.toUpperCase():''),
        W/2,H*0.655,44,CHALK,0,600,W-170,4);
      ctx.restore()}
    const r=outExpo(cl((p-0.52)/0.26));
    if(r>0&&F.euro.prize){ctx.save();ctx.globalAlpha=r*0.85;
      // The prize sentence is long editorial prose — wrapped, not shrunk to nothing.
      const words=F.euro.prize.split(' ');const lines=[];let cur='';
      ctx.font='600 38px "Barlow Condensed"';
      for(const w of words){const test=cur?cur+' '+w:w;
        if(ctx.measureText(test).width>W-220){lines.push(cur);cur=w}else cur=test}
      if(cur)lines.push(cur);
      lines.slice(0,3).forEach((ln,i)=>rowText(ln,W/2,H*0.755+i*46,38,'rgba(237,245,239,0.75)',600,'center'));
      ctx.restore()}
  }
  else if(SC==='league'){
    const p=pOf(t,'league');
    kicker(p,'PREMIERSHIP · ROUND '+F.round);
    title(p,'THE LEAGUE');
    const n=F.rows.length;
    const top=H*0.255, bot=H*0.845, gap=(bot-top)/n;
    F.rows.forEach((r,i)=>{
      fixtureRow(top+gap*i+gap/2,r,outBack(cl((p-0.10-i*0.075)/0.32)),!F.uniformTime);
    });
    const q=outExpo(cl((p-0.70)/0.24));
    if(q>0&&F.uniformTime){ctx.save();ctx.globalAlpha=q;
      slam('EVERY ONE AT '+F.uniformTime,W/2,H*0.905,46,GOLD,0,600,W-200,8);ctx.restore()}
  }
  else if(SC==='b1'){
    const p=pOf(t,'b1');
    beat(p,'LEADING SCORERS','Who is actually scoring, updated all season',GOLD,(pp)=>{
      F.scorers.forEach((s,i)=>{
        statRow(H*0.40+i*H*0.135,outBack(cl((pp-0.22-i*0.09)/0.30)),s.club,s.player.toUpperCase(),String(s.goals),GREEN);
      });
    });
  }
  else if(SC==='b2'){
    const p=pOf(t,'b2');
    beat(p,'THE PREDICTOR','Call every score — 3 points for an exact one',SKY,(pp)=>{
      const k=outBack(cl((pp-0.22)/0.30));
      statRow(H*0.42,k,null,'ROUND '+F.round+' IS OPEN',String(F.predictorTies)+' TIES',SKY);
      statRow(H*0.555,outBack(cl((pp-0.31)/0.30)),null,'EXACT SCORE','3 PTS',GOLD);
      statRow(H*0.69,outBack(cl((pp-0.40)/0.30)),null,'RIGHT RESULT','1 PT',GOLD);
      const q=outExpo(cl((pp-0.62)/0.26));
      if(q>0){ctx.save();ctx.globalAlpha=q*0.8;
        slam('FREE · NO SIGN-UP · NO BOOKMAKERS',W/2,H*0.83,40,'rgba(237,245,239,0.7)',0,600,W-200,6);ctx.restore()}
    });
  }
  else if(SC==='b3'){
    const p=pOf(t,'b3');
    beat(p,'THE TABLE','Live, and on every club page',GOLD,(pp)=>{
      F.topFour.forEach((r,i)=>{
        statRow(H*0.375+i*H*0.125,outBack(cl((pp-0.22-i*0.07)/0.30)),r.club,
          r.pos+'  '+r.club.short.toUpperCase(),r.pts+' PTS',i===0?GOLD:CHALK);
      });
      const q=outExpo(cl((pp-0.60)/0.26));
      if(q>0){ctx.save();ctx.globalAlpha=q*0.8;
        slam(F.season+' · '+F.stageLabel,W/2,H*0.885,42,'rgba(237,245,239,0.7)',0,600,W-200,6);ctx.restore()}
    });
  }
  else{
    const lt=t-T.sign[0],dur=T.sign[1]-T.sign[0];
    const k=outBack(cl(lt/(dur*0.22)));
    ctx.save();ctx.translate(W/2,H*0.32);ctx.scale(0.6+k*0.4,0.6+k*0.4);ctx.globalAlpha=cl(k*1.5);
    cup(0,0,270);ctx.restore();
    const q=outExpo(cl((lt-dur*0.09)/(dur*0.20)));
    ctx.save();ctx.globalAlpha=q;
    slam('GIBSON',W/2,H*0.505,200,GOLD,(1-q)*20,800,W-160,10);
    slam('THE HOME OF IRISH LEAGUE STATS',W/2,H*0.583,42,CHALK,0,600,W-200,8);
    ctx.restore();
    const r=outExpo(cl((lt-dur*0.24)/(dur*0.20)));
    if(r>0){ctx.save();ctx.globalAlpha=r;
      const bw=W*0.70,bh=108,bx=(W-bw)/2,by=H*0.685;
      ctx.beginPath();ctx.roundRect(bx,by,bw,bh,54);ctx.fillStyle=GOLD;ctx.fill();
      ctx.fillStyle='#0B1512';ctx.textAlign='center';ctx.textBaseline='middle';
      const s=fitFont('GIBSONSTATS.COM',800,bw-70,56);
      ctx.font='800 '+s+'px "Barlow Condensed"';
      ctx.fillText('GIBSONSTATS.COM',W/2,by+bh/2+3);ctx.restore()}
    const u=cl((lt-dur*0.40)/(dur*0.20));
    if(u>0){ctx.save();ctx.globalAlpha=u;
      slam('ALL '+F.clubCount+' CLUBS · EVERY FIXTURE · EVERY NUMBER',W/2,H*0.815,42,CHALK,0,600,W-180,4);
      ctx.restore()}
  }

  ctx.restore();
  ctx.drawImage(scan,0,0);grain(fr,0.030);vignette();
  for(const c of CUTS){const d=t-c;if(d>=0&&d<60){ctx.fillStyle='rgba(255,255,255,'+(0.38*(1-d/60))+')';ctx.fillRect(0,0,W,H)}}
  if(t<130){ctx.fillStyle='rgba(0,0,0,'+(1-t/130)+')';ctx.fillRect(0,0,W,H)}
  if(t>END-320){ctx.fillStyle='rgba(0,0,0,'+cl((t-(END-320))/320)+')';ctx.fillRect(0,0,W,H)}
}
window.__END=END;
window.__frame=(t)=>{draw(t);return cv.toDataURL('image/jpeg',0.94)};
window.__ready=document.fonts.ready.then(()=>document.fonts.load('800 200px "Barlow Condensed"')).then(()=>document.fonts.load('600 60px "Barlow Condensed"')).then(()=>true);
</script></body></html>`;

const PW_CHROME = "/opt/pw-browsers/chromium";
const browser = await chromium.launch({
  ...(existsSync(PW_CHROME) ? { executablePath: PW_CHROME } : {}),
  args: ["--force-color-profile=srgb", "--disable-lcd-text"],
});
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
const pageErrors = [];
page.on("pageerror", (e) => { pageErrors.push(e.message); console.error("PAGE ERROR:", e.message); });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => window.__ready);

const END = await page.evaluate(() => window.__END);
const total = Math.round((END / 1000) * FPS);
console.log(`duration ${(END / 1000).toFixed(2)}s -> ${total} frames @ ${FPS}fps`);

const out = join(OUT_DIR, `gibson-week-r${round.round}.mp4`);
const ff = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "pipe:0",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", "-r", String(FPS), out], { stdio: ["pipe", "ignore", "pipe"] });
let ffErr = ""; ff.stderr.on("data", (d) => { ffErr += d.toString(); });
for (let i = 0; i < total; i++) {
  const u = await page.evaluate((tt) => window.__frame(tt), (i / FPS) * 1000);
  const buf = Buffer.from(u.slice(u.indexOf(",") + 1), "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 150 === 0) console.log(`  frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c + "\n" + ffErr.slice(-1500))))));
await browser.close();
// A frame that threw still encodes, as whatever was on the canvas before the throw. Failing
// loudly beats posting a video with a blank scene in the middle of it.
if (pageErrors.length) { console.error(`\n${pageErrors.length} page error(s) while drawing — output is not trustworthy`); process.exit(1); }
console.log("wrote", out);
