import React from "react";
import { CONTACT_EMAIL } from "../../data.js";
import { dim, tapPad } from "../lib/theme.js";

// Quiet error-report link.
//
// It pointed only at X, which asks a fan to hold an account on one particular social network
// before they can tell us a scoreline is wrong. The people who spot a bad number are the most
// valuable readers this site has, and most of them are not on X — so an email route sits
// beside it whenever CONTACT_EMAIL is set. Until it is, the link behaves exactly as it did:
// an address that bounces is worse than one route that works.
//
// inline-block + tapPad gives each link a 44px-tall hit area while its margin box stays the
// 14px it always was, so the footer does not gain a band of dead space.
export function ReportLink({ style }) {
  const linkStyle = { fontSize: 12, color: dim, textDecoration: "underline", display: "inline-block", ...tapPad(14), ...style };
  return (
    <>
      <a href="https://x.com/GibsonStats" target="_blank" rel="noopener noreferrer" style={linkStyle}>
        Spot an error? Tell GIBSON
      </a>
      {CONTACT_EMAIL && (<>
        <span aria-hidden="true" style={{ fontSize: 12, color: dim, padding: "0 6px" }}>·</span>
        {/* Subject line prefilled so a report arrives already labelled. */}
        <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("GIBSON — spotted an error")}`} style={linkStyle}>
          or email
        </a>
      </>)}
    </>
  );
}
