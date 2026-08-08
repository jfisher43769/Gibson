import React from "react";
import { CLUBS, goalMinuteLabel, matchDetail } from "../../data.js";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// What we recorded about a single match: who scored and when, then the team numbers as split
// bars. Opened from a played fixture row rather than living on its own page — this is the
// answer to "what happened in that game", and the fixture list is where people already are.
//
// Bars are gold for home and sky for away, not club colours, because two clubs can wear the
// same one — Cliftonville against Crusaders is red against red. Same pairing the Duel view and
// the matchday graphics use, and the club names above carry the matching colour so the legend
// is built in rather than needing a key.
const HOME = "#FFB627";
const AWAY = "#5EC8F2";

function Bar({ pair, suffix }) {
  const [h, a] = pair;
  const total = h + a;
  const hPct = total > 0 ? (h / total) * 100 : 50;
  return (
    <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", background: faint, gap: 2 }}>
      {/* A 0-0 row would otherwise render as one side owning the whole bar. */}
      <div style={{ width: `${total > 0 ? hPct : 0}%`, background: HOME }} />
      <div style={{ width: `${total > 0 ? 100 - hPct : 0}%`, background: AWAY }} />
    </div>
  );
}

function Scorers({ goals, club, align }) {
  const mine = (goals || []).filter((g) => g.club === club);
  if (!mine.length) return <div style={{ flex: 1 }} />;
  return (
    <div style={{ flex: 1, textAlign: align, minWidth: 0 }}>
      {mine.map((g, i) => (
        <div key={i} style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
          {g.player} <span style={{ color: chalk, fontVariantNumeric: "tabular-nums" }}>{goalMinuteLabel(g)}</span>
          {g.note ? <span style={{ color: dim }}> · {g.note}</span> : null}
        </div>
      ))}
    </div>
  );
}

export function MatchDetail({ round, h, a }) {
  const d = matchDetail(round, h, a);
  if (!d) return null;

  return (
    <div style={{ ...SURFACE.flat, borderRadius: 12, padding: "12px 14px", marginTop: 8 }}>
      {d.goals && (
        <div style={{ display: "flex", gap: 12, marginBottom: d.rows.length ? 14 : 0 }}>
          <Scorers goals={d.goals} club={h} align="left" />
          <span aria-hidden="true" style={{ fontSize: 13, color: dim }}>⚽</span>
          <Scorers goals={d.goals} club={a} align="right" />
        </div>
      )}

      {d.rows.length > 0 && (<>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 9 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: HOME }}>{CLUBS[h].name}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: AWAY }}>{CLUBS[a].name}</span>
        </div>
        {d.rows.map((r) => (
          <div key={r.label} style={{ marginBottom: 9 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{
                fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, color: chalk,
                fontVariantNumeric: "tabular-nums",
              }}>{r.pair[0]}{r.suffix || ""}</span>
              <span style={{ fontSize: 11, color: dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>{r.label}</span>
              <span style={{
                fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, color: chalk,
                fontVariantNumeric: "tabular-nums",
              }}>{r.pair[1]}{r.suffix || ""}</span>
            </div>
            <Bar pair={r.pair} suffix={r.suffix} />
          </div>
        ))}
        <div style={{ fontSize: 11, color: dim, marginTop: 4, lineHeight: 1.5 }}>
          Match stats entered by hand after the game.
        </div>
      </>)}
    </div>
  );
}
