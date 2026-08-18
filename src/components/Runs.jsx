import React from "react";
import { SEQUENCE_MIN, clubName, clubRuns, notableRuns, runLabel } from "../../data.js";
import { Crest } from "./Crest.jsx";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// Runs — "unbeaten in 6", "three clean sheets in a row".
//
// The cheapest real statistic there is: nothing but results in order. Derived from the same
// recorded scorelines as the table, so a run cannot disagree with the results list above it.
//
// NOTHING BELOW SEQUENCE_MIN IS SHOWN. Two of anything happens constantly in a league where
// every club plays every week, and "unbeaten in 2" presented as a statistic is the padding that
// makes a stats site untrustworthy. Early in a season that means this says so plainly rather
// than filling the screen — which is the correct output, not a missing feature.

const TONE = {
  winning: "#3DDC84", unbeaten: "#3DDC84", scoring: "#3DDC84", cleanSheets: "#5EC8F2",
  losing: "#E8663C", winless: "#E8663C", failedToScore: "#E8663C",
};

const label = { fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 };

export function LeagueRuns({ limit = 6 }) {
  const runs = notableRuns();
  return (
    <div data-runs style={{ marginBottom: 18 }}>
      <div style={label}>Runs</div>
      {runs.length === 0 ? (
        // Said, rather than left blank. A reader who saw a run here last week should learn that
        // it ended, not wonder whether the section broke.
        <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
          No club is on a run of {SEQUENCE_MIN} or more yet. Anything shorter is a coincidence,
          not a sequence, so nothing is listed until one gets there.
        </div>
      ) : (<>
        <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden" }}>
          {runs.slice(0, limit).map((r, i, arr) => (
            <div key={`${r.club}-${r.kind}`} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
              borderBottom: i < arr.length - 1 ? `1px solid ${faint}` : "none",
            }}>
              <Crest club={r.club} size={20} />
              <span style={{ fontSize: 13, fontWeight: 600, color: chalk, minWidth: 0, whiteSpace: "nowrap" }}>
                {clubName(r.club, { short: true })}
              </span>
              <span style={{ fontSize: 12, color: dim, flex: 1, minWidth: 0, textAlign: "right", whiteSpace: "nowrap" }}>
                {runLabel(r.kind, r.n).replace(/^\d+\s/, "")}
              </span>
              <span style={{
                fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 18,
                color: TONE[r.kind] || chalk, width: 24, textAlign: "right", fontVariantNumeric: "tabular-nums",
              }}>{r.n}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: dim, lineHeight: 1.5, marginTop: 8 }}>
          Current runs of {SEQUENCE_MIN} or more, from every recorded result.
        </div>
      </>)}
    </div>
  );
}

// One club's current runs. Absent entirely when it has none — on a club page an empty block
// every week is worse than the section simply not being there.
export function ClubRuns({ club }) {
  const runs = clubRuns(club);
  if (runs.length === 0) return null;
  return (
    <div data-club-runs={club} style={{ marginBottom: 16 }}>
      <div style={label}>On a run</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {runs.map((r) => (
          <span key={r.kind} style={{
            ...SURFACE.card, borderRadius: 999, padding: "7px 13px",
            fontSize: 13, color: chalk, whiteSpace: "nowrap",
            border: `1px solid ${TONE[r.kind] || faint}55`,
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16,
              color: TONE[r.kind] || chalk, fontVariantNumeric: "tabular-nums", marginRight: 5,
            }}>{r.n}</span>
            {runLabel(r.kind, r.n).replace(/^\d+\s/, "")}
          </span>
        ))}
      </div>
    </div>
  );
}
