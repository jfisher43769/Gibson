import React from "react";

export function LogoMark({ size = 42 }) {
  // The Gibson Cup on terrace steps — same geometry as the app icons and og-card
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="GIBSON logo — the Gibson Cup on terrace steps" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="lg-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD873" /><stop offset="1" stopColor="#FFA51F" />
        </linearGradient>
      </defs>
      <g fill="url(#lg-amber)">
        <path d="M54 38 L146 38 L138 76 C133 101 118 114 100 114 C82 114 67 101 62 76 Z" />
        <path d="M56 46 C30 46 26 78 49 88 L54 78 C40 71 44 55 56 55 Z" />
        <path d="M144 46 C170 46 174 78 151 88 L146 78 C160 71 156 55 144 55 Z" />
        <rect x="92" y="114" width="16" height="15" rx="3" />
        <rect x="70" y="132" width="60" height="10" rx="2" />
        <rect x="57" y="145" width="86" height="10" rx="2" />
        <rect x="43" y="158" width="114" height="10" rx="2" />
      </g>
    </svg>
  );
}
