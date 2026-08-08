// GIBSON — European tie card (1080x1350 JPEG).
//
//   node scripts/promo/euro.mjs LAR
//   node scripts/promo/euro.mjs LAR --photo=/path/to/ground.jpg
//
// The other match cards read FIXTURES_2627, which is the league and only the league — point
// status.mjs at a club in Europe and it draws that club's next *domestic* fixture instead,
// against a different opponent, on a different date. European ties live in EURO, with an
// opponent who has no crest, no club colours in CLUBS, and a country. So they get their own
// card.
//
// Everything is looked up: competition, round, opponent, country, both legs, venue, kick-off
// and what the winner goes on to. The one thing that has to be derived rather than read is
// the state of the tie, and that comes from the previous leg's recorded result — never from
// a scoreline typed on the command line, because a card that gets the aggregate wrong is
// worse than no card.

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
const die = (m) => { console.error(`\n${m}\n\nUsage: node scripts/promo/euro.mjs <CLUB> [--photo=...]\n`); process.exit(1); };

const club = String(argv.filter((a) => !a.startsWith("--"))[0] || "").toUpperCase();
if (!club) die("Which club? e.g. node scripts/promo/euro.mjs LAR");
if (!D.CLUBS[club]) die(`Unknown club "${club}".`);

const tie = D.EURO.find((e) => e.club === club);
if (!tie) die(`${D.CLUBS[club].name} has no European tie in EURO.`);

// The leg nearest to now, the same rule every other card here uses. Not "the next unplayed
// leg" — after full time the card you want is still about the match that has just been on.
const NOW = Number(process.env.NOW_MS) || Date.now();
const legs = tie.legs.filter((l) => l.dt).sort((a, b) => Date.parse(a.dt) - Date.parse(b.dt));
if (!legs.length) die(`${tie.opp} tie has no leg with a date on it.`);
let leg = legs[0];
for (const l of legs) {
  if (Math.abs(Date.parse(l.dt) - NOW) < Math.abs(Date.parse(leg.dt) - NOW)) leg = l;
}

// State of the tie, from the recorded result of the leg before this one. CLUB_FIXTURES is
// where results live; the two are matched on kick-off, which verify.js already guarantees
// lines up. `res` is written home-first with a W/D/L from this club's point of view, so the
// letter — not the scoreline — is what says who is ahead.
const fixtures = D.CLUB_FIXTURES[club] || [];
const earlier = legs.filter((l) => Date.parse(l.dt) < Date.parse(leg.dt));
let standing = null;
if (earlier.length) {
  const prev = earlier[earlier.length - 1];
  const row = fixtures.find((f) => f.dt === prev.dt);
  const m = row && /^(\d+)\s*[-–]\s*(\d+)\s*([WDL])$/.exec(String(row.res || "").trim());
  if (m) {
    const score = `${m[1]}–${m[2]}`;
    const where = String(prev.venue || "").trim();
    standing = m[3] === "D"
      ? { line: `LEVEL AT ${score}`, sub: where ? `after the first leg at ${where}` : "after the first leg" }
      : {
          line: `${(m[3] === "W" ? D.CLUBS[club].name : tie.opp).toUpperCase()} LEAD ${score}`,
          sub: where ? `from the first leg at ${where}` : "from the first leg",
        };
  }
}
if (!standing && earlier.length) {
  // A leg was played and we cannot read its result. Say nothing rather than imply it is level.
  console.warn(`  ! previous leg on ${earlier[earlier.length - 1].dt} has no readable result — omitting the tie state`);
}

// Kick-off in Belfast wall time, from the same helper the app prints with, so the card and
// the fixture list can't disagree about what time to be in front of the telly.
const kickoff = D.londonKickoffLabel ? D.londonKickoffLabel(new Date(leg.dt)) : "";

const photoPath = flag("photo");
if (photoPath && !existsSync(photoPath)) die(`No such photo: ${photoPath}`);
const photoData = photoPath
  ? `data:image/${photoPath.toLowerCase().endsWith(".png") ? "png" : "jpeg"};base64,${readFileSync(photoPath).toString("base64")}`
  : "";

// "2nd leg · away" -> "SECOND LEG". The away/home half is already said by the venue.
const legName = /2nd/i.test(leg.label) ? "SECOND LEG" : /1st/i.test(leg.label) ? "FIRST LEG" : String(leg.label).toUpperCase();

const facts = {
  comp: `${tie.comp} · ${tie.round}`.toUpperCase(),
  legName,
  home: { code: club, ...D.CLUBS[club] },
  opp: { name: tie.opp, country: tie.oppCountry || "", color: tie.oppColor || "#8FA69B" },
  // Which way round to draw them: the club is at home only when this leg says so.
  clubAtHome: /home/i.test(leg.label),
  awayLabel: /home/i.test(leg.label) ? "HOME LEG" : "AWAY LEG",
  standing,
  date: String(leg.date || "").replace(/\s*·.*$/, "").toUpperCase(),
  kickoff: String(kickoff || "").toUpperCase(),
  venue: String(leg.venue || "").toUpperCase(),
  prize: String(tie.prize || ""),
  hasPhoto: Boolean(photoData),
};

console.log(`${facts.comp} — ${facts.legName}`);
console.log(`  ${D.CLUBS[club].name} v ${tie.opp} (${tie.oppCountry})`);
console.log(`  ${facts.date} ${facts.kickoff} · ${facts.venue || "venue TBC"}`);
console.log(`  ${standing ? standing.line + " " + standing.sub : "no tie state (first leg)"}`);

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
function wrap(s,size,weight,maxW){
  const words=s.split(' '); const lines=[]; let line='';
  for(const w of words){
    const test=line?line+' '+w:w;
    if(measure(test,size,weight,0)>maxW && line){ lines.push(line); line=w; }
    else line=test;
  }
  if(line) lines.push(line);
  return lines;
}

// Full bleed, not a band. The first version ran the ground as a strip across the top at 38%
// opacity and faded it to black by halfway — a dramatic empty stadium under storm clouds
// reduced to background texture. Let the photograph be the photograph, and put the type on
// a gradient that only gets heavy where the words actually are.
function ground(){
  ctx.fillStyle='#060C0A'; ctx.fillRect(0,0,W,H);
  // No photo: the card still has to look deliberate. Left flat, two thirds of it was an empty
  // black rectangle that read as a missing image rather than a dark poster.
  if(!IMG){
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#0A1611'); g.addColorStop(0.5,'#0B1815'); g.addColorStop(1,'#060C0A');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    const glow=ctx.createRadialGradient(W*0.5,Y(420),10,W*0.5,Y(420),W*0.95);
    glow.addColorStop(0,'rgba(255,182,39,0.16)'); glow.addColorStop(1,'rgba(255,182,39,0)');
    ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
    // The competition, set enormous and nearly invisible, so the empty half is textured
    // rather than blank — and it is the one thing on the card that can't be wrong.
    const gs=fit(F.legName,800,W*1.25,300*S,0);
    T(F.legName,W/2,Y(430),{size:gs,weight:800,align:'center',color:'rgba(237,245,239,0.05)'});
    vignette();
    return;
  }
  // Cropped to a BAND, not to the card. The distinction is the whole thing: filling
  // 1080x1350 means taking a 4:5 slice out of a 16:9 ground shot, which loses 55% of the
  // width — the entire sweep of the main stand — and still upscales what survives by 2.4x.
  // Cropping the same photo to 1080x690 loses about 12% and upscales 1.24x. It bleeds off
  // the top and both edges, and the type sits below it on solid ground.
  const bottom=Y(690);
  if(IMG){
    const iw=IMG.naturalWidth, ih=IMG.naturalHeight, need=W/bottom;
    let sw=iw, sh=iw/need;
    if(sh>ih){ sh=ih; sw=ih*need; }
    // Biased above centre: the stand roof and the sky carry this frame, and the near
    // touchline is the least interesting part of any empty-ground shot.
    ctx.drawImage(IMG,(iw-sw)/2,(ih-sh)*0.34,sw,sh,0,0,W,bottom);
  }
  // Melt the photo's lower edge into the card rather than cutting it off square, then hold
  // solid underneath so the type block sits on real ground.
  const fade=ctx.createLinearGradient(0,bottom*0.55,0,bottom);
  fade.addColorStop(0,'rgba(6,12,10,0)');
  fade.addColorStop(0.62,'rgba(6,12,10,0.55)');
  fade.addColorStop(1,'#060C0A');
  ctx.fillStyle=fade; ctx.fillRect(0,bottom*0.55,W,bottom-bottom*0.55+2);
  ctx.fillStyle='#060C0A'; ctx.fillRect(0,bottom,W,H-bottom);
  // A light scrim at the very top so the wordmark holds against a bright sky.
  const top=ctx.createLinearGradient(0,0,0,Y(190));
  top.addColorStop(0,'rgba(6,12,10,0.66)'); top.addColorStop(1,'rgba(6,12,10,0)');
  ctx.fillStyle=top; ctx.fillRect(0,0,W,Y(190));
  vignette();
}

// One line of the fixture: a small muted "v" that sits on the same baseline as a very large
// name. Mixed sizes on one line rather than a "V" floating on its own row — that row was
// pure spacer, and it collided with the name below it.
function fixtureLine(x,y,prefix,name,size){
  let cx=x;
  if(prefix){
    const ps=size*0.30;
    T(prefix,cx,y,{size:ps,weight:800,color:GOLD,track:2*S});
    cx+=measure(prefix,ps,800,2*S)+size*0.16;
  }
  T(name.toUpperCase(),cx,y,{size,weight:800,track:1*S,shadow:true});
}

function draw(){
  ground();

  T('GIBSON',M,Y(84),{size:26*S,weight:800,color:GOLD,track:8*S,shadow:true});
  T(F.awayLabel,W-M,Y(84),{size:23*S,weight:600,align:'right',color:'rgba(237,245,239,0.75)',track:6*S,shadow:true});

  // One left axis for everything. Centring eight elements down a column gave them all equal
  // weight and no reading order; a hard left edge with a big scale jump between levels gives
  // the eye somewhere to start and somewhere to go.
  const AX=M;

  // Kicker: a short gold rule, then the competition. Small and tracked, so the names below
  // land about four times its size — that jump is the hierarchy.
  ctx.fillStyle=GOLD; ctx.fillRect(AX,Y(742),74*S,5*S);
  const kicker=F.comp+' · '+F.legName;
  const ks=fit(kicker,600,W-M*2,23*S,7*S);
  T(kicker,AX,Y(792),{size:ks,weight:600,color:'rgba(237,245,239,0.88)',track:7*S,shadow:true});

  // The two clubs, in the order they'd be written in a scoreline — home side first.
  const first=F.clubAtHome ? F.home.name : F.opp.name;
  const second=F.clubAtHome ? F.opp.name : F.home.name;
  // Sized off whichever name is longer so both lines share one scale. Sizing them
  // independently makes the shorter club look like the bigger deal.
  const room=W-M*2;
  const size=Math.min(
    fit(first.toUpperCase(),800,room,116*S,1*S),
    fit('V '+second.toUpperCase(),800,room,116*S,1*S),
  );
  fixtureLine(AX,Y(900),'',first,size);
  fixtureLine(AX,Y(900)+size*0.94,'V',second,size);

  // The state of the tie, as a line of type rather than a boxed UI component — the gold panel
  // read as an app widget dropped onto a poster. Only drawn when a previous leg gave us one.
  let y=Y(900)+size*0.94;
  if(F.standing){
    y+=68*S;
    const ss=fit(F.standing.line,800,room,40*S,3*S);
    const lw=T(F.standing.line,AX,y,{size:ss,weight:800,color:GOLD,track:3*S,shadow:true});
    T(F.standing.sub,AX+lw+14*S,y,{size:24*S,weight:600,color:'rgba(237,245,239,0.62)'});
  }

  // When and where, on one line. Two lines of small centred type was three separate things
  // fighting for the same job.
  const when=[F.date,F.kickoff,F.venue].filter(Boolean).join('  ·  ');
  const ws=fit(when,800,room,30*S,3*S);
  T(when,AX,y+62*S,{size:ws,weight:800,color:CHALK,track:3*S,shadow:true});

  // What the winner gets. One line, quiet — context, not headline.
  if(F.prize){
    const ps=fit(F.prize,600,room,21*S,0);
    T(F.prize,AX,y+102*S,{size:ps,weight:600,color:'rgba(237,245,239,0.45)'});
  }

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1222),W-M*2,2*S);
  cup(M+26*S,Y(1278),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1294),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1294),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

  grain(9,0.016);
  vignette();
}
window.__render=()=>{draw();return cv.toDataURL('image/jpeg',0.94)};
window.__ready=Promise.all([
  document.fonts.ready.then(()=>Promise.all([
    document.fonts.load('800 200px "Barlow Condensed"'),
    document.fonts.load('600 60px "Barlow Condensed"'),
  ])),
  new Promise((res,rej)=>{
    if(!PHOTO_SRC) return res(null);
    const im=new Image();
    im.onload=()=>{IMG=im;res(im);};
    im.onerror=()=>rej(new Error('photo failed to decode'));
    im.src=PHOTO_SRC;
  }),
]).then(()=>true);
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
const slug = `${club}-${String(tie.opp).toLowerCase().replace(/\W+/g, "-").replace(/^-|-$/g, "")}-${legName.toLowerCase().replace(/\W+/g, "")}`;
const out = join(OUT_DIR, `gibson-euro-${slug}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
