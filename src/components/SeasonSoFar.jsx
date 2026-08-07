import React from "react";
import {
  SEASON, aggregateMatchStats, currentSeasonStats, recordedCoverage,
} from "../../data.js";
import { Crest } from "./Crest.jsx";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// "26/27 so far" — the new season's numbers from the moment there is one result, without
// waiting for the curated season blocks that don't exist until well into a campaign.
//
// Two kinds of number live here and they are treated differently:
//
//   Derived (points per game, clean sheets, home/away, goals per game) come from the results
//   themselves. They are complete by construction — if a match is recorded, it is in them.
//
//   Recorded (possession, shots) are typed in by hand after a match, and not every match gets
//   written up. Any TOTAL across them would flatter whoever happened to be recorded, so that
//   section only appears once coverage is complete. Partial data presented as a total is the
//   wrong-number problem golden rule 1 exists to prevent, and it is worse than showing nothing
//   because it looks authoritative.
//
// Top scorers deliberately absent: graphics aren't made for every match, so MATCH_EVENTS will
// always be a subset and a scorer table would understate everyone whose goals went unrecorded.
// The data is still kept per-match in data.js — it just isn't totalled here.

const label = { fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 };

function Stat({ value, unit, name }) {
  return (
    <div style={{ ...SURFACE.card, borderRadius: 12, padding: "12px 14px", flex: "1 1 0", minWidth: 92 }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 28, color: "#FFB627", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}<span style={{ fontSize: 15, color: dim }}>{unit || ""}</span>
      </div>
      <div style={{ fontSize: 11, color: dim, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 5, lineHeight: 1.3 }}>{name}</div>
    </div>
  );
}

export function SeasonSoFar() {
  const s = currentSeasonStats();
  if (!s.matches) return null;                     // nothing has been played; say nothing

  const cover = recordedCoverage();
  const byPpg = [...s.clubs].filter((c) => c.p > 0).sort((a, b) => b.ppg - a.ppg || b.gd - a.gd);
  const teamStats = cover.statsComplete ? aggregateMatchStats().slice(0, 5) : [];
  const g = s.league;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={label}>{SEASON.current.display} so far · {s.matches} match{s.matches === 1 ? "" : "es"}</div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Stat value={g.avgGoals} name="Goals per game" />
        <Stat value={g.o25Pct} unit="%" name="Over 2.5" />
        <Stat value={g.btsPct} unit="%" name="Both scored" />
        <Stat value={g.homeWinPct} unit="%" name="Home wins" />
      </div>

      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
        {byPpg.map((c, i) => (
          <div key={c.club} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
            borderBottom: i < byPpg.length - 1 ? `1px solid ${faint}` : "none",
          }}>
            <Crest club={c.club} size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0 }}>{c.club}</span>
            <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums" }}>
              {c.gf}–{c.ga} · {c.cs} CS
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17, color: chalk,
              fontVariantNumeric: "tabular-nums", width: 42, textAlign: "right",
            }}>{c.ppg}</span>
            <span style={{ fontSize: 11, color: dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>ppg</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: dim, lineHeight: 1.5, marginBottom: teamStats.length ? 16 : 0 }}>
        Derived from every recorded result — points per game, clean sheets and goal rates need
        nothing but the scorelines, so they are complete for the {s.matches} match{s.matches === 1 ? "" : "es"} played.
      </div>

      {teamStats.length > 0 && (<>
        <div style={{ ...label, marginTop: 4 }}>Possession &amp; shooting · per match</div>
        <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
          {teamStats.map((t, i) => (
            <div key={t.club} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
              borderBottom: i < teamStats.length - 1 ? `1px solid ${faint}` : "none",
            }}>
              <Crest club={t.club} size={20} />
              <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0 }}>{t.club}</span>
              <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums" }}>
                {t.shots} shots · {t.accuracy}% on target
              </span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>{t.poss}%</span>
            </div>
          ))}
        </div>
      </>)}

      {/* Say why a section is missing rather than leaving a silent gap — an absent top-scorer
          table with no explanation reads as a bug rather than as a deliberate omission. */}
      {!cover.statsComplete && (
        <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
          Possession and shooting are entered by hand and cover {cover.stats} of the {cover.played}{" "}
          match{cover.played === 1 ? "" : "es"} played. Averages appear once every match has been
          written up — figures built from some of the games would flatter whoever happened to be
          recorded.
        </div>
      )}
    </div>
  );
}
