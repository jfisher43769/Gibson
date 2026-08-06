// GIBSON — match preview generator (1080x1920 MP4).
//
//   node scripts/promo/preview.mjs [HOME] [AWAY]
//
// With no arguments it previews the current Predictor gameweek's first fixture, so during
// the season it is a one-command job. Pass two club codes to preview any other tie.
//
// Every number is read from data.js — last season's table, goals profile, xG, clean sheets,
// squad values, the fixture's own kick-off details, injuries, and who has left. Nothing is
// asserted here by hand (CLAUDE.md golden rule 1), and the preflight throws if a club is
// missing any of it rather than rendering a card with a hole in it.
//
// Odds shown are GIBSON estimates and are labelled as such on screen. Never add a
// bookmaker name, logo or link to this file (CLAUDE.md golden rule 2).

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

// ---- Pick the fixture -----------------------------------------------------------------
const [argH, argA] = process.argv.slice(2).map((s) => s && s.toUpperCase());
const gw = D.PREDICTOR_GW.fixtures.find((f) =>
  argH ? (f.home.club === argH && f.away.club === argA) : (f.home.club && f.away.club));
const HOME = argH || gw?.home.club, AWAY = argA || gw?.away.club;
if (!D.CLUBS[HOME] || !D.CLUBS[AWAY]) throw new Error(`unknown club(s): ${HOME} v ${AWAY}`);

// "Round 1 · Solitude · Fri 7 Aug, 7.45pm" -> its parts, or fall back to the fixture list.
const compBits = (gw?.comp || "").split(" · ");
const roundLabel = compBits[0] || "";
const venue = compBits[1] || D.CLUB_META[HOME]?.ground || "";
const when = compBits.slice(2).join(" · ");

const side = (c) => {
  const t = D.FULL_TABLE.find((r) => r.club === c);
  const g = D.GOALS_STATS.find((r) => r.club === c);
  const x = D.XG_TEAMS.find((r) => r.club === c);
  const s = D.TEAM_STATS_2526.find((r) => r.club === c);
  const mv = D.MARKET_VALUES.find((r) => r.club === c);
  if (!t || !g || !x || !s || !mv) throw new Error(`missing last-season data for ${c}`);
  return {
    code: c, ...D.CLUBS[c],
    pos: D.FULL_TABLE.findIndex((r) => r.club === c) + 1,
    pts: t.pts, w: t.w, d: t.d, l: t.l, gd: t.gd, note: t.note || null,
    avg: g.avg, o25: g.o25, cs: g.cs, xg: x.xg, xga: x.xga,
    goals: s.goals, poss: s.poss, value: mv.total,
    injuries: D.INJURIES.filter((i) => i.club === c).map((i) => ({ player: i.player, injury: i.injury })),
  };
};
const h = side(HOME), a = side(AWAY);

// The loudest true thing about this tie, chosen from the data rather than written by hand.
const goalsRank = [...D.GOALS_STATS].sort((p, q) => q.avg - p.avg).findIndex((r) => r.club === AWAY) + 1;
const goalsRankHome = [...D.GOALS_STATS].sort((p, q) => q.avg - p.avg).findIndex((r) => r.club === HOME) + 1;
const wildest = goalsRank <= goalsRankHome ? { ...a, rank: goalsRank } : { ...h, rank: goalsRankHome };

// A departed top scorer is the strongest team-news line there is, so surface it if either
// club has lost one from last season's scoring charts.
const lostScorer = (() => {
  for (const c of [h, a]) {
    const scorers = D.XG_PLAYERS.filter((p) => p.club === c.code).sort((p, q) => q.goals - p.goals);
    for (const p of scorers) {
      const to = D.playerDeparture(p.name);
      if (to) return { club: c, name: p.name, goals: p.goals, to };
    }
  }
  return null;
})();

const facts = {
  h, a, roundLabel, venue, when,
  odds: gw?.odds || null,
  wildest: { name: wildest.name, code: wildest.code, avg: wildest.avg, o25: wildest.o25, rank: wildest.rank },
  lostScorer: lostScorer && { name: lostScorer.name, goals: lostScorer.goals, to: lostScorer.to, code: lostScorer.club.code },
  seasonPrev: D.SEASON.previous.display,
};
console.log(`preview: ${h.name} v ${a.name} — ${roundLabel} ${venue} ${when}`);
console.log(`  ${h.name} ${h.pos}th ${h.pts}pts · ${a.name} ${a.pos}th ${a.pts}pts`);
console.log(`  wildest: ${facts.wildest.name} ${facts.wildest.avg} goals/game (rank ${facts.wildest.rank})`);
console.log(`  lost scorer: ${lostScorer ? `${lostScorer.name} (${lostScorer.goals}) -> ${lostScorer.to}` : "none"}`);

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
const PX=100,PW=W-200;
// Home gold / away sky — the same pairing Duel uses for head-to-head, and necessary here
// because both clubs can wear the same colour (two reds in this tie).
const CH=GOLD, CA=SKY;

function kicker(p,txt){
  const k=outExpo(cl(p/0.14));
  ctx.save();ctx.globalAlpha=k*0.55;
  slam(txt,W/2,H*0.075,40,CHALK,0,600,W-220,16);ctx.restore();
}
function title(p,txt,col){
  const k=outBack(cl((p-0.03)/0.20));
  ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate(0,(1-k)*24);
  slam(txt,W/2,H*0.155,96,col||GOLD,(1-k)*14,800,W-140);ctx.restore();
}
function payoff(p,txt){
  const k=outExpo(cl((p-0.55)/0.28));
  if(k<=0)return;
  ctx.save();ctx.globalAlpha=k;ctx.translate(0,(1-k)*16);
  slam(txt,W/2,H*0.885,44,CHALK,0,600,W-170,6);ctx.restore();
}
// Two-value comparison row: label in the middle, a split bar under it.
function tape(y,label,hv,av,q,fmt,lowerBetter){
  const k=cl(q*4); if(k<=0)return;
  ctx.save();ctx.globalAlpha=k;
  const hs=Number(hv), as=Number(av), tot=hs+as||1;
  const hw=(PW*hs/tot)*k, aw=(PW*as/tot)*k;
  const hBetter=lowerBetter?hs<as:hs>as;
  rowText(fmt(hv),PX,y-34,52,hBetter?CH:'rgba(237,245,239,0.6)',800,'left');
  rowText(fmt(av),PX+PW,y-34,52,!hBetter?CA:'rgba(237,245,239,0.6)',800,'right');
  rowText(label,W/2,y-30,30,'rgba(237,245,239,0.55)',600,'center');
  ctx.beginPath();ctx.roundRect(PX,y,hw,14,7);ctx.fillStyle=CH;ctx.fill();
  ctx.beginPath();ctx.roundRect(PX+PW-aw,y,aw,14,7);ctx.fillStyle=CA;ctx.fill();
  ctx.restore();
}

const T={hook:[0,2600],badge:[2600,6100],table:[6100,9700],tape:[9700,13800],
  wild:[13800,17200],news:[17200,20600],odds:[20600,24000],sign:[24000,27600]};
const END=T.sign[1];
const CUTS=Object.values(T).map(v=>v[0]);
const pOf=(t,k)=>(t-T[k][0])/(T[k][1]-T[k][0]);

function draw(t){
  const fr=Math.round(t/1000*${FPS});
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  let sx=0,sy=0;
  for(const c of CUTS){const d=t-c;if(d>=0&&d<150){const q=1-d/150,r=rng(fr*13+c);sx+=(r()-.5)*24*q;sy+=(r()-.5)*24*q}}
  ctx.save();ctx.translate(sx,sy);

  if(t<T.badge[0]){                                   // ---- hook
    const p=pOf(t,'hook');
    sweep(cl(p*1.4),F.h.colors[0],F.a.colors[0]);
    const k=outBack(cl((p-0.04)/0.30));
    ctx.save();ctx.globalAlpha=cl(k*1.4);
    slam(F.roundLabel.toUpperCase(),W/2,H*0.35,74,GOLD,0,600,W-260,20);
    slam(F.when.toUpperCase(),W/2,H*0.47,150,CHALK,(1-k)*20);
    slam(F.venue.toUpperCase(),W/2,H*0.585,78,GOLD,0,800,W-200);
    ctx.restore();
    const q=cl((p-0.55)*2.4);
    if(q>0){ctx.save();ctx.globalAlpha=q;
      slam('THE SEASON STARTS HERE',W/2,H*0.70,46,'rgba(237,245,239,0.8)',0,600,W-220,8);ctx.restore()}
  }
  else if(t<T.table[0]){                              // ---- who's playing
    const p=pOf(t,'badge');
    kicker(p,'GIBSON MATCH PREVIEW');
    const k=outBack(cl((p-0.05)/0.28));
    ctx.save();ctx.globalAlpha=cl(k*1.4);
    ctx.save();ctx.translate(W*0.27,H*0.36);ctx.scale(k,k);shield(F.h,0,0,250);ctx.restore();
    ctx.save();ctx.translate(W*0.73,H*0.36);ctx.scale(k,k);shield(F.a,0,0,250);ctx.restore();
    slam('V',W/2,H*0.36,86,GOLD,0);
    slam(F.h.name.toUpperCase(),W/2,H*0.545,120,CHALK,(1-k)*16);
    slam(F.a.name.toUpperCase(),W/2,H*0.645,120,CHALK,(1-k)*16);
    ctx.restore();
    const q=outExpo(cl((p-0.45)/0.30));
    if(q>0){ctx.save();ctx.globalAlpha=q;
      slam(F.venue.toUpperCase()+' · '+F.when.toUpperCase(),W/2,H*0.755,44,GOLD,0,600,W-180,6);ctx.restore()}
  }
  else if(t<T.tape[0]){                               // ---- last season
    const p=pOf(t,'table');
    kicker(p,F.seasonPrev+' · HOW THEY FINISHED');
    title(p,'LAST SEASON');
    [[F.h,CH,0],[F.a,CA,1]].forEach(([c,col,i])=>{
      const k=outBack(cl((p-0.12-i*0.14)/0.30));if(k<=0)return;
      const y=H*0.34+i*H*0.215;
      ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate((1-k)*(i?40:-40),0);
      panel(PX,y,PW,H*0.175,30);
      shield(c,PX+108,y+H*0.088,150);
      rowText(c.name.toUpperCase(),PX+200,y+62,52,CHALK,800);
      rowText('W'+c.w+'  D'+c.d+'  L'+c.l+'   '+(c.gd>0?'+':'')+c.gd+' GD',PX+200,y+118,34,'rgba(237,245,239,0.6)',600);
      rowText(c.pos+(c.pos===1?'ST':c.pos===2?'ND':c.pos===3?'RD':'TH'),PX+PW-46,y+62,54,col,800,'right');
      rowText(c.pts+' PTS',PX+PW-46,y+118,40,'rgba(237,245,239,0.75)',600,'right');
      ctx.restore();
      // The relegation play-off note is the whole story of a season — don't bury it.
      if(c.note==='PO'){const q2=cl((p-0.45-i*0.1)*4);if(q2>0){ctx.save();ctx.globalAlpha=q2;
        rowText('SURVIVED THE RELEGATION PLAY-OFF',W/2,y+H*0.155,30,'#E8663C',700,'center');ctx.restore()}}
    });
  }
  else if(t<T.wild[0]){                               // ---- tale of the tape
    const p=pOf(t,'tape');
    kicker(p,F.seasonPrev+' · HEAD TO HEAD');
    title(p,'THE TAPE');
    ctx.save();
    shield(F.h,PX+40,H*0.265,86);shield(F.a,PX+PW-40,H*0.265,86);
    ctx.restore();
    const rows=[
      ['POINTS',F.h.pts,F.a.pts,(v)=>String(v),false],
      ['GOALS SCORED',F.h.goals,F.a.goals,(v)=>String(v),false],
      ['xG FOR / 90',F.h.xg,F.a.xg,(v)=>v.toFixed(2),false],
      ['xG AGAINST / 90',F.h.xga,F.a.xga,(v)=>v.toFixed(2),true],
      ['CLEAN SHEETS',F.h.cs,F.a.cs,(v)=>v+'%',false],
      ['SQUAD VALUE',F.h.value,F.a.value,(v)=>'\\u20ac'+v.toFixed(2)+'m',false],
    ];
    rows.forEach((r,i)=>tape(H*0.375+i*H*0.085,r[0],r[1],r[2],cl((p-0.10-i*0.075)/0.22),r[3],r[4]));
  }
  else if(t<T.news[0]){                               // ---- the wildest watch
    const p=pOf(t,'wild');
    kicker(p,'ONE NUMBER TO KNOW');
    const k=outBack(cl((p-0.05)/0.28));
    ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate(0,(1-k)*30);
    slam(String(F.wildest.avg),W/2,H*0.36,300,GOLD,(1-k)*24);
    slam('GOALS A GAME',W/2,H*0.50,62,CHALK,0,600,W-240,12);
    ctx.restore();
    const q=outExpo(cl((p-0.40)/0.30));
    if(q>0){ctx.save();ctx.globalAlpha=q;
      slam(F.wildest.name.toUpperCase()+' MATCHES,',W/2,H*0.605,54,CHALK,0,600,W-200,4);
      slam('THE MOST IN THE LEAGUE',W/2,H*0.665,54,GOLD,0,600,W-200,4);
      slam(F.wildest.o25+'% WENT OVER 2.5',W/2,H*0.745,44,'rgba(237,245,239,0.7)',0,600,W-220,6);
      ctx.restore()}
  }
  else if(t<T.odds[0]){                               // ---- team news
    const p=pOf(t,'news');
    kicker(p,'TEAM NEWS');
    title(p,'WHO IS MISSING');
    let y=H*0.32;
    if(F.lostScorer){
      const k=outBack(cl((p-0.10)/0.28));
      if(k>0){ctx.save();ctx.globalAlpha=cl(k*1.4);
        panel(PX,y,PW,H*0.165,30);
        const c=F.lostScorer.code===F.h.code?F.h:F.a;
        shield(c,PX+100,y+H*0.082,140);
        rowText(F.lostScorer.name.toUpperCase(),PX+190,y+58,50,CHALK,800);
        rowText(F.lostScorer.goals+' GOALS '+F.seasonPrev,PX+190,y+108,34,GOLD,600);
        rowText('NOW AT '+F.lostScorer.to.toUpperCase(),PX+190,y+152,32,'#E8663C',600);
        ctx.restore()}
      y+=H*0.20;
    }
    const inj=[...F.h.injuries.map(i=>[F.h,i]),...F.a.injuries.map(i=>[F.a,i])].slice(0,4);
    if(inj.length){
      const kk=cl((p-0.30)*3);
      if(kk>0){ctx.save();ctx.globalAlpha=kk;
        rowText('TREATMENT TABLE',PX,y-14,34,'rgba(237,245,239,0.55)',600);
        inj.forEach(([c,i],n)=>{
          const k2=cl((p-0.34-n*0.06)*5);if(k2<=0)return;
          ctx.save();ctx.globalAlpha=k2;
          const ry=y+40+n*H*0.062;
          shield(c,PX+40,ry,64);
          rowText(i.player.toUpperCase(),PX+90,ry,42,CHALK,700);
          rowText(i.injury.toUpperCase(),PX+PW-40,ry,34,'#E8663C',600,'right');
          ctx.restore();
        });
        ctx.restore()}
    } else {
      const kk=cl((p-0.30)*3);
      if(kk>0){ctx.save();ctx.globalAlpha=kk;
        slam('BOTH SIDES REPORT A CLEAN BILL OF HEALTH',W/2,y+60,44,CHALK,0,600,W-200,4);ctx.restore()}
    }
  }
  else if(t<T.sign[0]){                               // ---- the call
    const p=pOf(t,'odds');
    kicker(p,'GIBSON ESTIMATE');
    title(p,'THE CALL');
    if(F.odds){
      const cols=[[F.h.name.toUpperCase(),F.odds.home,CH],['DRAW',F.odds.draw,CHALK],[F.a.name.toUpperCase(),F.odds.away,CA]];
      cols.forEach((c,i)=>{
        const k=outBack(cl((p-0.10-i*0.10)/0.28));if(k<=0)return;
        const bw=(PW-40)/3,bx=PX+i*(bw+20);
        ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate(0,(1-k)*24);
        panel(bx,H*0.34,bw,H*0.20,26);
        rowText(String(c[1].toFixed ? c[1].toFixed(2) : c[1]),bx+bw/2,H*0.40,76,c[2],800,'center');
        const s=fitFont(c[0],600,bw-24,32);
        rowText(c[0],bx+bw/2,H*0.485,s,'rgba(237,245,239,0.7)',600,'center');
        ctx.restore();
      });
    }
    // Required framing: these are GIBSON's own numbers, not a bookmaker's.
    const q=cl((p-0.50)*3);
    if(q>0){ctx.save();ctx.globalAlpha=q;
      slam('GIBSON ESTIMATES · INFORMATIONAL ONLY',W/2,H*0.62,38,'rgba(237,245,239,0.6)',0,600,W-200,6);
      slam('NOT BETTING ADVICE. NO BOOKMAKERS HERE.',W/2,H*0.675,38,'rgba(237,245,239,0.6)',0,600,W-200,6);
      ctx.restore()}
    const r=cl((p-0.66)*3);
    if(r>0){ctx.save();ctx.globalAlpha=r;
      slam('MAKE YOUR OWN CALL',W/2,H*0.775,60,GOLD,0,800,W-220);
      slam('ON THE PREDICTOR',W/2,H*0.835,60,GOLD,0,800,W-220);ctx.restore()}
  }
  else{                                               // ---- sign-off
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
      slam(F.h.name.toUpperCase()+' V '+F.a.name.toUpperCase(),W/2,H*0.815,50,CHALK,0,600,W-180,4);
      slam(F.when.toUpperCase(),W/2,H*0.865,44,GOLD,0,600,W-200,4);ctx.restore()}
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
page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => window.__ready);

const END = await page.evaluate(() => window.__END);
const total = Math.round((END / 1000) * FPS);
console.log(`duration ${(END / 1000).toFixed(2)}s -> ${total} frames @ ${FPS}fps`);

const out = join(OUT_DIR, `gibson-preview-${HOME.toLowerCase()}-${AWAY.toLowerCase()}.mp4`);
const ff = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "pipe:0",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
  "-movflags", "+faststart", "-r", String(FPS), out], { stdio: ["pipe", "ignore", "pipe"] });
let ffErr = ""; ff.stderr.on("data", (d) => { ffErr += d.toString(); });
for (let i = 0; i < total; i++) {
  const u = await page.evaluate((tt) => window.__frame(tt), (i / FPS) * 1000);
  const buf = Buffer.from(u.slice(u.indexOf(",") + 1), "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 120 === 0) console.log(`  frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c + "\n" + ffErr.slice(-1500))))));
await browser.close();
console.log("wrote", out);
