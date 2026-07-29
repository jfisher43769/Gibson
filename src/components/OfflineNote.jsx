import React from "react";
import { dim } from "../lib/theme.js";

// Quiet banner shown when a live-data fetch failed and we've fallen back to saved data
export function OfflineNote() {
  return (
    <div style={{ fontSize: 12, color: dim, marginBottom: 12, fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
      <span aria-hidden="true">⚠</span> Offline — showing saved data.
    </div>
  );
}
