import React from "react";
import { dim } from "../lib/theme.js";

// Quiet error-report link — points at the GIBSON X account
export function ReportLink({ style }) {
  return (
    <a href="https://x.com/GibsonStats" target="_blank" rel="noopener noreferrer"
      style={{ fontSize: 12, color: dim, textDecoration: "underline", ...style }}>
      Spot an error? Tell GIBSON
    </a>
  );
}
