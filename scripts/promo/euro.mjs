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

// The ground runs across the top as a band, same as status.mjs and for the same reason: the
// source is around 1000px wide and covering the full 1350 would mean upscaling past 2x.
const BAND=Y(560);
function ground(){
  ctx.fillStyle='#080F0C'; ctx.fillRect(0,0,W,H);
  if(IMG){
    const need=W/BAND, iw=IMG.naturalWidth, ih=IMG.naturalHeight;
    let sw=iw, sh=iw/need;
    if(sh>ih){ sh=ih; sw=ih*need; }
    ctx.drawImage(IMG,(iw-sw)/2,(ih-sh)*0.40,sw,sh,0,0,W,BAND);
    ctx.fillStyle='rgba(8,15,12,0.38)'; ctx.fillRect(0,0,W,BAND);
    const fade=ctx.createLinearGradient(0,BAND*0.40,0,BAND);
    fade.addColorStop(0,'rgba(8,15,12,0)'); fade.addColorStop(0.70,'rgba(8,15,12,0.88)'); fade.addColorStop(1,'#080F0C');
    ctx.fillStyle=fade; ctx.fillRect(0,0,W,BAND);
    const top=ctx.createLinearGradient(0,0,0,Y(230));
    top.addColorStop(0,'rgba(8,15,12,0.80)'); top.addColorStop(1,'rgba(8,15,12,0)');
    ctx.fillStyle=top; ctx.fillRect(0,0,W,Y(230));
  }
  const glow=ctx.createRadialGradient(W*0.5,Y(880),10,W*0.5,Y(880),W*0.85);
  glow.addColorStop(0,'rgba(255,182,39,0.13)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
}

// Names, stacked, no badges. GIBSON has Larne's real crest but nothing for FC Iberia, and a
// real crest beside a disc invented for the occasion looks like the invented one is a crest
// too. Set the names big instead and let a rule in each side's colour carry the identity —
// full width each, so they read at a glance in a feed.
function side(y,name,country,color){
  const s=fit(name.toUpperCase(),800,W-M*2-40*S,74*S,2*S);
  T(name.toUpperCase(),W/2,y,{size:s,weight:800,align:'center',track:2*S,shadow:true});
  ctx.fillStyle=color; ctx.fillRect(W/2-46*S,y+16*S,92*S,6*S);
  let next=y+16*S+6*S;
  if(country){
    T(country.toUpperCase(),W/2,next+34*S,{size:23*S,weight:600,align:'center',color:MUTE,track:6*S});
    next+=34*S;
  }
  return next;
}

function draw(){
  ground();

  // Top right says which side of the tie this is for the club, NOT the venue — the venue is
  // printed under the date where it belongs, and having it twice on one card just read as a
  // mistake.
  T('GIBSON',M,Y(88),{size:26*S,weight:800,color:GOLD,track:8*S,shadow:true});
  T(F.awayLabel,W-M,Y(88),{size:24*S,weight:600,align:'right',color:'rgba(237,245,239,0.8)',track:6*S,shadow:true});

  const cs=fit(F.comp,600,W-M*2,26*S,6*S);
  T(F.comp,W/2,Y(300),{size:cs,weight:600,align:'center',color:'rgba(237,245,239,0.85)',track:6*S,shadow:true});
  const ls=fit(F.legName,800,W-M*2,124*S,4*S);
  T(F.legName,W/2,Y(410),{size:ls,weight:800,align:'center',color:GOLD,track:4*S,shadow:true});

  // The two sides, in the order they'd be written in a scoreline — home first.
  const first=F.clubAtHome
    ? { name:F.home.name, country:'', color:F.home.colors[0] }
    : { name:F.opp.name, country:F.opp.country, color:F.opp.color };
  const second=F.clubAtHome
    ? { name:F.opp.name, country:F.opp.country, color:F.opp.color }
    : { name:F.home.name, country:'', color:F.home.colors[0] };
  // Everything below the headline flows from the block above it rather than sitting at fixed
  // heights. The country line exists on one side only, so fixed positions leave a hole on a
  // home leg — and the first attempt at this had the V landing on top of the second name.
  let y=Y(586);
  y=side(y,first.name,first.country,first.color);
  T('V',W/2,y+50*S,{size:40*S,weight:800,align:'center',color:MUTE,track:4*S});
  y=side(y+132*S,second.name,second.country,second.color);

  // The state of the tie, only when a previous leg gave us one to state.
  if(F.standing){
    const bx=M, by=y+44*S, bw=W-M*2, bh=Y(112);
    ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,18*S);
    ctx.fillStyle='rgba(255,182,39,0.09)'; ctx.fill();
    ctx.lineWidth=2*S; ctx.strokeStyle='rgba(255,182,39,0.35)'; ctx.stroke();
    const ss=fit(F.standing.line,800,bw-56*S,46*S,3*S);
    T(F.standing.line,W/2,by+bh*0.46,{size:ss,weight:800,align:'center',color:GOLD,track:3*S});
    T(F.standing.sub,W/2,by+bh*0.80,{size:24*S,weight:600,align:'center',color:MUTE});
    y=by+bh;
  }

  // When and where.
  const wy=y+66*S;
  const when=[F.date,F.kickoff].filter(Boolean).join(' · ');
  const ws=fit(when,800,W-M*2,60*S,4*S);
  T(when,W/2,wy,{size:ws,weight:800,align:'center',track:4*S});
  if(F.venue) T(F.venue,W/2,wy+38*S,{size:25*S,weight:600,align:'center',color:MUTE,track:4*S});

  // What the winner gets. Muted, because it is context, not the headline.
  if(F.prize){
    const py=wy+92*S;
    const lines=wrap(F.prize,22*S,600,W-M*2).slice(0,2);
    lines.forEach((ln,i)=>T(ln,W/2,py+i*28*S,{size:22*S,weight:600,align:'center',color:'rgba(237,245,239,0.42)'}));
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
