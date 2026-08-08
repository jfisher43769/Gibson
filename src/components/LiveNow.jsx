import React from "react";
import { SURFACE, dim } from "../lib/theme.js";
import { ScoreRow } from "./ScoreRow.jsx";

// The one-line honesty check on "live". The feed behind it is TheSportsDB's free public
// tier, community-edited, and api/events.js already treats it as unreliable — it falls back
// to a clock-based guess whenever strStatus is blank, and the app polls it just once a
// minute. That is not a bug to fix; it is what "live" costs nothing. Saying so once, plainly,
// is cheaper than a fan screenshotting a stale 0-0 at the 70th minute and posting it as a
// GIBSON error.
export function LiveCaveat() {
  return (
    <div style={{ fontSize: 11, color: dim, fontStyle: "italic", marginTop: 6 }}>
      Live scores come from a free public feed and can lag or miss a minute — not official, refreshes on its own.
    </div>
  );
}

// Every match currently in play. Shared by the fixtures list and the front page, because the
// front page was showing at most one: its board carries the featured fixture, and if that
// fixture happened not to be the live one — or three others kicked off alongside it — the rest
// were nowhere. On a Saturday with six 3pm kick-offs that is most of the afternoon missing.
//
// `exclude` drops a match the caller is already showing elsewhere, so the Home board's own
// game isn't listed twice directly beneath itself — and `title` lets that caller say "Also
// live" instead, since two "LIVE NOW" headings stacked on one screen read as a duplicate
// rather than as two different things.
//
// `showCaveat` defaults on. Home turns it off here and prints its own copy next to the board
// instead, for the case that actually matters most: a single midweek fixture live, where the
// board carries the only score and this list has nothing in it to hang a footnote on.
export function LiveNow({ matches, exclude, title, showCaveat = true }) {
  const rows = (matches || []).filter(
    (m) => !exclude || m.h !== exclude.h || m.a !== exclude.a,
  ).slice(0, 6);
  if (!rows.length) return null;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: "50%", background: "#3DDC84", display: "inline-block", animation: "livePulse 1.4s infinite" }} />
        <span style={{ fontSize: 12, color: "#3DDC84", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
          {title || "Live now"}
        </span>
      </div>
      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", border: "1px solid rgba(61,220,132,0.35)" }}>
        {rows.map((m, i) => (
          <ScoreRow key={`${m.h}${m.a}`} m={m} last={i === rows.length - 1}
            lead={m.status || "LIVE"} leadColor="#3DDC84" />
        ))}
      </div>
      {showCaveat && <LiveCaveat />}
    </div>
  );
}
