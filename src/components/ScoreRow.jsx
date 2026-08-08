import React from "react";
import { CLUBS } from "../../data.js";
import { Crest } from "./Crest.jsx";
import { chalk, dim, faint } from "../lib/theme.js";

// A small pulsing "live" marker with the feed's own clock (2H, HT) when it has one. Used on
// fixture rows so a score that is still moving never looks like a final one.
export function LiveTick({ status }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: "#3DDC84", animation: "livePulse 1.4s infinite" }} />
      <span style={{ fontSize: 11, fontWeight: 800, color: "#3DDC84", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {status || "Live"}
      </span>
    </span>
  );
}

// One scoreline from the feed. Shared by the live block and the finished-results block so the
// two can never drift into looking like different things — the only difference between a live
// score and a final one should be what the row is labelled, not how it is drawn.
export function ScoreRow({ m, last, lead, leadColor, trailing }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8, padding: "9px 13px",
      borderBottom: last ? "none" : `1px solid ${faint}`,
    }}>
      <span style={{
        fontSize: 12, color: leadColor, width: 56, flexShrink: 0,
        fontWeight: leadColor === "#3DDC84" ? 800 : 400, textTransform: "uppercase",
      }}>{lead}</span>
      <Crest club={m.h} size={16} />
      <span style={{
        fontSize: 12, color: chalk, flex: 1, minWidth: 0, textAlign: "right", fontWeight: m.hs > m.as ? 700 : 400,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{CLUBS[m.h].name}</span>
      <span style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, color: "#FFB627",
        fontVariantNumeric: "tabular-nums", padding: "0 6px", flexShrink: 0, whiteSpace: "nowrap",
      }}>{m.hs}–{m.as}</span>
      <span style={{
        fontSize: 12, color: chalk, flex: 1, minWidth: 0, fontWeight: m.as > m.hs ? 700 : 400,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{CLUBS[m.a].name}</span>
      <Crest club={m.a} size={16} />
      {trailing}
    </div>
  );
}

