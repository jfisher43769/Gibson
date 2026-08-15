// GIBSON — matchday generator (1080x1920 MP4).
//
//   node scripts/promo/matchday.mjs
//   NOW_MS=... node scripts/promo/matchday.mjs      # render as if it were another moment
//
// The whole day's card in one cut: what is on, when, where, the tie of the day, and the
// table it all lands on. Takes no arguments — the round is whichever one is next by real
// kick-off time, using the SAME nextLeagueFixture() + one-week filter cards.mjs uses, so the
// still set and the video can never disagree about which fixtures are today.
//
// preview.mjs already covers a single tie in depth. This is the other half of a matchday:
// six games, thirty seconds, posted before three o'clock.
//
// Every fact is read from data.js (CLUBS, FIXTURES_2627, CLUB_META, FULL_TABLE, and the
// derived currentTable/tableStage) — nothing on screen is typed in here, so the video cannot
// drift from the app or invent a statistic (CLAUDE.md golden rule 1). The tie of the day is
// CHOSEN from the data too, by combined finishing position last season, rather than picked by
// hand: on a card containing the champions away at the runners-up, no human should have to
// decide what the headline is.
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

// ---- The tie of the day, chosen rather than decided ------------------------------------
// Combined finishing position last season, lowest wins. On this card that is the champions
// away at the runners-up, which is the right answer and nobody had to type it.
const prevPos = (c) => {
  const i = D.FULL_TABLE.findIndex((r) => r.club === c);
  return i >= 0 ? i + 1 : D.FULL_TABLE.length + 1;   // promoted club: ranked last, not zero
};
const headline = [...rows].sort((x, y) =>
  (prevPos(x.h.code) + prevPos(x.a.code)) - (prevPos(y.h.code) + prevPos(y.a.code)))[0];
const hl = {
  h: headline.h, a: headline.a, venue: headline.venue, time: headline.time,
  day: headline.day, date: headline.date, tv: headline.tv,
  hPos: prevPos(headline.h.code), aPos: prevPos(headline.a.code),
};

// ---- The table it lands on --------------------------------------------------------------
// Current season once a result exists, last season's final before that — the same rule the
// home screen's snapshot follows, so the video and the app agree about which table is "the"
// table on any given weekend.
const stage = D.tableStage();
const live = !!stage;
// Goal difference travels with the points because early on it is the only thing separating
// them: after round one this table is five clubs on three points, and a column of identical
// "3"s with no explanation of the order reads as a bug rather than as a league table.
const tableRows = (live ? D.currentTable() : D.FULL_TABLE).slice(0, 5)
  .map((r, i) => ({
    pos: i + 1, club: clubOf(r.club), pts: r.pts, p: r.p,
    gd: `${r.gd > 0 ? "+" : r.gd < 0 ? "−" : ""}${Math.abs(r.gd)}`,
  }));
const tableLabel = live
  ? `${D.SEASON.current.display} · ${stage.complete ? "AFTER " : ""}ROUND ${stage.round}`
  : `${D.SEASON.previous.display} · FINAL`;

const ord = (n) => D.ordinal(n).toUpperCase();
const facts = {
  round: round.round, rows, uniformTime, uniformDay,
  hl: { ...hl, hPosText: ord(hl.hPos), aPosText: ord(hl.aPos) },
  tableRows, tableLabel, seasonPrev: D.SEASON.previous.display,
  count: rows.length,
};

console.log(`matchday: round ${facts.round} · ${facts.count} fixtures · ${uniformDay || "mixed days"} ${uniformTime || "mixed times"}`);
for (const r of rows) console.log(`   ${r.h.name} v ${r.a.name} — ${r.day} ${r.date} ${r.time} ${r.venue}`);
console.log(`   tie of the day: ${hl.h.name} (${hl.hPos}) v ${hl.a.name} (${hl.aPos}) at ${hl.venue}`);
console.log(`   table: ${tableLabel} — ${tableRows.map((r) => `${r.pos} ${r.club.code} ${r.pts}`).join(", ")}`);

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

const T={hook:[0,3000],card:[3000,10200],tie:[10200,15400],table:[15400,19400],sign:[19400,23200]};
const END=T.sign[1];
const CUTS=Object.values(T).map(v=>v[0]);
const pOf=(t,k)=>(t-T[k][0])/(T[k][1]-T[k][0]);

function draw(t){
  const fr=Math.round(t/1000*${FPS});
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  let sx=0,sy=0;
  for(const c of CUTS){const d=t-c;if(d>=0&&d<150){const q=1-d/150,r=rng(fr*13+c);sx+=(r()-.5)*24*q;sy+=(r()-.5)*24*q}}
  ctx.save();ctx.translate(sx,sy);

  if(t<T.card[0]){                                    // ---- hook
    const p=pOf(t,'hook');
    sweep(cl(p*1.4),F.hl.h.colors[0],F.hl.a.colors[0]);
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
  else if(t<T.tie[0]){                                // ---- the whole card
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
  else if(t<T.table[0]){                              // ---- tie of the day
    const p=pOf(t,'tie');
    kicker(p,'TIE OF THE DAY');
    const k=outBack(cl((p-0.05)/0.28));
    ctx.save();ctx.globalAlpha=cl(k*1.4);
    ctx.save();ctx.translate(W*0.27,H*0.30);ctx.scale(k,k);shield(F.hl.h,0,0,260);ctx.restore();
    ctx.save();ctx.translate(W*0.73,H*0.30);ctx.scale(k,k);shield(F.hl.a,0,0,260);ctx.restore();
    slam('V',W/2,H*0.30,90,GOLD,0);
    slam(F.hl.h.name.toUpperCase(),W/2,H*0.475,112,CHALK,(1-k)*16);
    slam(F.hl.a.name.toUpperCase(),W/2,H*0.565,112,CHALK,(1-k)*16);
    ctx.restore();
    // Why this one is the headline, stated rather than implied.
    const q=outExpo(cl((p-0.34)/0.26));
    if(q>0){ctx.save();ctx.globalAlpha=q;
      slam(F.hl.hPosText+' V '+F.hl.aPosText+' LAST SEASON',W/2,H*0.665,54,GOLD,0,800,W-200,4);
      ctx.restore()}
    const r=outExpo(cl((p-0.52)/0.26));
    if(r>0){ctx.save();ctx.globalAlpha=r;
      slam(F.hl.venue.toUpperCase(),W/2,H*0.755,52,CHALK,0,600,W-180,4);
      slam(F.hl.day+' '+F.hl.date+' · '+F.hl.time+(F.hl.tv?' · '+F.hl.tv.toUpperCase():''),
        W/2,H*0.815,46,'rgba(237,245,239,0.7)',0,600,W-180,4);ctx.restore()}
  }
  else if(t<T.sign[0]){                               // ---- the table it lands on
    const p=pOf(t,'table');
    kicker(p,F.tableLabel);
    title(p,'AS IT STANDS');
    const top=H*0.275,gap=H*0.115;
    F.tableRows.forEach((r,i)=>{
      const k=outBack(cl((p-0.10-i*0.085)/0.32));if(k<=0)return;
      const y=top+gap*i;
      ctx.save();ctx.globalAlpha=cl(k*1.4);ctx.translate((1-k)*30,0);
      panel(PX,y-46,PW,92,24);
      rowText(String(r.pos),PX+50,y,58,r.pos===1?GOLD:'rgba(237,245,239,0.55)',800,'center');
      shield(r.club,PX+130,y,72);
      const s=fitFont(r.club.short.toUpperCase(),800,PW-520,46);
      ctx.font='800 '+s+'px "Barlow Condensed"';ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillStyle=CHALK;ctx.fillText(r.club.short.toUpperCase(),PX+180,y);
      rowText(r.gd,PX+PW-150,y,44,'rgba(237,245,239,0.7)',800,'right');
      rowText('GD',PX+PW-150,y+34,24,'rgba(237,245,239,0.45)',600,'right');
      rowText(String(r.pts),PX+PW-46,y,58,CHALK,800,'right');
      rowText('PTS',PX+PW-46,y+36,24,'rgba(237,245,239,0.45)',600,'right');
      ctx.restore();
    });
    const q=outExpo(cl((p-0.62)/0.26));
    if(q>0){ctx.save();ctx.globalAlpha=q;
      slam('FULL TABLE ON GIBSON',W/2,H*0.885,52,GOLD,0,800,W-220,6);ctx.restore()}
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
