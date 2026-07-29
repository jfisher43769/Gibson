import React from "react";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

export function OddsStrip({ odds, homeLabel, awayLabel }) {
  if (!odds) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", gap: 6, marginTop: 10,
        fontSize: 12, color: dim, fontStyle: "italic",
      }}>GIBSON's still crunching this one — estimate lands closer to kick-off</div>
    );
  }
  const cell = (label, val) => (
    <div style={{ flex: 1, textAlign: "center", ...SURFACE.card, borderRadius: 8, padding: "7px 4px" }}>
      <div style={{ fontSize: 12, color: dim, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: chalk, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{val.toFixed(2)}</div>
    </div>
  );
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 4 }}>
        1X2 · GIBSON estimate
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {cell(homeLabel, odds.home)}
        {cell("Draw", odds.draw)}
        {cell(awayLabel, odds.away)}
      </div>
    </div>
  );
}

export function OddsDisclaimer() {
  return (
    <div style={{ fontSize: 12, color: dim, marginTop: 12, lineHeight: 1.5, borderTop: `1px solid ${faint}`, paddingTop: 10 }}>
      Odds shown are GIBSON's own estimates for context — not bookmaker prices, not a betting offer, and
      GIBSON has no link to any bookmaker. 18+. If gambling stops being fun, free support is available at
      begambleaware.org.
    </div>
  );
}
