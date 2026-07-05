import React, { useState, useMemo } from "react";
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
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
    .gb-row:hover { background: rgba(240,255,245,0.05) !important; }
    .gb-tab:focus-visible, .gb-row:focus-visible, button:focus-visible { outline: 2px solid #FFB627; outline-offset: 2px; }
  `}</style>
);

/* ================= DATA — NIFL Premiership 2025/26 (demo stats) ================= */
const CLUBS = {
  LAR: { name: "Larne", ground: "Inver Park", colors: ["#C8102E", "#FFFFFF"], pattern: "plain" },
  COL: { name: "Coleraine", ground: "The Showgrounds", colors: ["#005EB8", "#FFFFFF"], pattern: "stripes" },
  GLE: { name: "Glentoran", ground: "The Oval", colors: ["#00693E", "#C8102E"], pattern: "sleeve" },
  LIN: { name: "Linfield", ground: "Windsor Park", colors: ["#0033A0", "#FFFFFF"], pattern: "plain" },
  CLI: { name: "Cliftonville", ground: "Solitude", colors: ["#EE1C25", "#FFFFFF"], pattern: "plain" },
  DUN: { name: "Dungannon Swifts", ground: "Stangmore Park", colors: ["#1D4F91", "#FFFFFF"], pattern: "plain" },
  BAL: { name: "Ballymena Utd", ground: "The Showgrounds", colors: ["#6CACE4", "#FFFFFF"], pattern: "plain" },
  POR: { name: "Portadown", ground: "Shamrock Park", colors: ["#DA291C", "#000000"], pattern: "plain" },
  BAN: { name: "Bangor", ground: "Clandeboye Park", colors: ["#FDB913", "#0033A0"], pattern: "plain" },
  CAR: { name: "Carrick Rangers", ground: "Loughview Leisure", colors: ["#FFB81C", "#000000"], pattern: "stripes" },
  CRU: { name: "Crusaders", ground: "Seaview", colors: ["#D01317", "#000000"], pattern: "stripes" },
  GLV: { name: "Glenavon", ground: "Mourneview Park", colors: ["#0072CE", "#FFFFFF"], pattern: "plain" },
};

// Final 25/26 order: top 4 + bottom 2 per reports; mid-table order + all stats are demo placeholders
const TABLE = [
  { club: "LAR", p: 38, w: 26, d: 7, l: 5, gd: 44, pts: 85, note: "C", form: ["W","W","D","W","W"] },
  { club: "COL", p: 38, w: 24, d: 9, l: 5, gd: 36, pts: 81, note: "IC", form: ["W","D","W","W","L"] },
  { club: "GLE", p: 38, w: 24, d: 7, l: 7, gd: 33, pts: 79, note: "E", form: ["W","W","L","W","D"] },
  { club: "LIN", p: 38, w: 23, d: 8, l: 7, gd: 30, pts: 77, note: "E", form: ["D","W","W","L","W"] },
  { club: "CLI", p: 38, w: 17, d: 8, l: 13, gd: 9, pts: 59, note: "", form: ["L","W","D","W","L"] },
  { club: "DUN", p: 38, w: 15, d: 9, l: 14, gd: 2, pts: 54, note: "", form: ["W","L","D","L","W"] },
  { club: "BAL", p: 38, w: 13, d: 10, l: 15, gd: -8, pts: 49, note: "", form: ["D","L","W","D","L"] },
  { club: "POR", p: 38, w: 12, d: 9, l: 17, gd: -12, pts: 45, note: "", form: ["L","D","L","W","D"] },
  { club: "BAN", p: 38, w: 11, d: 10, l: 17, gd: -15, pts: 43, note: "", form: ["D","W","L","L","D"] },
  { club: "CAR", p: 38, w: 10, d: 10, l: 18, gd: -20, pts: 40, note: "", form: ["L","L","D","W","L"] },
  { club: "CRU", p: 38, w: 9, d: 9, l: 20, gd: -28, pts: 36, note: "PO", form: ["L","D","L","L","W"] },
  { club: "GLV", p: 38, w: 6, d: 9, l: 23, gd: -37, pts: 27, note: "R", form: ["L","L","L","D","L"] },
];

// Radar axes: Shooting, Creation, Passing, Dribbling, Defending, Physical (0–100, demo)
const PLAYERS = [
  { id: 1, name: "Pat Hoban", club: "GLE", pos: "ST", num: 9, rating: 8.2, apps: 36, goals: 26, assists: 4, xg: 22.4, xa: 3.1, per90: { shots: 3.8, keyPasses: 1.0, dribbles: 0.6, tackles: 0.4 }, radar: [95, 55, 56, 48, 32, 84], form: [8.4, 7.6, 9.1, 8.0, 8.8, 7.5], shots: [{x:88,y:46,xg:.72,g:1},{x:84,y:54,xg:.35,g:1},{x:90,y:50,xg:.65,g:1},{x:79,y:42,xg:.14,g:0},{x:86,y:58,xg:.41,g:1},{x:92,y:48,xg:.78,g:0}] },
  { id: 2, name: "Andy Ryan", club: "LAR", pos: "ST", num: 10, rating: 7.9, apps: 34, goals: 19, assists: 6, xg: 16.8, xa: 4.6, per90: { shots: 3.2, keyPasses: 1.4, dribbles: 0.9, tackles: 0.5 }, radar: [86, 64, 62, 58, 34, 80], form: [7.6, 8.2, 7.8, 8.5, 7.2, 8.4], shots: [{x:85,y:50,xg:.52,g:1},{x:80,y:44,xg:.24,g:1},{x:89,y:55,xg:.68,g:0},{x:75,y:52,xg:.10,g:0},{x:87,y:47,xg:.58,g:1}] },
  { id: 3, name: "Matthew Shevlin", club: "COL", pos: "ST", num: 29, rating: 7.8, apps: 35, goals: 18, assists: 5, xg: 15.9, xa: 3.8, per90: { shots: 3.0, keyPasses: 1.2, dribbles: 1.1, tackles: 0.6 }, radar: [84, 58, 60, 62, 36, 76], form: [8.0, 7.4, 8.6, 7.1, 8.3, 7.9], shots: [{x:83,y:48,xg:.44,g:1},{x:78,y:56,xg:.18,g:0},{x:88,y:52,xg:.61,g:1},{x:81,y:40,xg:.27,g:1}] },
  { id: 4, name: "Joel Cooper", club: "LIN", pos: "LW", num: 11, rating: 7.7, apps: 33, goals: 11, assists: 12, xg: 9.4, xa: 10.2, per90: { shots: 2.4, keyPasses: 2.8, dribbles: 2.6, tackles: 0.7 }, radar: [70, 88, 78, 90, 38, 66], form: [7.8, 8.1, 6.9, 8.4, 7.6, 8.0], shots: [{x:78,y:62,xg:.20,g:1},{x:84,y:56,xg:.38,g:0},{x:72,y:60,xg:.08,g:0},{x:86,y:50,xg:.49,g:1}] },
  { id: 5, name: "Leroy Millar", club: "LAR", pos: "CM", num: 8, rating: 7.6, apps: 36, goals: 8, assists: 9, xg: 6.8, xa: 7.4, per90: { shots: 1.8, keyPasses: 2.2, dribbles: 1.4, tackles: 1.8 }, radar: [62, 78, 82, 68, 66, 84], form: [7.4, 7.9, 7.2, 8.0, 7.7, 7.5], shots: [{x:74,y:50,xg:.11,g:0},{x:80,y:46,xg:.26,g:1},{x:70,y:56,xg:.06,g:0}] },
  { id: 6, name: "Kirk Millar", club: "LIN", pos: "RW", num: 7, rating: 7.5, apps: 34, goals: 6, assists: 13, xg: 4.9, xa: 11.6, per90: { shots: 1.6, keyPasses: 3.1, dribbles: 1.8, tackles: 0.8 }, radar: [58, 92, 84, 74, 40, 62], form: [7.2, 7.8, 8.2, 7.0, 7.6, 8.1], shots: [{x:76,y:58,xg:.13,g:0},{x:82,y:52,xg:.30,g:1},{x:71,y:62,xg:.05,g:0}] },
  { id: 7, name: "Rory Hale", club: "CLI", pos: "CM", num: 8, rating: 7.4, apps: 35, goals: 7, assists: 8, xg: 5.6, xa: 6.9, per90: { shots: 1.9, keyPasses: 2.4, dribbles: 1.5, tackles: 2.1 }, radar: [60, 76, 80, 66, 72, 82], form: [7.6, 7.1, 7.8, 7.3, 8.0, 7.2], shots: [{x:72,y:48,xg:.09,g:0},{x:78,y:54,xg:.21,g:1},{x:68,y:50,xg:.04,g:0}] },
  { id: 8, name: "Chris Shields", club: "LIN", pos: "DM", num: 4, rating: 7.3, apps: 34, goals: 3, assists: 4, xg: 2.4, xa: 3.2, per90: { shots: 0.9, keyPasses: 1.3, dribbles: 0.6, tackles: 3.1 }, radar: [42, 58, 84, 48, 92, 88], form: [7.1, 7.5, 7.0, 7.6, 7.4, 7.2], shots: [{x:68,y:52,xg:.05,g:0},{x:74,y:46,xg:.10,g:1}] },
  { id: 9, name: "Jamie McDonagh", club: "CLI", pos: "RW", num: 14, rating: 7.2, apps: 32, goals: 8, assists: 9, xg: 6.7, xa: 7.8, per90: { shots: 2.1, keyPasses: 2.5, dribbles: 2.2, tackles: 0.9 }, radar: [64, 80, 72, 82, 42, 72], form: [7.0, 7.7, 7.3, 6.8, 7.9, 7.4], shots: [{x:79,y:60,xg:.17,g:1},{x:84,y:54,xg:.36,g:0},{x:73,y:58,xg:.07,g:0}] },
];

const AXES = ["Shooting", "Creation", "Passing", "Dribbling", "Defending", "Physical"];

// Summer 2026 window tracker — example entries, replace with real news as it breaks
const TRANSFERS = [
  { id: 1, date: "4 Jul", player: "Example Striker", from: "GLV", to: "LAR", status: "done", note: "Free transfer after Glenavon's relegation — replace with real news" },
  { id: 2, date: "3 Jul", player: "Example Winger", from: "CRU", to: "GLE", status: "rumour", note: "Linked in local press — replace with real news" },
  { id: 3, date: "1 Jul", player: "Example Keeper", from: "BAN", to: "BAN", status: "contract", note: "New two-year deal at Clandeboye — replace with real news" },
  { id: 4, date: "28 Jun", player: "Example Midfielder", from: "CLI", to: "OUT", status: "departure", note: "Released at end of contract — replace with real news" },
];
const STATUS_META = {
  done: { label: "Done deal", color: "#3DDC84" },
  rumour: { label: "Rumour", color: "#FFB627" },
  contract: { label: "New contract", color: "#5EC8F2" },
  departure: { label: "Departure", color: "#E05252" },
};

// Illustrative Team of the Season (demo)
const BEST_XI = [
  { name: "Johns", club: "COL", pos: [50, 92], r: 7.2 },
  { name: "Cosgrove", club: "LAR", pos: [82, 76], r: 7.1 },
  { name: "McEleney", club: "LAR", pos: [62, 80], r: 7.3 },
  { name: "Addis", club: "CLI", pos: [38, 80], r: 7.2 },
  { name: "Clarke", club: "LIN", pos: [18, 76], r: 7.0 },
  { name: "Shields", club: "LIN", pos: [50, 62], r: 7.3 },
  { name: "R. Hale", club: "CLI", pos: [34, 48], r: 7.4 },
  { name: "L. Millar", club: "LAR", pos: [66, 48], r: 7.6 },
  { name: "K. Millar", club: "LIN", pos: [84, 30], r: 7.5 },
  { name: "Hoban", club: "GLE", pos: [50, 20], r: 8.2 },
  { name: "Cooper", club: "LIN", pos: [16, 30], r: 7.7 },
];

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
function TableView() {
  const noteLabel = { C: "Champions · Gibson Cup", IC: "Irish Cup winners · Europe", E: "Europe", PO: "Relegation play-off", R: "Relegated" };
  const noteColor = { C: "#3DDC84", IC: "#5EC8F2", E: "#FFB627", PO: "#E0A252", R: "#E05252" };
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Sports Direct Premiership · Final 2025/26
      </div>
      <div style={{ border: `1px solid ${faint}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "26px 1fr 30px 34px 42px 110px", gap: 4, padding: "8px 12px", fontSize: 10, color: dim, letterSpacing: "0.1em", textTransform: "uppercase", borderBottom: `1px solid ${faint}` }}>
          <span>#</span><span>Club</span><span>P</span><span>GD</span><span>Pts</span><span style={{ textAlign: "right" }}>Form</span>
        </div>
        {TABLE.map((row, i) => (
          <div key={row.club} style={{
            display: "grid", gridTemplateColumns: "26px 1fr 30px 34px 42px 110px", gap: 4, alignItems: "center",
            padding: "9px 12px", borderBottom: i < TABLE.length - 1 ? `1px solid ${faint}` : "none",
            borderLeft: row.note ? `3px solid ${noteColor[row.note]}` : "3px solid transparent",
            fontVariantNumeric: "tabular-nums",
          }}>
            <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15, color: dim }}>{i + 1}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Crest club={row.club} size={18} />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: chalk, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{CLUBS[row.club].name}</div>
                {row.note && <div style={{ fontSize: 9, color: noteColor[row.note] }}>{noteLabel[row.note]}</div>}
              </div>
            </div>
            <span style={{ fontSize: 12, color: dim }}>{row.p}</span>
            <span style={{ fontSize: 12, color: row.gd > 0 ? "#3DDC84" : row.gd < 0 ? "#E05252" : dim }}>{row.gd > 0 ? "+" : ""}{row.gd}</span>
            <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17, color: chalk }}>{row.pts}</span>
            <div style={{ display: "flex", gap: 3, justifyContent: "flex-end" }}>
              {row.form.map((f, j) => (
                <span key={j} style={{
                  width: 17, height: 17, borderRadius: 5, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9.5, fontWeight: 700, color: "#0B1512", background: formColor(f),
                  opacity: j === row.form.length - 1 ? 1 : 0.75,
                }}>{f}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10, color: dim, marginTop: 8 }}>
        Top four + bottom two reflect the real 25/26 finish. Mid-table order, points and form are placeholder demo values.
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
          <div style={{ fontSize: 10, color: dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>Rating</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8, marginBottom: 14 }}>
        {stat("Goals", player.goals, `xG ${player.xg}`)}
        {stat("Assists", player.assists, `xA ${player.xa}`)}
        {stat("Apps", player.apps)}
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
          <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 8px" }}>Skill Radar</div>
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

function TransfersView() {
  const [filter, setFilter] = useState("all");
  const items = TRANSFERS.filter((t) => filter === "all" || t.status === filter);
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
        {items.map((t, i) => {
          const meta = STATUS_META[t.status];
          const isDeparture = t.to === "OUT";
          const isContract = t.status === "contract";
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
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Crest club={t.from} size={20} />
                  <span style={{ fontSize: 12, color: dim }}>{CLUBS[t.from].name}</span>
                </div>
                {!isContract && (
                  <>
                    <span style={{ color: meta.color, fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16 }}>→</span>
                    {isDeparture
                      ? <span style={{ fontSize: 12, color: dim, fontStyle: "italic" }}>Released</span>
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
        These are placeholder examples showing the format. Swap in real window news from club announcements and BBC Sport NI.
      </div>
    </div>
  );
}

function BestXIView() {
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Team of the season · illustrative · 4-2-3-1</div>
      <div style={{
        position: "relative", width: "100%", aspectRatio: "3/4", borderRadius: 14, overflow: "hidden",
        background: "repeating-linear-gradient(180deg, #123023 0 12.5%, #0F291E 12.5% 25%)",
        border: `1px solid ${faint}`,
      }}>
        <svg viewBox="0 0 100 133" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <rect x="2" y="2" width="96" height="129" fill="none" stroke="rgba(237,245,239,0.25)" strokeWidth="0.5" />
          <line x1="2" y1="66.5" x2="98" y2="66.5" stroke="rgba(237,245,239,0.25)" strokeWidth="0.5" />
          <circle cx="50" cy="66.5" r="10" fill="none" stroke="rgba(237,245,239,0.25)" strokeWidth="0.5" />
          <rect x="28" y="2" width="44" height="16" fill="none" stroke="rgba(237,245,239,0.25)" strokeWidth="0.5" />
          <rect x="28" y="115" width="44" height="16" fill="none" stroke="rgba(237,245,239,0.25)" strokeWidth="0.5" />
        </svg>
        {BEST_XI.map((p) => {
          const c = CLUBS[p.club];
          const darkText = ["BAN", "CAR", "BAL"].includes(p.club);
          return (
            <div key={p.name} style={{
              position: "absolute", left: `${p.pos[0]}%`, top: `${p.pos[1]}%`,
              transform: "translate(-50%, -50%)", textAlign: "center", animation: "riseIn 0.5s ease-out backwards",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: "50%", margin: "0 auto",
                background: `linear-gradient(135deg, ${c.colors[0]}, ${c.colors[1]})`,
                border: `2px solid ${ratingColor(p.r)}`, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13,
                color: darkText ? "#10241B" : chalk, boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              }}>{p.r.toFixed(1)}</div>
              <div style={{
                marginTop: 3, fontSize: 9.5, fontWeight: 600, color: chalk,
                background: "rgba(11,21,18,0.85)", borderRadius: 5, padding: "2px 6px", whiteSpace: "nowrap",
              }}>{p.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ================= APP ================= */
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
    { id: "players", label: "Players" },
    { id: "duel", label: "Duel" },
    { id: "transfers", label: "Transfers" },
    { id: "xi", label: "Best XI" },
  ];

  return (
    <div style={{
      minHeight: "100vh", background: "radial-gradient(1200px 500px at 50% -10%, rgba(255,182,39,0.07), transparent), #0B1512",
      color: chalk, fontFamily: "'Barlow', sans-serif", padding: "0 0 40px",
    }}>
      <GlobalStyle />
      <header style={{ padding: "22px 18px 14px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <h1 style={{
            fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 40, letterSpacing: "0.04em",
            textTransform: "uppercase", lineHeight: 1,
            background: "linear-gradient(90deg, #EDF5EF, #FFB627)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Gibson</h1>
          <span style={{ fontSize: 11, color: dim, letterSpacing: "0.2em", textTransform: "uppercase" }}>Irish League stats · 25/26 · demo data</span>
        </div>
        <div style={{ fontSize: 11, color: dim, marginTop: 4, fontStyle: "italic" }}>Named for the Gibson Cup — the oldest prize in the game here.</div>
        <nav style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap" }} aria-label="Views">
          {tabs.map((t) => (
            <button key={t.id} className="gb-tab" onClick={() => setTab(t.id)} style={{
              padding: "8px 18px", borderRadius: 999, cursor: "pointer",
              fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
              background: tab === t.id ? "#FFB627" : "rgba(240,255,245,0.05)",
              color: tab === t.id ? "#0B1512" : dim,
              border: `1px solid ${tab === t.id ? "#FFB627" : faint}`, transition: "all 0.2s ease",
            }}>{t.label}</button>
          ))}
        </nav>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "0 18px" }}>
        {tab === "table" && <TableView />}
        {tab === "players" && (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 18 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 10, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Leaderboard</div>
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
            <PlayerDetail player={player} />
          </div>
        )}
        {tab === "duel" && <DuelView />}
        {tab === "transfers" && <TransfersView />}
        {tab === "xi" && <BestXIView />}
      </main>
    </div>
  );
}
