import React from "react";
import {
  SEASON, SEASON_ARCHIVE, seasonStartDisplay,
} from "../../data.js";
import { OVERLAY, SURFACE, chalk, dim, faint } from "../lib/theme.js";

// The "2026/27 starts 7 August" / "3 games played — early days" banner. Only shown while
// the season is still early; once real data has built up it would just be noise.
function SeasonStrip({ status }) {
  if (!status.early) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, marginBottom: 8,
      background: "rgba(255,182,39,0.08)", border: "1px solid rgba(255,182,39,0.25)",
      borderRadius: 10, padding: "8px 12px",
    }}>
      <span aria-hidden="true" style={{ fontSize: 13 }}>📅</span>
      <span style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13,
        letterSpacing: "0.08em", textTransform: "uppercase", color: "#FFB627",
      }}>{status.strip}</span>
    </div>
  );
}

export function SeasonSwitch({ value, onChange, status }) {
  const opts = [
    [SEASON.current.id, SEASON.current.display],
    [SEASON.previous.id, `${SEASON.previous.display} · last season`],
  ];
  return (
    <div style={{ marginBottom: 14 }}>
      <SeasonStrip status={status} />
      <div role="group" aria-label="Season" style={{ display: "flex", gap: 6 }}>
        {opts.map(([id, label]) => (
          <button key={id} onClick={() => onChange(id)} aria-pressed={value === id} style={{
            flex: 1, padding: "8px 10px", borderRadius: 999, cursor: "pointer",
            fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13,
            letterSpacing: "0.06em", textTransform: "uppercase",
            background: value === id ? "#FFB627" : OVERLAY.fill,
            color: value === id ? "#0B1512" : dim,
            border: `1px solid ${value === id ? "#FFB627" : faint}`,
          }}>{label}</button>
        ))}
      </div>
    </div>
  );
}

// Shown when the current season is selected but has no numbers behind it yet. Never
// invents a placeholder stat — it says plainly what exists and when more arrives.
export function NoSeasonData({ status, what = "Stats", seasonId = SEASON.current.id }) {
  const isCurrent = seasonId === SEASON.current.id;
  const display = isCurrent ? SEASON.current.display : SEASON.previous.display;
  // Two distinct reasons a season can have nothing to show, and they need different copy:
  // the current season hasn't produced the numbers yet, or an older season's numbers have
  // been rolled into SEASON_ARCHIVE and aren't wired back into these views yet.
  const body = isCurrent
    ? (status.gamesPlayed === 0
        ? `The season kicks off on ${seasonStartDisplay()}. ${what} fill in here as results come in — until then, tap ${SEASON.previous.display} for last season's completed numbers.`
        : `Only ${status.gamesPlayed} game${status.gamesPlayed === 1 ? "" : "s"} played so far — too early for these to mean much. Tap ${SEASON.previous.display} for last season's completed numbers.`)
    : `${display} has been archived. Its completed numbers are kept in the season archive — tap ${SEASON.current.display} for the live season.`;
  return (
    <div style={{ ...SURFACE.flat, borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 26, marginBottom: 8 }}>⚽</div>
      <div style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 18, textTransform: "uppercase",
        color: chalk, lineHeight: 1.15, marginBottom: 6,
      }}>No {display} {what.toLowerCase()} yet</div>
      <div style={{ fontSize: 13, color: dim, lineHeight: 1.5, maxWidth: 380, margin: "0 auto" }}>{body}</div>
    </div>
  );
}
