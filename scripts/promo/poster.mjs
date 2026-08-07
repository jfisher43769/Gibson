// GIBSON — season poster (portrait PNG + JPEG).
//
//   node scripts/promo/poster.mjs            # 2000x2800
//   POSTER_W=2480 POSTER_H=3508 node scripts/promo/poster.mjs   # A4 at 300dpi
//
// A GIBSON-native answer to the league's launch photograph, which we can't use: the plinth
// under the trophy carries two bookmaker logos and they sit directly beneath the cup, so no
// crop removes them (CLAUDE.md golden rule 2). This is drawn from our own marks and data.js.
//
// Design notes, because the first version got this wrong: it is an editorial poster, not a
// diagram. Flush-left type block, a hairline rule system, one accent colour, and the twelve
// set as a ranked list — the thing GIBSON actually is. The cup appears once as a large ghost
// behind the headline and once small in the footer lockup, because it is an icon and icons
// do not survive being blown up to fill a poster.

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

// FULL_TABLE is last season's final table in finishing order — note it is NOT sorted by
// points, because the league splits in two after 33 rounds: Carrick finished 7th on 53
// points, below Dungannon's 6th on 46. So the array index is the finishing position and
// re-sorting it here would be wrong.
const current = [...new Set(D.FIXTURES_2627.flatMap((r) => r.matches.flatMap((m) => [m.h, m.a])))];
const finished = new Map(D.FULL_TABLE.map((r, i) => [r.club, i + 1]).filter(([c]) => current.includes(c)));

// A club absent from last season's table can only have come up, so it gets "NEW" rather than
// a made-up finishing position. Numbering Limavady 12th would be inventing a statistic.
const ranked = [...current].sort((a, b) => (finished.get(a) || 99) - (finished.get(b) || 99));

const WORDS = { 10: "TEN", 11: "ELEVEN", 12: "TWELVE", 13: "THIRTEEN", 14: "FOURTEEN", 16: "SIXTEEN" };
if (!WORDS[current.length]) throw new Error(`no headline word for ${current.length} clubs`);

// FIXTURES_2627 only holds the 33 rounds before the split — the post-split fixtures can't
// exist until the split is decided in March. So the season is longer than that file: after
// round 33 the league halves and each six plays five more rounds (POST_SPLIT_DATES), which
// is why every club plays 38 and not 33. Printing 33 on a poster would be wrong to anyone
// who follows this league. Both totals are derived, and the preflight below fails the render
// if the shape that makes the arithmetic true ever changes.
const perRound = new Set(D.FIXTURES_2627.map((r) => r.matches.length));
if (perRound.size !== 1 || [...perRound][0] !== current.length / 2) {
  throw new Error(`expected every round to be ${current.length / 2} matches, saw ${[...perRound].join("/")}`);
}
if (!D.POST_SPLIT_DATES?.length) throw new Error("POST_SPLIT_DATES is empty — cannot derive the season length");
const rounds = D.FIXTURES_2627.length + D.POST_SPLIT_DATES.length;
const matches = rounds * (current.length / 2);
const facts = {
  clubs: ranked.map((c) => ({ code: c, pos: finished.get(c) || null, ...D.CLUBS[c] })),
  champion: D.FULL_TABLE[0].club,
  clubWord: WORDS[current.length],
  season: D.SEASON.current.display,
  prevSeason: D.SEASON.previous.display,
  start: D.seasonStartDisplay(),
  rounds,
  matches,
};
for (const c of facts.clubs) if (!c.name || !c.ground || !c.colors) throw new Error(`club ${c.code} is missing name/ground/colors`);
console.log(`poster ${W}x${H} — ${facts.clubs.length} clubs, champions ${facts.champion}, ${matches} matches`);

const kit = readFileSync(join(HERE, "kit.js"), "utf8");
const f800 = readFileSync(join(FONT_DIR, "barlow-condensed-latin-800-normal.woff2")).toString("base64");
const f600 = readFileSync(join(FONT_DIR, "barlow-condensed-latin-600-normal.woff2")).toString("base64");
const f400 = readFileSync(join(FONT_DIR, "barlow-condensed-latin-400-normal.woff2")).toString("base64");

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Barlow Condensed";font-weight:800;src:url(data:font/woff2;base64,${f800}) format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:600;src:url(data:font/woff2;base64,${f600}) format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:400;src:url(data:font/woff2;base64,${f400}) format("woff2")}
html,body{margin:0;background:#000}canvas{display:block}
</style></head><body><canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W},H=${H};
const cv=document.getElementById('c'),ctx=cv.getContext('2d',{alpha:false});
${kit}
const F=${JSON.stringify(facts)};

// Authored at 2000x2800. S scales anything measured in width, Y maps a design-space y.
const S=W/2000, Y=v=>v*(H/2800);
const M=150*S, IW=W-M*2;
const INK='#EDF5EF', MUTE='rgba(237,245,239,0.44)', DIM='rgba(237,245,239,0.52)', FAINT='rgba(237,245,239,0.13)';

// ---- type -------------------------------------------------------------------------------
// Deliberately not kit.js's slam(): that carries a mandatory drop shadow, which is right for
// type sitting over a moving colour sweep and wrong for a still poster. Clean type here.
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
  ctx.fillStyle=o.color||INK;
  let px=o.align==='right'?x-w:o.align==='center'?x-w/2:x;
  for(const c of [...s]){ ctx.fillText(c,px,y); px+=ctx.measureText(c).width+track; }
  return w;
}
// Largest size at or below 'start' that keeps the string inside maxW.
function fit(s,weight,maxW,start,track){
  let size=start;
  while(size>8 && measure(s,size,weight,track||0)>maxW) size-=Math.max(1,size*0.02);
  return size;
}
function rule(x1,x2,y,color,thick){
  ctx.fillStyle=color||FAINT; ctx.fillRect(x1,y,x2-x1,thick||2*S);
}

// ---- ground -----------------------------------------------------------------------------
// Near-black, faintly green. The first version put a drawn pitch behind everything; mown
// stripes at poster scale are just noise, and they muddied every colour on top of them.
function ground(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#08110E'); g.addColorStop(0.52,'#0B1815'); g.addColorStop(1,'#060C0A');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const warm=ctx.createRadialGradient(W*0.72,Y(760),10,W*0.72,Y(760),W*0.85);
  warm.addColorStop(0,'rgba(255,182,39,0.13)'); warm.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=warm; ctx.fillRect(0,0,W,H);
}

// The cup as a ghost: flat gold at low alpha, oversized and bleeding off the right edge, so
// it reads as a watermark rather than as the clipart it becomes at full contrast.
function ghostCup(cx,cy,size,alpha){
  const sc=size/200;
  ctx.save(); ctx.globalAlpha=alpha;
  ctx.translate(cx-size/2,cy-size/2); ctx.scale(sc,sc);
  ctx.fillStyle=GOLD;
  CUP.forEach(p=>ctx.fill(p));
  ctx.fillRect(92,114,16,15); ctx.fillRect(70,132,60,10); ctx.fillRect(57,145,86,10); ctx.fillRect(43,158,114,10);
  ctx.restore();
}

// A club's colours as a chip: primary over secondary. Two flat bars carry a kit better at
// this size than a 40px shield does, and they make no claim to be anybody's crest.
function chip(club,x,y,w,h){
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x,y,w,h,4*S); ctx.clip();
  ctx.fillStyle=club.colors[0]; ctx.fillRect(x,y,w,h);
  ctx.fillStyle=club.colors[1]; ctx.fillRect(x,y+h*0.62,w,h*0.38);
  ctx.restore();
  ctx.beginPath(); ctx.roundRect(x,y,w,h,4*S);
  ctx.lineWidth=1.5*S; ctx.strokeStyle='rgba(237,245,239,0.22)'; ctx.stroke();
}

// ---- one row of the ranked list ---------------------------------------------------------
function clubRow(club,x,y,colW,rowH){
  const isChamp=club.code===F.champion;
  const mid=y+rowH/2;
  if(isChamp){
    const g=ctx.createLinearGradient(x-20*S,0,x+colW,0);
    g.addColorStop(0,'rgba(255,182,39,0.11)'); g.addColorStop(1,'rgba(255,182,39,0)');
    ctx.fillStyle=g; ctx.fillRect(x-20*S,y,colW+20*S,rowH);
  }
  // Position, right-aligned so 1 and 12 share a spine.
  const numX=x+56*S;
  if(club.pos!=null) T(String(club.pos),numX,mid,{size:46*S,weight:800,align:'right',baseline:'middle',color:isChamp?GOLD:'rgba(237,245,239,0.55)'});
  else T('NEW',numX,mid,{size:26*S,weight:800,align:'right',baseline:'middle',color:GOLD,track:1.5*S});

  chip(club,x+82*S,mid-34*S,16*S,68*S);

  const nameX=x+124*S;
  const nameSize=fit(club.name.toUpperCase(),800,colW*0.62,58*S,0);
  let cursor=nameX+T(club.name.toUpperCase(),nameX,mid,{size:nameSize,weight:800,baseline:'middle',color:isChamp?GOLD:INK});
  if(isChamp) cursor+=26*S+T('CHAMPIONS',cursor+26*S,mid-2*S,{size:24*S,weight:800,baseline:'middle',color:GOLD,track:4*S});

  // Ground flush right, shrunk to whatever the name left behind so nothing ever collides.
  const room=(x+colW)-cursor-36*S;
  if(room>60*S){
    const gs=fit(club.ground.toUpperCase(),600,room,30*S,3*S);
    T(club.ground.toUpperCase(),x+colW,mid,{size:gs,weight:600,align:'right',baseline:'middle',color:DIM,track:3*S});
  }
  rule(x,x+colW,y+rowH-2*S);
}

function draw(){
  ground();
  // Whole cup, not a crop of one: bled off the edge it showed only its stepped base, which
  // read as three unexplained bars behind the headline.
  ghostCup(W*0.74,Y(645),1320*S,0.07);

  // ---- masthead ----
  T('GIBSON',M,Y(168),{size:52*S,weight:800,color:GOLD,track:10*S});
  T('THE IRISH LEAGUE',W-M,Y(168),{size:32*S,weight:600,align:'right',color:MUTE,track:9*S});
  rule(M,W-M,Y(205),'rgba(237,245,239,0.22)',3*S);

  // ---- eyebrow ----
  T('SEASON '+F.season,M,Y(292),{size:36*S,weight:600,color:INK,track:10*S});
  T('FIRST WHISTLE · '+F.start.toUpperCase(),W-M,Y(292),{size:36*S,weight:600,align:'right',color:GOLD,track:10*S});

  // ---- headline: one size, flush left, ragged right ----
  const lines=[F.clubWord,'CLUBS.','ONE CUP.'];
  let hs=440*S;
  for(const l of lines) hs=Math.min(hs,fit(l,800,IW,hs,0));
  const lead=hs*0.78;
  let by=Y(380)+hs*0.715;
  lines.forEach((l,i)=>{
    T(l,M,by,{size:hs,weight:800,color:i===2?GOLD:INK});
    by+=lead;
  });

  // ---- the season in four numbers ----
  const stripY=Y(1495);
  rule(M,W-M,stripY,'rgba(237,245,239,0.22)',3*S);
  const cells=[[String(F.clubs.length),'CLUBS'],[String(F.rounds),'ROUNDS'],[String(F.matches),'MATCHES'],['1','CUP']];
  const cw=IW/cells.length;
  cells.forEach(([n,lbl],i)=>{
    const cx=M+cw*i;
    if(i){ ctx.fillStyle=FAINT; ctx.fillRect(cx-1*S,stripY+22*S,2*S,Y(118)); }
    T(n,cx+30*S,stripY+Y(132),{size:124*S,weight:800,color:GOLD});
    T(lbl,cx+30*S,stripY+Y(178),{size:32*S,weight:600,color:MUTE,track:8*S});
  });
  rule(M,W-M,Y(1700),'rgba(237,245,239,0.22)',3*S);

  // ---- the twelve ----
  T('THE '+F.clubWord,M,Y(1772),{size:38*S,weight:800,color:INK,track:8*S});
  T(F.prevSeason+' FINISH · HOME GROUND',W-M,Y(1772),{size:28*S,weight:600,align:'right',color:MUTE,track:7*S});

  const gutter=90*S, colW=(IW-gutter)/2, rowH=Y(110), top=Y(1820);
  const per=Math.ceil(F.clubs.length/2);
  F.clubs.forEach((c,i)=>{
    const col=i<per?0:1, idx=i<per?i:i-per;
    clubRow(c,M+col*(colW+gutter),top+idx*rowH,colW,rowH);
  });

  // ---- footer ----
  rule(M,W-M,Y(2545),'rgba(255,182,39,0.45)',3*S);
  cup(M+38*S,Y(2632),78*S);
  T('GIBSONSTATS.COM',M+92*S,Y(2652),{size:62*S,weight:800,color:GOLD,track:3*S});
  T('THE HOME OF IRISH LEAGUE STATS',W-M,Y(2652),{size:30*S,weight:600,align:'right',color:MUTE,track:7*S});

  grain(11,0.016);
  vignette();
}

window.__render=()=>{draw();return [cv.toDataURL('image/png'),cv.toDataURL('image/jpeg',0.94)]};
window.__ready=document.fonts.ready
  .then(()=>Promise.all([document.fonts.load('800 200px "Barlow Condensed"'),document.fonts.load('600 60px "Barlow Condensed"'),document.fonts.load('400 40px "Barlow Condensed"')]))
  .then(()=>true);
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
