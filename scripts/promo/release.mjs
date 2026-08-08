// GIBSON — release notes card (1080x1350 JPEG).
//
//   node scripts/promo/release.mjs \
//     --notes="NEW|Live scores, in-play;FIXED|Round-up cards dated one day when a round spanned two"
//
// A changelog for people who read changelogs. Each note is "CATEGORY|text", categories being
// NEW, FIXED or CHANGED, and the colour of the chip is the category — so the shape of a
// release is legible before a word is read: mostly gold is a feature drop, mostly green is a
// week spent paying down bugs.
//
// The version is read from package.json, never typed. The app footer stamps the same value
// through vite's `define`, so a card claiming 1.2.0 and a site reporting 1.1.0 cannot both
// exist — which is the only claim on here that could be quietly wrong.

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

const argv = process.argv.slice(2);
const flag = (n) => { const h = argv.find((a) => a.startsWith(`--${n}=`)); return h ? h.slice(n.length + 3) : null; };
const die = (m) => { console.error(`\n${m}\n\nUsage: node scripts/promo/release.mjs --notes="NEW|…;FIXED|…"\n`); process.exit(1); };

// The one number on the card that is a claim about the world, so it comes from the file the
// deploy is built from rather than from whoever is writing the post.
const pkg = JSON.parse(readFileSync(join(REPO, "package.json"), "utf8"));
const version = String(pkg.version || "");
if (!/^\d+\.\d+\.\d+$/.test(version)) die(`package.json version "${version}" isn't a version number.`);

const CATEGORIES = { NEW: "#FFB627", FIXED: "#3DDC84", CHANGED: "#5EC8F2" };

const raw = flag("notes");
if (!raw) die("Missing --notes.");
const notes = raw.split(";").map((s) => s.trim()).filter(Boolean).map((line) => {
  const at = line.indexOf("|");
  if (at < 0) die(`Can't read note "${line}" — expected CATEGORY|text.`);
  const cat = line.slice(0, at).trim().toUpperCase();
  const text = line.slice(at + 1).trim();
  if (!CATEGORIES[cat]) die(`"${cat}" isn't a category. Use one of: ${Object.keys(CATEGORIES).join(", ")}`);
  if (!text) die(`Note "${line}" has a category but no text.`);
  return { cat, text, color: CATEGORIES[cat] };
});
if (!notes.length) die("No notes parsed.");
if (notes.length > 7) die(`${notes.length} notes won't fit legibly — 7 is the most. Post the rest as a second card.`);

const facts = {
  version,
  headline: (flag("head") || `GIBSON ${version}`).toUpperCase(),
  eyebrow: (flag("eyebrow") || "What's new").toUpperCase(),
  site: "GIBSONSTATS.COM",
  notes,
};

console.log(`Release card — ${facts.headline}, ${notes.length} notes`);
for (const n of notes) console.log(`  ${n.cat.padEnd(8)} ${n.text}`);

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
  if(o.shadow){ctx.shadowColor='rgba(0,0,0,0.55)';ctx.shadowBlur=20*S;ctx.shadowOffsetY=4*S;}
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
// Greedy word wrap. Notes are sentences, not labels, so they have to break rather than shrink
// to nothing — a changelog line set at 18px to fit on one line is a changelog nobody reads.
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

function ground(){
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0A1611'); g.addColorStop(0.5,'#0B1815'); g.addColorStop(1,'#060C0A');
  ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
  const glow=ctx.createRadialGradient(W*0.5,Y(240),10,W*0.5,Y(240),W*0.95);
  glow.addColorStop(0,'rgba(255,182,39,0.14)'); glow.addColorStop(1,'rgba(255,182,39,0)');
  ctx.fillStyle=glow; ctx.fillRect(0,0,W,H);
}

// Category chip. Fixed width for every category so the note text starts on one vertical line
// down the card — a ragged left edge on a list this long reads as a mistake.
const CHIP_W=132*S;
function chip(label,color,x,y){
  const h=34*S;
  ctx.beginPath(); ctx.roundRect(x,y-h/2,CHIP_W,h,h/2);
  ctx.fillStyle=color+'22'; ctx.fill();
  ctx.lineWidth=2*S; ctx.strokeStyle=color+'66'; ctx.stroke();
  T(label,x+CHIP_W/2,y+7*S,{size:21*S,weight:800,align:'center',color,track:3*S});
}

function draw(){
  ground();

  T('GIBSON',M,Y(90),{size:27*S,weight:800,color:GOLD,track:8*S});
  T(F.site,W-M,Y(90),{size:27*S,weight:600,align:'right',color:MUTE,track:5*S});
  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(114),W-M*2,2*S);

  T(F.eyebrow,W/2,Y(196),{size:30*S,weight:600,align:'center',color:MUTE,track:10*S});
  const hs=fit(F.headline,800,W-M*2,132*S,4*S);
  T(F.headline,W/2,Y(300),{size:hs,weight:800,align:'center',color:GOLD,track:4*S,shadow:true});

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(352),W-M*2,2*S);

  // Rows are laid out from their own measured height, so a two-line note takes the room it
  // needs instead of overlapping the next chip. The GAP between notes is what stretches to
  // fill the card: with a fixed gap, six short lines sat in the middle of an otherwise empty
  // 1350px card and the release looked like an afterthought. Clamped at both ends so seven
  // two-line notes still fit and three notes don't drift apart into unrelated statements.
  const textX=M+CHIP_W+22*S, textW=W-M-textX;
  const size=31*S, lineH=39*S;
  const top=Y(430), bottom=Y(1160), band=bottom-top;
  const blocks=F.notes.map(n=>({...n,lines:wrap(n.text,size,600,textW)}));
  const lines=blocks.reduce((n,b)=>n+b.lines.length,0);
  const gap=blocks.length>1
    ? Math.max(30*S,Math.min(92*S,(band-lines*lineH)/(blocks.length-1)))
    : 0;
  const total=lines*lineH+gap*(blocks.length-1);
  let y=top+Math.max(0,(band-total)/2);

  for(const b of blocks){
    chip(b.cat,b.color,M,y+lineH*0.30);
    b.lines.forEach((ln,i)=>T(ln,textX,y+lineH*i+11*S,{size,weight:600,color:CHALK}));
    y+=b.lines.length*lineH+gap;
  }

  ctx.fillStyle='rgba(237,245,239,0.18)'; ctx.fillRect(M,Y(1222),W-M*2,2*S);
  cup(M+26*S,Y(1278),58*S);
  T('GIBSONSTATS.COM',M+64*S,Y(1294),{size:42*S,weight:800,color:GOLD,track:2*S});
  T('@GIBSONSTATS',W-M,Y(1294),{size:30*S,weight:600,align:'right',color:MUTE,track:5*S});

  grain(9,0.016);
  vignette();
}
window.__render=()=>{draw();return cv.toDataURL('image/jpeg',0.94)};
window.__ready=document.fonts.ready
  .then(()=>Promise.all([document.fonts.load('800 200px "Barlow Condensed"'),document.fonts.load('600 60px "Barlow Condensed"')]))
  .then(()=>true);
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
const out = join(OUT_DIR, `gibson-release-${version.replace(/\./g, "-")}.jpg`);
writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
console.log("wrote", out);
