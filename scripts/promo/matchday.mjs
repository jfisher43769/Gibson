// GIBSON — matchday generator (1080x1920 MP4).
//
//   node scripts/promo/matchday.mjs
//   NOW_MS=... node scripts/promo/matchday.mjs      # render as if it were another moment
//
// The whole day's card in one cut: what is on, when and where, then the two games worth
// stopping for. Takes no arguments — the round is whichever one is next by real kick-off
// time, using the SAME nextLeagueFixture() + one-week filter cards.mjs uses, so the still set
// and the video can never disagree about which fixtures are today.
//
// preview.mjs already covers a single tie in depth. This is the other half of a matchday:
// six games, twenty-odd seconds, posted before three o'clock.
//
// Every fact is read from data.js (CLUBS, FIXTURES_2627, CLUB_META, FULL_TABLE) — nothing on
// screen is typed in here, so the video cannot drift from the app or invent a statistic
// (CLAUDE.md golden rule 1). The billed ties are CHOSEN from the data too, by combined
// finishing position last season, rather than picked by hand: on a card carrying both the
// champions away at the runners-up and the Big Two derby, no human should have to decide.
//
// There is deliberately no league table in here — see the note above the facts block.
//
// No odds here, and so no bookmaker anything (golden rule 2) — the model's call lives in
// preview.mjs and predictor.mjs, both of which carry the full "GIBSON estimate" framing. A
// fast hype cut is the wrong place for a number that needs a paragraph of caveat.

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

// ---- Which round, and which of its games are actually today ---------------------------
const next = D.nextLeagueFixture(now);
if (!next) throw new Error("no upcoming league fixture — nothing to make a matchday video from");
const round = D.FIXTURES_2627.find((r) => r.round === next.round);
const WEEK_MS = 7 * 24 * 3600 * 1000;

// Same filter as cards.mjs: within the coming week of the next kick-off, and not already
// finished. A game moved months ahead — Larne v Bangor, shifted to September — is not part of
// this matchday and must not be listed as though it were.
const fixtures = round.matches
  .map((m) => ({ ...m, ms: D.fixtureKickoffMs(round, m) }))
  .filter((m) => m.ms !== null && !Array.isArray(m.result)
    && m.ms >= now - D.LIVE_WINDOW_MS && m.ms <= next.kickoffMs + WEEK_MS)
  .sort((x, y) => x.ms - y.ms);
if (!fixtures.length) throw new Error(`round ${round.round} has no fixtures inside the week`);

const clubOf = (c) => {
  if (!D.CLUBS[c]) throw new Error(`unknown club code ${c}`);
  // `code` is what shield() prints on the badge; CLUBS is keyed by it but doesn't carry it.
  return { code: c, ...D.CLUBS[c] };
};
const dayOf = (s) => String(s).split(" ")[0].toUpperCase();
const dateOf = (s) => String(s).replace(/^\w+\s+/, "").toUpperCase();

const rows = fixtures.map((m) => ({
  h: clubOf(m.h), a: clubOf(m.a),
  time: (m.t || round.time || "3pm").toUpperCase(),
  day: dayOf(m.d || round.date), date: dateOf(m.d || round.date),
  venue: D.CLUB_META[m.h]?.ground || "",
  tv: m.tv || null,
}));

// Six identical "3PM"s down the right-hand edge is noise. When the whole card kicks off
// together — which is most Saturdays — say it once, in the header.
const times = [...new Set(rows.map((r) => r.time))];
const uniformTime = times.length === 1 ? times[0] : null;
const days = [...new Set(rows.map((r) => `${r.day} ${r.date}`))];
const uniformDay = days.length === 1 ? days[0] : null;

// ---- The ties of the day, chosen rather than decided ------------------------------------
// Combined finishing position last season, lowest wins, top TWO. One headline undersold a
// card carrying both the champions away at the runners-up AND the Big Two derby — on most
// Saturdays there is more than one game worth stopping for, and the same rule finds them.
const prevPos = (c) => {
  const i = D.FULL_TABLE.findIndex((r) => r.club === c);
  return i >= 0 ? i + 1 : D.FULL_TABLE.length + 1;   // promoted club: ranked last, not zero
};
const TIE_COUNT = 2;
const ord = (n) => D.ordinal(n).toUpperCase();
// Labels, not rankings: the second is picked by the same rule as the first, so calling it
// "second best" would overstate what the arithmetic actually says.
const TIE_KICKERS = ["TIE OF THE DAY", "THE OTHER ONE TO WATCH"];
const ties = [...rows]
  .sort((x, y) => (prevPos(x.h.code) + prevPos(x.a.code)) - (prevPos(y.h.code) + prevPos(y.a.code)))
  .slice(0, TIE_COUNT)
  .map((t, i) => ({
    h: t.h, a: t.a, venue: t.venue, time: t.time, day: t.day, date: t.date, tv: t.tv,
    hPos: prevPos(t.h.code), aPos: prevPos(t.a.code),
    hPosText: ord(prevPos(t.h.code)), aPosText: ord(prevPos(t.a.code)),
    kicker: TIE_KICKERS[i] || "ALSO TODAY",
  }));

// No table scene. Two rounds in, "as it stands" is five clubs level on three points — true,
// and worth nothing to a viewer. The app is where a table earns its place; a matchday cut is
// for what is about to be played. Owner's call, 15 Aug 2026.

const facts = {
  round: round.round, rows, uniformTime, uniformDay, ties,
  seasonPrev: D.SEASON.previous.display,
  count: rows.length,
};

console.log(`matchday: round ${facts.round} · ${facts.count} fixtures · ${uniformDay || "mixed days"} ${uniformTime || "mixed times"}`);
for (const r of rows) console.log(`   ${r.h.name} v ${r.a.name} — ${r.day} ${r.date} ${r.time} ${r.venue}`);
for (const t of ties) console.log(`   ${t.kicker.toLowerCase()}: ${t.h.name} (${t.hPos}) v ${t.a.name} (${t.aPos}) at ${t.venue}`);

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
  slam(txt,W/2,H*0.145,96,col||GOLD,(1-k)*14,800,W-140);ctx.restore();
}

// One fixture: shields at the edges, names meeting a gold V in the middle. Names are drawn
// with fitFont against a hard half-width budget so "Dungannon Swifts" cannot run into the V.
function fixtureRow(y,r,k,showTime){
  if(k<=0)return;
  ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate((1-k)*30,0);
  const rowH=124;
  panel(PX,y-rowH/2,PW,rowH,26);
  shield(r.h,PX+62,y,86);
  shield(r.a,PX+PW-62,y,86);
  const mid=W/2, half=PW/2-150;
  const hs=fitFont(r.h.short.toUpperCase(),800,half,46);
  ctx.font='800 '+hs+'px "Barlow Condensed"';ctx.textAlign='right';ctx.textBaseline='middle';
  ctx.fillStyle=CHALK;ctx.fillText(r.h.short.toUpperCase(),mid-40,y);
  const as=fitFont(r.a.short.toUpperCase(),800,half,46);
  ctx.font='800 '+as+'px "Barlow Condensed"';ctx.textAlign='left';
  ctx.fillText(r.a.short.toUpperCase(),mid+40,y);
  rowText('V',mid,y+1,40,GOLD,800,'center');
  if(showTime)rowText(r.time,PX+PW-118,y+38,26,'rgba(237,245,239,0.55)',600,'right');
  ctx.restore();
}

// Built from the tie count rather than written out, so a round with only one fixture worth
// billing still ends up with a whole video instead of five dead seconds.
const TIE_MS=5000, CARD_END=10200, SIGN_MS=3800;
const T={hook:[0,3000],card:[3000,CARD_END]};
F.ties.forEach((_,i)=>{T['tie'+i]=[CARD_END+i*TIE_MS,CARD_END+(i+1)*TIE_MS]});
const SIGN_AT=CARD_END+F.ties.length*TIE_MS;
T.sign=[SIGN_AT,SIGN_AT+SIGN_MS];
const ORDER=['hook','card',...F.ties.map((_,i)=>'tie'+i),'sign'];
const END=T.sign[1];
const CUTS=ORDER.map(k=>T[k][0]);
const pOf=(t,k)=>(t-T[k][0])/(T[k][1]-T[k][0]);
const sceneAt=(t)=>ORDER.find(k=>t<T[k][1])||'sign';

// One tie, drawn once. Both billed games go through this — a second copy of the scene is how
// the two drift apart the first time either is adjusted.
function tieScene(p,F2){
  kicker(p,F2.kicker);
  const k=outBack(cl((p-0.05)/0.28));
  ctx.save();ctx.globalAlpha=cl(k*1.4);
  ctx.save();ctx.translate(W*0.27,H*0.30);ctx.scale(k,k);shield(F2.h,0,0,260);ctx.restore();
  ctx.save();ctx.translate(W*0.73,H*0.30);ctx.scale(k,k);shield(F2.a,0,0,260);ctx.restore();
  slam('V',W/2,H*0.30,90,GOLD,0);
  slam(F2.h.name.toUpperCase(),W/2,H*0.475,112,CHALK,(1-k)*16);
  slam(F2.a.name.toUpperCase(),W/2,H*0.565,112,CHALK,(1-k)*16);
  ctx.restore();
  // Why this one is billed, stated rather than implied.
  const q=outExpo(cl((p-0.34)/0.26));
  if(q>0){ctx.save();ctx.globalAlpha=q;
    slam(F2.hPosText+' V '+F2.aPosText+' LAST SEASON',W/2,H*0.665,54,GOLD,0,800,W-200,4);ctx.restore()}
  const r=outExpo(cl((p-0.52)/0.26));
  if(r>0){ctx.save();ctx.globalAlpha=r;
    slam(F2.venue.toUpperCase(),W/2,H*0.755,52,CHALK,0,600,W-180,4);
    slam(F2.day+' '+F2.date+' · '+F2.time+(F2.tv?' · '+F2.tv.toUpperCase():''),
      W/2,H*0.815,46,'rgba(237,245,239,0.7)',0,600,W-180,4);ctx.restore()}
}

function draw(t){
  const fr=Math.round(t/1000*${FPS});
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  let sx=0,sy=0;
  for(const c of CUTS){const d=t-c;if(d>=0&&d<150){const q=1-d/150,r=rng(fr*13+c);sx+=(r()-.5)*24*q;sy+=(r()-.5)*24*q}}
  ctx.save();ctx.translate(sx,sy);

  const SC=sceneAt(t);
  if(SC==='hook'){                                    // ---- hook
    const p=pOf(t,'hook');
    sweep(cl(p*1.4),F.ties[0].h.colors[0],F.ties[0].a.colors[0]);
    const k=outBack(cl((p-0.04)/0.30));
    ctx.save();ctx.globalAlpha=cl(k*1.4);
    slam('ROUND '+F.round,W/2,H*0.33,66,GOLD,0,600,W-260,20);
    slam('MATCHDAY',W/2,H*0.455,205,CHALK,(1-k)*22);
    if(F.uniformDay)slam(F.uniformDay,W/2,H*0.565,74,GOLD,0,800,W-200);
    ctx.restore();
    const q=cl((p-0.52)*2.4);
    if(q>0){ctx.save();ctx.globalAlpha=q;
      slam(F.count+' GAME'+(F.count===1?'':'S')+(F.uniformTime?' · ALL '+F.uniformTime:''),
        W/2,H*0.675,52,'rgba(237,245,239,0.85)',0,600,W-220,8);ctx.restore()}
  }
  else if(SC==='card'){                               // ---- the whole card
    const p=pOf(t,'card');
    kicker(p,'TODAY IN THE PREMIERSHIP');
    title(p,'THE CARD');
    const n=F.rows.length;
    // Rows share the space between the title and the footer whatever the count, so a
    // five-game round doesn't leave a hole and a seven-game one doesn't overflow.
    const top=H*0.255, bot=H*0.845, gap=(bot-top)/n;
    F.rows.forEach((r,i)=>{
      fixtureRow(top+gap*i+gap/2,r,outBack(cl((p-0.10-i*0.075)/0.32)),!F.uniformTime);
    });
    const q=outExpo(cl((p-0.70)/0.24));
    if(q>0&&F.uniformTime){ctx.save();ctx.globalAlpha=q;
      slam('EVERY ONE AT '+F.uniformTime,W/2,H*0.905,46,GOLD,0,600,W-200,8);ctx.restore()}
  }
  else if(SC.startsWith('tie')){                      // ---- the games worth billing
    tieScene(pOf(t,SC),F.ties[Number(SC.slice(3))]);
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
      slam('LIVE SCORES · TABLE · STATS',W/2,H*0.815,50,CHALK,0,600,W-180,4);
      slam('ROUND '+F.round+(F.uniformTime?' · FROM '+F.uniformTime:''),W/2,H*0.865,44,GOLD,0,600,W-200,4);
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

const out = join(OUT_DIR, `gibson-matchday-r${round.round}.mp4`);
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
// A frame that threw still encodes — as whatever was on the canvas before the throw. Failing
// loudly here beats posting a video with a blank scene in the middle of it.
if (pageErrors.length) { console.error(`\n${pageErrors.length} page error(s) while drawing — output is not trustworthy`); process.exit(1); }
console.log("wrote", out);
