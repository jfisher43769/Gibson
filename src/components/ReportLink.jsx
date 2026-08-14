import React from "react";
import { dim, tapPad } from "../lib/theme.js";

// Quiet error-report link — points at the GIBSON X account.
//
// inline-block + tapPad gives it a 44px-tall hit area while its margin box stays the 14px it
// always was, so the footer does not gain a band of dead space. Callers pass `style` last and
// can still override, as before.
export function ReportLink({ style }) {
  return (
    <a href="https://x.com/GibsonStats" target="_blank" rel="noopener noreferrer"
      style={{ fontSize: 12, color: dim, textDecoration: "underline", display: "inline-block", ...tapPad(14), ...style }}>
      Spot an error? Tell GIBSON
    </a>
  );
}
