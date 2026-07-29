import React from "react";
import {
  CLUBS,
} from "../../data.js";
import { chalk, faint, ratingColor } from "../lib/theme.js";

export function Avatar({ player, size = 56, ring = true }) {
  const c = CLUBS[player.club];
  const initials = player.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const darkText = ["BAN", "CAR", "BAL"].includes(player.club);
  const R = size / 2 - 3;
  const circ = 2 * Math.PI * R;
  const pct = (player.rating / 10) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: 5, borderRadius: "50%",
        background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
        fontSize: size * 0.34, color: darkText ? "#10241B" : chalk, letterSpacing: "0.02em",
      }}>{initials}</div>
      {ring && (
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={faint} strokeWidth="3" />
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={ratingColor(player.rating)} strokeWidth="3"
            strokeLinecap="round" strokeDasharray={`${pct} ${circ}`} style={{ animation: "ringDraw 0.9s ease-out" }} />
        </svg>
      )}
    </div>
  );
}
