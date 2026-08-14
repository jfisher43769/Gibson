import React from "react";
import { CLUBS, clubName } from "../../data.js";
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

// The club's name twice, long and short, with CSS choosing. Only one is in the accessibility
// tree at a time because the other is display:none, so this reads as one name to a screen
// reader rather than two.
function ClubLabel({ club, align, bold }) {
  const style = {
    fontSize: 12, color: chalk, fontWeight: bold ? 700 : 400,
    textAlign: align, minWidth: 0, whiteSpace: "nowrap",
  };
  return (
    <span style={style}>
      <span className="gb-nm-full">{clubName(club)}</span>
      <span className="gb-nm-short">{clubName(club, { short: true })}</span>
    </span>
  );
}

// One scoreline from the feed. Shared by the live block and the finished-results block so the
// two can never drift into looking like different things — the only difference between a live
// score and a final one should be what the row is labelled, not how it is drawn.
//
// A GRID, not a flex row. Flexed, the score sat between two flex:1 names and drifted sideways
// whenever a row had a trailing affordance and its neighbour didn't, so the column of scores
// wandered down the list. Fixed tracks pin the score to the same x on every row, which is the
// whole reason a results list is scannable.
//
// The names no longer carry text-overflow: ellipsis. Truncating "Dungannon Swifts" to
// "Dunganno…" is not a shorter name, it is a broken one — CLUBS carries a real short form and
// that is what a narrow screen shows.
export function ScoreRow({ m, last, lead, leadColor, trailing }) {
  // Same reasoning as Crest: these codes come from the live feed via a club map that lives in
  // a different file. An unknown code drops the row instead of throwing on CLUBS[m.h].name.
  if (!CLUBS[m.h] || !CLUBS[m.a]) return null;
  return (
    <div className="gb-score-row" style={{
      display: "grid", alignItems: "center", gap: 6, padding: "9px 11px",
      borderBottom: last ? "none" : `1px solid ${faint}`,
    }}>
      <span style={{
        fontSize: 12, color: leadColor, minWidth: 0, whiteSpace: "nowrap",
        fontWeight: leadColor === "#3DDC84" ? 800 : 400, textTransform: "uppercase",
      }}>{lead}</span>
      {/* Home side reads crest-then-name; the away side mirrors it. */}
      <span style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 5, minWidth: 0 }}>
        <Crest club={m.h} size={16} />
        <ClubLabel club={m.h} align="right" bold={m.hs > m.as} />
      </span>
      <span style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, color: "#FFB627",
        fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", textAlign: "center",
      }}>{m.hs}–{m.as}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
        <ClubLabel club={m.a} align="left" bold={m.as > m.hs} />
        <Crest club={m.a} size={16} />
      </span>
      {/* Always present, even when empty, so a row with a stats toggle and a row without
          still put their score in the same place. */}
      <span style={{ display: "flex", justifyContent: "flex-end" }}>{trailing}</span>
    </div>
  );
}
