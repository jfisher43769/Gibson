import React from "react";
import {
  EARLY_SEASON_GAMES, SEASON, seasonStatus,
} from "../../data.js";
import { OVERLAY, dim, faint } from "../lib/theme.js";

export function SubNav({ items, value, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 8, position: "sticky", top: 0, zIndex: 5,
      background: "#0B1512", margin: "0 -18px 14px", padding: "10px 18px",
    }}>
      {items.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase",
          background: value === id ? "#FFB627" : OVERLAY.fill,
          color: value === id ? "#0B1512" : dim,
          border: `1px solid ${value === id ? "#FFB627" : faint}`,
        }}>{label}</button>
      ))}
    </div>
  );
}

/* ================= SEASON SELECTOR =================
   Every stats surface (Stats tab, Players, club pages) can switch between the current
   season and last completed one. Which is shown by default comes from seasonStatus():
   early in a new campaign there's little or no current-season data, so we lead with last
   season's completed numbers — clearly labelled — and keep the current season one tap
   away. Once EARLY_SEASON_GAMES games are played, current becomes the default. Games
   played is derived from results in the fixture list, never hardcoded. */
