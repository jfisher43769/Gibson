import React, { useContext } from "react";
import {
  CLUBS, CLUB_FIXTURES, EURO, FIXTURES_2627, LEAGUE_LORE, LIVE_WINDOW_MS, PREDICTOR_GW, STATUS_META, TRANSFERS,
  londonKickoffLabel, nextLeagueFixture,
} from "../../data.js";
import { ClubNavContext, Crest } from "../components/Crest.jsx";
import { TvBadge } from "../components/TvBadge.jsx";
import { CountUp } from "../components/CountUp.jsx";
import { findLive, useLiveEvents } from "../lib/live.js";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// One side of the scoreboard. A Premiership club shows its crest, which is what the rest of
// the app leads with; a European opponent isn't in CLUBS so Crest can't draw it, and that
// side falls back to the derived code. The fallback is given the crest's exact height so the
// two sides of the board stay on the same baseline either way.
function BoardSide({ crest, code, name }) {
  const CREST = 38;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 84 }}>
      {crest ? <Crest club={crest} size={CREST} /> : (
        <span style={{
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 26, letterSpacing: "0.2em",
          color: chalk, lineHeight: `${Math.round(CREST * 1.15)}px`,
        }}>{code}</span>
      )}
      <span style={{
        fontSize: 10.5, fontWeight: 700, color: dim, textTransform: "uppercase", letterSpacing: "0.04em", lineHeight: 1.15,
        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
      }}>{name}</span>
    </div>
  );
}

export function HomeView({ goTo }) {
  const openClub = useContext(ClubNavContext);
  const live = useLiveEvents();
  const now = Date.now();
  // LIVE_WINDOW_MS (a kick-off within the last 2.5h still counts as "the match", because
  // the result isn't in data.js while the game is on) comes from data.js so this and
  // nextLeagueFixture() cannot drift apart.
  // Soonest still-relevant (future, or within the live window), non-provisional fixture
  // per club, picked by real kick-off time — not by array/object order, so whichever
  // club's dt is earliest wins regardless of which key comes first in CLUB_FIXTURES.
  const nextEuro = [];
  for (const club of Object.keys(CLUB_FIXTURES)) {
    const eligible = CLUB_FIXTURES[club]
      .filter((x) => !x.opp.includes("*") && x.dt && new Date(x.dt).getTime() >= now - LIVE_WINDOW_MS)
      .sort((a, b) => new Date(a.dt) - new Date(b.dt));
    if (eligible[0]) nextEuro.push({ club, ...eligible[0] });
  }
  nextEuro.sort((a, b) => new Date(a.dt) - new Date(b.dt));
  // The next league game by real kick-off time. This used to be hardcoded to round 1's
  // first match, so from the second matchday onward the board advertised a game that had
  // already been played, all season. Now it advances on its own.
  const nextLeague = nextLeagueFixture(now);
  // Season's over (or every remaining fixture is unreadable): keep showing the last one
  // rather than rendering an empty board.
  const lastRound = FIXTURES_2627[FIXTURES_2627.length - 1];
  const leagueFix = nextLeague || {
    round: lastRound.round, h: lastRound.matches[0].h, a: lastRound.matches[0].a,
    date: lastRound.date, time: lastRound.time || null, kickoffMs: Infinity, done: true,
  };
  const resultsIn = PREDICTOR_GW.fixtures.every((f) => f.result);
  const feed = TRANSFERS.slice(0, 3);
  // One lore entry per day, rotating by day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const lore = LEAGUE_LORE[dayOfYear % LEAGUE_LORE.length];
  const label = { fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 };
  // Stadium scoreboard hero for the very next fixture, European or league, whichever
  // kicks off first — so the board always names a match that is actually still to come.
  // External opponents get a derived code (RSB, HJK, TF).
  // The board shows whichever comes first, Europe or the league — not Europe by default.
  // A European tie used to always win the hero slot, which was right in July when the only
  // fixtures were European and wrong from August on.
  const euroFirst = nextEuro[0] || null;
  const leagueIsSooner = !euroFirst || (leagueFix.kickoffMs < new Date(euroFirst.dt).getTime());
  const heroFix = leagueIsSooner ? null : euroFirst;      // set only when Europe leads
  const restEuro = nextEuro.slice(heroFix ? 1 : 0);
  // The league row in "Next up" — omitted when that same game is already the hero.
  const upcomingLeague = leagueIsSooner ? null : leagueFix;
  const oppCode = (name) => {
    const first = name.split(" ")[0];
    return first === first.toUpperCase() && first.length <= 4
      ? first
      : name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3);
  };
  // Home colours for the scoreboard's side accent bars. The home club's is always known
  // (CLUBS[...].colors[0]); the away side is only coloured when it's a Premiership club or
  // an external opponent whose colour the owner has confirmed (EURO[...].oppColor) — an
  // unknown opponent gets no bar rather than an invented one.
  // CLUB_FIXTURES bakes the venue indicator into opp itself ("FC Iberia 1999 (h)"), which
  // reads fine in the prose sub-line but is redundant clutter under a name already paired
  // with its own club — strip it for the compact label only.
  const stripVenueTag = (name) => name.replace(/\s*\((?:h|a)\)\s*$/i, "");
  const board = heroFix
    ? {
        home: heroFix.club, away: oppCode(heroFix.opp), date: heroFix.date,
        // Only the Premiership club has a crest; a European opponent falls back to its code.
        homeCrest: heroFix.club, awayCrest: null,
        homeName: CLUBS[heroFix.club].name, awayName: stripVenueTag(heroFix.opp),
        homeColor: CLUBS[heroFix.club].colors[0],
        awayColor: EURO.find((e) => e.club === heroFix.club)?.oppColor || null,
        // Rendered from the tie's UTC dt, so it stays right either side of the clocks going back.
        time: londonKickoffLabel(heroFix.dt),
        sub: `${CLUBS[heroFix.club].name} v ${heroFix.opp} · ${heroFix.comp}`,
      }
    : {
        home: leagueFix.h, away: leagueFix.a, date: leagueFix.date.replace(/^\w+\s+/, ""),
        homeCrest: leagueFix.h, awayCrest: leagueFix.a,
        homeName: CLUBS[leagueFix.h].name, awayName: CLUBS[leagueFix.a].name,
        homeColor: CLUBS[leagueFix.h].colors[0], awayColor: CLUBS[leagueFix.a].colors[0],
        // Past the last fixture the board is showing a game that has been played, so the
        // kick-off time would be stating something that already happened.
        time: leagueFix.done ? null : leagueFix.time || null,
        // "Opening night" is true exactly once. After that the board names the round, and
        // once the fixture list runs out it stops claiming anything is coming.
        sub: `${CLUBS[leagueFix.h].name} v ${CLUBS[leagueFix.a].name} · ${
          leagueFix.done ? "Final round" : leagueFix.round === 1 ? "Premiership opening night" : `Premiership round ${leagueFix.round}`
        }`,
        tv: leagueFix.tv || null,
      };
  // If the match the board is advertising has actually kicked off, stop advertising it and
  // show the score. Without this the front page says "NEXT MATCH · 7 AUG · 7.45PM" for a game
  // that is already an hour old, which is the same wrong-number problem the results list had.
  const liveMatch = findLive(live.data, board.home, board.away);
  const heroDate = board.date.match(/^(\d+)(\S*)(.*)$/);
  return (
    <div className="gb-narrow" style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 14, padding: "20px 16px 15px",
        marginBottom: 14, textAlign: "center",
        background: "linear-gradient(180deg, #0A140F, #060D0A)",
        border: "1px solid rgba(255,182,39,0.28)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 26px rgba(255,182,39,0.07)",
        animation: "boardFlicker 0.4s ease-out",
      }}>
        <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, #FFB627, transparent)" }} />
        {board.homeColor && (
          <div aria-hidden="true" style={{ position: "absolute", left: 0, top: 10, bottom: 10, width: 3, borderRadius: "0 2px 2px 0", background: board.homeColor, opacity: 0.85 }} />
        )}
        {board.awayColor && (
          <div aria-hidden="true" style={{ position: "absolute", right: 0, top: 10, bottom: 10, width: 3, borderRadius: "2px 0 0 2px", background: board.awayColor, opacity: 0.85 }} />
        )}
        <div style={{ fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          {liveMatch ? (<>
            <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#3DDC84", display: "inline-block", animation: "livePulse 1.4s infinite" }} />
            <span style={{ color: "#3DDC84", fontWeight: 800 }}>Live now</span>
          </>) : <span style={{ color: dim }}>Next match</span>}
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 18 }}>
          <BoardSide crest={board.homeCrest} code={board.home} name={board.homeName} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            {liveMatch ? (<>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 48, lineHeight: 1, color: "#FFB627", fontVariantNumeric: "tabular-nums", textShadow: "0 0 18px rgba(255,182,39,0.35)" }}>
                {liveMatch.hs}–{liveMatch.as}
              </span>
              {/* The feed's own status (2H, HT) rather than anything we work out ourselves —
                  a minute counted on the client would drift from the actual game. */}
              {liveMatch.status && (
                <span style={{
                  fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 19, lineHeight: 1,
                  letterSpacing: "0.08em", color: "#3DDC84", textTransform: "uppercase",
                }}>{liveMatch.status}</span>
              )}
            </>) : (<>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 48, lineHeight: 1, color: "#FFB627", fontVariantNumeric: "tabular-nums", textShadow: "0 0 18px rgba(255,182,39,0.35)" }}>
                {heroDate ? <><CountUp value={parseInt(heroDate[1], 10)} />{heroDate[2]}</> : board.date}
                {heroDate && heroDate[3] && <span style={{ fontSize: 20, letterSpacing: "0.12em", color: dim }}>{heroDate[3].toUpperCase()}</span>}
              </span>
              {board.time && (
                <span style={{
                  fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 19, lineHeight: 1,
                  letterSpacing: "0.08em", color: chalk, fontVariantNumeric: "tabular-nums",
                }}>{board.time.toUpperCase()}</span>
              )}
            </>)}
          </div>
          <BoardSide crest={board.awayCrest} code={board.away} name={board.awayName} />
        </div>
        <div style={{ height: 2, width: 130, margin: "13px auto 9px", background: "#FFB627", opacity: 0.7, borderRadius: 1 }} />
        <div style={{ fontSize: 12, color: dim }}>{board.sub}</div>
        {board.tv && (
          <div style={{ display: "flex", justifyContent: "center", marginTop: 9 }}>
            <TvBadge tv={board.tv} />
          </div>
        )}
      </div>
      {openClub && (<>
        <div style={{ ...label, marginBottom: 8 }}>Your club</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 18 }}>
          {Object.keys(CLUBS).filter((k) => k !== "GLV").map((k) => (
            <button key={k} onClick={() => openClub(k)} aria-label={`Open ${CLUBS[k].name} club page`} style={{
              ...SURFACE.card, borderRadius: 12, padding: "8px 3px 7px", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 48,
            }}>
              <Crest club={k} size={26} tappable={false} />
              <span style={{
                fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 10.5, color: chalk, textAlign: "center", lineHeight: 1.1,
                display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>{CLUBS[k].name}</span>
            </button>
          ))}
        </div>
      </>)}
      {(restEuro.length > 0 || heroFix) && (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ ...label, marginBottom: 0 }}>Next up</div>
          <button onClick={() => goTo("matches", "fixtures")} style={{
            fontSize: 12, fontWeight: 700, color: "#FFB627", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0,
          }}>See all →</button>
        </div>
        <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
          {restEuro.map((f) => (
            <div key={f.club + f.date} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderBottom: `1px solid ${faint}` }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#5EC8F2", width: 74, flexShrink: 0, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{f.date}</div>
              <Crest club={f.club} size={22} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{CLUBS[f.club].name} v {f.opp}</div>
                <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>{f.comp}</div>
              </div>
            </div>
          ))}
          {upcomingLeague && !upcomingLeague.done && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px" }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#FFB627", width: 74, flexShrink: 0, lineHeight: 1.2 }}>{upcomingLeague.date}</div>
              <Crest club={upcomingLeague.h} size={22} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{CLUBS[upcomingLeague.h].name} v {CLUBS[upcomingLeague.a].name}</div>
                <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>
                  {upcomingLeague.round === 1 ? "Premiership opening night" : "Premiership"} · Round {upcomingLeague.round}{upcomingLeague.time ? ` · ${upcomingLeague.time}` : ""}
                </div>
              </div>
            </div>
          )}
        </div>
      </>)}

      {nextEuro.length > 0 && (<>
        <div style={label}>Euro Watch · still standing</div>
        <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
          {nextEuro.map((f) => (
            <button key={f.club} className="gb-row" onClick={() => goTo("matches", "europe")} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer",
              ...SURFACE.card, borderRadius: 12, padding: "10px 13px",
            }}>
              <Crest club={f.club} size={22} />
              <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0 }}>
                {CLUBS[f.club].name} <span style={{ color: dim, fontWeight: 400 }}>v {f.opp} · {f.date}</span>
              </span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#5EC8F2", flexShrink: 0 }}>{f.comp.split(" · ")[0]}</span>
            </button>
          ))}
        </div>
      </>)}

      <div style={{
        borderRadius: 14, padding: "16px", marginBottom: 18,
        ...SURFACE.hero,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
          The Predictor · {PREDICTOR_GW.name} 🎯
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 4 }}>
          {PREDICTOR_GW.fixtures.length} fixtures · exact score 3 pts · {PREDICTOR_GW.deadline}
        </div>
        <button onClick={() => goTo("predictor")} style={{
          marginTop: 12, width: "100%", padding: "11px", borderRadius: 10, cursor: "pointer",
          background: "#FFB627", color: "#0B1512", border: "1px solid #FFB627",
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{resultsIn ? "Results are in — see your score →" : "Make your picks →"}</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ ...label, marginBottom: 0 }}>Latest transfer talk</div>
        <button onClick={() => goTo("more", "transfers")} style={{
          fontSize: 12, fontWeight: 700, color: "#FFB627", background: "transparent", border: "none", cursor: "pointer",
        }}>See all →</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {feed.map((t) => {
          const meta = STATUS_META[t.status];
          return (
            <div key={t.id} style={{
              ...SURFACE.card,
              borderLeft: `3px solid ${meta.color}`, borderRadius: 12, padding: "10px 13px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15, color: chalk }}>{t.player}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{meta.label}</span>
              </div>
              <div style={{ fontSize: 12, color: dim, marginTop: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.note}</div>
            </div>
          );
        })}
      </div>

      <div style={{ ...SURFACE.card, borderRadius: 14, padding: "14px", marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Did you know? · Only in the Irish League</div>
          <button onClick={() => goTo("more", "history")} style={{ fontSize: 12, fontWeight: 700, color: "#FFB627", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>See all →</button>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, textTransform: "uppercase", color: "#FFB627", lineHeight: 1.15 }}>{lore.title}</div>
        <div style={{ fontSize: 13, color: chalk, marginTop: 6, lineHeight: 1.55 }}>{lore.fact}</div>
        <div style={{ fontSize: 12, color: dim, marginTop: 6 }}>{lore.source}</div>
      </div>
    </div>
  );
}
