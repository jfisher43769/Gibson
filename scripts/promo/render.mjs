// GIBSON — season-launch promo generator.
//
// Renders a 1080x1920 (9:16) MP4 frame by frame. Every fact on screen is read from
// data.js at build time — nothing is typed in here by hand, so the video cannot drift
// from the app or invent a statistic (CLAUDE.md golden rule 1).
//
// Frames are drawn to a canvas inside headless Chromium, pulled out as JPEG via
// toDataURL (much faster than page.screenshot) and piped straight into ffmpeg's stdin,
// so no intermediate frames ever touch disk.

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

// ---- Facts, straight from the app's own data ------------------------------------------
const D = await import(`file://${REPO}/data.js`);

const currentClubs = [...new Set(D.FIXTURES_2627.flatMap((r) => r.matches.flatMap((m) => [m.h, m.a])))];
const champion = D.FULL_TABLE[0];
const facts = {
  seasonDisplay: D.SEASON.current.display,                 // "2026/27"
  startDisplay: D.seasonStartDisplay(),                    // "7 August"
  startWeekday: new Date(`${D.SEASON.seasonStart}T00:00:00Z`)
    .toLocaleDateString("en-GB", { weekday: "long", timeZone: "UTC" }).toUpperCase(),
  rounds: D.FIXTURES_2627.length,                          // 33
  clubCount: currentClubs.length,                          // 12
  chasing: currentClubs.length - 1,                        // everyone but the champion
  champion: { code: champion.club, name: D.CLUBS[champion.club].name, pts: champion.pts },
  championNote: D.ROLL_OF_HONOUR[0].note,                  // "3rd title in 4 seasons"
  clubs: currentClubs.map((c) => ({ code: c, ...D.CLUBS[c] })),
  // Round 1, exactly as the Predictor has it
  fixtures: D.PREDICTOR_GW.fixtures.map((f) => ({
    h: f.home.club, a: f.away.club,
    hName: D.CLUBS[f.home.club].name, aName: D.CLUBS[f.away.club].name,
    when: f.comp.split(" · ").slice(2).join(" · "),
    venue: f.comp.split(" · ")[1],
  })),
};

// Fail loudly rather than shipping a video with a blank where a fact should be.
for (const [k, v] of Object.entries(facts)) {
  if (v === undefined || v === null || (Array.isArray(v) && !v.length)) throw new Error(`missing fact: ${k}`);
}
console.log("facts:", JSON.stringify({ ...facts, clubs: facts.clubs.length, fixtures: facts.fixtures.length }, null, 1));

const font800 = readFileSync(join(FONT_DIR, "barlow-condensed-latin-800-normal.woff2")).toString("base64");
const font600 = readFileSync(join(FONT_DIR, "barlow-condensed-latin-600-normal.woff2")).toString("base64");

// ---- The scene ------------------------------------------------------------------------
const html = `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Barlow Condensed";font-weight:800;src:url(data:font/woff2;base64,${font800}) format("woff2")}
@font-face{font-family:"Barlow Condensed";font-weight:600;src:url(data:font/woff2;base64,${font600}) format("woff2")}
html,body{margin:0;background:#000}canvas{display:block}
</style></head><body><canvas id="c" width="${W}" height="${H}"></canvas><script>
const F = ${JSON.stringify(facts)};
const W=${W},H=${H};
const cv=document.getElementById('c'),ctx=cv.getContext('2d',{alpha:false});

const BG='#0B1512', GOLD='#FFB627', GOLD_HI='#FFD873', CHALK='#EDF5EF', GREEN='#3DDC84';

const cl=x=>x<0?0:x>1?1:x;
const seg=(t,a,b)=>cl((t-a)/(b-a));
const outExpo=x=>x>=1?1:1-Math.pow(2,-10*x);
const outBack=x=>{const c1=2.2,c3=c1+1;return 1+c3*Math.pow(x-1,3)+c1*Math.pow(x-1,2)};
const inExpo=x=>x<=0?0:Math.pow(2,10*x-10);
function rng(s){let v=(s*2654435761)>>>0;return()=>{v=(v*1664525+1013904223)>>>0;return v/4294967296}}

// WCAG-matched text colour, same rule the app's crests use
function lum(hex){const p=hex.replace('#','').match(/.{2}/g).map(h=>{const v=parseInt(h,16)/255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)});return .2126*p[0]+.7152*p[1]+.0722*p[2]}
function contrastText(fill){const l=lum(fill),a=(Math.max(lum(CHALK),l)+.05)/(Math.min(lum(CHALK),l)+.05),b=(Math.max(l,lum('#10241B'))+.05)/(Math.min(l,lum('#10241B'))+.05);return a>=b?CHALK:'#10241B'}

// Scanline + vignette overlays, pre-rendered once
const scan=document.createElement('canvas');scan.width=W;scan.height=H;
{const s=scan.getContext('2d');s.fillStyle='rgba(0,0,0,0.20)';for(let y=0;y<H;y+=4)s.fillRect(0,y,W,1)}

function fitFont(txt,weight,maxW,size){
  ctx.font=weight+' '+size+'px "Barlow Condensed"';
  while(ctx.measureText(txt).width>maxW&&size>12){size-=3;ctx.font=weight+' '+size+'px "Barlow Condensed"'}
  return size;
}
// Big type with optional chromatic split — the "impact" look
function slam(txt,x,y,size,color,split,weight,maxW,track){
  weight=weight||800;maxW=maxW||W-110;
  const s=fitFont(txt,weight,maxW,size);
  ctx.font=weight+' '+s+'px "Barlow Condensed"';
  ctx.textAlign='center';ctx.textBaseline='middle';
  if(track){ // letter-spaced draw
    const chars=[...txt];let tot=0;for(const c of chars)tot+=ctx.measureText(c).width+track;tot-=track;
    let cx=x-tot/2;
    const put=(col,dx)=>{ctx.fillStyle=col;let p=cx;for(const c of chars){ctx.fillText(c,p+ctx.measureText(c).width/2+dx,y);p+=ctx.measureText(c).width+track}};
    if(split>0.4){ctx.globalCompositeOperation='lighter';put('#FF0A3C',-split);put('#00E9FF',split);ctx.globalCompositeOperation='source-over'}
    ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=20;ctx.shadowOffsetY=5;
    put(color,0);
    ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    return s;
  }
  if(split>0.4){
    ctx.globalCompositeOperation='lighter';
    ctx.fillStyle='#FF0A3C';ctx.fillText(txt,x-split,y);
    ctx.fillStyle='#00E9FF';ctx.fillText(txt,x+split,y);
    ctx.globalCompositeOperation='source-over';
  }
  // Drop shadow on the solid fill only — keeps type readable wherever a club-colour
  // sweep passes behind it, without muddying the chromatic-split ghosts.
  ctx.shadowColor='rgba(0,0,0,0.6)';ctx.shadowBlur=20;ctx.shadowOffsetY=5;
  ctx.fillStyle=color;ctx.fillText(txt,x,y);
  ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  return s;
}

// The app's shield, drawn from the same path Crest.jsx uses (40x46 viewBox)
const SHIELD=new Path2D('M20 2 L37 8 V24 C37 35 29 42 20 45 C11 42 3 35 3 24 V8 Z');
function shield(club,cx,cy,h){
  const sc=h/46,w=40*sc;
  ctx.save();ctx.translate(cx-w/2,cy-h/2);ctx.scale(sc,sc);
  ctx.fillStyle=club.colors[0];ctx.fill(SHIELD);
  ctx.save();ctx.clip(SHIELD);
  ctx.fillStyle=club.colors[1];
  if(club.pattern==='stripes')[8,20,32].forEach(x=>ctx.fillRect(x-3,0,6,46));
  else if(club.pattern==='sleeve'){ctx.globalAlpha=.9;ctx.fillRect(0,30,40,16);ctx.globalAlpha=1}
  else ctx.fillRect(3,24,34,2);
  ctx.restore();
  ctx.lineWidth=1.5;ctx.strokeStyle='rgba(237,245,239,0.35)';ctx.stroke(SHIELD);
  ctx.fillStyle=contrastText(club.colors[0]);
  ctx.font='800 10px "Barlow Condensed"';ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.fillText(club.code,20,24);
  ctx.restore();
}

// The Gibson Cup mark, same geometry as LogoMark.jsx (200x200 viewBox)
const CUP=['M54 38 L146 38 L138 76 C133 101 118 114 100 114 C82 114 67 101 62 76 Z',
'M56 46 C30 46 26 78 49 88 L54 78 C40 71 44 55 56 55 Z',
'M144 46 C170 46 174 78 151 88 L146 78 C160 71 156 55 144 55 Z'].map(d=>new Path2D(d));
function cup(cx,cy,size){
  const sc=size/200;
  ctx.save();ctx.translate(cx-size/2,cy-size/2);ctx.scale(sc,sc);
  const g=ctx.createLinearGradient(0,0,200,200);g.addColorStop(0,GOLD_HI);g.addColorStop(1,'#FFA51F');
  ctx.fillStyle=g;
  CUP.forEach(p=>ctx.fill(p));
  ctx.fillRect(92,114,16,15);ctx.fillRect(70,132,60,10);ctx.fillRect(57,145,86,10);ctx.fillRect(43,158,114,10);
  ctx.restore();
}

function grain(fr,amt){
  const r=rng(fr+7);ctx.fillStyle='rgba(255,255,255,'+amt+')';
  for(let i=0;i<700;i++)ctx.fillRect(r()*W|0,r()*H|0,2,2);
}
function vignette(){
  const g=ctx.createRadialGradient(W/2,H/2,H*0.25,W/2,H/2,H*0.72);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0.65)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
}
// Diagonal colour sweep in a club's own colours
function sweep(p,c1,c2){
  const x=(-W*0.6)+p*(W*2.2);
  ctx.save();ctx.globalAlpha=.9;
  ctx.beginPath();ctx.moveTo(x,H);ctx.lineTo(x+W*0.42,0);ctx.lineTo(x+W*0.62,0);ctx.lineTo(x+W*0.2,H);ctx.closePath();
  ctx.fillStyle=c1;ctx.fill();
  ctx.beginPath();ctx.moveTo(x+W*0.2,H);ctx.lineTo(x+W*0.62,0);ctx.lineTo(x+W*0.70,0);ctx.lineTo(x+W*0.28,H);ctx.closePath();
  ctx.fillStyle=c2;ctx.fill();
  ctx.restore();
  // Knock the bands back so type laid over them always clears contrast — a white
  // club stripe behind chalk text is otherwise unreadable.
  ctx.fillStyle='rgba(11,21,18,0.46)';ctx.fillRect(0,0,W,H);
}

// ---- Timeline (ms) --------------------------------------------------------------------
const T={
  date:[0,1650], starts:[1650,3000], clubs:[3000,5500],
  champ:[5500,7900], chase:[7900,9350], fix:[9350,13850],
  scale:[13850,15600], logo:[15600,18600]
};
const END=T.logo[1];

function draw(t){
  const fr=Math.round(t/1000*${FPS});
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  let shakeX=0,shakeY=0;

  // impact shake on every hard cut
  for(const k in T){const a=T[k][0],d=t-a;if(d>=0&&d<170){const q=1-d/170,r=rng(fr*13+a);shakeX+=(r()-.5)*34*q;shakeY+=(r()-.5)*34*q}}
  ctx.save();ctx.translate(shakeX,shakeY);

  // ---------- 1. the date ----------
  if(t<T.starts[0]){
    const p=seg(t,0,900);
    ctx.save();ctx.globalAlpha=cl(p*3);
    slam(F.startWeekday,W/2,H*0.36,86,GOLD,0,600,W-260,26);
    ctx.restore();
    const k=outBack(seg(t,180,1050));
    ctx.save();ctx.translate(W/2,H*0.5);ctx.scale(0.55+k*0.45,0.55+k*0.45);
    slam(F.startDisplay.toUpperCase(),0,0,250,CHALK,(1-k)*26);
    ctx.restore();
    const q=seg(t,900,1500);
    if(q>0){ctx.save();ctx.globalAlpha=q;slam(F.seasonDisplay,W/2,H*0.635,120,GOLD,0,800,W-380);ctx.restore()}
  }

  // ---------- 2. it starts again ----------
  else if(t<T.clubs[0]){
    const p=seg(t,T.starts[0],T.starts[1]);
    sweep(cl(p*1.5),GOLD,'#0B1512');
    const k=outExpo(seg(t,T.starts[0]+60,T.starts[0]+620));
    ctx.save();ctx.translate(0,(1-k)*70);ctx.globalAlpha=k;
    slam('IT STARTS',W/2,H*0.44,190,CHALK,(1-k)*22);
    slam('AGAIN',W/2,H*0.58,190,GOLD,(1-k)*22);
    ctx.restore();
  }

  // ---------- 3. twelve clubs ----------
  else if(t<T.champ[0]){
    const p=seg(t,T.clubs[0],T.clubs[1]);
    slam(F.clubCount+' CLUBS',W/2,H*0.135,110,GOLD,0,800,W-300,8);
    const cols=3,rows=Math.ceil(F.clubs.length/cols),gw=W*0.78,gh=H*0.56;
    const x0=(W-gw)/2,y0=H*0.235;
    // One name size for the whole grid, driven by the longest name, so the row of
    // labels sits on a single baseline instead of stepping about per club.
    let nameSize=34;
    F.clubs.forEach(c=>{nameSize=Math.min(nameSize,fitFont(c.name.toUpperCase(),600,gw/cols-26,34))});
    F.clubs.forEach((c,i)=>{
      // Land the full grid well before the cut so all 12 are on screen together.
      const step=(T.clubs[1]-T.clubs[0]-1200)/F.clubs.length;
      const k=outBack(seg(t,T.clubs[0]+120+i*step,T.clubs[0]+420+i*step));
      if(k<=0)return;
      const cx=x0+(gw/cols)*((i%cols)+0.5),cy=y0+(gh/rows)*(Math.floor(i/cols)+0.5);
      // flash frame as each lands
      if(k>0&&k<0.35){ctx.save();ctx.globalAlpha=(0.35-k)*1.6;ctx.fillStyle=c.colors[0];
        ctx.fillRect(cx-gw/cols/2,cy-gh/rows/2,gw/cols,gh/rows);ctx.restore()}
      ctx.save();ctx.translate(cx,cy);ctx.scale(k,k);ctx.globalAlpha=cl(k);
      shield(c,0,-14,168);
      ctx.fillStyle=CHALK;ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.font='600 '+nameSize+'px "Barlow Condensed"';
      ctx.fillText(c.name.toUpperCase(),0,104);
      ctx.restore();
    });
  }

  // ---------- 4. the champions ----------
  else if(t<T.chase[0]){
    const p=seg(t,T.champ[0],T.champ[1]);
    const ch=F.clubs.find(c=>c.code===F.champion.code);
    sweep(cl(p*1.35),ch.colors[0],ch.colors[1]);
    const k=outBack(seg(t,T.champ[0]+80,T.champ[0]+640));
    ctx.save();ctx.globalAlpha=cl(k*1.4);
    ctx.save();ctx.translate(W/2,H*0.30);ctx.scale(k,k);shield(ch,0,0,300);ctx.restore();
    slam(F.champion.name.toUpperCase(),W/2,H*0.50,168,CHALK,(1-k)*20);
    slam('CHAMPIONS',W/2,H*0.585,74,GOLD,0,600,W-300,20);
    ctx.restore();
    const q=outExpo(seg(t,T.champ[0]+700,T.champ[0]+1250));
    if(q>0){ctx.save();ctx.globalAlpha=q;ctx.translate(0,(1-q)*40);
      slam(F.champion.pts+' PTS',W/2,H*0.715,190,GOLD,0);
      slam(F.championNote.toUpperCase(),W/2,H*0.80,58,CHALK,0,600,W-220,10);
      ctx.restore()}
  }

  // ---------- 5. the chase ----------
  else if(t<T.fix[0]){
    const k=outExpo(seg(t,T.chase[0]+40,T.chase[0]+560));
    ctx.save();ctx.globalAlpha=k;ctx.translate(0,(1-k)*60);
    slam(F.chasing+' CLUBS',W/2,H*0.42,215,GOLD,(1-k)*24);
    slam('WANT IT BACK',W/2,H*0.56,150,CHALK,(1-k)*24);
    ctx.restore();
  }

  // ---------- 6. round one ----------
  else if(t<T.scale[0]){
    const each=(T.fix[1]-T.fix[0])/F.fixtures.length;
    const i=Math.min(F.fixtures.length-1,Math.floor((t-T.fix[0])/each));
    const f=F.fixtures[i],lt=t-(T.fix[0]+i*each);
    const home=F.clubs.find(c=>c.code===f.h),away=F.clubs.find(c=>c.code===f.a);
    sweep(cl(seg(lt,0,each*0.85)),home.colors[0],away.colors[0]);
    ctx.save();ctx.globalAlpha=0.16;
    ctx.fillStyle=home.colors[0];ctx.fillRect(0,0,W,18);
    ctx.fillStyle=away.colors[0];ctx.fillRect(0,H-18,W,18);ctx.restore();
    slam('ROUND 1',W/2,H*0.13,72,GOLD,0,600,W-300,22);
    const k=outBack(cl(lt/300));
    ctx.save();ctx.globalAlpha=cl(lt/140);
    ctx.save();ctx.translate(W*0.26,H*0.34);ctx.scale(k,k);shield(home,0,0,210);ctx.restore();
    ctx.save();ctx.translate(W*0.74,H*0.34);ctx.scale(k,k);shield(away,0,0,210);ctx.restore();
    slam(f.hName.toUpperCase(),W/2,H*0.52,116,CHALK,(1-k)*16);
    slam('V',W/2,H*0.60,64,GOLD,0);
    slam(f.aName.toUpperCase(),W/2,H*0.68,116,CHALK,(1-k)*16);
    ctx.globalAlpha=cl((lt-160)/300);
    slam(f.venue.toUpperCase(),W/2,H*0.785,50,GOLD,0,600,W-220,8);
    slam(f.when.toUpperCase(),W/2,H*0.845,44,CHALK,0,600,W-220,6);
    ctx.restore();
  }

  // ---------- 7. the season ahead ----------
  else if(t<T.logo[0]){
    const rows=[[F.rounds,'ROUNDS'],[F.clubCount,'CLUBS'],['1','GIBSON CUP']];
    slam('THE SEASON AHEAD',W/2,H*0.20,58,GOLD,0,600,W-300,18);
    rows.forEach((r,i)=>{
      const k=outBack(seg(t,T.scale[0]+140+i*230,T.scale[0]+560+i*230));
      if(k<=0)return;
      const y=H*(0.375+i*0.16);
      ctx.save();ctx.globalAlpha=cl(k*1.3);ctx.translate(0,(1-k)*30);
      slam(String(r[0]),W/2,y,168,CHALK,(1-k)*18);
      slam(r[1],W/2,y+96,54,GOLD,0,600,W-260,14);
      ctx.restore();
    });
  }

  // ---------- 8. the sign-off ----------
  else{
    const k=outBack(seg(t,T.logo[0]+60,T.logo[0]+700));
    ctx.save();ctx.translate(W/2,H*0.34);ctx.scale(0.6+k*0.4,0.6+k*0.4);ctx.globalAlpha=cl(k*1.5);
    cup(0,0,300);ctx.restore();
    const q=outExpo(seg(t,T.logo[0]+320,T.logo[0]+900));
    ctx.save();ctx.globalAlpha=q;
    slam('GIBSON',W/2,H*0.535,215,GOLD,(1-q)*22,800,W-160,10);
    slam('THE HOME OF IRISH LEAGUE STATS',W/2,H*0.615,44,CHALK,0,600,W-200,8);
    ctx.restore();
    const r=outExpo(seg(t,T.logo[0]+780,T.logo[0]+1350));
    if(r>0){
      ctx.save();ctx.globalAlpha=r;
      const bw=W*0.70,bh=112,bx=(W-bw)/2,by=H*0.715;
      ctx.fillStyle=GOLD;ctx.beginPath();ctx.roundRect(bx,by,bw,bh,56);ctx.fill();
      ctx.fillStyle='#0B1512';ctx.textAlign='center';ctx.textBaseline='middle';
      const s=fitFont('GIBSONSTATS.COM',800,bw-70,58);
      ctx.font='800 '+s+'px "Barlow Condensed"';
      ctx.fillText('GIBSONSTATS.COM',W/2,by+bh/2+3);
      ctx.restore();
    }
    const u=seg(t,T.logo[0]+1150,T.logo[0]+1750);
    if(u>0){ctx.save();ctx.globalAlpha=u;
      slam(F.seasonDisplay+' STARTS '+F.startDisplay.toUpperCase(),W/2,H*0.845,52,CHALK,0,600,W-200,6);
      ctx.restore()}
  }

  ctx.restore(); // shake

  // ---- global grade ----
  ctx.drawImage(scan,0,0);
  grain(fr,0.030);
  vignette();

  // white strobe on each cut
  for(const k in T){const d=t-T[k][0];if(d>=0&&d<70){ctx.fillStyle='rgba(255,255,255,'+(0.5*(1-d/70))+')';ctx.fillRect(0,0,W,H)}}
  // open from black / close to black
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
page.on("pageerror", (e) => { console.error("PAGE ERROR:", e.message); });
await page.setContent(html, { waitUntil: "load" });
await page.evaluate(() => window.__ready);

const END = await page.evaluate(() => window.__END);
const total = Math.round((END / 1000) * FPS);
console.log(`duration ${(END / 1000).toFixed(2)}s -> ${total} frames @ ${FPS}fps`);

const out = join(OUT_DIR, "gibson-season-launch.mp4");
const ff = spawn(FFMPEG, [
  "-y", "-f", "image2pipe", "-framerate", String(FPS), "-i", "pipe:0",
  "-c:v", "libx264", "-preset", "slow", "-crf", "18",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(FPS), out,
], { stdio: ["pipe", "ignore", "pipe"] });
let ffErr = "";
ff.stderr.on("data", (d) => { ffErr += d.toString(); });

for (let i = 0; i < total; i++) {
  const t = (i / FPS) * 1000;
  const dataUrl = await page.evaluate((tt) => window.__frame(tt), t);
  const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64");
  if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
  if (i % 60 === 0) console.log(`  frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error("ffmpeg " + c + "\n" + ffErr.slice(-2000))))));
await browser.close();
console.log("wrote", out);
