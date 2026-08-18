import React from "react";
import { CLUBS, clubName, positionHistory, roundMovers } from "../../data.js";
import { Crest } from "./Crest.jsx";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// Every club's league position, round by round.
//
// Hand-drawn SVG rather than recharts. The chart library is already a dependency, but it only
// loads on the Players and Duel views — pulling it into the Matches tab would add a chart
// bundle to a screen that needs twelve straight lines. This is a polyline per club.
//
// TWELVE LINES IS SPAGHETTI on a phone, so most of them are drawn faint and only three are
// picked out: the leader, the club at the bottom, and the visitor's own club if they have
// chosen one. Everything else is context, which is what it should be.
//
// The y axis is INVERTED — first at the top — because that is what a league table looks like
// and a chart where "up" means "worse" is a puzzle rather than a picture.
export function PositionChart({ myClub }) {
  const history = positionHistory();
  // Before a ball is kicked there is nothing to plot, and one round is a column of dots
  // rather than a chart. Both say so by drawing nothing.
  if (!history || history.rounds.length < 2) return null;

  const { rounds, positions } = history;
  const clubs = Object.keys(positions);
  const n = clubs.length;
  const last = rounds.length - 1;

  const W = 320, H = 190, padL = 26, padR = 34, padT = 12, padB = 22;
  const x = (i) => padL + (i * (W - padL - padR)) / Math.max(1, rounds.length - 1);
  const y = (pos) => padT + ((pos - 1) * (H - padT - padB)) / Math.max(1, n - 1);

  const leader = clubs.find((c) => positions[c][last] === 1);
  const bottom = clubs.find((c) => positions[c][last] === n);
  const picked = [myClub, leader, bottom].filter((c, i, a) => c && CLUBS[c] && a.indexOf(c) === i);
  const colourOf = (c) => (c === myClub ? "#FFB627" : c === leader ? "#3DDC84" : "#E8663C");

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Position by round</span>
        <span style={{ fontSize: 11, color: dim, whiteSpace: "nowrap" }}>
          rounds {rounds[0]}–{rounds[last]}
        </span>
      </div>

      <div style={{ ...SURFACE.flat, borderRadius: 14, padding: "12px 10px 8px" }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img"
          aria-label={`League position by round. ${picked.map((c) => `${clubName(c)} ${positions[c].map((p, i) => `round ${rounds[i]} ${p}`).join(", ")}`).join(". ")}`}
          style={{ display: "block", overflow: "visible" }}>
          {/* Guide rows at first, middle and last, so a line's height means something. */}
          {[1, Math.ceil(n / 2), n].map((pos) => (
            <g key={pos}>
              <line x1={padL} y1={y(pos)} x2={W - padR} y2={y(pos)} stroke={faint} strokeWidth="1" />
              <text x={padL - 6} y={y(pos) + 3} textAnchor="end" fontSize="9" fill={dim}>{pos}</text>
            </g>
          ))}
          {rounds.map((r, i) => (
            <text key={r} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill={dim}>{r}</text>
          ))}

          {/* The other nine first, so a highlighted line is never drawn underneath one. */}
          {clubs.filter((c) => !picked.includes(c)).map((c) => (
            <polyline key={c} fill="none" stroke="rgba(237,245,239,0.16)" strokeWidth="1.5"
              points={positions[c].map((pos, i) => `${x(i)},${y(pos)}`).join(" ")} />
          ))}
          {picked.map((c) => (
            <g key={c}>
              <polyline fill="none" stroke={colourOf(c)} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                points={positions[c].map((pos, i) => `${x(i)},${y(pos)}`).join(" ")} />
              <circle cx={x(last)} cy={y(positions[c][last])} r="3.5" fill={colourOf(c)} />
              <text x={x(last) + 7} y={y(positions[c][last]) + 3} fontSize="10" fontWeight="700" fill={colourOf(c)}>
                {CLUBS[c].code || c}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 8, fontSize: 11, color: dim }}>
        {picked.map((c) => (
          <span key={c} style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <span aria-hidden="true" style={{ width: 10, height: 3, borderRadius: 2, background: colourOf(c) }} />
            {clubName(c, { short: true })}
          </span>
        ))}
      </div>
    </div>
  );
}

// Who moved between the last two rounds, and by how much. Silent when nobody did, which is
// what an unchanged week actually looks like — a row of zeroes would be noise.
export function BiggestMovers() {
  const movers = roundMovers();
  if (!movers.length) return null;
  const up = movers.filter((m) => m.delta > 0).slice(0, 3);
  const down = movers.filter((m) => m.delta < 0).slice(-3).reverse();
  const ord = (n) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");

  const Row = ({ m, i, arr }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
      borderBottom: i < arr.length - 1 ? `1px solid ${faint}` : "none",
    }}>
      <Crest club={m.club} size={20} />
      <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0, whiteSpace: "nowrap" }}>
        {clubName(m.club, { short: true })}
      </span>
      <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
        {ord(m.from)} → {ord(m.to)}
      </span>
      <span style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17,
        color: m.delta > 0 ? "#3DDC84" : "#E8663C", width: 30, textAlign: "right",
        fontVariantNumeric: "tabular-nums",
      }}>{m.delta > 0 ? "+" : ""}{m.delta}</span>
    </div>
  );

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Biggest movers
      </div>
      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden" }}>
        {[...up, ...down].map((m, i, arr) => <Row key={m.club} m={m} i={i} arr={arr} />)}
      </div>
    </div>
  );
}
