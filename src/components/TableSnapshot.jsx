import React from "react";
import {
  FULL_TABLE, SEASON, clubName, currentTable, tableStage,
} from "../../data.js";
import { Crest } from "./Crest.jsx";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// The league table, five rows, at the top of Home.
//
// This is the point of the screen. GIBSON is a stats app whose front page opened on a logo, a
// tagline, two rows of navigation and a fixture date — the first actual number a visitor met
// was a day of the month. A position and a points total now sit above the fold.
//
// WHICH SEASON. The season that is actually being played, from its first result. This used to
// defer to last season's final table until EARLY_SEASON_GAMES had been played, on the argument
// that two games in a table is noise. True as statistics, wrong as a front page: a visitor
// opening a live league's stats app in August wants to see the league as it stands, and the
// old rule showed them a champion crowned in April with nothing on screen admitting the new
// season was under way. Owner's instruction, 14 Aug 2026.
//
// The noise is handled by labelling instead of hiding — the header says which season and how
// far into it, so "after round 1" carries its own warning that one result moved these clubs.
// Last season's final table is still the fallback, but only before a ball is kicked, where the
// alternative is twelve clubs on nought sorted alphabetically.
//
// WHICH ROWS. Top four, and the visitor's club pinned underneath when it sits outside them.
// Five rows maximum: the whole value is that it fits without scrolling.
export function TableSnapshot({ myClub, onOpenTable }) {
  // tableStage() returns null until some fixture carries a result, which is exactly the
  // "nothing has happened yet" case — derived from the same results that build the table, so
  // the label and the rows can never disagree about what season is on screen.
  const stage = tableStage();
  const live = !!stage;
  const rows = live ? currentTable() : FULL_TABLE;
  if (!rows || rows.length === 0) return null;

  const top = rows.slice(0, 4);
  const mineIdx = myClub ? rows.findIndex((r) => r.club === myClub) : -1;
  const pinned = mineIdx >= 4 ? { ...rows[mineIdx], pos: mineIdx + 1 } : null;
  const shown = [...top.map((r, i) => ({ ...r, pos: i + 1 })), ...(pinned ? [pinned] : [])];

  // Deliberately shorter than the Table view's own header ("round 3 · 2 of 6 played"): this one
  // shares a line with the word "Table" on a 360px screen, and the full phrasing pushed the row
  // sideways. The detail is one tap away in the view this strip opens.
  const seasonLabel = live
    ? `${SEASON.current.display} · ${stage.complete ? "after " : ""}round ${stage.round}`
    : `${SEASON.previous.display} · final`;

  const Row = ({ r, gap }) => {
    const mine = r.club === myClub;
    return (
      <div style={{
        display: "grid", gridTemplateColumns: "22px 20px minmax(0,1fr) 30px 34px",
        alignItems: "center", gap: 8, padding: "8px 11px",
        borderTop: gap ? `1px dashed ${faint}` : undefined,
        background: mine ? "rgba(255,182,39,0.09)" : undefined,
      }}>
        <span data-snap-pos style={{
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, textAlign: "center",
          color: r.pos === 1 ? "#FFB627" : dim, fontVariantNumeric: "tabular-nums",
        }}>{r.pos}</span>
        <Crest club={r.club} size={18} tappable={false} />
        <span className="gb-snap-name" style={{
          fontSize: 13, fontWeight: mine ? 700 : 600, color: chalk, minWidth: 0, whiteSpace: "nowrap",
        }}>
          <span className="gb-nm-full">{clubName(r.club)}</span>
          <span className="gb-nm-short">{clubName(r.club, { short: true })}</span>
        </span>
        <span style={{ fontSize: 12, color: dim, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{r.p}</span>
        <span data-snap-pts style={{
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: chalk,
          textAlign: "right", fontVariantNumeric: "tabular-nums",
        }}>{r.pts}</span>
      </div>
    );
  };

  return (
    <div style={{ marginBottom: 14 }}>
      {/* The strip itself has always been one big button, but nothing SAID so — every other
          block on this tab carries a "See all →" and this one carried only a season label, so
          the four rows read as the whole of it. The affordance now matches the behaviour.
          The season label drops below on a narrow screen rather than fighting the link for
          the same line, which is what pushed this row sideways at 360px before. */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Table</span>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
          <span style={{ fontSize: 11, color: dim, whiteSpace: "nowrap" }}>{seasonLabel}</span>
          <button onClick={onOpenTable} aria-label="Open the full league table" style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: 12, color: "#FFB627", fontWeight: 600, whiteSpace: "nowrap",
          }}>Full table →</button>
        </span>
      </div>
      {/* The whole strip is one target — a five-row summary exists to be tapped through. */}
      <button onClick={onOpenTable} aria-label="Open the full league table" className="gb-row" style={{
        ...SURFACE.flat, borderRadius: 14, overflow: "hidden", width: "100%", padding: 0,
        cursor: "pointer", textAlign: "left", display: "block", color: "inherit",
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "22px 20px minmax(0,1fr) 30px 34px", gap: 8, padding: "6px 11px 4px" }}>
          <span />
          <span />
          <span />
          <span style={{ fontSize: 10, color: dim, textAlign: "right", letterSpacing: "0.08em" }}>P</span>
          <span style={{ fontSize: 10, color: dim, textAlign: "right", letterSpacing: "0.08em" }}>PTS</span>
        </div>
        {shown.map((r, i) => (
          <Row key={r.club} r={r} gap={pinned && i === shown.length - 1 && r.pos > 5} />
        ))}
      </button>
    </div>
  );
}
