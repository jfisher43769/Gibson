import React from "react";

// Marks a fixture that is being broadcast.
//
// The broadcaster is stored as a plain string on the fixture (`tv: "BBC Sport NI"`) rather
// than a code mapped to a name here, so a new broadcaster needs no code change — the same
// reasoning as club crests being a file lookup rather than a list.
//
// This is not a bookmaker reference and must never become one: CLAUDE.md rule 2 bans
// bookmaker names, logos and links app-wide, and `scripts/verify.js` scans for them. A
// broadcaster naming where you can watch the match is editorial information, not gambling
// advertising, but the distinction only holds while this stays a broadcaster.
//
// Renders nothing when a fixture is not on TV, so it is safe to drop into any row.
export function TvBadge({ tv, compact = false }) {
  if (!tv) return null;
  return (
    <span
      title={`Live on ${tv}`}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
        fontSize: 11, lineHeight: 1.6, padding: "0 7px", borderRadius: 999,
        whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis",
        color: "#5EC8F2",
        background: "rgba(94,200,242,0.12)",
        border: "1px solid rgba(94,200,242,0.3)",
      }}
    >
      <span aria-hidden="true">📺</span>
      {compact ? "Live" : tv}
    </span>
  );
}
