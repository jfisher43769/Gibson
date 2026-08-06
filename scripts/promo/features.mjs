// GIBSON — feature-tour promo generator (1080x1920 MP4).
//
// Same deterministic canvas-per-frame approach as render.mjs, sharing kit.js. Every
// feature card is drawn from real data.js content, so the mock UI on screen shows the
// app's actual numbers rather than placeholder text (CLAUDE.md golden rule 1).
//
// Claims made on screen, and where each is evidenced:
//   Live table ............ api/table.js (TheSportsDB, idLeague 4659 validated)
//   Predictor 3pts ........ data.js PREDICTOR_GW header comment
//   GIBSON Index .......... data.js PLAYERS[].rating, StatsTab "GIBSON Index"
//   Duel .................. src/tabs/StatsTab.jsx DuelView
//   Stats Lab ............. XG_TEAMS / GOALS_STATS / DISCIPLINE
//   Club pages ............ src/club/ClubPage.jsx, CLUB_META, TRAVEL
//   Euro Watch ............ data.js EURO, EURO_COEFFICIENT
//   Transfer tracker ...... data.js TRANSFERS + WINDOW
//   Calendar / offline .... public/calendar/*.ics, public/sw.js, manifest.webmanifest
//   No bookmakers/affiliate scripts/verify.js enforces both across all shipped source
//   Free .................. routes.js predictor description, Ko-fi support model

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

// Both extras are deliberately NOT in package.json: ffmpeg-static is an ~80MB binary and
// neither is needed to build or test the site, so keeping them out means CI installs stay
// small. Fetch them on demand — see scripts/promo/README.md.
for (const [path, pkg] of [[FFMPEG, "ffmpeg-static"], [FONT_DIR, "@fontsource/barlow-condensed"]]) {
  if (!existsSync(path)) {
    console.error(`Missing ${pkg}. Run:\n  npm install --no-save ffmpeg-static @fontsource/barlow-condensed`);
    process.exit(1);
  }
}
mkdirSync(OUT_DIR, { recursive: true });

const D = await import(`file://${REPO}/data.js`);
const clubOf = (c) => ({ code: c, ...D.CLUBS[c] });

// ---- Real content for each card -------------------------------------------------------
const topTable = D.FULL_TABLE.slice(0, 3).map((r) => ({ ...clubOf(r.club), pts: r.pts, p: r.p, gd: r.gd }));

// PLAYERS holds last season's ratings, so it still contains players who have since left the
// league — correct for a 25/26 stats table, wrong for a promo, which reads as "here is who
// you'll be watching". Anyone with a departure in TRANSFERS whose destination is outside the
// league (or retirement) is dropped, derived rather than a hand-kept blocklist so it stays
// right as the window moves. Multi-player entries ("A, B & C") are split on the same
// separators the transfer feed uses.
const splitPlayers = (s) => s.split(/,| & | and /i).map((x) => x.trim()).filter(Boolean);
const departed = new Set(
  D.TRANSFERS.filter((t) => t.status === "departure" && t.toExternal)
    .flatMap((t) => splitPlayers(t.player))
    .map((n) => n.toLowerCase()),
);
const stillHere = D.PLAYERS.filter((p) => !departed.has(p.name.toLowerCase()));
if (!stillHere.length) throw new Error("every rated player reads as departed — check the departure filter");
console.log(`rated players: ${D.PLAYERS.length} total, ${D.PLAYERS.length - stillHere.length} left the league (${
  D.PLAYERS.filter((p) => departed.has(p.name.toLowerCase())).map((p) => p.name).join(", ") || "none"})`);
const rated = [...stillHere].sort((a, b) => b.rating - a.rating);
// clubOf() carries the CLUB's name, so it must be spread FIRST and the player's own name
// applied after — the other order silently relabels every player with their club.
const indexTop = rated.slice(0, 3).map((p) => ({ ...clubOf(p.club), name: p.name, rating: p.rating, goals: p.goals }));
const duel = rated.slice(0, 2).map((p) => ({ ...clubOf(p.club), name: p.name, rating: p.rating, goals: p.goals, assists: p.assists, xg: p.xg }));
const xgTop = D.XG_TEAMS.slice(0, 4).map((t) => ({ ...clubOf(t.club), xg: t.xg }));
const pf = D.PREDICTOR_GW.fixtures[0];
const euro = D.EURO.find((e) => e.legs && e.legs.length) || D.EURO[0];
// The window's marquee moves, picked by TRANSFERS id rather than "most recent" — the
// newest entries are usually fringe deals, and a showcase should lead with the stories the
// owner actually wrote up. Falls back to recent done deals if any id is ever removed.
// Ids whose from/to are both real clubs. Some curated entries use the "from" field for a
// headline instead ("Triple swoop", "Window roundup"), which renders as a club that does
// not exist, so those are deliberately not used here.
const HEADLINE_IDS = [1, 5, 15]; // O'Hara to the champions; Nolan champions->Linfield; Ballymena's five from Linfield
const done = D.TRANSFERS.filter((t) => t.status === "done");
const picked = HEADLINE_IDS.map((id) => done.find((t) => t.id === id)).filter(Boolean);
const transfers = [...picked, ...done.filter((t) => !picked.includes(t))].slice(0, 3).map((t) => ({
  player: t.player, to: t.to ? D.CLUBS[t.to].name : "", toCode: t.to || null,
  from: t.from ? D.CLUBS[t.from].name : (t.fromExternal || ""),
}));
const clubCard = (() => {
  const code = "GLE", m = D.CLUB_META[code], tv = D.TRAVEL.clubs[code];
  return { ...clubOf(code), ground: m.ground, capacity: m.capacity, founded: m.founded, miles: tv.totalMiles };
})();

const facts = {
  clubCount: [...new Set(D.FIXTURES_2627.flatMap((r) => r.matches.flatMap((m) => [m.h, m.a])))].length,
  seasonDisplay: D.SEASON.current.display,
  startDisplay: D.seasonStartDisplay(),
  topTable, indexTop, duel, xgTop, transfers, clubCard,
  predictor: { h: clubOf(pf.home.club), a: clubOf(pf.away.club) },
  euro: { club: clubOf(euro.club), comp: euro.comp, opp: euro.opp, country: euro.oppCountry },
  coefRank: D.EURO_COEFFICIENT.rank,
  travelAvg: D.TRAVEL.leagueAverageMiles,
};
for (const [k, v] of Object.entries(facts)) {
  if (v === undefined || v === null || (Array.isArray(v) && !v.length)) throw new Error(`missing fact: ${k}`);
}
console.log("cards built from real data:", Object.keys(facts).join(", "));

const kit = readFileSync(join(HERE, "kit.js"), "utf8");
const font800 = readFileSync(join(FONT_DIR, "barlow-condensed-latin-800-normal.woff2")).toString("base64");
const font600 = readFileSync(join(FONT_DIR, "barlow-condensed-latin-600-normal.woff2")).toString("base64");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Barlow Condensed";font-weight:800;src:url(data:font/woff2;base64,${font800}) format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:600;src:url(data:font/woff2;base64,${font600}) format("woff2")}
html,body{margin:0;background:#000}canvas{display:block}
</style></head><body><canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W},H=${H};
const cv=document.getElementById('c'),ctx=cv.getContext('2d',{alpha:false});
${kit}
const F=${JSON.stringify(facts)};

// ---- Card chrome ----------------------------------------------------------------------
// Every feature card shares this frame: kicker, title, live panel, one-line payoff.
function cardFrame(k,title,sub,accent,p){
  const kk=outExpo(cl(p/0.16));
  ctx.save();ctx.globalAlpha=kk;
  slam('GIBSON',W/2,H*0.075,40,'rgba(237,245,239,0.45)',0,600,W-300,16);
  ctx.restore();
  const t1=outBack(cl((p-0.03)/0.20));
  ctx.save();ctx.globalAlpha=cl(t1*1.4);ctx.translate(0,(1-t1)*26);
  slam(title,W/2,H*0.155,104,accent,(1-t1)*14,800,W-140);
  ctx.restore();
  const t2=outExpo(cl((p-0.55)/0.28));
  if(t2>0){ctx.save();ctx.globalAlpha=t2;ctx.translate(0,(1-t2)*18);
    slam(sub,W/2,H*0.885,46,CHALK,0,600,W-170,6);ctx.restore()}
}
// Panel that scales in under the title
function stage(p,draw){
  const k=outBack(cl((p-0.10)/0.30));
  if(k<=0)return;
  ctx.save();ctx.globalAlpha=cl(k*1.5);
  ctx.translate(W/2,H*0.50);ctx.scale(0.86+k*0.14,0.86+k*0.14);ctx.translate(-W/2,-H*0.50);
  draw(cl((p-0.16)/0.5));
  ctx.restore();
}
const PX=100,PW=W-200; // panel gutter

// ---- The nine feature visuals ---------------------------------------------------------
function vLiveTable(q){
  panel(PX,H*0.29,PW,H*0.33,34);
  ctx.save();ctx.globalAlpha=cl(q*3);
  ctx.beginPath();ctx.arc(PX+52,H*0.335,10,0,7);ctx.fillStyle=GREEN;ctx.fill();
  rowText('LIVE',PX+76,H*0.335,34,GREEN,800);
  ctx.restore();
  F.topTable.forEach((r,i)=>{
    const a=cl((q-i*0.14)*4);if(a<=0)return;
    const y=H*0.405+i*H*0.088;
    ctx.save();ctx.globalAlpha=a;
    rowText(String(i+1),PX+50,y,44,'rgba(237,245,239,0.55)',800);
    shield(r,PX+118,y,74);
    rowText(r.name.toUpperCase(),PX+172,y-14,44,CHALK,700);
    rowText('P'+r.p+' · '+(r.gd>0?'+':'')+r.gd+' GD',PX+172,y+24,32,'rgba(237,245,239,0.6)',600);
    rowText(String(r.pts),PX+PW-52,y,60,GOLD,800,'right');
    ctx.restore();
  });
}
function vPredictor(q){
  panel(PX,H*0.30,PW,H*0.38,34);
  const {h,a}=F.predictor;
  ctx.save();ctx.globalAlpha=cl(q*3);
  shield(h,PX+130,H*0.40,96);shield(a,PX+PW-130,H*0.40,96);
  rowText(h.name.toUpperCase(),PX+130,H*0.472,34,CHALK,700,'center');
  rowText(a.name.toUpperCase(),PX+PW-130,H*0.472,34,CHALK,700,'center');
  ctx.restore();
  // two score boxes filling in
  [0,1].forEach(i=>{
    const a2=cl((q-0.25-i*0.16)*5);if(a2<=0)return;
    const bw=124,bh=124,bx=W/2+(i?26:-26-bw),by=H*0.535;
    ctx.save();ctx.globalAlpha=a2;
    panel(bx,by,bw,bh,26,'rgba(255,182,39,0.16)');
    rowText(i?'1':'2',bx+bw/2,by+bh/2+4,86,GOLD,800,'center');
    ctx.restore();
  });
  const a3=cl((q-0.62)*5);
  if(a3>0){ctx.save();ctx.globalAlpha=a3;
    rowText('3 PTS · EXACT SCORE',W/2,H*0.645,38,GREEN,800,'center');ctx.restore()}
}
function vIndex(q){
  panel(PX,H*0.30,PW,H*0.315,34);
  F.indexTop.forEach((p,i)=>{
    const a=cl((q-i*0.15)*4);if(a<=0)return;
    const y=H*0.365+i*H*0.098;
    ctx.save();ctx.globalAlpha=a;
    shield(p,PX+96,y,78);
    rowText(p.name.toUpperCase(),PX+152,y-18,42,CHALK,700);
    const bw=(PW-320)*cl((p.rating/10)*a);
    panel(PX+152,y+16,PW-320,16,8,'rgba(240,255,245,0.07)');
    ctx.beginPath();ctx.roundRect(PX+152,y+16,bw,16,8);ctx.fillStyle=GOLD;ctx.fill();
    rowText(p.rating.toFixed(1),PX+PW-52,y,56,GOLD,800,'right');
    ctx.restore();
  });
}
function vDuel(q){
  const [x,y2]=F.duel;
  // 80px channel down the middle so the VS badge sits in open space, not on top of the
  // right-hand panel's first stat row.
  const pw=PW/2-40;
  [[x,PX,0],[y2,W/2+40,1]].forEach(([p,px,i])=>{
    const a=cl((q-i*0.18)*4);if(a<=0)return;
    ctx.save();ctx.globalAlpha=a;
    panel(px,H*0.30,pw,H*0.31,30);
    shield(p,px+pw/2,H*0.365,104);
    rowText(p.name.toUpperCase(),px+pw/2,H*0.435,36,CHALK,700,'center');
    [['RATING',p.rating.toFixed(1)],['GOALS',String(p.goals)],['xG',p.xg.toFixed(1)]].forEach((r,j)=>{
      const ry=H*0.487+j*H*0.056;
      rowText(r[0],px+26,ry,30,'rgba(237,245,239,0.55)',600);
      rowText(r[1],px+pw-26,ry,44,GOLD,800,'right');
    });
    ctx.restore();
  });
  const a3=cl((q-0.5)*5);
  if(a3>0){ctx.save();ctx.globalAlpha=a3;
    ctx.beginPath();ctx.arc(W/2,H*0.49,36,0,7);ctx.fillStyle=BG;ctx.fill();
    ctx.lineWidth=3;ctx.strokeStyle=GOLD;ctx.stroke();
    rowText('VS',W/2,H*0.49+3,34,GOLD,800,'center');ctx.restore()}
}
function vLab(q){
  panel(PX,H*0.30,PW,H*0.38,34);
  ctx.save();ctx.globalAlpha=cl(q*3);
  rowText('EXPECTED GOALS · PER 90',PX+48,H*0.345,32,'rgba(237,245,239,0.55)',600);
  ctx.restore();
  const max=Math.max(...F.xgTop.map(t=>t.xg));
  F.xgTop.forEach((t,i)=>{
    const a=cl((q-i*0.11)*4);if(a<=0)return;
    const y=H*0.405+i*H*0.070;
    ctx.save();ctx.globalAlpha=a;
    shield(t,PX+78,y,58);
    rowText(t.code,PX+118,y,34,CHALK,700);
    const full=PW-330,bw=full*(t.xg/max)*a;
    panel(PX+186,y-16,full,32,16,'rgba(240,255,245,0.07)');
    ctx.beginPath();ctx.roundRect(PX+186,y-16,bw,32,16);
    ctx.fillStyle=i===0?GOLD:'rgba(255,182,39,0.55)';ctx.fill();
    rowText(t.xg.toFixed(2),PX+PW-46,y,40,CHALK,800,'right');
    ctx.restore();
  });
}
function vClub(q){
  const c=F.clubCard;
  panel(PX,H*0.30,PW,H*0.38,34);
  ctx.save();ctx.globalAlpha=cl(q*3);
  shield(c,PX+110,H*0.375,110);
  rowText(c.name.toUpperCase(),PX+186,H*0.362,54,CHALK,800);
  rowText(c.ground.toUpperCase(),PX+186,H*0.405,32,'rgba(237,245,239,0.6)',600);
  ctx.restore();
  [['FOUNDED',String(c.founded)],['CAPACITY',c.capacity.toLocaleString('en-GB')],
   ['SEASON TRAVEL',c.miles+' MI']].forEach((r,i)=>{
    const a=cl((q-0.25-i*0.13)*5);if(a<=0)return;
    const y=H*0.478+i*H*0.062;
    ctx.save();ctx.globalAlpha=a;
    rowText(r[0],PX+48,y,32,'rgba(237,245,239,0.55)',600);
    rowText(r[1],PX+PW-48,y,44,GOLD,800,'right');
    ctx.restore();
  });
}
function vEuro(q){
  const e=F.euro;
  panel(PX,H*0.31,PW,H*0.30,34);
  ctx.save();ctx.globalAlpha=cl(q*3);
  rowText(e.comp.toUpperCase(),W/2,H*0.365,38,SKY,800,'center');
  shield(e.club,PX+130,H*0.455,110);
  rowText('V',W/2,H*0.455,44,GOLD,800,'center');
  ctx.restore();
  const a2=cl((q-0.3)*4);
  if(a2>0){ctx.save();ctx.globalAlpha=a2;
    rowText(e.opp.toUpperCase(),PX+PW-130,H*0.442,40,CHALK,700,'center');
    rowText(e.country.toUpperCase(),PX+PW-130,H*0.482,30,'rgba(237,245,239,0.55)',600,'center');
    ctx.restore()}
  const a3=cl((q-0.55)*4);
  if(a3>0){ctx.save();ctx.globalAlpha=a3;
    rowText('UEFA COUNTRY RANK',PX+48,H*0.565,32,'rgba(237,245,239,0.55)',600);
    rowText('#'+F.coefRank,PX+PW-48,H*0.565,46,GOLD,800,'right');ctx.restore()}
}
function vTransfers(q){
  panel(PX,H*0.30,PW,H*0.32,34);
  F.transfers.forEach((t,i)=>{
    const a=cl((q-i*0.15)*4);if(a<=0)return;
    const y=H*0.365+i*H*0.095;
    ctx.save();ctx.globalAlpha=a;
    ctx.beginPath();ctx.roundRect(PX+44,y-16,90,32,16);ctx.fillStyle='rgba(61,220,132,0.18)';ctx.fill();
    rowText('DONE',PX+89,y,26,GREEN,800,'center');
    // Headline moves can name several players at once, so both lines are fitted rather
    // than fixed — otherwise "Allen, Archer, Whiteside, McKee & Walsh" runs off the card.
    const nm=t.player.toUpperCase(),mv=(t.from+' → '+t.to).toUpperCase();
    rowText(nm,PX+156,y-16,fitFont(nm,700,PW-212,40),CHALK,700);
    rowText(mv,PX+156,y+20,fitFont(mv,600,PW-212,30),'rgba(237,245,239,0.6)',600);
    ctx.restore();
  });
}
function vPhone(q){
  // A phone showing the app, plus the two things that make it feel native.
  const pw=330,ph=620,px=W/2-pw/2,py=H*0.30;
  ctx.save();ctx.globalAlpha=cl(q*3);
  panel(px,py,pw,ph,44,'rgba(240,255,245,0.05)');
  cup(W/2,py+150,120);
  rowText('GIBSON',W/2,py+250,54,GOLD,800,'center');
  [0,1,2].forEach(i=>{panel(px+30,py+300+i*68,pw-60,52,16,'rgba(240,255,245,0.06)')});
  ctx.restore();
  [['INSTALLS LIKE AN APP',0],['WORKS OFFLINE',1],['FIXTURES → YOUR CALENDAR',2]].forEach(([t,i])=>{
    const a=cl((q-0.3-i*0.13)*5);if(a<=0)return;
    ctx.save();ctx.globalAlpha=a;
    rowText('✓  '+t,W/2,H*0.70+i*54,40,i===2?GOLD:CHALK,700,'center');
    ctx.restore();
  });
}

const CARDS=[
  ['LIVE TABLE','The table, straight from the league feed',GOLD,vLiveTable],
  ['THE PREDICTOR','Call every score — 3 points for an exact one',GOLD,vPredictor],
  ['GIBSON INDEX','Our own rating for every rated player',GOLD,vIndex],
  ['DUEL','Put any two players head to head',SKY,vDuel],
  ['STATS LAB','xG, clean sheets, discipline, the lot',SKY,vLab],
  ['CLUB PAGES','All '+F.clubCount+' clubs — even the miles they travel',GOLD,vClub],
  ['EURO WATCH','Every Irish League tie in Europe',SKY,vEuro],
  ['TRANSFERS','The full window, club by club',GREEN,vTransfers],
  ['ON YOUR PHONE','No app store, no sign-up, no cost',GOLD,vPhone],
];

// ---- Timeline -------------------------------------------------------------------------
// Pacing: cards hold long enough to actually read the panel before the cut. The per-card
// animation is all expressed as a fraction of CARD, so raising it slows the motion too
// rather than leaving quick moves sitting on a longer hold.
const INTRO=2850, CARD=2040, CARDS_T=INTRO+CARD*CARDS.length;
const PLEDGE=3800, OUTRO=4300;
const T_PLEDGE=CARDS_T, T_OUTRO=CARDS_T+PLEDGE, END=T_OUTRO+OUTRO;
const CUTS=[0,INTRO,...CARDS.map((_,i)=>INTRO+i*CARD),T_PLEDGE,T_OUTRO];

function draw(t){
  const fr=Math.round(t/1000*${FPS});
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  let sx=0,sy=0;
  for(const c of CUTS){const d=t-c;if(d>=0&&d<150){const q=1-d/150,r=rng(fr*13+c);sx+=(r()-.5)*26*q;sy+=(r()-.5)*26*q}}
  ctx.save();ctx.translate(sx,sy);

  if(t<INTRO){
    const k=outBack(seg(t,90,760));
    ctx.save();ctx.translate(W/2,H*0.36);ctx.scale(0.55+k*0.45,0.55+k*0.45);ctx.globalAlpha=cl(k*1.5);
    cup(0,0,250);ctx.restore();
    const q=outExpo(seg(t,380,1000));
    ctx.save();ctx.globalAlpha=q;
    slam(F.clubCount+' CLUBS',W/2,H*0.545,180,CHALK,(1-q)*22);
    slam('ONE APP',W/2,H*0.655,180,GOLD,(1-q)*22);
    ctx.restore();
    const r=seg(t,1050,1600);
    if(r>0){ctx.save();ctx.globalAlpha=r;
      slam('HERE IS WHAT IS INSIDE',W/2,H*0.775,44,'rgba(237,245,239,0.75)',0,600,W-220,8);ctx.restore()}
  }
  else if(t<CARDS_T){
    const i=Math.min(CARDS.length-1,Math.floor((t-INTRO)/CARD));
    const p=(t-(INTRO+i*CARD))/CARD;
    const [title,sub,accent,vis]=CARDS[i];
    if(p<0.16)sweep(cl(p/0.16*1.5),accent,'rgba(11,21,18,0.9)');
    cardFrame(i,title,sub,accent,p);
    stage(p,vis);
    // progress ticks so the reel reads as a list, not random cards
    const tw=(W-260)/CARDS.length;
    CARDS.forEach((_,j)=>{
      ctx.beginPath();ctx.roundRect(130+j*tw+3,H*0.945,tw-6,6,3);
      ctx.fillStyle=j<i?'rgba(255,182,39,0.5)':j===i?GOLD:'rgba(237,245,239,0.13)';ctx.fill();
    });
  }
  else if(t<T_OUTRO){
    const lt=t-T_PLEDGE;
    slam('AND WHAT IS NOT',W/2,H*0.20,58,'rgba(237,245,239,0.6)',0,600,W-260,14);
    [['NO BOOKMAKERS',0],['NO AFFILIATE LINKS',1],['NO SIGN-UP',2],['ALWAYS FREE',3]].forEach(([txt,i])=>{
      const k=outBack(cl((lt-PLEDGE*0.07-i*PLEDGE*0.092)/(PLEDGE*0.185)));if(k<=0)return;
      const y=H*0.36+i*H*0.125;
      ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate((1-k)*-30,0);
      const isLast=i===3;
      slam(txt,W/2,y,isLast?120:96,isLast?GOLD:CHALK,(1-k)*14,800,W-150);
      ctx.restore();
    });
  }
  else{
    const lt=t-T_OUTRO;
    const k=outBack(cl(lt/(OUTRO*0.22)));
    ctx.save();ctx.translate(W/2,H*0.34);ctx.scale(0.6+k*0.4,0.6+k*0.4);ctx.globalAlpha=cl(k*1.5);
    cup(0,0,300);ctx.restore();
    const q=outExpo(cl((lt-OUTRO*0.094)/(OUTRO*0.188)));
    ctx.save();ctx.globalAlpha=q;
    slam('GIBSON',W/2,H*0.535,215,GOLD,(1-q)*22,800,W-160,10);
    slam('THE HOME OF IRISH LEAGUE STATS',W/2,H*0.615,44,CHALK,0,600,W-200,8);
    ctx.restore();
    const r=outExpo(cl((lt-OUTRO*0.238)/(OUTRO*0.194)));
    if(r>0){ctx.save();ctx.globalAlpha=r;
      const bw=W*0.70,bh=112,bx=(W-bw)/2,by=H*0.715;
      ctx.beginPath();ctx.roundRect(bx,by,bw,bh,56);ctx.fillStyle=GOLD;ctx.fill();
      ctx.fillStyle='#0B1512';ctx.textAlign='center';ctx.textBaseline='middle';
      const s=fitFont('GIBSONSTATS.COM',800,bw-70,58);
      ctx.font='800 '+s+'px "Barlow Condensed"';
      ctx.fillText('GIBSONSTATS.COM',W/2,by+bh/2+3);ctx.restore()}
    const u=cl((lt-OUTRO*0.359)/(OUTRO*0.188));
    if(u>0){ctx.save();ctx.globalAlpha=u;
      slam(F.seasonDisplay+' STARTS '+F.startDisplay.toUpperCase(),W/2,H*0.845,52,CHALK,0,600,W-200,6);ctx.restore()}
  }

  ctx.restore();
  ctx.drawImage(scan,0,0);grain(fr,0.030);vignette();
  for(const c of CUTS){const d=t-c;if(d>=0&&d<60){ctx.fillStyle='rgba(255,255,255,'+(0.4*(1-d/60))+')';ctx.fillRect(0,0,W,H)}}
  if(t<130){ctx.fillStyle='rgba(0,0,0,'+(1-t/130)+')';ctx.fillRect(0,0,W,H)}
  if(t>END-320){ctx.fillStyle='rgba(0,0,0,'+cl((t-(END-320))/320)+')';ctx.fillRect(0,0,W,H)}
}
window.__END=END;
window.__frame=(t)=>{draw(t);return cv.toDataURL('image/jpeg',0.94)};
window.__ready=document.fonts.ready.then(()=>document.fonts.load('800 200px "Barlow Condensed"')).then(()=>document.fonts.load('600 60px "Barlow Condensed"')).then(()=>true);
</script></body></html>`;

// Some images ship a Chromium build older than the one playwright expects; prefer it when
// present rather than downloading a second browser, and fall back to playwright's own.
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

const out = join(OUT_DIR, "gibson-features.mp4");
const ff = spawn(FFMPEG, [
  "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "pipe:0",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(FPS), out,
], { stdio: ["pipe", "ignore", "pipe"] });
let ffErr = ""; ff.stderr.on("data", (d) => { ffErr += d.toString(); });

for (let i = 0; i < total; i++) {
  const dataUrl = await page.evaluate((tt) => window.__frame(tt), (i / FPS) * 1000);
  const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 90 === 0) console.log(`  frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c + "\n" + ffErr.slice(-2000))))));
await browser.close();
console.log("wrote", out);
