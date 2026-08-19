import React from "react";
import { KOFI_URL } from "../../data.js";
import { track } from "../lib/track.js";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// The ask.
//
// Live scores are gated on Ko-fi revenue and the site never once mentioned it. The Support view
// exists, with tiers and a Season Ticket, three taps deep under More — which means the people
// funding it are the ones who already went looking, and nobody goes looking for a donate page.
//
// TWO PLACEMENTS, DELIBERATELY DIFFERENT IN WEIGHT.
//
//   SupportLine — one sentence in the footer of every page. It should be easy to ignore; a
//   stats site that nags is a stats site people stop opening. It is there so that the answer to
//   "who pays for this?" is always one tap away, not so that it converts.
//
//   SupportCard — a real card, and only under the Predictor, because that is the one screen
//   someone comes back to weekly by choice. Asking there is asking a regular; asking on the
//   table is asking a stranger who came from Google for one number.
//
// IT SELLS A MEMBERSHIP. IT DOES NOT ASK FOR HELP. The first draft of this said "chip in" and
// verify.js stopped it, which is the check earning its keep: asking for money to keep a project
// alive is soliciting donations, a regulated category no processor carries for a private
// individual, and it is what got GIBSON's payments switched off on 8 Aug 2026. So the copy
// names a price and lists what the money buys — the same perks SUPPORT_TIERS already promises —
// and never ties a payment to a feature that does not exist yet. "Vote on what gets built" is a
// benefit the membership actually includes; "fund live scores" would be an appeal wearing a
// product's clothes, and the distinction is the whole reason the payments came back.
//
// NO GUILT AND NO FALSE URGENCY either: no countdown, no "only N left", no progress bar toward
// a target. A number about funding would obey golden rule 1 like every other number here, which
// for a running total nobody has verified means it doesn't appear.

export function SupportLine({ style }) {
  return (
    <div style={{ textAlign: "center", fontSize: 12, color: dim, lineHeight: 1.6, ...style }}>
      GIBSON is free and carries no ads.{" "}
      <a href={KOFI_URL} target="_blank" rel="noopener noreferrer"
        onClick={() => track("kofi_tapped", { from: "footer" })}
        style={{ color: "#FFB627", textDecoration: "underline", fontWeight: 600 }}>
        Season Ticket
      </a>{" "}
      members vote on new features and see them first.
    </div>
  );
}

export function SupportCard({ onOpenSupport }) {
  return (
    <div style={{ ...SURFACE.card, borderRadius: 14, padding: "14px 15px", border: `1px solid ${faint}`, marginBottom: 18 }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 19, color: "#FFB627", letterSpacing: "0.02em", lineHeight: 1.1 }}>
        Season Ticket
      </div>
      <div style={{ fontSize: 13, color: chalk, lineHeight: 1.55, marginTop: 7 }}>
        £4 a month. Vote in the monthly feature polls, see new stats before they go live, and
        get your name in the GIBSON credits. Cancel any time.
      </div>
      <div style={{ display: "flex", gap: 9, marginTop: 12, flexWrap: "wrap" }}>
        <a href={KOFI_URL} target="_blank" rel="noopener noreferrer"
          onClick={() => track("kofi_tapped", { from: "predictor_card" })}
          style={{
            background: "#FFB627", color: "#0B0F0D", borderRadius: 999, padding: "9px 16px",
            fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap",
          }}>
          Become a member
        </a>
        {/* In-app route to the full tier list, so the card is an invitation rather than a
            one-way door straight off the site. */}
        {onOpenSupport && (
          <button onClick={onOpenSupport} style={{
            background: "none", border: `1px solid ${faint}`, borderRadius: 999, padding: "9px 16px",
            fontSize: 13, color: chalk, cursor: "pointer", whiteSpace: "nowrap",
          }}>
            See what you get
          </button>
        )}
      </div>
    </div>
  );
}
