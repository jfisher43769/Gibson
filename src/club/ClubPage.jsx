import React, { useState } from "react";
import {
  CLUBS, CLUB_META, CLUB_TOP_SCORERS, DISCIPLINE, FIXTURES_2627, FULL_TABLE, GOALS_STATS, INJURIES, MARKET_VALUES, PLAYERS, ROLL_OF_HONOUR, SEASON, STATUS_META, TEAM_STATS_2526, TRANSFERS, TRAVEL, WINDOW, XG_PLAYERS, XG_TEAMS, liveSeasonId, seasonLabel, seasonStatus,
} from "../../data.js";
import { ClubSection } from "./ClubSection.jsx";
import { Avatar } from "../components/Avatar.jsx";
import { GibsonBoundary } from "../components/Boundary.jsx";
import { Crest } from "../components/Crest.jsx";
import { NoSeasonData, SeasonSwitch } from "../components/SeasonSwitch.jsx";
import { OVERLAY, SURFACE, chalk, dim, faint, ratingColor } from "../lib/theme.js";
import { FixturesView } from "../tabs/MatchesTab.jsx";

export function ClubPage({ club, onBack }) {
  const c = CLUBS[club];
  const c1 = c.colors[0];
  const ord = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
  const tableIdx = FULL_TABLE.findIndex((r) => r.club === club);
  const row = tableIdx >= 0 ? FULL_TABLE[tableIdx] : null;
  const pos = tableIdx >= 0 ? tableIdx + 1 : null;
  const mv = MARKET_VALUES.find((m) => m.club === club);
  const xg = XG_TEAMS.find((t) => t.club === club);
  const teamStat = TEAM_STATS_2526.find((t) => t.club === club);
  const goalsStat = GOALS_STATS.find((t) => t.club === club);
  const yellows = DISCIPLINE.yellows.filter((p) => p.club === club);
  const reds = DISCIPLINE.reds.filter((p) => p.club === club);
  const indexPlayers = PLAYERS.filter((p) => p.club === club).sort((a, b) => b.rating - a.rating);
  const scorers = XG_PLAYERS.filter((p) => p.club === club);
  const topScorer = CLUB_TOP_SCORERS[club];
  const injuries = INJURIES.filter((p) => p.club === club);
  const win = WINDOW.find((w) => w.club === club);
  const feed = TRANSFERS.filter((t) => t.from === club || t.to === club);
  const titles = ROLL_OF_HONOUR.filter((r) => r.club === club);
  const meta = CLUB_META[club]; // ground/capacity/founded/website — Wikidata (CC0), null until sourced
  const travel = TRAVEL.clubs[club]; // season away miles, derived from CLUB_META + FIXTURES_2627
  const status = seasonStatus();
  const [season, setSeason] = useState(status.defaultSeason);
  const noteLabel = { C: "Champions · Gibson Cup", IC: "Irish Cup winners", E: "Europe (automatic)", EPO: "Europe (play-off)", PO: "Relegation play-off", R: "Relegated" };

  const empty = (msg) => <div style={{ fontSize: 13, color: dim, fontStyle: "italic", padding: "8px 0" }}>{msg}</div>;
  // minWidth: 0 is the real fix — without it, a grid item's default min-width:auto refuses
  // to shrink below its content's unwrapped width, so a narrow column (e.g. a 4th tile
  // wrapping alone on a phone) forces the value to bleed past the card edge instead of
  // shrinking to fit. clamp() scales the font down for that squeeze; overflowWrap is the
  // last-resort safety net for values still too wide even at the smallest size.
  const tile = (label, value, accent) => (
    <div style={{ ...SURFACE.card, borderRadius: 10, padding: "10px 8px", textAlign: "center", minWidth: 0 }}>
      <div style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: "clamp(15px, 5.5vw, 24px)",
        color: accent || chalk, lineHeight: 1.05, fontVariantNumeric: "tabular-nums",
        overflowWrap: "anywhere",
      }}>{value}</div>
      <div style={{ fontSize: 12, color: dim, marginTop: 3 }}>{label}</div>
    </div>
  );
  const subhead = { fontSize: 12, color: dim, letterSpacing: "0.1em", textTransform: "uppercase", margin: "12px 0 6px" };
  const cardList = (items) => (
    <div style={{ ...SURFACE.flat, borderRadius: 12, overflow: "hidden" }}>{items}</div>
  );

  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <button onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14, padding: "7px 14px",
        borderRadius: 999, cursor: "pointer", background: OVERLAY.fill, color: chalk, border: `1px solid ${faint}`,
        fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>← Back</button>

      {/* Header — a subtle club-colour tint over the house dark green; GIBSON stays dominant */}
      <GibsonBoundary minHeight="140px">
        <div style={{
          background: `linear-gradient(135deg, ${c1}22, transparent 62%), rgba(240,255,245,0.03)`,
          border: `1px solid ${faint}`, borderRadius: 14, padding: "18px 16px", marginBottom: 22,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: row || mv ? 14 : 0 }}>
            <Crest club={club} size={54} tappable={false} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 26, textTransform: "uppercase", color: chalk, lineHeight: 1 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: dim, marginTop: 4 }}>{c.ground}</div>
              {row && row.note && <div style={{ fontSize: 12, color: "#FFB627", marginTop: 4 }}>{noteLabel[row.note]} · {seasonLabel("FULL_TABLE")}</div>}
            </div>
          </div>
          {row ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 8 }}>
              {tile("25/26", ord(pos), "#FFB627")}
              {tile("W-D-L", `${row.w}-${row.d}-${row.l}`)}
              {tile("Points", row.pts)}
              {mv && tile("Squad value", `€${mv.total.toFixed(2)}m`)}
            </div>
          ) : (
            <>
              {empty("Promoted from the Championship — no 25/26 Premiership record.")}
              {mv && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 8 }}>{tile("Squad value", `€${mv.total.toFixed(2)}m`)}</div>}
            </>
          )}
        </div>
      </GibsonBoundary>

      {/* Club info — ground/capacity/founded from Wikidata (CC0); season travel derived
          from those coordinates + the 26/27 fixture list. Null fields render as
          "not yet available" rather than a guess. */}
      <ClubSection title="Club info">
        {(meta?.founded || meta?.ground || meta?.capacity || travel) ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
            {meta?.founded && tile("Founded", meta.founded)}
            {meta?.ground && tile("Ground", meta.ground)}
            {meta?.capacity && tile("Capacity", meta.capacity.toLocaleString())}
            {travel && tile("Season travel", `${travel.totalMiles.toLocaleString()} mi`)}
          </div>
        ) : empty("Club metadata not yet available.")}
        {travel?.longestTrip && (
          <div style={{ fontSize: 12, color: dim, marginTop: 10 }}>
            Longest away trip: <span style={{ color: chalk }}>{travel.longestTrip.miles} mi</span> to {travel.longestTrip.opponent}
          </div>
        )}
        {meta?.website && (
          <div style={{ marginTop: 10 }}>
            <a href={meta.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "#FFB627" }}>Official website ↗</a>
          </div>
        )}
        {meta && <div style={{ fontSize: 11, color: "rgba(143,166,155,0.5)", marginTop: 10 }}>Source: {meta.source}</div>}
      </ClubSection>

      {/* Season */}
      {/* Season selector — governs the two season-scoped sections below (Season + Squad).
          Club info, fixtures, transfers and honours aren't season stats, so they stay put. */}
      <SeasonSwitch value={season} onChange={setSeason} status={status} />
      {!(season === liveSeasonId() && FULL_TABLE.length > 0) ? (
        <ClubSection title={`Season · ${season === SEASON.current.id ? SEASON.current.display : SEASON.previous.display}`}>
          <NoSeasonData status={status} what="Stats" seasonId={season} />
        </ClubSection>
      ) : (<>
      <ClubSection title={`Season · ${seasonLabel("XG_TEAMS")}`}>
        {xg ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            {tile("xG for", xg.xg.toFixed(2), "#3DDC84")}
            {tile("xG against", xg.xga.toFixed(2))}
            {tile("xG diff", `${xg.xgd >= 0 ? "+" : "−"}${Math.abs(xg.xgd).toFixed(2)}`, xg.xgd >= 0 ? "#3DDC84" : "#E8663C")}
          </div>
        ) : empty("No expected-goals data for 25/26.")}
        {(teamStat || goalsStat) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))", gap: 8, marginBottom: 12 }}>
            {teamStat && tile("Goals", teamStat.goals, "#3DDC84")}
            {teamStat && tile("Possession", `${teamStat.poss.toFixed(0)}%`)}
            {goalsStat && tile("Goals/game", goalsStat.avg.toFixed(2))}
            {goalsStat && tile("Clean sheets", `${goalsStat.cs}%`)}
          </div>
        )}
        <div style={subhead}>Discipline · {seasonLabel("DISCIPLINE")}</div>
        {yellows.length || reds.length ? cardList(
          [...yellows.map((p) => [p, "🟨", "#FFB627"]), ...reds.map((p) => [p, "🟥", "#E8663C"])].map(([p, icon, col], i, arr) => (
            <div key={p.player + icon} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: i < arr.length - 1 ? `1px solid ${faint}` : "none" }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ fontSize: 13, color: chalk, flex: 1 }}>{p.player}</span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: col, fontVariantNumeric: "tabular-nums" }}>{p.n}</span>
            </div>
          ))
        ) : empty("No booking data recorded for 25/26.")}
      </ClubSection>

      {/* Squad */}
      <ClubSection title={`Squad · ${seasonLabel("PLAYERS")}`}>
        {indexPlayers.length ? cardList(
          indexPlayers.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderBottom: i < indexPlayers.length - 1 ? `1px solid ${faint}` : "none" }}>
              <Avatar player={p} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: chalk }}>{p.name}</div>
                <div style={{ fontSize: 12, color: dim }}>{p.pos} · {p.goals}g · {p.assists}a</div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, color: ratingColor(p.rating), fontVariantNumeric: "tabular-nums" }}>{p.rating.toFixed(1)}</div>
            </div>
          ))
        ) : empty("GIBSON Index ratings are added club by club, not simulated — coverage builds up as the 2026/27 season is played.")}

        {/* Club top scorer — Transfermarkt, all competitions. Deliberately separate from the
            xG block below: that one is league-only FootyStats data, and this view publishes
            no xG, so the two must never be shown as comparable. */}
        {topScorer && (<>
          <div style={subhead}>Top scorer · {seasonLabel("CLUB_TOP_SCORERS")}</div>
          {cardList(
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 13px" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: chalk }}>{topScorer.player}</div>
                <div style={{ fontSize: 12, color: dim }}>
                  {topScorer.apps} apps · a goal every {topScorer.minsPerGoal} mins
                </div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 22, color: "#3DDC84", fontVariantNumeric: "tabular-nums" }}>{topScorer.goals}</div>
            </div>
          )}
          <div style={{ fontSize: 11, color: "rgba(143,166,155,0.5)", marginTop: 6 }}>
            All competitions{topScorer.comp ? ` · ${topScorer.comp}` : ""} · Transfermarkt
          </div>
        </>)}

        {scorers.length > 0 && (<>
          <div style={subhead}>Goals vs expected · {seasonLabel("XG_PLAYERS")}</div>
          {cardList(scorers.map((p, i) => {
            const diff = p.goals - p.xg;
            return (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: i < scorers.length - 1 ? `1px solid ${faint}` : "none" }}>
                <span style={{ fontSize: 13, color: chalk, flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums" }}>{p.goals}g / {p.xg.toFixed(1)} xG</span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, minWidth: 44, textAlign: "right", color: diff >= 2 ? "#3DDC84" : diff <= -1 ? "#E8663C" : chalk, fontVariantNumeric: "tabular-nums" }}>{diff >= 0 ? "+" : "−"}{Math.abs(diff).toFixed(1)}</span>
              </div>
            );
          }))}
        </>)}

        <div style={subhead}>Treatment table</div>
        {injuries.length ? cardList(
          injuries.map((inj, i) => (
            <div key={inj.player} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: i < injuries.length - 1 ? `1px solid ${faint}` : "none" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1 }}>{inj.player}</span>
              <span style={{ fontSize: 12, color: "#E8663C" }}>✚ {inj.injury}</span>
            </div>
          ))
        ) : empty("No current injuries — squad at full strength.")}
      </ClubSection>
      </>)}

      {/* Transfers */}
      <ClubSection title="Summer window 2026">
        {win ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["→ In", win.ins, "#3DDC84"], ["← Out", win.outs, "#E8663C"]].map(([t, items, col]) => (
              <div key={t} style={{ ...SURFACE.flat, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, color: col, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{t}</div>
                {items.length === 0 && <div style={{ fontSize: 12, color: dim, fontStyle: "italic" }}>None recorded</div>}
                {items.map(([p, place]) => (
                  <div key={p + place} style={{ marginBottom: 7 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: chalk, lineHeight: 1.3 }}>{p}</div>
                    <div style={{ fontSize: 12, color: dim }}>{place}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : empty("No confirmed window business recorded yet.")}
        {feed.length > 0 && (<>
          <div style={subhead}>In the transfer feed</div>
          <div style={{ display: "grid", gap: 8 }}>
            {feed.map((t) => {
              const meta = STATUS_META[t.status];
              return (
                <div key={t.id} style={{ ...SURFACE.card, borderLeft: `3px solid ${meta.color}`, borderRadius: 12, padding: "10px 13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15, color: chalk }}>{t.player}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: dim, marginTop: 4, lineHeight: 1.4 }}>{t.note}</div>
                </div>
              );
            })}
          </div>
        </>)}
      </ClubSection>

      {/* Fixtures — reuses the existing by-club fixtures view, locked to this club */}
      <ClubSection title="Fixtures · 26/27">
        <FixturesView key={club} fixedClub={club} />
        <a href={`/calendar/${club}.ics`} style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 10, padding: "7px 14px",
          borderRadius: 999, background: OVERLAY.fill, color: chalk, border: `1px solid ${faint}`, textDecoration: "none",
          fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>📅 Add to calendar</a>
      </ClubSection>

      {/* Honours */}
      <ClubSection title="Honours · league titles, last 12 seasons">
        {titles.length ? (
          <>
            <div style={{ fontSize: 13, color: chalk, marginBottom: 8 }}>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>{titles.length}</span> title{titles.length > 1 ? "s" : ""} since 2014/15
            </div>
            {cardList(titles.map((t, i) => (
              <div key={t.season} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 13px", borderBottom: i < titles.length - 1 ? `1px solid ${faint}` : "none" }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 14, color: dim, width: 62, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{t.season}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1 }}>Champions 🏆</span>
                {t.note && <span style={{ fontSize: 12, color: "#FFB627" }}>{t.note}</span>}
              </div>
            )))}
          </>
        ) : empty("No league titles in the last 12 seasons.")}
      </ClubSection>
    </div>
  );
}
