import React from "react";
import { clubName, opponentStrengthSplit, topHalfSize } from "../../data.js";
import { Crest } from "./Crest.jsx";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// Who each club has actually played.
//
// Two clubs on the same points have not necessarily had the same season. Carrick sit second on
// six points having played the bottom half twice and the top half not at all; Crusaders have
// played the top half twice. The table cannot show that and this can.
//
// MEASURED AGAINST THE CURRENT TABLE, which is the only honest way midway through a season —
// final positions do not exist yet, and last season's would answer a different question. The
// consequence is that the split MOVES: beat a club and drag them down the table, and a result
// of yours quietly becomes a bottom-half result. That is a property of the measure rather than
// a fault, and the note under it says so, because a reader who spots it moving deserves to have
// been told rather than to catch us out.
export function OpponentSplit({ limit = 12 }) {
  const rows = opponentStrengthSplit();
  const half = topHalfSize();
  // Nothing to compare before anyone has played.
  if (!rows.some((r) => r.top.p + r.bottom.p > 0)) return null;

  // Colour follows the NUMBER, not the column. Fixed green meant a club with nothing from the
  // top six had its 0 rendered in the same green as Cliftonville's 3 — the colour said "good"
  // over a figure that is the opposite, which is worse than no colour at all.
  const toneFor = (ppg) => (ppg >= 2 ? "#3DDC84" : ppg >= 1 ? chalk : "#E8663C");

  const Cell = ({ side, ppg }) => (
    <div style={{ width: 62, textAlign: "right", flexShrink: 0 }}>
      <div style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17,
        color: side.p === 0 ? dim : toneFor(ppg), fontVariantNumeric: "tabular-nums", lineHeight: 1,
      }}>{side.p === 0 ? "—" : ppg}</div>
      {/* The played count is not decoration: one game at 3.00 and four games at 3.00 are very
          different claims, and without it the first reads like the second. */}
      <div style={{ fontSize: 10, color: dim, marginTop: 3, whiteSpace: "nowrap" }}>
        {side.p === 0 ? "not played" : `${side.p} game${side.p === 1 ? "" : "s"}`}
      </div>
    </div>
  );

  return (
    <div data-opponent-split style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Who they have played
      </div>

      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 13px 4px" }}>
          <span style={{ flex: 1, minWidth: 0 }} />
          <span style={{ width: 62, textAlign: "right", fontSize: 10, color: dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>Top {half}</span>
          <span style={{ width: 62, textAlign: "right", fontSize: 10, color: dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>Rest</span>
        </div>
        {rows.slice(0, limit).map((r, i, arr) => (
          <div key={r.club} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
            borderBottom: i < arr.length - 1 ? `1px solid ${faint}` : "none",
          }}>
            <Crest club={r.club} size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0, whiteSpace: "nowrap" }}>
              {clubName(r.club, { short: true })}
            </span>
            <Cell side={r.top} ppg={r.topPpg} />
            <Cell side={r.bottom} ppg={r.bottomPpg} />
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: dim, lineHeight: 1.5, marginTop: 8 }}>
        Points per game against the current top {half} and against the rest. Measured against the
        table as it stands, so it shifts as clubs move — a win over a side who then slide down
        becomes a result against the bottom half.
      </div>
    </div>
  );
}
