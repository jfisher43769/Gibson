import React from "react";
import { dim } from "../lib/theme.js";

export function ExternalBadge({ name }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 32, height: 24, borderRadius: 4, border: `1px dashed ${dim}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        fontSize: 12, color: dim, fontFamily: "'Barlow Condensed'", fontWeight: 700,
      }}>OUT</div>
      <span style={{ fontSize: 12, color: dim }}>{name}</span>
    </div>
  );
}
