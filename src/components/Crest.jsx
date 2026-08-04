import React, { useContext, useEffect, useState } from "react";
import {
  CLUBS,
} from "../../data.js";
import { contrastText } from "../lib/theme.js";

// Club-page navigation: any Crest can open a club page via this context. Provided at
// the app root; null when unavailable (SSR/render test), so Crest degrades to static.
export const ClubNavContext = React.createContext(null);

// GLV (Glenavon) is the archived, relegated club — no club page, so its crest stays static.
const hasClubPage = (club) => club !== "GLV";

// ---- Real crests -------------------------------------------------------------------------
// A club's real crest is simply a file at public/crests/{CODE}.png, used with that club's
// written permission (see CRESTS.md, and public/crests/README.md). Presence is detected by
// LOADING it, not by any list in the code — so adding or removing a crest is a file
// operation with no code change anywhere, which is the whole point of doing it this way.
//
// Probed once per club per session and cached at module level: many Crests render per page
// (twelve in the Home selector alone) and they must not each fire their own request. A club
// with no crest costs exactly one 404, once.
const crestSrc = (club) => `/crests/${club}.png`;
const probed = new Map(); // club code -> true (crest exists) | false (no crest)

function useRealCrest(club) {
  // Start from the cache so a crest already known to exist renders immediately on the next
  // mount rather than flashing the shield again.
  const [exists, setExists] = useState(() => probed.get(club) === true);

  useEffect(() => {
    // No window during prerender/SSR: the shield is rendered into the static HTML, and the
    // real crest swaps in on the client. That ordering is deliberate — the shield always
    // works, so the page is never broken while the image is in flight.
    if (typeof window === "undefined") return undefined;

    const cached = probed.get(club);
    if (cached !== undefined) { setExists(cached); return undefined; }

    let alive = true;
    const img = new window.Image();
    img.onload = () => { probed.set(club, true); if (alive) setExists(true); };
    img.onerror = () => { probed.set(club, false); if (alive) setExists(false); };
    img.src = crestSrc(club);
    return () => { alive = false; };
  }, [club]);

  return exists;
}

export function Crest({ club, size = 34, tappable = true }) {
  const openClub = useContext(ClubNavContext);
  const c = CLUBS[club];
  const [c1, c2] = c.colors;
  const realCrest = useRealCrest(club);

  const shield = (
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
        fill={contrastText(c1)}
        fontFamily="'Barlow Condensed', sans-serif" fontWeight="800" fontSize="10">
        {club}
      </text>
    </svg>
  );

  // The real crest keeps the shield's exact footprint (size x size*1.15) so a club gaining
  // or losing a crest never reflows the lists it sits in.
  //
  // NO CONTAINER. An earlier version put the crest on a white rounded tile so that a crest
  // with an opaque background would still sit on the dark theme. It looked bad — a hard white
  // block against the dark green — and it was solving a problem the crests themselves do not
  // have: club crests come as transparent PNGs carrying their own outline (Glentoran's is a
  // gold border), which reads cleanly straight on the background. The requirement moved to
  // where it belongs, the asset: crests must be supplied with an alpha channel, which
  // verify.js enforces, so there is no opaque background left to hide.
  //
  // The drop shadow is the only thing added, and it touches nothing in the artwork — it is
  // cast behind the crest to lift it off the background, so a crest with pale edges still
  // separates. No recolouring, no overlay, no filter on the crest's own pixels.
  //
  // maxWidth/maxHeight with auto dimensions and objectFit:contain means the crest is scaled
  // to fit and never stretched or cropped. Glentoran's is 0.60 aspect against the shield's
  // 0.87, so it sits narrower inside the footprint — which is the correct outcome. Permission
  // is granted for UNALTERED reproduction, so distorting or cropping to fill would breach it.
  const crestImage = (
    <span style={{
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      width: size, height: size * 1.15,
      lineHeight: 0, flexShrink: 0,
    }}>
      <img
        src={crestSrc(club)}
        alt={`${c.name} crest`}
        style={{
          maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto",
          objectFit: "contain", display: "block",
          filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.55))",
        }}
      />
    </span>
  );

  const art = realCrest ? crestImage : shield;

  // Any crest opens that club's page, unless the caller opts out (e.g. it already sits
  // inside a selector button whose own action should win). Uses a role=button span, not
  // a <button>, to stay valid when nested inside other interactive rows.
  if (tappable && openClub && hasClubPage(club)) {
    return (
      <span role="button" tabIndex={0} aria-label={`${c.name} — open club page`}
        onClick={(e) => { e.stopPropagation(); openClub(club); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); openClub(club); } }}
        style={{ display: "inline-flex", lineHeight: 0, cursor: "pointer" }}>
        {art}
      </span>
    );
  }
  return art;
}
