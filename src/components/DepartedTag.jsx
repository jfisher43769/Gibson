import React from "react";
import { playerDeparture } from "../../data.js";

// Marks a player in a completed-season list who has since left the league.
//
// Season stats are a record of what happened, so a departed player belongs in them — but
// without this the GIBSON Index reads as a squad list, and someone who signed for an
// English club in July still looks like he is turning out on Saturday. The destination
// comes from the transfer feed verbatim, so a loan says loan and a retirement says
// retired, rather than everything collapsing into one vague "gone" label.
//
// Renders nothing at all when the player is still here, so it is safe to drop into any
// row without guarding the call site.
export function DepartedTag({ name, compact = false }) {
  const to = playerDeparture(name);
  if (!to) return null;
  const retired = /^retired$/i.test(to.trim());
  const label = retired ? "Retired" : (compact ? "Left" : `Left · ${to}`);
  return (
    <span
      title={retired ? "Retired" : `Left the league — joined ${to}`}
      style={{
        display: "inline-block", flexShrink: 0,
        fontSize: 11, lineHeight: 1.6, padding: "0 7px", borderRadius: 999,
        whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis",
        color: "rgba(237,245,239,0.68)",
        background: "rgba(237,245,239,0.07)",
        border: "1px solid rgba(237,245,239,0.14)",
      }}
    >{label}</span>
  );
}
