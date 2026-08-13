import React from "react";
import { CUP_GOLD_FROM, CUP_GOLD_TO, CUP_PATHS, CUP_VIEWBOX } from "../lib/cup.js";

export function LogoMark({ size = 42 }) {
  // The Gibson Cup. Geometry lives in src/lib/cup.js and is shared with the OG card
  // and the promo generators, so the mark cannot differ between the app and the images
  // it posts — see that file for what the shapes are and why they are all fills.
  return (
    <svg width={size} height={size} viewBox={CUP_VIEWBOX}
      aria-label="GIBSON logo — the Gibson Cup" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="lg-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={CUP_GOLD_FROM} /><stop offset="1" stopColor={CUP_GOLD_TO} />
        </linearGradient>
      </defs>
      <g fill="url(#lg-amber)">
        {CUP_PATHS.map((d) => <path key={d} d={d} />)}
      </g>
    </svg>
  );
}
