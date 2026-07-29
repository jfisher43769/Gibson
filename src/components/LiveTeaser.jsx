import React from "react";
import { SURFACE, chalk, dim } from "../lib/theme.js";

// "Live scores coming soon" banner shown above the table. Pure presentation — no props, no
// state; it renders the same wherever it appears.
export function LiveTeaser() {
  return (
    <div style={{
        borderRadius: 14, padding: "14px 16px", marginBottom: 22,
        ...SURFACE.hero,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3DDC84", flexShrink: 0, animation: "livePulse 1.4s infinite" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", color: chalk, textTransform: "uppercase" }}>Live scores</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#0B1512", background: "#FFB627", borderRadius: 99, padding: "2px 8px", letterSpacing: "0.06em" }}>COMING SOON</span>
          </div>
          <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
            In-play Premiership scores, refreshed every two minutes. The data feed costs real money — it switches on
            the moment supporters cover it. One Season Ticket does it. ♥
          </div>
        </div>
      </div>
  );
}
