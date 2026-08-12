// GIBSON — postponement card (1080x1350 JPEG).
//
//   node scripts/promo/postponed.mjs
//   node scripts/promo/postponed.mjs --club=LAR
//
// The "don't turn up" card. Reads every fixture in FIXTURES_2627 carrying `pp` — postponed
// with no replacement date — and states which games are off, when they were due, and why.
//
// Nothing is typed: the clubs, the round, the date the match WOULD have been played and the
// reason all come from the fixture row. A card that says the wrong game is off is worse than
// no card, because someone drives to Inver Park on the strength of it.

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
const only = (flag("club") || "").toUpperCase();

// The date the match was DUE — its own `d` if it had one, otherwise the round's. `pp` means the
// kick-off no longer resolves, which is the whole point, so it is read off the row directly
// rather than through fixtureKickoffMs().
const rows = [];
for (const r of D.FIXTURES_2627) {
  for (const m of r.matches) {
    if (!D.fixturePostponed(m)) continue;
    if (only && m.h !== only && m.a !== only) continue;
    const h = D.CLUBS[m.h], a = D.CLUBS[m.a];
    if (!h || !a) continue;
    rows.push({
      home: { code: m.h, name: h.name, colors: h.colors, pattern: h.pattern },
      away: { code: m.a, name: a.name, colors: a.colors, pattern: a.pattern },
      round: r.round,
      was: String(m.d || r.date || "").toUpperCase(),
      venue: String(D.CLUB_META?.[m.h]?.ground || h.ground || "").toUpperCase(),
      why: String(m.pp || "").toUpperCase(),
    });
  }
}

if (!rows.length) {
  console.log(only ? `No postponed fixtures for ${only}.` : "No postponed fixtures — nothing to draw.");
  process.exit(0);
}

// When every postponement shares one reason, it belongs in the header rather than repeated
// down the card. Six rows all saying "Larne in Europe" is the same fact printed six times.
const reasons = [...new Set(rows.map((r) => r.why).filter(Boolean))];
const oneReason = reasons.length === 1 ? reasons[0] : "";

// The club common to every postponement — Larne here, since both games are off because of
// them. Only meaningful when there is exactly one.
const commonClub = (() => {
  // Asked for one club explicitly? That is the club, even when a single postponement leaves
  // two candidates and the intersection below cannot choose between them.
  if (only && D.CLUBS[only]) return only;
  let set = null;
  for (const r of rows) {
    const pair = new Set([r.home.code, r.away.code]);
    set = set === null ? pair : new Set([...set].filter((c) => pair.has(c)));
  }
  return set && set.size === 1 ? [...set][0] : null;
})();

// The question the card provokes and could not answer: "so when ARE they playing?" The new
// dates are genuinely unknown, but that club's next league game is not — it is sitting in
// FIXTURES_2627, and it is the most useful thing that can honestly go on this card. Derived
// the same way the Home board picks its next match: earliest kick-off still to come, skipping
// anything postponed.
const NOW = Number(process.env.NOW_MS) || Date.now();
const nextUp = (() => {
  if (!commonClub) return null;
  let best = null;
  for (const r of D.FIXTURES_2627) {
    for (const m of r.matches) {
      if (m.h !== commonClub && m.a !== commonClub) continue;
      if (D.fixturePostponed(m) || Array.isArray(m.result)) continue;
      const ms = D.fixtureKickoffMs(r, m);
      if (ms === null || ms < NOW) continue;
      if (!best || ms < best.ms) {
        const opp = m.h === commonClub ? m.a : m.h;
        best = {
          ms,
          label: `${D.CLUBS[opp]?.name || opp} (${m.h === commonClub ? "H" : "A"})`,
          when: `${m.d || r.date}${m.t || r.time ? ` · ${m.t || r.time}` : ""}`,
        };
      }
    }
  }
  return best;
})();

const facts = {
  headline: rows.length === 1 ? "POSTPONED" : "FIXTURES POSTPONED",
  oneReason,
  // Stated, not implied: nobody should have to guess whether a new date exists yet.
  note: "NEW DATES TO BE CONFIRMED",
  nextUp: nextUp
    ? { label: `NEXT UP FOR ${D.CLUBS[commonClub]?.name || commonClub}`.toUpperCase(),
        value: `${nextUp.label} · ${nextUp.when}`.toUpperCase() }
    : null,
  rows: rows.map((r) => ({ ...r, why: oneReason ? "" : r.why })),
};

console.log(facts.headline + (oneReason ? ` — ${oneReason}` : ""));
if (facts.nextUp) console.log(`  ${facts.nextUp.label}: ${facts.nextUp.value}`);
for (const r of rows) console.log(`  R${r.round}  ${r.home.name} v ${r.away.name}  (was ${r.was}, ${r.venue})`);

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
const OFF='#E8663C';

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

function backdrop(){
  // The app's own ground, not a brown wash. The previous version graded to #160C0A and laid
  // 3.5%-alpha stripes over it, which did not read as hazard banding — it read as a dirty
  // JPEG, and put orange type on brown at about 3:1.
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0E1A15'); g.addColorStop(0.5,'#0B1512'); g.addColorStop(1,'#070D0B');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(W*0.5,Y(210),10,W*0.5,Y(210),W*0.85);
  glow.addColorStop(0,'rgba(232,102,60,0.20)'); glow.addColorStop(1,'rgba(232,102,60,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
  vignette();
}

// One postponed match, as a PANEL rather than a floating row. The panel is what groups a
// crest to the name beside it and the old date underneath — before, the crests sat 320px out
// at the card edges and read as decoration rather than as identification.
function matchPanel(r,y,h,nameSize){
  const x=M, w=W-M*2, CR=Math.min(74*S,h*0.42);
  panel(x,y,w,h,18*S,'rgba(240,255,245,0.045)');
  // A red edge down the left of every panel: the one visual that says "this one is off",
  // repeated per match so it survives being cropped or seen at thumbnail size.
  ctx.save(); ctx.beginPath(); ctx.roundRect(x,y,w,h,18*S); ctx.clip();
  ctx.fillStyle=OFF; ctx.fillRect(x,y,7*S,h);
  ctx.restore();

  const padL=x+34*S, padR=x+w-34*S;
  const nameY=y+h*0.44;

  // Laid out as ONE assembled line, measured and then centred — crest, name, V, name, crest.
  //
  // The previous version pinned each crest to the panel padding and centred the names on the
  // panel, so the gap between a crest and its own club's name was whatever the name's length
  // left over: "LARNE" sat 270px clear of the Larne crest while "LIMAVADY UNITED" almost
  // touched its own. Every crest now sits the same distance from the name it belongs to,
  // whatever the clubs are called.
  const hn=r.home.name.toUpperCase(), an=r.away.name.toUpperCase();
  const CG=20*S, VG=20*S, vSize=nameSize*0.52;
  const hw=measure(hn,nameSize,800,1*S), aw=measure(an,nameSize,800,1*S);
  const vw=measure('V',vSize,800,0);
  let cx=(x+w/2)-(CR+CG+hw+VG+vw+VG+aw+CG+CR)/2;
  const crestY=nameY-nameSize*0.30;
  shield(r.home,cx+CR/2,crestY,CR); cx+=CR+CG;
  T(hn,cx,nameY,{size:nameSize,weight:800,track:1*S}); cx+=hw+VG;
  T('V',cx,nameY-nameSize*0.04,{size:vSize,weight:800,color:OFF}); cx+=vw+VG;
  T(an,cx,nameY,{size:nameSize,weight:800,track:1*S}); cx+=aw+CG;
  shield(r.away,cx+CR/2,crestY,CR);

  // The old slot, LABELLED rather than struck through. A 1.5px rule at 42% read as an
  // underline artifact, and striking the date says the date was wrong — it wasn't, the match
  // is off. "WAS" says the thing that is actually true.
  const was=[r.was,r.venue].filter(Boolean).join('  ·  ');
  const ls=20*S;
  const lw=T('WAS',padL,y+h*0.78,{size:ls,weight:800,color:OFF,track:4*S});
  const ws=Math.min(23*S,fit(was,600,w-68*S-lw-16*S,23*S,3*S));
  T(was,padL+lw+16*S,y+h*0.78,{size:ws,weight:600,color:'rgba(237,245,239,0.78)',track:3*S});
  T('ROUND '+r.round,padR,y+h*0.78,{size:20*S,weight:800,align:'right',color:'rgba(237,245,239,0.45)',track:4*S});
  if(r.why) T(r.why,padL,y+h*0.78+30*S,{size:19*S,weight:600,color:OFF,track:3*S});
}

function draw(){
  backdrop();

  T('GIBSON',M,Y(84),{size:26*S,weight:800,color:GOLD,track:8*S,shadow:true});
  T('FIXTURE NEWS',W-M,Y(84),{size:23*S,weight:600,align:'right',color:'rgba(237,245,239,0.75)',track:6*S,shadow:true});

  // Headline sits tight above the matches instead of floating 300px clear of them.
  const hs=fit(F.headline,800,W-M*2,132*S,4*S);
  T(F.headline,W/2,Y(238),{size:hs,weight:800,align:'center',color:OFF,track:4*S,shadow:true});
  if(F.oneReason){
    const rs=fit(F.oneReason,600,W-M*2,28*S,7*S);
    T(F.oneReason,W/2,Y(288),{size:rs,weight:600,align:'center',color:'rgba(237,245,239,0.88)',track:7*S});
  }

  // Panels FILL the space between the headline and the closing line rather than being spaced
  // out inside it and leaving 500px of nothing. Height comes from how many there are.
  const zoneTop=Y(360), zoneBottom=Y(F.nextUp?960:1040), n=F.rows.length;
  const gap=22*S;
  // A lone postponement gets a taller panel — at the two-up height it floated in the middle
  // of a zone sized for two.
  const panelH=Math.max(140*S,Math.min((n===1?320:236)*S,((zoneBottom-zoneTop)-gap*(n-1))/n));
  const blockH=panelH*n+gap*(n-1);
  const top=zoneTop+((zoneBottom-zoneTop)-blockH)/2;

  // One scale for every panel, chosen so the WIDEST assembled line still fits. Fitting each
  // name independently against half a panel ignored the crests and the V sitting on the same
  // line, which is what let a long pairing run wider than the space it actually had.
  const CRp=Math.min(74*S,panelH*0.42), avail=(W-M*2)-68*S;
  const lineW=(r,size)=>CRp+20*S+measure(r.home.name.toUpperCase(),size,800,1*S)
    +20*S+measure('V',size*0.52,800,0)+20*S+measure(r.away.name.toUpperCase(),size,800,1*S)+20*S+CRp;
  let nameSize=44*S;
  while(nameSize>16*S && F.rows.some((r)=>lineW(r,nameSize)>avail)) nameSize-=1*S;
  F.rows.forEach((r,i)=>matchPanel(r,top+(panelH+gap)*i,panelH,nameSize));

  // What the card would otherwise leave people asking. Set apart from the postponed panels
  // by colour and a rule, so it cannot be mistaken for another game that is off.
  if(F.nextUp){
    const sy=top+blockH+62*S;
    ctx.fillStyle='rgba(237,245,239,0.14)'; ctx.fillRect(M,sy-40*S,W-M*2,1.5*S);
    T(F.nextUp.label,W/2,sy,{size:22*S,weight:800,align:'center',color:'rgba(237,245,239,0.5)',track:6*S});
    const vs=fit(F.nextUp.value,800,W-M*2,42*S,3*S);
    T(F.nextUp.value,W/2,sy+48*S,{size:vs,weight:800,align:'center',color:GREEN,track:3*S,shadow:true});
  }

  const ns=fit(F.note,800,W-M*2,40*S,4*S);
  T(F.note,W/2,Y(1140),{size:ns,weight:800,align:'center',color:GOLD,track:4*S,shadow:true});
  T('FULL FIXTURE LIST ON GIBSON',W/2,Y(1184),{size:22*S,weight:600,align:'center',color:MUTE,track:5*S});

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1240),W-M*2,2*S);
  cup(M+26*S,Y(1292),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1308),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1308),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

  grain(9,0.016);
  vignette();
}
window.__render=()=>{draw();return cv.toDataURL('image/jpeg',0.94)};
window.__ready=document.fonts.ready.then(()=>Promise.all([
  document.fonts.load('800 200px "Barlow Condensed"'),
  document.fonts.load('600 60px "Barlow Condensed"'),
])).then(()=>true);
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
const out = join(OUT_DIR, `gibson-postponed${only ? `-${only.toLowerCase()}` : ""}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
