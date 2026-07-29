import React from "react";
import { GibsonBoundary } from "../components/Boundary.jsx";
import { dim } from "../lib/theme.js";

/* ================= CLUB PAGES (1.07) ================= */
// A section wrapper: its own error boundary (compact fallback) + eyebrow label, so one
// malformed dataset never takes down the whole club page.
export function ClubSection({ title, children }) {
  return (
    <GibsonBoundary minHeight="160px">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
        {children}
      </div>
    </GibsonBoundary>
  );
}
