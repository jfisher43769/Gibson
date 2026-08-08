// GIBSON — still social cards (1080x1350 PNG), for posting alongside the videos.
//
//   node scripts/promo/cards.mjs
//
// Renders a matchday set: this round's fixtures, tonight's headline tie, the champions
// being chased, and the shape of the season. Everything is read from data.js — the round
// is whichever one is next by real kick-off time, so this needs no arguments and no edits
// week to week.

import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const FONT_DIR = join(REPO, "node_modules/@fontsource/barlow-condensed/files");
const OUT_DIR = process.env.PROMO_OUT || join(REPO, "promo-out");
const W = 1080, H = 1350;

if (!existsSync(FONT_DIR)) {
  console.error("Missing @fontsource/barlow-condensed. Run:\n  npm install --no-save @fontsource/barlow-condensed");
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

const D = await import(`file://${REPO}/data.js`);
const clubOf = (c) => ({ code: c, ...D.CLUBS[c] });
const now = Number(process.env.NOW_MS) || Date.now();

// The round being played next, and its fixtures within the coming week — so a game moved
// months ahead (Larne v Bangor, shifted to September) doesn't appear on a matchday card.
const next = D.nextLeagueFixture(now);
if (!next) throw new Error("no upcoming league fixture — nothing to make a matchday card from");
const round = D.FIXTURES_2627.find((r) => r.round === next.round);
const WEEK_MS = 7 * 24 * 3600 * 1000;
const fixtures = round.matches
  .map((m) => ({ ...m, ms: D.fixtureKickoffMs(round, m) }))
  .filter((m) => m.ms !== null && m.ms >= now - D.LIVE_WINDOW_MS && m.ms <= next.kickoffMs + WEEK_MS)
  .sort((a, b) => a.ms - b.ms)
  .map((m) => ({
    h: clubOf(m.h), a: clubOf(m.a),
    day: String(m.d || round.date).split(" ")[0].toUpperCase(),
    date: String(m.d || round.date).replace(/^\w+\s+/, "").toUpperCase(),
    time: (m.t || round.time || "3pm").toUpperCase(),
  }));

const headline = { h: clubOf(next.h), a: clubOf(next.a), venue: D.CLUB_META[next.h]?.ground || "", time: next.time.toUpperCase(),
  day: String(next.date).split(" ")[0].toUpperCase(), date: String(next.date).replace(/^\w+\s+/, "").toUpperCase() };
const goals = D.GOALS_STATS.find((g) => g.club === next.a) || D.GOALS_STATS.find((g) => g.club === next.h);
const champion = D.FULL_TABLE[0];
const clubCount = [...new Set(D.FIXTURES_2627.flatMap((r) => r.matches.flatMap((m) => [m.h, m.a])))].length;

// "It starts today" is true on one morning a season. After that the card is a matchday
// card, not a launch card, and printing the launch line over a round that is already
// under way says the season hasn't begun when it plainly has.
const opener = D.seasonOpener();
const seasonStarted = opener ? now >= opener.kickoffMs : false;
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
const matchdayTitle = !seasonStarted && opener && sameDay(now, opener.kickoffMs)
  ? "IT STARTS TODAY"
  : (fixtures.length && sameDay(now, next.kickoffMs) ? "TODAY IN THE LEAGUE" : "NEXT UP");

const facts = {
  round: next.round, fixtures, headline, matchdayTitle,
  goals: { code: goals.club, name: D.CLUBS[goals.club].name, avg: goals.avg, o25: goals.o25 },
  champion: { ...clubOf(champion.club), pts: champion.pts, note: D.ROLL_OF_HONOUR[0].note },
  chasing: clubCount - 1, clubCount, rounds: D.FIXTURES_2627.length,
  seasonDisplay: D.SEASON.current.display,
};
console.log(`round ${facts.round} · ${fixtures.length} fixtures · "${matchdayTitle}" · headline ${headline.h.name} v ${headline.a.name}`);

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
const PX=76,PW=W-152;

// Shared card furniture: background, corner rule, footer wordmark.
function frame(){
  ctx.fillStyle=BG;ctx.fillRect(0,0,W,H);
  const g=ctx.createLinearGradient(0,0,W,H);
  g.addColorStop(0,'rgba(255,182,39,0.07)');g.addColorStop(0.6,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle=GOLD;ctx.fillRect(PX,64,120,8);
  cup(W-PX-34,H-70,74);
  rowText('GIBSONSTATS.COM',PX,H-64,34,'rgba(237,245,239,0.55)',600);
}
function finish(){ ctx.drawImage(scan,0,0); grain(99,0.022); vignette(); }

const CARDS={};

// 1. The round's fixtures.
CARDS['matchday']=()=>{
  frame();
  ctx.textAlign='left';
  rowText('ROUND '+F.round,PX,132,44,GOLD,800);
  const s=fitFont(F.matchdayTitle,800,PW,132);
  ctx.font='800 '+s+'px "Barlow Condensed"';ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.fillStyle=CHALK;ctx.fillText(F.matchdayTitle,PX,246);
  const n=F.fixtures.length, top=306, gap=Math.min(210,(H-top-176)/n);
  F.fixtures.forEach((f,i)=>{
    const y=top+i*gap;
    panel(PX,y,PW,gap-14,22);
    const cy=y+(gap-14)/2;
    shield(f.h,PX+56,cy,72); shield(f.a,PX+140,cy,72);
    const nm=f.h.name.toUpperCase()+'  V  '+f.a.name.toUpperCase();
    rowText(nm,PX+196,cy-16,fitFont(nm,700,PW-330,40),CHALK,700);
    rowText(f.day+' '+f.date+' · '+f.time,PX+196,cy+22,30,'rgba(237,245,239,0.6)',600);
  });
  finish();
};

// 2. Tonight's headline tie.
CARDS['tonight']=()=>{
  frame();
  const {h,a}=F.headline;
  sweep(0.5,h.colors[0],a.colors[0]);
  ctx.fillStyle=GOLD;ctx.fillRect(PX,64,120,8);
  rowText('ROUND '+F.round+' · FIRST WHISTLE',PX,132,40,GOLD,800);
  shield(h,W*0.29,H*0.34,260); shield(a,W*0.71,H*0.34,260);
  slam('V',W/2,H*0.34,92,GOLD,0);
  slam(h.name.toUpperCase(),W/2,H*0.56,116,CHALK,0);
  slam(a.name.toUpperCase(),W/2,H*0.645,116,CHALK,0);
  slam(F.headline.venue.toUpperCase(),W/2,H*0.735,52,GOLD,0,600,PW,6);
  slam(F.headline.day+' '+F.headline.date+' · '+F.headline.time,W/2,H*0.795,58,CHALK,0,800,PW);
  ctx.textAlign='left';
  rowText('GIBSONSTATS.COM',PX,H-64,34,'rgba(237,245,239,0.55)',600);
  cup(W-PX-34,H-70,74);
  finish();
};

// 3. One number worth knowing about this tie.
CARDS['number']=()=>{
  frame();
  rowText('ONE NUMBER TO KNOW',PX,132,40,GOLD,800);
  slam(String(F.goals.avg),W/2,H*0.36,330,GOLD,0);
  slam('GOALS A GAME',W/2,H*0.48,66,CHALK,0,600,PW,12);
  slam(F.goals.name.toUpperCase()+' MATCHES LAST SEASON —',W/2,H*0.60,44,'rgba(237,245,239,0.8)',0,600,PW,3);
  slam('THE MOST IN THE LEAGUE',W/2,H*0.655,54,GOLD,0,800,PW);
  slam(F.goals.o25+'% WENT OVER 2.5',W/2,H*0.745,48,CHALK,0,600,PW,5);
  ctx.textAlign='left';
  rowText('GIBSONSTATS.COM',PX,H-64,34,'rgba(237,245,239,0.55)',600);
  cup(W-PX-34,H-70,74);
  finish();
};

// 4. The champions, and how many are chasing.
CARDS['champions']=()=>{
  frame();
  const c=F.champion;
  rowText('THE TEAM TO CATCH',PX,132,40,GOLD,800);
  shield(c,W/2,H*0.31,300);
  slam(c.name.toUpperCase(),W/2,H*0.50,150,CHALK,0);
  slam('CHAMPIONS · '+c.pts+' PTS',W/2,H*0.575,58,GOLD,0,600,PW,8);
  slam(String(c.note).toUpperCase(),W/2,H*0.645,44,'rgba(237,245,239,0.7)',0,600,PW,4);
  slam(String(F.chasing),W/2,H*0.775,190,GOLD,0);
  slam('CLUBS WANT IT BACK',W/2,H*0.855,54,CHALK,0,800,PW);
  ctx.textAlign='left';
  rowText('GIBSONSTATS.COM',PX,H-64,34,'rgba(237,245,239,0.55)',600);
  cup(W-PX-34,H-70,74);
  finish();
};

// 5. The season in three numbers.
CARDS['season']=()=>{
  frame();
  rowText(F.seasonDisplay+' · THE SEASON AHEAD',PX,132,40,GOLD,800);
  [[String(F.rounds),'ROUNDS'],[String(F.clubCount),'CLUBS'],['1','GIBSON CUP']].forEach((r,i)=>{
    const y=H*0.30+i*H*0.205;
    slam(r[0],W/2,y,168,CHALK,0);
    slam(r[1],W/2,y+92,54,GOLD,0,600,PW,12);
  });
  ctx.textAlign='left';
  rowText('GIBSONSTATS.COM',PX,H-64,34,'rgba(237,245,239,0.55)',600);
  cup(W-PX-34,H-70,74);
  finish();
};

window.__names=Object.keys(CARDS);
window.__render=(n)=>{CARDS[n]();return cv.toDataURL('image/png')};
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

const names = await page.evaluate(() => window.__names);
for (const n of names) {
  const url = await page.evaluate((k) => window.__render(k), n);
  const out = join(OUT_DIR, `gibson-card-${n}.png`);
  writeFileSync(out, Buffer.from(url.slice(url.indexOf(",") + 1), "base64"));
  console.log("wrote", out);
}
await browser.close();
