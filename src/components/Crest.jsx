import React, { useContext } from "react";
import {
  CLUBS,
} from "../../data.js";
import { chalk } from "../lib/theme.js";

// Club-page navigation: any Crest can open a club page via this context. Provided at
// the app root; null when unavailable (SSR/render test), so Crest degrades to static.
export const ClubNavContext = React.createContext(null);

// GLV (Glenavon) is the archived, relegated club — no club page, so its crest stays static.
const hasClubPage = (club) => club !== "GLV";

export function Crest({ club, size = 34, tappable = true }) {
  const openClub = useContext(ClubNavContext);
  const c = CLUBS[club];
  const [c1, c2] = c.colors;
  const svg = (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-label={c.name + " crest"}>
      <defs>
        <clipPath id={`shield-${club}`}>
          <path d="M20 2 L37 8 V24 C37 35 29 42 20 45 C11 42 3 35 3 24 V8 Z" />
        </clipPath>
      </defs>
      <path d="M20 2 L37 8 V24 C37 35 29 42 20 45 C11 42 3 35 3 24 V8 Z" fill={c1} stroke="rgba(237,245,239,0.35)" strokeWidth="1.5" />
      <g clipPath={`url(#shield-${club})`}>
        {c.pattern === "stripes" && [8, 20, 32].map((x) => <rect key={x} x={x - 3} y="0" width="6" height="46" fill={c2} />)}
        {c.pattern === "sleeve" && <rect x="0" y="30" width="40" height="16" fill={c2} opacity="0.9" />}
        {c.pattern === "plain" && <path d="M3 26 H37 V24 H3 Z" fill={c2} />}
      </g>
      <text x="20" y="21" textAnchor="middle"
        fill={["BAN", "CAR", "BAL"].includes(club) ? "#10241B" : chalk}
        fontFamily="'Barlow Condensed', sans-serif" fontWeight="800" fontSize="10">
        {club}
      </text>
    </svg>
  );
  // Any crest opens that club's page, unless the caller opts out (e.g. it already sits
  // inside a selector button whose own action should win). Uses a role=button span, not
  // a <button>, to stay valid when nested inside other interactive rows.
  if (tappable && openClub && hasClubPage(club)) {
    return (
      <span role="button" tabIndex={0} aria-label={`${c.name} — open club page`}
        onClick={(e) => { e.stopPropagation(); openClub(club); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); openClub(club); } }}
        style={{ display: "inline-flex", lineHeight: 0, cursor: "pointer" }}>
        {svg}
      </span>
    );
  }
  return svg;
}
