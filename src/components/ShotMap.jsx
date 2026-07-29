import React from "react";
import { chalk, dim, faint } from "../lib/theme.js";

export function ShotMap({ player, accent }) {
  return (
    <svg viewBox="0 0 100 70" style={{ width: "100%", background: "linear-gradient(180deg, #10241B, #0D1F17)", borderRadius: 12, border: `1px solid ${faint}` }} aria-label="shot map">
      {[14, 28, 42, 56].map((y) => <rect key={y} x="0" y={y} width="100" height="7" fill="rgba(255,255,255,0.025)" />)}
      <rect x="60" y="0.8" width="39" height="68.4" fill="none" stroke="rgba(237,245,239,0.3)" strokeWidth="0.6" />
      <rect x="82" y="15" width="17" height="40" fill="none" stroke="rgba(237,245,239,0.3)" strokeWidth="0.6" />
      <rect x="93" y="27" width="6" height="16" fill="none" stroke="rgba(237,245,239,0.3)" strokeWidth="0.6" />
      <line x1="99" y1="30" x2="99" y2="40" stroke={chalk} strokeWidth="1.4" />
      <circle cx="60" cy="35" r="9" fill="none" stroke="rgba(237,245,239,0.2)" strokeWidth="0.6" />
      {player.shots.map((s, i) => (
        <g key={i} style={{ animation: `bubblePop 0.4s ease-out ${i * 0.08}s backwards`, transformOrigin: `${s.x}px ${s.y}px` }}>
          <circle cx={s.x} cy={s.y} r={2 + s.xg * 5} fill={s.g ? accent : "transparent"} fillOpacity={s.g ? 0.85 : 0} stroke={s.g ? accent : dim} strokeWidth="0.8" />
        </g>
      ))}
      <text x="61.5" y="66" fill={dim} fontSize="3.2" fontFamily="'Barlow', sans-serif">bubble size = xG · filled = goal</text>
    </svg>
  );
}
