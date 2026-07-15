import React, { useState, useMemo, useEffect } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

/* ================= FONTS + GLOBAL ================= */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Barlow:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0B1512; }
    ::-webkit-scrollbar { height: 6px; width: 6px; }
    ::-webkit-scrollbar-thumb { background: rgba(240,255,245,0.15); border-radius: 3px; }
    @keyframes riseIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes ringDraw { from { stroke-dashoffset: 260; } }
    @keyframes bubblePop { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    @keyframes shimmer { 0% { background-position: -400px 0; } 100% { background-position: 400px 0; } }
    @keyframes pop { 0% { transform: scale(0.5); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
    @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    button { transition: transform 0.12s ease, opacity 0.15s ease; }
    button:active { transform: scale(0.96); }
    .gb-skel { background: linear-gradient(90deg, rgba(240,255,245,0.05) 25%, rgba(240,255,245,0.12) 50%, rgba(240,255,245,0.05) 75%); background-size: 400px 100%; animation: shimmer 1.3s infinite linear; border-radius: 8px; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
    .gb-row:hover { background: rgba(240,255,245,0.05) !important; }
    .gb-tab:focus-visible, .gb-row:focus-visible, button:focus-visible { outline: 2px solid #FFB627; outline-offset: 2px; }
  `}</style>
);

import {
  CLUBS, FINAL_PLACINGS, MID_TABLE, FULL_TABLE, PLAYERS, AXES, TRANSFERS, STATUS_META, ROLL_OF_HONOUR, ALL_TIME_TITLES, RECORDS, PREDICTOR_GW, store, KOFI_URL, EURO, CLUB_FIXTURES, FIXTURES_2627, POST_SPLIT_DATES, SUPPORT_TIERS, SOCIALS, SEASON_ARCHIVE, MARKET_VALUES, LEAGUE_FACTS, INJURIES, TEAM_STATS_2526, DISCIPLINE, WINDOW, GOALS_STATS, GOALS_LEAGUE_AVG, XG_TEAMS, XG_PLAYERS,
} from "./data.js";


/* ================= SHARED PIECES ================= */
const chalk = "#EDF5EF";
const dim = "rgba(237,245,239,0.55)";
const faint = "rgba(237,245,239,0.08)";

const ratingColor = (r) => (r >= 8 ? "#3DDC84" : r >= 7.3 ? "#FFB627" : "#8FA69B");
const formColor = (f) => (f === "W" ? "#3DDC84" : f === "D" ? "#FFB627" : "#E05252");

function Crest({ club, size = 34 }) {
  const c = CLUBS[club];
  const [c1, c2] = c.colors;
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46" aria-label={c.name + " crest"}>
      <defs>
        <clipPath id={`shield-${club}`}>
          <path d="M20 2 L37 8 V24 C37 35 29 42 20 45 C11 42 3 35 3 24 V8 Z" />
        </clipPath>
      </defs>
      <path d="M20 2 L37 8 V24 C37 35 29 42 20 45 C11 42 3 35 3 24 V8 Z" fill={c1} stroke="rgba(237,245,239,0.35)" strokeWidth="1.5" />
      <g clipPath={`url(#shield-${club})`}>
        {c.pattern === "stripes" && [8, 20, 32].map((x) => <rect key={x} x={x - 3} y="0" width="6" height="46" fill={c2} />)}
        {c.pattern === "sleeve" && <rect x="0" y="30" width="40" height="16" fill={c2} opacity="0.9" />}
        {c.pattern === "plain" && <path d="M3 26 H37 V24 H3 Z" fill={c2} />}
      </g>
      <text x="20" y="21" textAnchor="middle"
        fill={["BAN", "CAR", "BAL"].includes(club) ? "#10241B" : chalk}
        fontFamily="'Barlow Condensed', sans-serif" fontWeight="800" fontSize="10">
        {club}
      </text>
    </svg>
  );
}

function Avatar({ player, size = 56, ring = true }) {
  const c = CLUBS[player.club];
  const initials = player.name.split(" ").map((w) => w[0]).slice(0, 2).join("");
  const darkText = ["BAN", "CAR", "BAL"].includes(player.club);
  const R = size / 2 - 3;
  const circ = 2 * Math.PI * R;
  const pct = (player.rating / 10) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <div style={{
        position: "absolute", inset: 5, borderRadius: "50%",
        background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800,
        fontSize: size * 0.34, color: darkText ? "#10241B" : chalk, letterSpacing: "0.02em",
      }}>{initials}</div>
      {ring && (
        <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={faint} strokeWidth="3" />
          <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={ratingColor(player.rating)} strokeWidth="3"
            strokeLinecap="round" strokeDasharray={`${pct} ${circ}`} style={{ animation: "ringDraw 0.9s ease-out" }} />
        </svg>
      )}
    </div>
  );
}

function Sparkline({ data, color, w = 120, h = 30 }) {
  const min = Math.min(...data), max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - 4 - ((v - min) / (max - min || 1)) * (h - 8)}`).join(" ");
  return (
    <svg width={w} height={h} aria-label="form trend">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((v, i) => {
        const [x, y] = pts.split(" ")[i].split(",");
        return <circle key={i} cx={x} cy={y} r={i === data.length - 1 ? 3.5 : 2} fill={color} />;
      })}
    </svg>
  );
}

function ShotMap({ player, accent }) {
  return (
    <svg viewBox="0 0 100 70" style={{ width: "100%", background: "linear-gradient(180deg, #10241B, #0D1F17)", borderRadius: 12, border: `1px solid ${faint}` }} aria-label="shot map">
      {[14, 28, 42, 56].map((y) => <rect key={y} x="0" y={y} width="100" height="7" fill="rgba(255,255,255,0.025)" />)}
      <rect x="60" y="0.8" width="39" height="68.4" fill="none" stroke="rgba(237,245,239,0.3)" strokeWidth="0.6" />
      <rect x="82" y="15" width="17" height="40" fill="none" stroke="rgba(237,245,239,0.3)" strokeWidth="0.6" />
      <rect x="93" y="27" width="6" height="16" fill="none" stroke="rgba(237,245,239,0.3)" strokeWidth="0.6" />
      <line x1="99" y1="30" x2="99" y2="40" stroke={chalk} strokeWidth="1.4" />
      <circle cx="60" cy="35" r="9" fill="none" stroke="rgba(237,245,239,0.2)" strokeWidth="0.6" />
      {player.shots.map((s, i) => (
        <g key={i} style={{ animation: `bubblePop 0.4s ease-out ${i * 0.08}s backwards`, transformOrigin: `${s.x}px ${s.y}px` }}>
          <circle cx={s.x} cy={s.y} r={2 + s.xg * 5} fill={s.g ? accent : "transparent"} fillOpacity={s.g ? 0.85 : 0} stroke={s.g ? accent : dim} strokeWidth="0.8" />
        </g>
      ))}
      <text x="61.5" y="66" fill={dim} fontSize="3.2" fontFamily="'Barlow', sans-serif">bubble size = xG · filled = goal</text>
    </svg>
  );
}

/* ================= VIEWS ================= */
function Skel({ w = "100%", h = 12, style }) {
  return <div className="gb-skel" style={{ width: w, height: h, ...style }} aria-hidden="true" />;
}

function SkelRows({ n = 3 }) {
  return (
    <div style={{ border: "1px solid rgba(240,255,245,0.1)", borderRadius: 14, overflow: "hidden" }}>
      {Array.from({ length: n }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: i < n - 1 ? "1px solid rgba(240,255,245,0.07)" : "none" }}>
          <Skel w={20} h={20} style={{ borderRadius: "50%" }} />
          <Skel w={`${55 - i * 8}%`} h={11} />
          <Skel w={34} h={11} style={{ marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}

function TableView() {
  const noteLabel = { C: "Champions · Gibson Cup", IC: "Irish Cup winners · Europe", E: "Europe (automatic)", EPO: "Europe (via play-off)", PO: "Relegation play-off", R: "Relegated" };
  const noteColor = { C: "#3DDC84", IC: "#5EC8F2", E: "#FFB627", EPO: "#5EC8F2", PO: "#E0A252", R: "#E05252" };
  const [live, setLive] = useState(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let on = true;
    fetch("/api/table")
      .then((r) => r.json())
      .then((j) => {
        if (on && j && j.ok && Array.isArray(j.rows) && j.rows.some((r) => r.p > 0)) setLive(j);
      })
      .catch(() => {})
      .finally(() => { if (on) setChecking(false); });
    return () => { on = false; };
  }, []);
  const LiveBlock = () => {
    if (checking) return (
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3DDC84", display: "inline-block", animation: "livePulse 1.2s infinite" }} />
          <Skel w={130} h={10} />
        </div>
        <SkelRows n={3} />
      </div>
    );
    return live && (
    <div style={{ marginBottom: 22, animation: "riseIn 0.4s ease-out" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3DDC84", display: "inline-block" }} />
        <span style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Live table · {live.season} · updated {live.updated}
        </span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {live.rows.map((row, i) => (
          <div key={row.club} style={{
            display: "flex", alignItems: "center", gap: 12,
            background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`,
            borderRadius: 12, padding: "10px 14px 10px 11px",
            animation: `riseIn 0.35s ease-out ${i * 0.03}s backwards`,
          }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17, color: dim, width: 24, textAlign: "center", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{i + 1}</div>
            <Crest club={row.club} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: chalk }}>{CLUBS[row.club].name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 10.5, color: dim, fontVariantNumeric: "tabular-nums" }}>
                  P{row.p} · W{row.w} D{row.d} L{row.l} · {row.gd > 0 ? "+" : ""}{row.gd} GD
                </span>
                <span style={{ display: "flex", gap: 3 }}>
                  {row.form.split("").map((f, j) => (
                    <span key={j} style={{ width: 6.5, height: 6.5, borderRadius: "50%", background: formColor(f), opacity: j === row.form.length - 1 ? 1 : 0.55 }} />
                  ))}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, color: chalk, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{row.pts}</div>
              <div style={{ fontSize: 9, color: dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>pts</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: dim, marginTop: 8 }}>
        Auto-updated via TheSportsDB (community data) — cross-check big calls against official sources.
      </div>
    </div>
  );
  };
  const Row = ({ pos, club, note, tag, i }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`,
      borderLeft: `3px solid ${note ? noteColor[note] : "transparent"}`,
      borderRadius: 12, padding: "11px 14px 11px 11px",
      animation: `riseIn 0.35s ease-out ${i * 0.04}s backwards`,
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 18,
        color: note ? noteColor[note] : dim, width: 26, textAlign: "center",
        fontVariantNumeric: "tabular-nums", flexShrink: 0,
      }}>{pos ?? "·"}</div>
      <Crest club={club} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: chalk }}>{CLUBS[club].name}</div>
        {(note || tag) && <div style={{ fontSize: 10, color: note ? noteColor[note] : dim, marginTop: 2 }}>{note ? noteLabel[note] : tag}</div>}
      </div>
    </div>
  );
  const LiveTeaser = () => (
    <div style={{
        borderRadius: 14, padding: "14px 16px", marginBottom: 22,
        background: "linear-gradient(120deg, rgba(61,220,132,0.08), rgba(255,182,39,0.06)), rgba(240,255,245,0.02)",
        border: "1px solid rgba(61,220,132,0.25)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3DDC84", flexShrink: 0, animation: "livePulse 1.4s infinite" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", color: chalk, textTransform: "uppercase" }}>Live scores</span>
            <span style={{ fontSize: 9, fontWeight: 800, color: "#0B1512", background: "#FFB627", borderRadius: 99, padding: "2px 8px", letterSpacing: "0.06em" }}>COMING SOON</span>
          </div>
          <div style={{ fontSize: 11, color: dim, lineHeight: 1.5 }}>
            In-play Premiership scores, refreshed every two minutes. The data feed costs real money — it switches on
            the moment supporters cover it. One Season Ticket does it. ♥
          </div>
        </div>
      </div>
  );
  if (FULL_TABLE && !live) {
    const noteL = noteLabel, noteC = noteColor;
    return (
      <div style={{ animation: "riseIn 0.4s ease-out" }}>
        <LiveBlock />
        <LiveTeaser />
        <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
          Sports Direct Premiership · Final 2025/26
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {FULL_TABLE.map((row, i) => (
            <div key={row.club} style={{
              display: "flex", alignItems: "center", gap: 12,
              background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`,
              borderLeft: `3px solid ${row.note ? noteC[row.note] : "transparent"}`,
              borderRadius: 12, padding: "10px 14px 10px 11px",
              animation: `riseIn 0.35s ease-out ${i * 0.03}s backwards`,
            }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17, color: row.note ? noteC[row.note] : dim, width: 24, textAlign: "center", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{i + 1}</div>
              <Crest club={row.club} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5, color: chalk }}>{CLUBS[row.club].name}</div>
                <div style={{ fontSize: 10.5, color: dim, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                  P{row.p} · W{row.w} D{row.d} L{row.l} · {row.gd > 0 ? "+" : ""}{row.gd} GD
                </div>
                {row.note && <div style={{ fontSize: 9.5, color: noteC[row.note], marginTop: 2 }}>{noteL[row.note]}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, color: chalk, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{row.pts}</div>
                <div style={{ fontSize: 9, color: dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>pts</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: dim, marginTop: 10, lineHeight: 1.5 }}>
          Official final table (split format — Carrick matched Cliftonville's 53 points but finished 7th in the
          bottom-six group). Verified · GIBSON 1.01.
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
            Squad Market Values 26/27 · Transfermarkt
          </div>
          <div style={{ display: "grid", gap: 7 }}>
            {MARKET_VALUES.map((m, i) => (
              <div key={m.club} style={{ display: "flex", alignItems: "center", gap: 10, animation: `riseIn 0.35s ease-out ${i * 0.04}s backwards` }}>
                <Crest club={m.club} size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[m.club].name} <span style={{ color: dim, fontWeight: 400, fontSize: 10.5 }}>· {m.squad} players</span></span>
                    <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>€{m.total.toFixed(2)}m</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden" }}>
                    <div style={{ width: `${Math.max((m.total / MARKET_VALUES[0].total) * 100, 3)}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[m.club].colors[0]}, ${CLUBS[m.club].colors[0]}AA)`, borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10.5, color: dim, marginTop: 10, lineHeight: 1.6 }}>
            League total {LEAGUE_FACTS.totalValue} across {LEAGUE_FACTS.players} players · {LEAGUE_FACTS.foreigners} from outside NI · average age {LEAGUE_FACTS.avgAge}.
            Most valuable player: {LEAGUE_FACTS.mvp}.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <LiveBlock />
      <LiveTeaser />
      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Sports Direct Premiership · Final 2025/26
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {FINAL_PLACINGS.filter((r) => r.pos <= 4).map((r, i) => <Row key={r.club} {...r} i={i} />)}
      </div>
      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", margin: "16px 0 8px" }}>
        Mid-table · finished 5th–10th
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {MID_TABLE.map((r, i) => <Row key={r.club} club={r.club} tag={r.tag} i={i} />)}
      </div>
      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", margin: "16px 0 8px" }}>
        The bottom
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {FINAL_PLACINGS.filter((r) => r.pos >= 11).map((r, i) => <Row key={r.club} {...r} i={i} />)}
      </div>
      <div style={{ fontSize: 10, color: dim, marginTop: 10, lineHeight: 1.5 }}>
        Confirmed final placings shown. Full verified records now live in the table above —
        the 26/27 live table takes over here in August.
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
          Squad Market Values 26/27 · Transfermarkt
        </div>
        <div style={{ display: "grid", gap: 7 }}>
          {MARKET_VALUES.map((m, i) => (
            <div key={m.club} style={{ display: "flex", alignItems: "center", gap: 10, animation: `riseIn 0.35s ease-out ${i * 0.04}s backwards` }}>
              <Crest club={m.club} size={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[m.club].name} <span style={{ color: dim, fontWeight: 400, fontSize: 10.5 }}>· {m.squad} players</span></span>
                  <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>€{m.total.toFixed(2)}m</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max((m.total / MARKET_VALUES[0].total) * 100, 3)}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[m.club].colors[0]}, ${CLUBS[m.club].colors[0]}AA)`, borderRadius: 3 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: dim, marginTop: 10, lineHeight: 1.6 }}>
          League total {LEAGUE_FACTS.totalValue} across {LEAGUE_FACTS.players} players · {LEAGUE_FACTS.foreigners} from outside NI · average age {LEAGUE_FACTS.avgAge}.
          Most valuable player: {LEAGUE_FACTS.mvp}.
        </div>
      </div>

    </div>
  );
}

function PlayerDetail({ player }) {
  const c = CLUBS[player.club];
  const darkAccent = ["BAN", "CAR", "BAL", "COL", "LIN", "DUN", "GLV"].includes(player.club);
  const accent = player.club === "GLE" ? "#3DDC84" : darkAccent ? "#FFB627" : c.colors[0];
  const radarData = AXES.map((a, i) => ({ axis: a, v: player.radar[i] }));
  const stat = (label, value, sub) => (
    <div style={{ background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 26, color: chalk, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 11, color: dim, marginTop: 3 }}>{label}{sub && <span style={{ color: accent }}> · {sub}</span>}</div>
    </div>
  );
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "18px 16px", borderRadius: 14,
        background: `linear-gradient(120deg, ${c.colors[0]}26, transparent 55%), rgba(240,255,245,0.03)`,
        border: `1px solid ${faint}`, marginBottom: 14, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -10, top: -30, fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 120, color: "rgba(237,245,239,0.05)", lineHeight: 1 }}>{player.num}</div>
        <Avatar player={player} size={64} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 26, textTransform: "uppercase", letterSpacing: "0.02em", color: chalk, lineHeight: 1 }}>{player.name}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
            <Crest club={player.club} size={20} />
            <span style={{ fontSize: 12, color: dim }}>{c.name} · {c.ground} · {player.pos}</span>
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 34, color: ratingColor(player.rating), lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{player.rating.toFixed(1)}</div>
          <div style={{ fontSize: 10, color: dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>GIBSON Index</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8, marginBottom: 14 }}>
        {stat("Goals", player.goals, `xG ${player.xg}`)}
        {stat("Assists", player.assists, `xA ${player.xa}`)}
        {stat("G + A", player.goals + player.assists)}
        {stat("Shots /90", player.per90.shots)}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 2 }}>Form DNA — last 6</div>
          <div style={{ fontSize: 12, color: chalk, fontVariantNumeric: "tabular-nums" }}>{player.form.join("  ·  ")}</div>
        </div>
        <Sparkline data={player.form} color={accent} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        <div style={{ background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`, borderRadius: 12, padding: 8 }}>
          <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 8px" }}>Skill Radar · GIBSON Index beta</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={faint} />
                <PolarAngleAxis dataKey="axis" tick={{ fill: dim, fontSize: 11, fontFamily: "Barlow" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="v" stroke={accent} fill={accent} fillOpacity={0.35} strokeWidth={2} isAnimationActive />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Shot Map — attacking third</div>
          <ShotMap player={player} accent={accent} />
        </div>
      </div>
    </div>
  );
}

function DuelView() {
  const [a, setA] = useState(PLAYERS[0].id);
  const [b, setB] = useState(PLAYERS[1].id);
  const pA = PLAYERS.find((p) => p.id === a);
  const pB = PLAYERS.find((p) => p.id === b);
  const colA = "#FFB627", colB = "#5EC8F2";
  const data = AXES.map((ax, i) => ({ axis: ax, A: pA.radar[i], B: pB.radar[i] }));
  const rows = [
    ["Goals", pA.goals, pB.goals], ["Assists", pA.assists, pB.assists],
    ["xG", pA.xg, pB.xg], ["xA", pA.xa, pB.xa],
    ["Shots /90", pA.per90.shots, pB.per90.shots],
    ["Key passes /90", pA.per90.keyPasses, pB.per90.keyPasses],
    ["Dribbles /90", pA.per90.dribbles, pB.per90.dribbles],
    ["Tackles /90", pA.per90.tackles, pB.per90.tackles],
  ];
  const Select = ({ value, onChange, exclude }) => (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} style={{
      background: "#12211B", color: chalk, border: `1px solid ${faint}`, borderRadius: 8,
      padding: "8px 10px", fontFamily: "'Barlow'", fontSize: 13, width: "100%",
    }}>
      {PLAYERS.filter((p) => p.id !== exclude).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ fontSize: 11, color: dim, marginBottom: 12, lineHeight: 1.5 }}>
        Pick any two, settle the argument. Radar profiles are GIBSON Index estimates — fuel for the debate, not the end of it.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "center", marginBottom: 14 }}>
        <div style={{ textAlign: "center" }}>
          <Avatar player={pA} size={62} />
          <div style={{ height: 8 }} />
          <Select value={a} onChange={setA} exclude={b} />
        </div>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 30, color: dim }}>VS</div>
        <div style={{ textAlign: "center" }}>
          <Avatar player={pB} size={62} />
          <div style={{ height: 8 }} />
          <Select value={b} onChange={setB} exclude={a} />
        </div>
      </div>

      <div style={{ background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`, borderRadius: 12, marginBottom: 14 }}>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <RadarChart data={data} outerRadius="72%">
              <PolarGrid stroke={faint} />
              <PolarAngleAxis dataKey="axis" tick={{ fill: dim, fontSize: 11, fontFamily: "Barlow" }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="A" stroke={colA} fill={colA} fillOpacity={0.28} strokeWidth={2} isAnimationActive />
              <Radar dataKey="B" stroke={colB} fill={colB} fillOpacity={0.28} strokeWidth={2} isAnimationActive />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 18, paddingBottom: 12, fontSize: 12 }}>
          <span style={{ color: colA }}>● {pA.name}</span>
          <span style={{ color: colB }}>● {pB.name}</span>
        </div>
      </div>

      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Tale of the tape</div>
      {rows.map(([label, va, vb]) => {
        const total = va + vb || 1;
        const aWins = va > vb;
        return (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>
              <span style={{ color: aWins ? colA : dim, fontWeight: aWins ? 700 : 400 }}>{va}</span>
              <span style={{ color: dim, fontSize: 11 }}>{label}</span>
              <span style={{ color: !aWins && vb !== va ? colB : dim, fontWeight: !aWins && vb !== va ? 700 : 400 }}>{vb}</span>
            </div>
            <div style={{ display: "flex", height: 5, borderRadius: 3, overflow: "hidden", background: faint }}>
              <div style={{ width: `${(va / total) * 100}%`, background: colA, transition: "width 0.5s ease" }} />
              <div style={{ width: `${(vb / total) * 100}%`, background: colB, transition: "width 0.5s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ExternalBadge({ name }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{
        width: 20, height: 22, borderRadius: 4, border: `1px dashed ${dim}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        fontSize: 8, color: dim, fontFamily: "'Barlow Condensed'", fontWeight: 700,
      }}>OUT</div>
      <span style={{ fontSize: 12, color: dim }}>{name}</span>
    </div>
  );
}

function ClubLedger() {
  const [club, setClub] = useState("LAR");
  const w = WINDOW.find((x) => x.club === club);
  const List = ({ title, items, color }) => (
    <div style={{ border: `1px solid ${faint}`, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, color, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {items.length === 0 && <div style={{ fontSize: 11.5, color: dim, fontStyle: "italic" }}>None recorded yet</div>}
      {items.map(([p, c]) => (
        <div key={p + c} style={{ marginBottom: 7 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: chalk, lineHeight: 1.3 }}>{p}</div>
          <div style={{ fontSize: 10.5, color: dim }}>{c}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Full window · club by club
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {WINDOW.map((x) => (
          <button key={x.club} onClick={() => setClub(x.club)} aria-label={CLUBS[x.club].name} style={{
            padding: 3, borderRadius: 10, cursor: "pointer",
            background: club === x.club ? "rgba(255,182,39,0.14)" : "transparent",
            border: `1px solid ${club === x.club ? "rgba(255,182,39,0.5)" : faint}`,
          }}>
            <Crest club={x.club} size={24} />
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <List title={`→ In at ${CLUBS[club].name}`} items={w.ins} color="#3DDC84" />
        <List title={`← Out`} items={w.outs} color="#E05252" />
      </div>
      <div style={{ fontSize: 10, color: dim, marginTop: 8, lineHeight: 1.5 }}>
        Compiled from Transfermarkt, July 2026 — may not be exhaustive. Loan returns noted where known.
      </div>
    </div>
  );
}

function TransfersView() {
  const [filter, setFilter] = useState("all");
  const items = TRANSFERS.filter((t) => filter === "all" || t.status === filter);
  const emptyLines = {
    rumour: "No live rumours on the books — which in this league means one's about to break. Check back after the weekend.",
    done: "No confirmed deals in this view yet — the window runs until 31 August, and Irish League business loves a deadline.",
    departure: "Nobody's left the league in this window yet. The ferries stay empty for now.",
  };
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Summer window 2026</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["all", "done", "rumour", "contract", "departure"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{
              fontSize: 11, padding: "4px 10px", borderRadius: 999, cursor: "pointer", textTransform: "capitalize",
              background: filter === s ? "rgba(255,182,39,0.15)" : "transparent",
              color: filter === s ? "#FFB627" : dim,
              border: `1px solid ${filter === s ? "rgba(255,182,39,0.4)" : faint}`,
            }}>{s === "all" ? "All" : STATUS_META[s].label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {items.length === 0 && (
          <div style={{ border: `1px dashed ${faint}`, borderRadius: 14, padding: "18px 16px", fontSize: 12.5, color: dim, lineHeight: 1.6, textAlign: "center" }}>
            {emptyLines[filter] || "Nothing here yet."}
          </div>
        )}
        {items.map((t, i) => {
          const meta = STATUS_META[t.status];
          const isContract = t.status === "contract";
          const isReleaseOnly = !t.to && !t.toExternal;
          return (
            <div key={t.id} style={{
              background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`,
              borderLeft: `3px solid ${meta.color}`, borderRadius: 12, padding: "12px 14px",
              animation: `riseIn 0.4s ease-out ${i * 0.06}s backwards`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 17, color: chalk }}>{t.player}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: dim }}>{t.date}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: `${meta.color}1F`, borderRadius: 999, padding: "3px 9px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{meta.label}</span>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {t.fromExternal
                    ? <ExternalBadge name={t.fromExternal} />
                    : <><Crest club={t.from} size={20} /><span style={{ fontSize: 12, color: dim }}>{CLUBS[t.from].name}</span></>}
                </div>
                {!isContract && (
                  <>
                    <span style={{ color: meta.color, fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16 }}>→</span>
                    {isReleaseOnly
                      ? <span style={{ fontSize: 12, color: dim, fontStyle: "italic" }}>Released</span>
                      : t.toExternal
                        ? <ExternalBadge name={t.toExternal} />
                        : <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <Crest club={t.to} size={20} />
                            <span style={{ fontSize: 12, color: chalk, fontWeight: 600 }}>{CLUBS[t.to].name}</span>
                          </div>}
                  </>
                )}
                {isContract && <span style={{ fontSize: 12, color: "#5EC8F2" }}>✎ stays put</span>}
              </div>
              <div style={{ fontSize: 12, color: dim, marginTop: 7, lineHeight: 1.4 }}>{t.note}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: dim, marginTop: 10 }}>
        Sourced from Irish League press coverage, early July 2026. "Rumour" means reported but not yet officially confirmed by the club.
      </div>

      <ClubLedger />
    </div>
  );
}

function OddsStrip({ odds, homeLabel, awayLabel }) {
  if (!odds) {
    return (
      <div style={{
        display: "flex", justifyContent: "center", gap: 6, marginTop: 10,
        fontSize: 10.5, color: dim, fontStyle: "italic",
      }}>GIBSON's still crunching this one — estimate lands closer to kick-off</div>
    );
  }
  const cell = (label, val) => (
    <div style={{ flex: 1, textAlign: "center", background: "rgba(240,255,245,0.04)", border: `1px solid ${faint}`, borderRadius: 8, padding: "7px 4px" }}>
      <div style={{ fontSize: 9, color: dim, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: chalk, marginTop: 2 }}>{val.toFixed(2)}</div>
    </div>
  );
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 8.5, color: dim, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 4 }}>
        1X2 · GIBSON estimate
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {cell(homeLabel, odds.home)}
        {cell("Draw", odds.draw)}
        {cell(awayLabel, odds.away)}
      </div>
    </div>
  );
}

function OddsDisclaimer() {
  return (
    <div style={{ fontSize: 10, color: dim, marginTop: 12, lineHeight: 1.5, borderTop: `1px solid ${faint}`, paddingTop: 10 }}>
      Odds shown are GIBSON's own estimates for context — not bookmaker prices, not a betting offer, and
      GIBSON has no link to any bookmaker. 18+. If gambling stops being fun, free support is available at
      begambleaware.org.
    </div>
  );
}

function EuropeView() {
  const compColor = (c) => (c === "Champions League" ? "#5EC8F2" : "#3DDC84");
  const anyOdds = EURO.some((e) => e.odds);
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
        Euro Watch · Qualifying 2026/27
      </div>
      <div style={{ fontSize: 12, color: dim, marginBottom: 12, lineHeight: 1.5 }}>
        Four Irish League clubs on the continent this summer. First legs from 7 July.
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        {EURO.map((e, i) => {
          const c = CLUBS[e.club];
          return (
            <div key={e.club} style={{
              background: `linear-gradient(120deg, ${c.colors[0]}1F, transparent 55%), rgba(240,255,245,0.03)`,
              border: `1px solid ${faint}`, borderRadius: 14, padding: "14px",
              animation: `riseIn 0.4s ease-out ${i * 0.08}s backwards`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <Crest club={e.club} size={26} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 19, textTransform: "uppercase", color: chalk, lineHeight: 1 }}>
                    {c.name} <span style={{ color: dim, fontWeight: 600 }}>v</span> {e.opp}
                  </div>
                  <div style={{ fontSize: 11, color: dim, marginTop: 3 }}>{e.opp} · {e.oppCountry}</div>
                </div>
                <span style={{
                  fontSize: 9.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: compColor(e.comp), background: `${compColor(e.comp)}1A`,
                  border: `1px solid ${compColor(e.comp)}55`, borderRadius: 999, padding: "3px 10px",
                }}>{e.comp}</span>
              </div>
              <div style={{ fontSize: 10, color: dim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{e.round}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {e.legs.map((l) => (
                  <div key={l.label} style={{ background: "rgba(11,21,18,0.5)", border: `1px solid ${faint}`, borderRadius: 10, padding: "9px 11px" }}>
                    <div style={{ fontSize: 9.5, color: dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>{l.label}</div>
                    <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: chalk, marginTop: 2 }}>{l.date}</div>
                    <div style={{ fontSize: 11, color: dim }}>{l.venue}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#FFB627", fontWeight: 600, marginBottom: 5 }}>→ {e.prize}</div>
              <div style={{ fontSize: 11.5, color: dim, lineHeight: 1.45 }}>{e.note}</div>
              <OddsStrip
                odds={e.odds}
                homeLabel={e.legs[0].label.includes("home") ? c.name : e.opp}
                awayLabel={e.legs[0].label.includes("home") ? e.opp : c.name}
              />
            </div>
          );
        })}
      </div>
      {anyOdds && <OddsDisclaimer />}
    </div>
  );
}

function FixturesView() {
  const [club, setClub] = useState("LAR");
  const [mode, setMode] = useState("club"); // 'club' | 'round'
  const [round, setRound] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [liveEv, setLiveEv] = useState(null);
  const [evLoading, setEvLoading] = useState(true);
  useEffect(() => {
    let on = true;
    fetch("/api/events")
      .then((r) => r.json())
      .then((j) => { if (on && j && j.ok) setLiveEv(j); })
      .catch(() => {})
      .finally(() => { if (on) setEvLoading(false); });
    return () => { on = false; };
  }, []);
  const euro = CLUB_FIXTURES[club];
  const c = CLUBS[club];
  const leagueFixtures = [];
  for (const r of FIXTURES_2627) {
    for (const m of r.matches) {
      if (m.h === club || m.a === club) {
        leagueFixtures.push({
          round: r.round,
          date: m.d || r.date,
          time: m.t || r.time || "3pm",
          home: m.h === club,
          opp: m.h === club ? m.a : m.h,
          venue: CLUBS[m.h].ground,
        });
      }
    }
  }
  const nextLeague = showAll ? leagueFixtures : leagueFixtures.slice(0, 5);
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["club", "By club"], ["round", "By round"]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
            fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase",
            background: mode === m ? "#FFB627" : "rgba(240,255,245,0.05)",
            color: mode === m ? "#0B1512" : dim,
            border: `1px solid ${mode === m ? "#FFB627" : faint}`,
          }}>{label}</button>
        ))}
      </div>

      {mode === "round" && (() => {
        const r = FIXTURES_2627.find((x) => x.round === round) || FIXTURES_2627[0];
        return (
          <div style={{ animation: "riseIn 0.3s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button onClick={() => setRound(Math.max(1, round - 1))} disabled={round === 1} style={{
                padding: "8px 16px", borderRadius: 10, cursor: round === 1 ? "default" : "pointer", opacity: round === 1 ? 0.3 : 1,
                background: "rgba(240,255,245,0.06)", color: chalk, border: `1px solid ${faint}`,
                fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16,
              }} aria-label="Previous round">‹</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, color: chalk, textTransform: "uppercase" }}>Round {r.round} of 33</div>
                <div style={{ fontSize: 11, color: dim }}>{r.date}</div>
              </div>
              <button onClick={() => setRound(Math.min(33, round + 1))} disabled={round === 33} style={{
                padding: "8px 16px", borderRadius: 10, cursor: round === 33 ? "default" : "pointer", opacity: round === 33 ? 0.3 : 1,
                background: "rgba(240,255,245,0.06)", color: chalk, border: `1px solid ${faint}`,
                fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16,
              }} aria-label="Next round">›</button>
            </div>
            <div key={r.round} style={{ border: `1px solid ${faint}`, borderRadius: 14, overflow: "hidden", marginBottom: 10, animation: "riseIn 0.28s ease-out" }}>
              {r.matches.map((m, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", padding: "12px 14px",
                  borderBottom: i < r.matches.length - 1 ? `1px solid ${faint}` : "none",
                  background: i % 2 ? "rgba(240,255,245,0.02)" : "transparent",
                }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: chalk, textAlign: "right" }}>{CLUBS[m.h].name}</span>
                    <Crest club={m.h} size={19} />
                  </div>
                  <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#FFB627", padding: "0 12px" }}>V</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <Crest club={m.a} size={19} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: chalk }}>{CLUBS[m.a].name}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: dim, lineHeight: 1.5, marginBottom: 6 }}>
              {r.matches.some((m) => m.d) ? "Highlighted dates: " + r.matches.filter((m) => m.d).map((m) => `${CLUBS[m.h].name} v ${CLUBS[m.a].name} (${m.d}${m.t ? " · " + m.t : ""})`).join(" · ") + ". Others " + r.date + ", 3pm." : `All matches ${r.date}, 3pm unless rearranged.`}
            </div>
            <div style={{ fontSize: 10.5, color: dim, lineHeight: 1.5 }}>
              After round 33 the league splits — top six and bottom six play five more rounds against each other. Split fixtures released in March.
            </div>
          </div>
        );
      })()}

      {mode === "club" && (<>
      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
        BoyleSports Premiership 26/27 · pick your club
      </div>
      <div style={{ fontSize: 11, color: dim, marginBottom: 10, lineHeight: 1.5 }}>
        Opening night: Cliftonville v Crusaders under the Friday lights at Solitude, 7 Aug. Big Two derby as early as Round 2.
      </div>
      {evLoading && (
        <div style={{ marginBottom: 14 }}><SkelRows n={2} /></div>
      )}
      {!evLoading && !liveEv && (
        <div style={{ fontSize: 11, color: dim, marginBottom: 14, lineHeight: 1.5, animation: "riseIn 0.3s ease-out" }}>
          ⚡ The live results feed wakes up when the league does — opening night, Friday 7 August at Solitude.
        </div>
      )}
      {liveEv && liveEv.results && liveEv.results.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3DDC84", display: "inline-block" }} />
            <span style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Latest results · auto-updated</span>
          </div>
          <div style={{ border: `1px solid ${faint}`, borderRadius: 14, overflow: "hidden" }}>
            {liveEv.results.slice(0, 6).map((m, i) => (
              <div key={m.h + m.a + m.date} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 13px",
                borderBottom: i < Math.min(liveEv.results.length, 6) - 1 ? `1px solid ${faint}` : "none",
              }}>
                <span style={{ fontSize: 10, color: dim, width: 56, flexShrink: 0 }}>{m.date.slice(5)}</span>
                <Crest club={m.h} size={16} />
                <span style={{ fontSize: 12, color: chalk, flex: 1, textAlign: "right", fontWeight: m.hs > m.as ? 700 : 400 }}>{CLUBS[m.h].name}</span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, color: "#FFB627", fontVariantNumeric: "tabular-nums", padding: "0 6px" }}>{m.hs}–{m.as}</span>
                <span style={{ fontSize: 12, color: chalk, flex: 1, fontWeight: m.as > m.hs ? 700 : 400 }}>{CLUBS[m.a].name}</span>
                <Crest club={m.a} size={16} />
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {Object.keys(CLUBS).filter((k) => k !== "GLV").map((k) => (
          <button key={k} onClick={() => setClub(k)} aria-label={CLUBS[k].name} style={{
            padding: 3, borderRadius: 10, cursor: "pointer",
            background: club === k ? "rgba(255,182,39,0.14)" : "transparent",
            border: `1px solid ${club === k ? "rgba(255,182,39,0.5)" : faint}`,
          }}>
            <Crest club={k} size={26} />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Crest club={club} size={24} />
        <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk }}>{c.name}</span>
        <span style={{ fontSize: 11, color: dim }}>· {c.ground}</span>
      </div>
      {euro && (
        <>
          <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>In Europe first</div>
          <div style={{ border: `1px solid ${faint}`, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            {euro.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
                borderBottom: i < euro.length - 1 ? `1px solid ${faint}` : "none",
                opacity: f.opp.includes("*") ? 0.6 : 1,
              }}>
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#5EC8F2", width: 74, flexShrink: 0, lineHeight: 1.2 }}>{f.date}{f.res && <span style={{ color: "#FFB627" }}> {f.res}</span>}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: chalk }}>{f.opp.replace("*", "")}{f.opp.includes("*") && <span style={{ fontSize: 10, color: dim }}> (provisional)</span>}</div>
                  <div style={{ fontSize: 11, color: dim, marginTop: 2 }}>{f.comp}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
        Premiership · {showAll ? "full 33-round schedule" : "opening five"}
      </div>
      <div style={{ border: `1px solid ${faint}`, borderRadius: 14, overflow: "hidden" }}>
        {nextLeague.map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
            borderBottom: i < nextLeague.length - 1 ? `1px solid ${faint}` : "none",
          }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#FFB627", width: 74, flexShrink: 0, lineHeight: 1.2 }}>
              {f.date}
              <div style={{ fontSize: 9.5, color: dim, fontWeight: 600 }}>{f.time}</div>
            </div>
            <Crest club={f.opp} size={22} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: chalk }}>
                {CLUBS[f.opp].name} <span style={{ color: f.home ? "#3DDC84" : dim, fontSize: 11, fontWeight: 700 }}>{f.home ? "(H)" : "(A)"}</span>
              </div>
              <div style={{ fontSize: 11, color: dim, marginTop: 2 }}>Round {f.round} · {f.venue}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setShowAll(!showAll)} style={{
        width: "100%", marginTop: 10, padding: "11px", borderRadius: 10, cursor: "pointer",
        background: "rgba(240,255,245,0.05)", color: chalk, border: `1px solid ${faint}`,
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{showAll ? "Show opening five only" : `Show all ${leagueFixtures.length} league fixtures`}</button>
      <div style={{ fontSize: 10, color: dim, marginTop: 10, lineHeight: 1.5 }}>
        Official fixture list, July 2026 — subject to change for broadcast picks and European involvement.
        Post-split rounds 34–38: {POST_SPLIT_DATES.join(", ")} (opponents decided by the split).
      </div>
      </>)}
    </div>
  );
}


function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function PredictorView() {
  const storageKey = `gibson-predictor-${PREDICTOR_GW.id}`;
  const saved = (() => {
    try { return JSON.parse(store.get(storageKey)) || null; } catch { return null; }
  })();
  const [picks, setPicks] = useState(saved?.picks || Object.fromEntries(PREDICTOR_GW.fixtures.map((f) => [f.id, [1, 1]])));
  const [locked, setLocked] = useState(!!saved?.locked);
  const [copied, setCopied] = useState(false);

  const bump = (fid, side, delta) => {
    if (locked) return;
    setPicks((p) => {
      const next = { ...p, [fid]: [...p[fid]] };
      next[fid][side] = Math.max(0, Math.min(9, next[fid][side] + delta));
      return next;
    });
  };

  const lockIn = () => {
    store.set(storageKey, JSON.stringify({ picks, locked: true }));
    setLocked(true);
  };
  const unlock = () => {
    store.set(storageKey, JSON.stringify({ picks, locked: false }));
    setLocked(false);
  };

  const sideName = (s) => (s.club ? CLUBS[s.club].name : s.external);
  const scoreFor = (f) => {
    if (!f.result || !picks[f.id]) return null;
    const [ph, pa] = picks[f.id], [rh, ra] = f.result;
    if (ph === rh && pa === ra) return 3;
    if (Math.sign(ph - pa) === Math.sign(rh - ra)) return 1;
    return 0;
  };
  const resultsIn = PREDICTOR_GW.fixtures.some((f) => f.result);
  const anyOdds = PREDICTOR_GW.fixtures.some((f) => f.odds);
  const totalPts = PREDICTOR_GW.fixtures.reduce((sum, f) => sum + (scoreFor(f) ?? 0), 0);

  const shareText = () => {
    const lines = PREDICTOR_GW.fixtures.map((f) => `${sideName(f.home)} ${picks[f.id][0]}-${picks[f.id][1]} ${sideName(f.away)}`);
    let origin = "";
    try { origin = window.location.origin; } catch {}
    return `🏆 My GIBSON Predictor — ${PREDICTOR_GW.name}\n${lines.join("\n")}\nMake your own: ${origin}`;
  };
  const copyPicks = async () => {
    try { await navigator.clipboard.writeText(shareText()); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  const shareImage = async () => {
    const W = 1080, H = 1080;
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    // background
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, "#10241B"); bg.addColorStop(1, "#0B1512");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // glow
    const glow = ctx.createRadialGradient(W/2, 380, 60, W/2, 380, 560);
    glow.addColorStop(0, "rgba(255,182,39,0.13)"); glow.addColorStop(1, "rgba(255,182,39,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    // header
    ctx.fillStyle = "#EDF5EF";
    ctx.font = "bold 78px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.fillText(resultsIn ? "MY PREDICTOR SCORE" : "MY PICKS", W/2, 150);
    ctx.fillStyle = "#FFB627";
    ctx.font = "bold 34px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    ctx.fillText(PREDICTOR_GW.name.toUpperCase() + " · GIBSON 🎯", W/2, 210);
    // fixtures
    const n = PREDICTOR_GW.fixtures.length;
    const rowH = 150, startY = 320;
    PREDICTOR_GW.fixtures.forEach((f, i) => {
      const y = startY + i * rowH;
      // card
      ctx.fillStyle = "rgba(240,255,245,0.04)";
      ctx.strokeStyle = "rgba(240,255,245,0.12)";
      roundRect(ctx, 70, y - 62, W - 140, 124, 18); ctx.fill(); ctx.stroke();
      const pk = picks[f.id] || [0, 0];
      ctx.fillStyle = "#EDF5EF";
      ctx.font = "bold 33px 'Barlow Condensed', 'Arial Narrow', sans-serif";
      ctx.textAlign = "right"; ctx.fillText(sideName(f.home).toUpperCase(), W/2 - 110, y + 3);
      ctx.textAlign = "left"; ctx.fillText(sideName(f.away).toUpperCase(), W/2 + 110, y + 3);
      ctx.textAlign = "center";
      ctx.fillStyle = "#FFB627";
      ctx.font = "bold 52px 'Barlow Condensed', 'Arial Narrow', sans-serif";
      ctx.fillText(`${pk[0]} – ${pk[1]}`, W/2, y + 8);
      // scored chip / comp line
      const pts = scoreFor(f);
      if (pts !== null) {
        ctx.font = "bold 26px 'Barlow Condensed', 'Arial Narrow', sans-serif";
        ctx.fillStyle = pts === 3 ? "#3DDC84" : pts === 1 ? "#FFB627" : "#FF5A5A";
        ctx.fillText(pts === 3 ? "EXACT · +3" : pts === 1 ? "RESULT · +1" : "+0", W/2, y + 48);
      } else {
        ctx.font = "24px 'Barlow Condensed', 'Arial Narrow', sans-serif";
        ctx.fillStyle = "#8FA69B";
        ctx.fillText(f.comp, W/2, y + 46);
      }
    });
    // total
    const footY = startY + n * rowH + 40;
    if (resultsIn) {
      ctx.fillStyle = "#3DDC84";
      ctx.font = "bold 58px 'Barlow Condensed', 'Arial Narrow', sans-serif";
      ctx.fillText(`${totalPts} POINTS`, W/2, footY);
    } else {
      ctx.fillStyle = "#EDF5EF";
      ctx.font = "bold 36px 'Barlow Condensed', 'Arial Narrow', sans-serif";
      ctx.fillText("THINK YOU KNOW BETTER? 🎯", W/2, footY);
    }
    // gibson footer
    ctx.fillStyle = "#FFB627";
    ctx.font = "bold 30px 'Barlow Condensed', 'Arial Narrow', sans-serif";
    let origin = "";
    try { origin = window.location.host; } catch {}
    ctx.fillText("🏆 GIBSON · " + origin, W/2, H - 60);
    // share
    cv.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "gibson-picks.png", { type: "image/png" });
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: "My GIBSON picks" });
          return;
        }
      } catch {}
      // fallback: download
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement("a");
      aEl.href = url; aEl.download = "gibson-picks.png"; aEl.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, "image/png");
  };


  const Stepper = ({ fid, side }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <button onClick={() => bump(fid, side, 1)} disabled={locked} style={{
        width: 34, height: 26, borderRadius: 8, border: `1px solid ${faint}`, cursor: locked ? "default" : "pointer",
        background: "rgba(240,255,245,0.06)", color: locked ? dim : "#FFB627", fontSize: 15, fontWeight: 800,
        opacity: locked ? 0.4 : 1,
      }}>+</button>
      <div style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 32, color: chalk,
        fontVariantNumeric: "tabular-nums", lineHeight: 1, minWidth: 30, textAlign: "center",
      }}>{picks[fid][side]}</div>
      <button onClick={() => bump(fid, side, -1)} disabled={locked} style={{
        width: 34, height: 26, borderRadius: 8, border: `1px solid ${faint}`, cursor: locked ? "default" : "pointer",
        background: "rgba(240,255,245,0.06)", color: locked ? dim : "#FFB627", fontSize: 15, fontWeight: 800,
        opacity: locked ? 0.4 : 1,
      }}>−</button>
    </div>
  );

  const TeamCell = ({ s }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, width: 84 }}>
      {s.club
        ? <Crest club={s.club} size={30} />
        : <div style={{ width: 30, height: 34, borderRadius: 6, border: `1px dashed ${dim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: dim, fontFamily: "'Barlow Condensed'", fontWeight: 700 }}>EUR</div>}
      <span style={{ fontSize: 11, fontWeight: 600, color: chalk, textAlign: "center", lineHeight: 1.25 }}>{sideName(s)}</span>
    </div>
  );

  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        borderRadius: 14, padding: "16px", marginBottom: 14,
        background: "linear-gradient(120deg, rgba(255,182,39,0.12), transparent 60%), rgba(240,255,245,0.03)",
        border: `1px solid ${faint}`,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
            The Predictor · {PREDICTOR_GW.name}
          </div>
          <div style={{ fontSize: 11.5, color: dim, marginTop: 4 }}>
            Exact score 3 pts · correct result 1 pt · {PREDICTOR_GW.deadline}
          </div>
          {!resultsIn && Object.keys(picks).length === 0 && (
            <div style={{ fontSize: 11.5, color: "#FFB627", marginTop: 6, lineHeight: 1.5 }}>
              All 0–0s? Bold strategy. Tap the arrows to call it properly — GIBSON's odds are just an opinion.
            </div>
          )}
          <div style={{ display: "none" }}>
          </div>
        </div>
        {resultsIn && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 30, color: "#3DDC84", lineHeight: 1, animation: "pop 0.45s ease-out" }}>{totalPts}</div>
            <div style={{ fontSize: 10.5, color: dim, marginTop: 4 }}>
              {totalPts === 0 ? "Blanked. Even the bookies get weeks like this." : totalPts >= 7 ? "Scenes. Frame this one." : totalPts >= 4 ? "Solid week's work." : "Points on the board — momentum builds."}
            </div>
            <div style={{ fontSize: 9, color: dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>points</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        {PREDICTOR_GW.fixtures.map((f, i) => {
          const pts = scoreFor(f);
          return (
            <div key={f.id} style={{
              background: "rgba(240,255,245,0.03)", border: `1px solid ${pts === 3 ? "#3DDC84" : pts === 1 ? "#FFB627" : faint}`,
              borderRadius: 14, padding: "14px 10px 12px",
              animation: `riseIn 0.4s ease-out ${i * 0.07}s backwards`,
            }}>
              <div style={{ textAlign: "center", fontSize: 9.5, color: dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>{f.comp}</div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10 }}>
                <TeamCell s={f.home} />
                <Stepper fid={f.id} side={0} />
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: dim }}>–</div>
                <Stepper fid={f.id} side={1} />
                <TeamCell s={f.away} />
              </div>
              {f.result && (
                <div style={{ textAlign: "center", marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: dim }}>Result: </span>
                  <span style={{ color: chalk, fontWeight: 700 }}>{f.result[0]}–{f.result[1]}</span>
                  {pts !== null && <span style={{ color: pts === 3 ? "#3DDC84" : pts === 1 ? "#FFB627" : "#E05252", fontWeight: 700 }}> · +{pts} pts</span>}
                </div>
              )}
              <OddsStrip odds={f.odds} homeLabel={sideName(f.home)} awayLabel={sideName(f.away)} />
            </div>
          );
        })}
      </div>
      {anyOdds && <OddsDisclaimer />}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        {locked ? (
          <button onClick={unlock} style={{
            padding: "12px", borderRadius: 10, cursor: "pointer",
            background: "rgba(240,255,245,0.06)", color: chalk, border: `1px solid ${faint}`,
            fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>✏️ Edit picks</button>
        ) : (
          <button onClick={lockIn} style={{
            padding: "12px", borderRadius: 10, cursor: "pointer",
            background: "#FFB627", color: "#0B1512", border: "1px solid #FFB627",
            fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>🔒 Lock in</button>
        )}
        <button onClick={shareImage} style={{
          padding: "12px", borderRadius: 10, cursor: "pointer",
          background: "linear-gradient(90deg, #FFB627, #FFA51F)", color: "#0B1512", border: "1px solid #FFB627",
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{resultsIn ? "🎯 Share my score" : "🎯 Share my picks"}</button>
        <button onClick={copyPicks} style={{
          padding: "12px", borderRadius: 10, cursor: "pointer",
          background: "rgba(240,255,245,0.06)", color: copied ? "#3DDC84" : chalk, border: `1px solid ${copied ? "#3DDC84" : faint}`,
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{copied ? "✓ Copied!" : "📋 Copy as text"}</button>
      </div>

      {copied && (
        <div style={{ background: "rgba(11,21,18,0.6)", border: `1px solid ${faint}`, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: dim, whiteSpace: "pre-line", marginBottom: 12 }}>
          {shareText()}
        </div>
      )}

      <div style={{ fontSize: 11, color: dim, lineHeight: 1.5 }}>
        Picks are saved on this device. Points appear here automatically once results are in.
        Global leaderboards arrive with accounts in v2.0 — for now, screenshot your score and settle it in the group chat.
      </div>
    </div>
  );
}

function HistoryView() {
  const maxTitles = ALL_TIME_TITLES[0].titles;
  const [archiveSeason, setArchiveSeason] = useState(SEASON_ARCHIVE[0].season);
  const arch = SEASON_ARCHIVE.find((s) => s.season === archiveSeason);
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        borderRadius: 14, padding: "18px 16px", marginBottom: 16,
        background: "linear-gradient(120deg, rgba(255,182,39,0.12), transparent 60%), rgba(240,255,245,0.03)",
        border: `1px solid ${faint}`,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
          The Gibson Cup
        </div>
        <div style={{ fontSize: 12.5, color: dim, marginTop: 8, lineHeight: 1.55 }}>
          Contested since the league's founding era in 1890, the Gibson Cup is one of the oldest prizes
          in world football — and the trophy this site is named after.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 20 }}>
        {RECORDS.map((r) => (
          <div key={r.label} style={{ background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`, borderRadius: 12, padding: "12px 13px" }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 30, color: "#FFB627", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{r.big}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: chalk, marginTop: 5 }}>{r.label}</div>
            <div style={{ fontSize: 10.5, color: dim, marginTop: 3, lineHeight: 1.4 }}>{r.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>All-time league titles · current Premiership clubs</div>
      <div style={{ display: "grid", gap: 7, marginBottom: 20 }}>
        {ALL_TIME_TITLES.map((t, i) => {
          const c = CLUBS[t.club];
          return (
            <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 10, animation: `riseIn 0.4s ease-out ${i * 0.05}s backwards` }}>
              <Crest club={t.club} size={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{c.name}</span>
                  <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>{t.titles}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden" }}>
                  <div style={{
                    width: `${Math.max((t.titles / maxTitles) * 100, 3)}%`, height: "100%",
                    background: `linear-gradient(90deg, ${c.colors[0]}, ${c.colors[0]}AA)`, borderRadius: 3,
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10, color: dim, marginBottom: 20, lineHeight: 1.5 }}>
        Historic totals also include clubs no longer in the league — most famously Belfast Celtic's 14 titles.
      </div>

      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Roll of honour · last 12 seasons</div>
      <div style={{ border: `1px solid ${faint}`, borderRadius: 14, overflow: "hidden" }}>
        {ROLL_OF_HONOUR.map((r, i) => (
          <div key={r.season} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 13px",
            borderBottom: i < ROLL_OF_HONOUR.length - 1 ? `1px solid ${faint}` : "none",
            background: i === 0 ? "rgba(255,182,39,0.06)" : "transparent",
          }}>
            <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 14, color: dim, width: 62, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{r.season}</span>
            <Crest club={r.club} size={20} />
            <span style={{ fontSize: 13, fontWeight: 700, color: chalk, flex: 1 }}>{CLUBS[r.club].name}</span>
            {r.note && <span style={{ fontSize: 10, color: "#FFB627" }}>{r.note}</span>}
            {i === 0 && <span style={{ fontSize: 12 }}>🏆</span>}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Season Archive</div>
          <select value={archiveSeason} onChange={(e) => setArchiveSeason(e.target.value)} style={{
            background: "#12211B", color: chalk, border: `1px solid ${faint}`, borderRadius: 8,
            padding: "7px 10px", fontFamily: "'Barlow'", fontSize: 13,
          }}>
            {SEASON_ARCHIVE.map((s) => <option key={s.season} value={s.season}>{s.season}</option>)}
          </select>
        </div>
        <div style={{ background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}`, borderRadius: 14, padding: "14px 15px", animation: "riseIn 0.35s ease-out" }} key={arch.season}>
          <div style={{ display: "grid", gap: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 11, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Champions 🏆</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FFB627", textAlign: "right" }}>{arch.champion}{arch.champNote && <span style={{ color: dim, fontWeight: 400 }}> · {arch.champNote}</span>}</span>
            </div>
            {arch.runnerUp && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 11, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Runners-up</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{arch.runnerUp}</span>
              </div>
            )}
            {arch.cup && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 11, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Irish Cup</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{arch.cup}</span>
              </div>
            )}
            {arch.promotedIn && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 11, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Promoted in</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{arch.promotedIn}</span>
              </div>
            )}
            {arch.relegated && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 11, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Relegated</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#E05252" }}>{arch.relegated}</span>
              </div>
            )}
          </div>
          {arch.facts?.length > 0 && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${faint}`, paddingTop: 10 }}>
              {arch.facts.map((f) => (
                <div key={f} style={{ fontSize: 11.5, color: dim, lineHeight: 1.5, display: "flex", gap: 7, marginBottom: 5 }}>
                  <span style={{ color: "#FFB627", flexShrink: 0 }}>›</span>{f}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize: 10, color: dim, marginTop: 8 }}>
          Verified season snapshots — the full 25/26 record lives on the Table tab.
        </div>
      </div>
    </div>
  );
}

function StatsView() {
  const maxAvg = GOALS_STATS[0].avg;
  const csSorted = [...GOALS_STATS].sort((x, y) => y.cs - x.cs).slice(0, 5);
  const maxGoals = TEAM_STATS_2526[0].goals;
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        borderRadius: 14, padding: "16px", marginBottom: 16,
        background: "linear-gradient(120deg, rgba(255,182,39,0.12), rgba(94,200,242,0.10)), rgba(240,255,245,0.03)",
        border: "1px solid rgba(94,200,242,0.3)",
      }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
          The Stats Lab ⚡
        </div>
        <div style={{ fontSize: 11.5, color: dim, marginTop: 4 }}>25/26 season · verified team-level numbers</div>
      </div>

      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        The Entertainment Index · goals per game in their matches
      </div>
      <div style={{ display: "grid", gap: 7, marginBottom: 8 }}>
        {GOALS_STATS.map((t, i) => (
          <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 10, animation: `riseIn 0.35s ease-out ${i * 0.03}s backwards` }}>
            <Crest club={t.club} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[t.club].name}
                  <span style={{ color: dim, fontWeight: 400, fontSize: 10 }}> · O2.5 {t.o25}% · BTS {t.bts}%</span>
                </span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: i === 0 ? "#FFB627" : chalk, fontVariantNumeric: "tabular-nums" }}>{t.avg.toFixed(2)}</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden" }}>
                <div style={{ width: `${(t.avg / maxAvg) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[t.club].colors[0]}, ${CLUBS[t.club].colors[0]}AA)`, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: dim, marginBottom: 20, lineHeight: 1.5 }}>
        Crusaders games were pure chaos (3.39 goals a game); Linfield games were chess (2.47). League average:
        {" "}{GOALS_LEAGUE_AVG.o25}% of matches went over 2.5 goals, both teams scored in {GOALS_LEAGUE_AVG.bts}%.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ border: `1px solid ${faint}`, borderRadius: 12, padding: "12px" }}>
          <div style={{ fontSize: 10, color: "#3DDC84", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>🧤 Clean sheet kings</div>
          {csSorted.map((t) => (
            <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
              <Crest club={t.club} size={15} />
              <span style={{ fontSize: 11.5, color: chalk, flex: 1 }}>{CLUBS[t.club].name}</span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#3DDC84" }}>{t.cs}%</span>
            </div>
          ))}
          <div style={{ fontSize: 9.5, color: dim, marginTop: 4 }}>% of games without conceding</div>
        </div>
        <div style={{ border: `1px solid ${faint}`, borderRadius: 12, padding: "12px" }}>
          <div style={{ fontSize: 10, color: "#5EC8F2", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>⏱️ Half-time watch</div>
          <div style={{ fontSize: 26, fontFamily: "'Barlow Condensed'", fontWeight: 800, color: chalk, lineHeight: 1 }}>1.66</div>
          <div style={{ fontSize: 10.5, color: dim, marginBottom: 8 }}>HT goals avg in Carrick games — the league's fastest starters</div>
          <div style={{ fontSize: 26, fontFamily: "'Barlow Condensed'", fontWeight: 800, color: chalk, lineHeight: 1 }}>0.95</div>
          <div style={{ fontSize: 10.5, color: dim }}>in Linfield games — bring a coffee for the first half</div>
        </div>
      </div>

      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        The xG Lab · expected goals per 90
      </div>
      <div style={{ display: "grid", gap: 7, marginBottom: 8 }}>
        {XG_TEAMS.map((t, i) => (
          <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 10, animation: `riseIn 0.35s ease-out ${i * 0.03}s backwards` }}>
            <Crest club={t.club} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[t.club].name}
                  <span style={{ color: dim, fontWeight: 400, fontSize: 10 }}> · xG {t.xg.toFixed(2)} · xGA {t.xga.toFixed(2)}</span>
                </span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: t.xgd >= 0 ? "#3DDC84" : "#FF5A5A", fontVariantNumeric: "tabular-nums" }}>
                  {t.xgd >= 0 ? "+" : ""}{t.xgd.toFixed(2)}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "100%", position: "relative" }}>
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1.5, background: "rgba(240,255,245,0.25)" }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0,
                    left: t.xgd >= 0 ? "50%" : `${50 - (Math.abs(t.xgd) / 0.7) * 50}%`,
                    width: `${(Math.abs(t.xgd) / 0.7) * 50}%`,
                    background: t.xgd >= 0 ? "linear-gradient(90deg, #3DDC8455, #3DDC84)" : "linear-gradient(90deg, #FF5A5A, #FF5A5A55)",
                    borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: dim, marginBottom: 20, lineHeight: 1.5 }}>
        The metric that stings east Belfast: Glentoran had the league's best xG difference (+0.68) and its meanest
        expected defence — and finished third. Larne conceded 0.68 goals per game against an expected 1.10:
        title-winning goalkeeping and game management.
      </div>

      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Clinical XI · goals vs expected goals
      </div>
      <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
        {XG_PLAYERS.map((p, i) => {
          const diff = p.goals - p.xg;
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 9, animation: `riseIn 0.35s ease-out ${i * 0.03}s backwards` }}>
              <Crest club={p.club} size={17} />
              <span style={{ fontSize: 12, fontWeight: 600, color: chalk, flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 10.5, color: dim, fontVariantNumeric: "tabular-nums" }}>{p.goals}g / {p.xg.toFixed(1)} xG</span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13.5, minWidth: 44, textAlign: "right",
                color: diff >= 2 ? "#3DDC84" : diff <= -1 ? "#FF5A5A" : chalk, fontVariantNumeric: "tabular-nums" }}>
                {diff >= 0 ? "+" : ""}{diff.toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 10.5, color: dim, marginBottom: 20, lineHeight: 1.5 }}>
        Hoban scored 26 from chances worth 16.8 — over nine goals of pure finishing, the most clinical season the
        league has seen in years. Source: FootyStats, including play-offs; totals may differ slightly from the
        league-only scorer chart above.
      </div>

      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Goals scored & possession
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {TEAM_STATS_2526.map((t, i) => (
          <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 10, animation: `riseIn 0.35s ease-out ${i * 0.03}s backwards` }}>
            <Crest club={t.club} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[t.club].name} <span style={{ color: dim, fontWeight: 400, fontSize: 10.5 }}>· {t.poss}% poss.</span></span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#3DDC84", fontVariantNumeric: "tabular-nums" }}>{t.goals} goals</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden" }}>
                <div style={{ width: `${(t.goals / maxGoals) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[t.club].colors[0]}, ${CLUBS[t.club].colors[0]}AA)`, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: dim, marginTop: 8, lineHeight: 1.5 }}>
        The quirk of 25/26: Coleraine outscored everyone — 10 more than champions Larne — and still finished second.
        All figures verified via AiScore and published stats tables, July 2026.
      </div>
    </div>
  );
}

function SupportView() {
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        borderRadius: 14, padding: "20px 16px", marginBottom: 16,
        background: "linear-gradient(120deg, rgba(255,182,39,0.12), transparent 60%), rgba(240,255,245,0.03)",
        border: `1px solid ${faint}`,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
          Back GIBSON
        </div>
        <div style={{ fontSize: 13, color: dim, marginTop: 8, lineHeight: 1.5 }}>
          GIBSON is free and built by one Irish League fan in Belfast. Everything stays free —
          supporters just keep the floodlights on and get a say in what gets built next.
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {SUPPORT_TIERS.map((t, i) => (
          <div key={t.id} style={{
            position: "relative",
            background: t.featured ? "rgba(255,182,39,0.06)" : "rgba(240,255,245,0.03)",
            border: `1px solid ${t.featured ? "rgba(255,182,39,0.4)" : faint}`,
            borderRadius: 14, padding: "16px",
            animation: `riseIn 0.4s ease-out ${i * 0.08}s backwards`,
          }}>
            {t.featured && (
              <div style={{
                position: "absolute", top: -9, left: 16, background: "#FFB627", color: "#0B1512",
                fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
                borderRadius: 999, padding: "3px 10px",
              }}>Most popular</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: t.color }}>
                {t.emoji} {t.name}
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, color: chalk, fontVariantNumeric: "tabular-nums" }}>{t.price}</span>
                <span style={{ fontSize: 11, color: dim }}> {t.cadence}</span>
              </div>
            </div>
            <ul style={{ listStyle: "none", display: "grid", gap: 6, marginBottom: 14 }}>
              {t.perks.map((p) => (
                <li key={p} style={{ fontSize: 12.5, color: chalk, display: "flex", gap: 8, lineHeight: 1.4 }}>
                  <span style={{ color: t.color, flexShrink: 0 }}>✓</span>{p}
                </li>
              ))}
            </ul>
            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" style={{
              display: "block", textAlign: "center", textDecoration: "none",
              background: t.featured ? "#FFB627" : "rgba(240,255,245,0.07)",
              color: t.featured ? "#0B1512" : chalk,
              fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15,
              letterSpacing: "0.08em", textTransform: "uppercase",
              borderRadius: 10, padding: "11px", border: `1px solid ${t.featured ? "#FFB627" : faint}`,
            }}>
              {t.cadence === "one-off" ? "Buy one" : "Join"} →
            </a>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: dim, marginTop: 14, lineHeight: 1.5 }}>
        Payments are handled securely by Ko-fi — GIBSON never sees your card details.
        Memberships can be cancelled any time from your Ko-fi account.
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>The Roadmap</div>
        {[
          { v: "1.01", when: "Jul 2026", title: "The complete foundation", desc: "Official 25/26 archive, Stats Lab with xG, full 26/27 fixture browser, Predictor share cards and the live-data layer — shipped.", status: "done" },
          { v: "1.1", when: "Aug 2026", title: "Season one kicks off", desc: "Global Predictor leaderboard, live 26/27 table, and GIBSON on the Play Store.", status: "next" },
          { v: "1.2", when: "When funded", title: "Live scores", desc: "In-play scores every two minutes. Unlocks when Ko-fi support covers the data feed — one Season Ticket flips the switch.", status: "planned" },
          { v: "v1.2", when: "Pre-season", title: "Fixtures & Predictor gameweeks", desc: "26/27 fixture list, opening-day countdown, and weekly Predictor rounds all season long.", status: "planned" },
          { v: "v1.3", when: "In season", title: "Weekly GIBSON Index", desc: "Ratings updated every matchweek, plus a Team of the Week in the Stats Lab.", status: "planned" },
          { v: "v2.0", when: "Future", title: "Accounts, Premium & leaderboards", desc: "Sign in, save your club, follow players, and battle the whole league on global Predictor leaderboards.", status: "planned" },
        ].map((r, i) => (
          <div key={r.v} style={{
            display: "flex", gap: 12, padding: "12px 0",
            borderBottom: i < 3 ? `1px solid ${faint}` : "none",
          }}>
            <div style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, flexShrink: 0, width: 44,
              color: r.status === "next" ? "#FFB627" : dim,
            }}>{r.v}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: chalk }}>
                {r.title}
                {r.status === "next" && <span style={{ fontSize: 9, fontWeight: 800, color: "#0B1512", background: "#FFB627", borderRadius: 999, padding: "2px 8px", marginLeft: 8, letterSpacing: "0.08em", textTransform: "uppercase", verticalAlign: "middle" }}>Up next</span>}
              </div>
              <div style={{ fontSize: 12, color: dim, marginTop: 3, lineHeight: 1.45 }}>{r.desc}</div>
              <div style={{ fontSize: 10, color: dim, marginTop: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.when}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 11, color: dim, marginTop: 10, lineHeight: 1.5 }}>
          Season Ticket holders vote on what gets built first.
        </div>
      </div>
    </div>
  );
}

function LogoMark({ size = 42 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="GIBSON logo" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="lg-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD873" /><stop offset="1" stopColor="#FFA51F" />
        </linearGradient>
      </defs>
      <path d="M100 8 L180 34 V112 C180 156 144 182 100 194 C56 182 20 156 20 112 V34 Z"
        fill="#10241B" stroke="url(#lg-amber)" strokeWidth="8" />
      <g fill="url(#lg-amber)">
        <path d="M64 56 H136 V76 C136 100 120 114 100 114 C80 114 64 100 64 76 Z" />
        <path d="M64 60 C44 60 40 86 58 94 L63 85 C53 80 55 68 64 68 Z" />
        <path d="M136 60 C156 60 160 86 142 94 L137 85 C147 80 145 68 136 68 Z" />
        <rect x="93" y="114" width="14" height="16" rx="3" />
        <path d="M74 130 H126 L133 148 H67 Z" />
      </g>
      <line x1="48" y1="166" x2="152" y2="166" stroke="#EDF5EF" strokeOpacity="0.4" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

/* ================= APP ================= */
class GibsonBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, color: "#EDF5EF", textTransform: "uppercase", marginBottom: 8 }}>VAR is checking something</div>
          <div style={{ fontSize: 13, color: "#8FA69B", lineHeight: 1.6, maxWidth: 340, marginBottom: 18 }}>
            Something in the latest data update didn't parse. It's on us, not your phone — a fix is usually live within the hour.
          </div>
          <button onClick={() => window.location.reload()} style={{
            padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
            background: "#FFB627", color: "#0B1512", fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
          }}>Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [tab, setTab] = useState("table");
  const [selected, setSelected] = useState(PLAYERS[0].id);
  const [sort, setSort] = useState("rating");
  const player = PLAYERS.find((p) => p.id === selected);

  const sorted = useMemo(() => {
    const arr = [...PLAYERS];
    if (sort === "rating") arr.sort((x, y) => y.rating - x.rating);
    if (sort === "goals") arr.sort((x, y) => y.goals - x.goals);
    if (sort === "assists") arr.sort((x, y) => y.assists - x.assists);
    return arr;
  }, [sort]);

  const tabs = [
    { id: "table", label: "Table" },
    { id: "europe", label: "Europe" },
    { id: "predictor", label: "Predictor 🎯" },
    { id: "fixtures", label: "Fixtures" },
    { id: "players", label: "Players" },
    { id: "duel", label: "Duel" },
    { id: "transfers", label: "Transfers" },
    { id: "stats", label: "Stats ⚡" },
    { id: "history", label: "History" },
    { id: "support", label: "Support ♥" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "radial-gradient(1200px 500px at 50% -10%, rgba(255,182,39,0.07), transparent), #0B1512",
      color: chalk, fontFamily: "'Barlow', sans-serif", padding: "0 0 40px",
    }}>
      <GlobalStyle />
      <header style={{ padding: "22px 18px 14px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMark size={46} />
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 38, letterSpacing: "0.04em",
              textTransform: "uppercase", lineHeight: 1,
              background: "linear-gradient(90deg, #EDF5EF, #FFB627)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Gibson</h1>
            <div style={{ fontSize: 10.5, color: dim, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 2 }}>
              The home of Irish League stats
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={SOCIALS.x.url} target="_blank" rel="noopener noreferrer" aria-label={`GIBSON on X: ${SOCIALS.x.handle}`} style={{
              width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(240,255,245,0.06)", border: `1px solid ${faint}`, textDecoration: "none",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={chalk}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href={SOCIALS.tiktok.url} target="_blank" rel="noopener noreferrer" aria-label={`GIBSON on TikTok: ${SOCIALS.tiktok.handle}`} style={{
              width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(240,255,245,0.06)", border: `1px solid ${faint}`, textDecoration: "none",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={chalk}>
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
          </div>
        </div>
        <nav style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }} aria-label="Views">
          {tabs.map((t) => (
            <button key={t.id} className="gb-tab" onClick={() => setTab(t.id)} style={{
              padding: "8px 18px", borderRadius: 999, cursor: "pointer",
              fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
              background: t.id === "stats"
                ? (tab === "stats" ? "linear-gradient(90deg, #FFB627, #5EC8F2)" : "linear-gradient(90deg, rgba(255,182,39,0.14), rgba(94,200,242,0.14))")
                : tab === t.id ? "#FFB627" : "rgba(240,255,245,0.05)",
              color: t.id === "stats" ? (tab === "stats" ? "#0B1512" : chalk) : tab === t.id ? "#0B1512" : dim,
              border: t.id === "stats" ? "1px solid rgba(94,200,242,0.55)" : `1px solid ${tab === t.id ? "#FFB627" : faint}`,
              boxShadow: t.id === "stats" && tab !== "stats" ? "0 0 12px rgba(94,200,242,0.15)" : "none",
              transition: "all 0.2s ease",
            }}>{t.label}</button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 18px" }}>
        <GibsonBoundary key={tab}>
        {tab === "table" && <TableView />}
        {tab === "europe" && <EuropeView />}
        {tab === "predictor" && <PredictorView />}
        {tab === "fixtures" && <FixturesView />}
        {tab === "players" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 18 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>GIBSON Index · 25/26 · beta</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {["rating", "goals", "assists"].map((s) => (
                    <button key={s} onClick={() => setSort(s)} style={{
                      fontSize: 11, padding: "4px 10px", borderRadius: 999, cursor: "pointer", textTransform: "capitalize",
                      background: sort === s ? "rgba(255,182,39,0.15)" : "transparent",
                      color: sort === s ? "#FFB627" : dim, border: `1px solid ${sort === s ? "rgba(255,182,39,0.4)" : faint}`,
                    }}>{s}</button>
                  ))}
                </div>
              </div>
              <div style={{ border: `1px solid ${faint}`, borderRadius: 14, overflow: "hidden" }}>
                {sorted.map((p, i) => (
                  <button key={p.id} className="gb-row" onClick={() => setSelected(p.id)} style={{
                    display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
                    padding: "10px 12px", cursor: "pointer", border: "none",
                    borderBottom: i < sorted.length - 1 ? `1px solid ${faint}` : "none",
                    background: selected === p.id ? "rgba(255,182,39,0.08)" : "transparent", transition: "background 0.15s ease",
                  }}>
                    <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15, color: dim, width: 18, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
                    <Avatar player={p} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: chalk, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: dim, display: "flex", alignItems: "center", gap: 5 }}>
                        <Crest club={p.club} size={13} /> {CLUBS[p.club].name} · {p.pos}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 18, color: ratingColor(p.rating) }}>{p.rating.toFixed(1)}</div>
                      <div style={{ fontSize: 10, color: dim }}>{p.goals}g · {p.assists}a</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 10, color: dim, lineHeight: 1.5, marginTop: -8 }}>
              Goals cross-verified via AiScore and season reports; assists via Transfermarkt (may undercount).
              GIBSON Index ratings, radar profiles, xG and per-90 figures are our own model estimates.
            </div>
            <PlayerDetail player={player} />
            <div>
              <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Treatment Table · current injuries</div>
              <div style={{ border: `1px solid ${faint}`, borderRadius: 14, overflow: "hidden" }}>
                {INJURIES.length === 0 && (
                  <div style={{ padding: "16px", fontSize: 12, color: dim, textAlign: "center" }}>
                    🟢 Treatment room's empty — every squad at full strength. Enjoy it while it lasts.
                  </div>
                )}
                {INJURIES.map((inj, i) => (
                  <div key={inj.player} style={{
                    display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
                    borderBottom: i < INJURIES.length - 1 ? `1px solid ${faint}` : "none",
                  }}>
                    <Crest club={inj.club} size={18} />
                    <span style={{ fontSize: 12.5, fontWeight: 600, color: chalk, flex: 1 }}>{inj.player}</span>
                    <span style={{ fontSize: 11, color: "#E05252" }}>✚ {inj.injury}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 10, color: dim, marginTop: 6 }}>Via Transfermarkt, July 2026.</div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Discipline · 25/26 card leaders</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ border: `1px solid ${faint}`, borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#FFB627", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>🟨 Most yellows</div>
                  {DISCIPLINE.yellows.map((p) => (
                    <div key={p.player} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <Crest club={p.club} size={15} />
                      <span style={{ fontSize: 11.5, color: chalk, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.player}</span>
                      <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#FFB627" }}>{p.n}</span>
                    </div>
                  ))}
                </div>
                <div style={{ border: `1px solid ${faint}`, borderRadius: 12, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#E05252", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>🟥 Most reds</div>
                  {DISCIPLINE.reds.map((p) => (
                    <div key={p.player} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                      <Crest club={p.club} size={15} />
                      <span style={{ fontSize: 11.5, color: chalk, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.player}</span>
                      <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#E05252" }}>{p.n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 10, color: dim, marginTop: 6 }}>
                Bangor's Lewis Harrison: 10 yellows AND 2 reds — the league's most booked man. Via AiScore.
              </div>
            </div>
          </div>
        )}
        {tab === "duel" && <DuelView />}
        {tab === "transfers" && <TransfersView />}
        {tab === "stats" && <StatsView />}
        {tab === "history" && <HistoryView />}
        {tab === "support" && <SupportView />}
        </GibsonBoundary>
        <div style={{ textAlign: "center", padding: "26px 0 10px", fontSize: 9.5, color: "rgba(143,166,155,0.55)", letterSpacing: "0.12em", fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase" }}>
          GIBSON 1.01 · build 11 JUL · B2 🏆
        </div>
      </main>
    </div>
  );
}
