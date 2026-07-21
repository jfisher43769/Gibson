import React, { useState, useMemo, useEffect, useRef, useLayoutEffect, useContext } from "react";
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
    @keyframes boardFlicker { 0% { opacity: 0; } 18% { opacity: 1; } 30% { opacity: 0.45; } 48% { opacity: 1; } 62% { opacity: 0.75; } 100% { opacity: 1; } }
    button { transition: transform 0.12s ease, opacity 0.15s ease; }
    button:active { transform: scale(0.96); }
    .gb-skel { background: linear-gradient(90deg, rgba(240,255,245,0.05) 25%, rgba(240,255,245,0.12) 50%, rgba(240,255,245,0.05) 75%); background-size: 400px 100%; animation: shimmer 1.3s infinite linear; border-radius: 8px; }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
    .gb-row:hover { background: rgba(240,255,245,0.05) !important; }
    .gb-tab:focus-visible, .gb-row:focus-visible, button:focus-visible { outline: 2px solid #FFB627; outline-offset: 2px; }
    @media (min-width: 768px) {
      .gb-header, .gb-main { max-width: 820px !important; }
    }
    @media (min-width: 1100px) {
      .gb-header, .gb-main { max-width: 1020px !important; }
      .gb-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
      .gb-nav { margin-top: 0 !important; flex-wrap: nowrap !important; }
      .gb-narrow { max-width: 780px; margin-left: auto; margin-right: auto; }
      .gb-desk-2col { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 22px; align-items: start; }
      .gb-desk-2col > div { margin-top: 0 !important; }
    }
  `}</style>
);

import {
  CLUBS, FINAL_PLACINGS, MID_TABLE, FULL_TABLE, PLAYERS, AXES, TRANSFERS, STATUS_META, ROLL_OF_HONOUR, ALL_TIME_TITLES, RECORDS, PREDICTOR_GW, store, KOFI_URL, EURO, CLUB_FIXTURES, FIXTURES_2627, POST_SPLIT_DATES, SUPPORT_TIERS, SOCIALS, SEASON_ARCHIVE, MARKET_VALUES, LEAGUE_FACTS, LEAGUE_LORE, INJURIES, TEAM_STATS_2526, DISCIPLINE, WINDOW, GOALS_STATS, GOALS_LEAGUE_AVG, XG_TEAMS, XG_PLAYERS, EURO_COEFFICIENT,
} from "./data.js";


/* ================= SHARED PIECES ================= */
const chalk = "#EDF5EF";
const dim = "rgba(237,245,239,0.7)";
const faint = "rgba(237,245,239,0.08)";

// The only three surface treatments in the app: flat (bordered list), card, hero (highlighted card)
const SURFACE = {
  flat: { background: "transparent", border: `1px solid ${faint}` },
  card: { background: "rgba(240,255,245,0.03)", border: `1px solid ${faint}` },
  hero: { background: "linear-gradient(120deg, rgba(255,182,39,0.12), transparent 60%), rgba(240,255,245,0.03)", border: `1px solid ${faint}` },
};

// Near-white overlay used for interactive chrome (buttons, icon tiles) — one fill,
// not the ten ad-hoc opacities this replaced. Card/hero backgrounds stay in SURFACE;
// data-viz strokes and CSS hover/scrollbar are intentionally separate.
const OVERLAY = { fill: "rgba(240,255,245,0.06)" };

// Type scale — the app's intentional sizes. 12 is the accessibility floor (labels,
// captions, footnotes); everything else steps up from there. Orphan sizes (12.5,
// 13.5, 14.5, 17, 18, 19, 22) were snapped to their nearest step below.
//   12 cap · 13 small · 14 body · 15 control · 16 lead · 20 title · 24/26 head ·
//   30/34 stat · 38 wordmark · 48 scoreboard · 120 watermark
// Spacing rhythm keeps to even steps (2/4/6/8/10/12/14/16/18/20/22/24); odd
// orphans (5/7/9) were snapped to the nearest even.

// Staggered list entrance: ~30ms per row, capped at row 10. The global
// prefers-reduced-motion rule disables all animation, so no check needed here.
const rise = (i) => ({ animation: `riseIn 0.35s ease-out ${Math.min(i, 10) * 0.03}s backwards` });

const reducedMotion = () => {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
};

function useCountUp(target, duration = 600) {
  const [v, setV] = useState(target);
  useEffect(() => {
    if (reducedMotion() || !Number.isFinite(target)) { setV(target); return; }
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min((t - t0) / duration, 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    setV(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

function CountUp({ value, decimals = 0 }) {
  const v = useCountUp(value);
  return <>{v.toFixed(decimals)}</>;
}

const ratingColor = (r) => (r >= 8 ? "#3DDC84" : r >= 7.3 ? "#FFB627" : "#8FA69B");
const formColor = (f) => (f === "W" ? "#3DDC84" : f === "D" ? "#FFB627" : "#E8663C");

// Club-page navigation: any Crest can open a club page via this context. Provided at
// the app root; null when unavailable (SSR/render test), so Crest degrades to static.
const ClubNavContext = React.createContext(null);
// GLV (Glenavon) is the archived, relegated club — no club page, so its crest stays static.
const hasClubPage = (club) => club !== "GLV";

// Fire a Vercel Web Analytics custom event — no-op if analytics isn't loaded, never throws
function track(name, data) {
  try {
    if (typeof window !== "undefined" && typeof window.va === "function") {
      window.va("event", data ? { name, data } : { name });
    }
  } catch {}
}

// Quiet banner shown when a live-data fetch failed and we've fallen back to saved data
function OfflineNote() {
  return (
    <div style={{ fontSize: 12, color: dim, marginBottom: 12, fontStyle: "italic", display: "flex", alignItems: "center", gap: 6 }}>
      <span aria-hidden="true">⚠</span> Offline — showing saved data.
    </div>
  );
}

// Quiet error-report link — points at the GIBSON X account
function ReportLink({ style }) {
  return (
    <a href="https://x.com/GibsonStats" target="_blank" rel="noopener noreferrer"
      style={{ fontSize: 12, color: dim, textDecoration: "underline", ...style }}>
      Spot an error? Tell GIBSON
    </a>
  );
}

function Crest({ club, size = 34, tappable = true }) {
  const openClub = useContext(ClubNavContext);
  const c = CLUBS[club];
  const [c1, c2] = c.colors;
  const svg = (
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
  // Any crest opens that club's page, unless the caller opts out (e.g. it already sits
  // inside a selector button whose own action should win). Uses a role=button span, not
  // a <button>, to stay valid when nested inside other interactive rows.
  if (tappable && openClub && hasClubPage(club)) {
    return (
      <span role="button" tabIndex={0} aria-label={`${c.name} — open club page`}
        onClick={(e) => { e.stopPropagation(); openClub(club); }}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); openClub(club); } }}
        style={{ display: "inline-flex", lineHeight: 0, cursor: "pointer" }}>
        {svg}
      </span>
    );
  }
  return svg;
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
  const noteColor = { C: "#3DDC84", IC: "#5EC8F2", E: "#FFB627", EPO: "#5EC8F2", PO: "#E8663C", R: "#E8663C" };
  const [live, setLive] = useState(null);
  const [checking, setChecking] = useState(true);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let on = true;
    fetch("/api/table")
      .then((r) => r.json())
      .then((j) => {
        if (on && j && j.ok && Array.isArray(j.rows) && j.rows.some((r) => r.p > 0)) setLive(j);
      })
      .catch(() => { if (on) setOffline(true); })
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
        <span style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Live table · {live.season} · updated {live.updated}
        </span>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {live.rows.map((row, i) => (
          <div key={row.club} style={{
            display: "flex", alignItems: "center", gap: 12,
            ...SURFACE.card,
            borderRadius: 12, padding: "10px 14px 10px 11px",
            ...rise(i),
          }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: dim, width: 24, textAlign: "center", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{i + 1}</div>
            <Crest club={row.club} size={26} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: chalk }}>{CLUBS[row.club].name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums" }}>
                  P{row.p} · W{row.w} D{row.d} L{row.l} · {row.gd > 0 ? "+" : ""}{row.gd} GD
                </span>
                <span style={{ display: "flex", gap: 3 }}>
                  {row.form.split("").map((f, j) => (
                    <span key={j} aria-label={f === "W" ? "win" : f === "D" ? "draw" : "loss"} style={{
                      width: 14, height: 14, borderRadius: 4, background: formColor(f), color: "#0B1512",
                      fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 12, lineHeight: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      opacity: j === row.form.length - 1 ? 1 : 0.62,
                    }}>{f}</span>
                  ))}
                </span>
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, color: chalk, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{row.pts}</div>
              <div style={{ fontSize: 12, color: dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>pts</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: dim, marginTop: 8 }}>
        Auto-updated via TheSportsDB (community data) — cross-check big calls against official sources.
      </div>
    </div>
  );
  };
  const Row = ({ pos, club, note, tag, i }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      ...SURFACE.card,
      borderLeft: `3px solid ${note ? noteColor[note] : "transparent"}`,
      borderRadius: 12, padding: "11px 14px 11px 11px",
      ...rise(i),
    }}>
      <div style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16,
        color: note ? noteColor[note] : dim, width: 26, textAlign: "center",
        fontVariantNumeric: "tabular-nums", flexShrink: 0,
      }}>{pos ?? "·"}</div>
      <Crest club={club} size={26} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: chalk }}>{CLUBS[club].name}</div>
        {(note || tag) && <div style={{ fontSize: 12, color: note ? noteColor[note] : dim, marginTop: 2 }}>{note ? noteLabel[note] : tag}</div>}
      </div>
    </div>
  );
  const LiveTeaser = () => (
    <div style={{
        borderRadius: 14, padding: "14px 16px", marginBottom: 22,
        ...SURFACE.hero,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3DDC84", flexShrink: 0, animation: "livePulse 1.4s infinite" }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", color: chalk, textTransform: "uppercase" }}>Live scores</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#0B1512", background: "#FFB627", borderRadius: 99, padding: "2px 8px", letterSpacing: "0.06em" }}>COMING SOON</span>
          </div>
          <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
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
        {offline && <OfflineNote />}
        <LiveBlock />
        <LiveTeaser />
        <div className="gb-desk-2col">
        <div>
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
          Sports Direct Premiership · Final 2025/26
        </div>
        <div style={{ display: "grid", gap: 6 }}>
          {FULL_TABLE.map((row, i) => (
            <div key={row.club} style={{
              display: "flex", alignItems: "center", gap: 12,
              ...SURFACE.card,
              borderLeft: `3px solid ${row.note ? noteC[row.note] : "transparent"}`,
              borderRadius: 12, padding: "10px 14px 10px 11px",
              ...rise(i),
            }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: row.note ? noteC[row.note] : dim, width: 24, textAlign: "center", fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>{i + 1}</div>
              <Crest club={row.club} size={26} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: chalk }}>{CLUBS[row.club].name}</div>
                <div style={{ fontSize: 12, color: dim, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>
                  P{row.p} · W{row.w} D{row.d} L{row.l} · {row.gd > 0 ? "+" : ""}{row.gd} GD
                </div>
                {row.note && <div style={{ fontSize: 12, color: noteC[row.note], marginTop: 2 }}>{noteL[row.note]}</div>}
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, color: chalk, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{row.pts}</div>
                <div style={{ fontSize: 12, color: dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>pts</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 10, lineHeight: 1.5 }}>
          Official final table (split format — Carrick matched Cliftonville's 53 points but finished 7th in the
          bottom-six group). Verified · GIBSON 1.01.
        </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
            Squad Market Values 26/27 · Transfermarkt
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {MARKET_VALUES.map((m, i) => (
              <div key={m.club} style={{ display: "flex", alignItems: "center", gap: 10, ...rise(i) }}>
                <Crest club={m.club} size={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[m.club].name} <span style={{ color: dim, fontWeight: 400, fontSize: 12 }}>· {m.squad} players</span></span>
                    <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>€{m.total.toFixed(2)}m</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden" }}>
                    <div style={{ width: `${Math.max((m.total / MARKET_VALUES[0].total) * 100, 3)}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[m.club].colors[0]}, ${CLUBS[m.club].colors[0]}AA)`, borderRadius: 3 }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: dim, marginTop: 10, lineHeight: 1.6 }}>
            League total {LEAGUE_FACTS.totalValue} across {LEAGUE_FACTS.players} players · {LEAGUE_FACTS.foreigners} from outside NI · average age {LEAGUE_FACTS.avgAge}.
            Most valuable player: {LEAGUE_FACTS.mvp}.
          </div>
        </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      {offline && <OfflineNote />}
      <LiveBlock />
      <LiveTeaser />
      <div className="gb-desk-2col">
      <div>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Sports Direct Premiership · Final 2025/26
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {FINAL_PLACINGS.filter((r) => r.pos <= 4).map((r, i) => <Row key={r.club} {...r} i={i} />)}
      </div>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", margin: "16px 0 8px" }}>
        Mid-table · finished 5th–10th
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {MID_TABLE.map((r, i) => <Row key={r.club} club={r.club} tag={r.tag} i={i} />)}
      </div>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", margin: "16px 0 8px" }}>
        The bottom
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        {FINAL_PLACINGS.filter((r) => r.pos >= 11).map((r, i) => <Row key={r.club} {...r} i={i} />)}
      </div>
      <div style={{ fontSize: 12, color: dim, marginTop: 10, lineHeight: 1.5 }}>
        Confirmed final placings shown. Full verified records now live in the table above —
        the 26/27 live table takes over here in August.
      </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
          Squad Market Values 26/27 · Transfermarkt
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {MARKET_VALUES.map((m, i) => (
            <div key={m.club} style={{ display: "flex", alignItems: "center", gap: 10, ...rise(i) }}>
              <Crest club={m.club} size={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[m.club].name} <span style={{ color: dim, fontWeight: 400, fontSize: 12 }}>· {m.squad} players</span></span>
                  <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>€{m.total.toFixed(2)}m</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden" }}>
                  <div style={{ width: `${Math.max((m.total / MARKET_VALUES[0].total) * 100, 3)}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[m.club].colors[0]}, ${CLUBS[m.club].colors[0]}AA)`, borderRadius: 3 }} />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 10, lineHeight: 1.6 }}>
          League total {LEAGUE_FACTS.totalValue} across {LEAGUE_FACTS.players} players · {LEAGUE_FACTS.foreigners} from outside NI · average age {LEAGUE_FACTS.avgAge}.
          Most valuable player: {LEAGUE_FACTS.mvp}.
        </div>
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
    <div style={{ ...SURFACE.card, borderRadius: 10, padding: "10px 12px" }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 26, color: chalk, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: dim, marginTop: 3 }}>{label}{sub && <span style={{ color: accent }}> · {sub}</span>}</div>
    </div>
  );
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 14, padding: "18px 16px", borderRadius: 14,
        ...SURFACE.hero, marginBottom: 14, position: "relative", overflow: "hidden",
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
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.12em", textTransform: "uppercase" }}>GIBSON Index</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))", gap: 8, marginBottom: 14 }}>
        {stat("Goals", player.goals, `xG ${player.xg}`)}
        {stat("Assists", player.assists, `xA ${player.xa}`)}
        {stat("G + A", player.goals + player.assists)}
        {stat("Shots /90", player.per90.shots)}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", ...SURFACE.card, borderRadius: 10, padding: "10px 14px", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 2 }}>Form DNA — last 6</div>
          <div style={{ fontSize: 12, color: chalk, fontVariantNumeric: "tabular-nums" }}>{player.form.join("  ·  ")}</div>
        </div>
        <Sparkline data={player.form} color={accent} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
        <div style={{ ...SURFACE.card, borderRadius: 12, padding: 8 }}>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 8px" }}>Skill Radar · GIBSON Index beta</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke={faint} />
                <PolarAngleAxis dataKey="axis" tick={{ fill: dim, fontSize: 12, fontFamily: "Barlow" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar dataKey="v" stroke={accent} fill={accent} fillOpacity={0.35} strokeWidth={2} isAnimationActive />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>Shot Map — attacking third</div>
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
    <div className="gb-narrow" style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ fontSize: 12, color: dim, marginBottom: 12, lineHeight: 1.5 }}>
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

      <div style={{ ...SURFACE.card, borderRadius: 12, marginBottom: 14 }}>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <RadarChart data={data} outerRadius="72%">
              <PolarGrid stroke={faint} />
              <PolarAngleAxis dataKey="axis" tick={{ fill: dim, fontSize: 12, fontFamily: "Barlow" }} />
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

      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Tale of the tape</div>
      {rows.map(([label, va, vb]) => {
        const total = va + vb || 1;
        const aWins = va > vb;
        return (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontVariantNumeric: "tabular-nums", marginBottom: 3 }}>
              <span style={{ color: aWins ? colA : dim, fontWeight: aWins ? 700 : 400 }}>{va}</span>
              <span style={{ color: dim, fontSize: 12 }}>{label}</span>
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
        width: 32, height: 24, borderRadius: 4, border: `1px dashed ${dim}`,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        fontSize: 12, color: dim, fontFamily: "'Barlow Condensed'", fontWeight: 700,
      }}>OUT</div>
      <span style={{ fontSize: 12, color: dim }}>{name}</span>
    </div>
  );
}

function ClubLedger() {
  const [club, setClub] = useState("LAR");
  const w = WINDOW.find((x) => x.club === club);
  const List = ({ title, items, color }) => (
    <div style={{ ...SURFACE.flat, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 12, color, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {items.length === 0 && <div style={{ fontSize: 12, color: dim, fontStyle: "italic" }}>None recorded yet</div>}
      {items.map(([p, c]) => (
        <div key={p + c} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: chalk, lineHeight: 1.3 }}>{p}</div>
          <div style={{ fontSize: 12, color: dim }}>{c}</div>
        </div>
      ))}
    </div>
  );
  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Full window · club by club
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
        {WINDOW.map((x) => (
          <button key={x.club} onClick={() => setClub(x.club)} aria-label={CLUBS[x.club].name} style={{
            padding: 3, borderRadius: 10, cursor: "pointer",
            background: club === x.club ? "rgba(255,182,39,0.14)" : "transparent",
            border: `1px solid ${club === x.club ? "rgba(255,182,39,0.5)" : faint}`,
          }}>
            <Crest club={x.club} size={24} tappable={false} />
          </button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <List title={`→ In at ${CLUBS[club].name}`} items={w.ins} color="#3DDC84" />
        <List title={`← Out`} items={w.outs} color="#E8663C" />
      </div>
      <div style={{ fontSize: 12, color: dim, marginTop: 8, lineHeight: 1.5 }}>
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
    <div className="gb-narrow" style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Summer window 2026</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["all", "done", "rumour", "contract", "departure"].map((s) => (
            <button key={s} onClick={() => setFilter(s)} style={{
              fontSize: 12, padding: "4px 10px", borderRadius: 999, cursor: "pointer", textTransform: "capitalize",
              background: filter === s ? "rgba(255,182,39,0.15)" : "transparent",
              color: filter === s ? "#FFB627" : dim,
              border: `1px solid ${filter === s ? "rgba(255,182,39,0.4)" : faint}`,
            }}>{s === "all" ? "All" : STATUS_META[s].label}</button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {items.length === 0 && (
          <div style={{ border: `1px dashed ${faint}`, borderRadius: 14, padding: "18px 16px", fontSize: 13, color: dim, lineHeight: 1.6, textAlign: "center" }}>
            {emptyLines[filter] || "Nothing here yet."}
          </div>
        )}
        {items.map((t, i) => {
          const meta = STATUS_META[t.status];
          const isContract = t.status === "contract";
          const isReleaseOnly = !t.to && !t.toExternal;
          return (
            <div key={t.id} style={{
              ...SURFACE.card,
              borderLeft: `3px solid ${meta.color}`, borderRadius: 12, padding: "12px 14px",
              ...rise(i),
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 16, color: chalk }}>{t.player}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <span style={{ fontSize: 12, color: dim }}>{t.date}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, background: `${meta.color}1F`, borderRadius: 999, padding: "3px 9px", letterSpacing: "0.06em", textTransform: "uppercase" }}>{meta.label}</span>
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
              <div style={{ fontSize: 12, color: dim, marginTop: 8, lineHeight: 1.4 }}>{t.note}</div>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: dim, marginTop: 10 }}>
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
        fontSize: 12, color: dim, fontStyle: "italic",
      }}>GIBSON's still crunching this one — estimate lands closer to kick-off</div>
    );
  }
  const cell = (label, val) => (
    <div style={{ flex: 1, textAlign: "center", ...SURFACE.card, borderRadius: 8, padding: "7px 4px" }}>
      <div style={{ fontSize: 12, color: dim, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: chalk, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{val.toFixed(2)}</div>
    </div>
  );
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.12em", textTransform: "uppercase", textAlign: "center", marginBottom: 4 }}>
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
    <div style={{ fontSize: 12, color: dim, marginTop: 12, lineHeight: 1.5, borderTop: `1px solid ${faint}`, paddingTop: 10 }}>
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
    <div className="gb-narrow" style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
        Euro Watch · Qualifying 2026/27
      </div>
      <div style={{ fontSize: 12, color: dim, marginBottom: 12, lineHeight: 1.5 }}>
        Four Irish League clubs on the continent this summer. First legs from 7 July.
      </div>

      {EURO_COEFFICIENT && (
        <div style={{ ...SURFACE.card, borderRadius: 12, padding: "12px 14px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>UEFA country coefficient</div>
            <div style={{ fontSize: 12, color: dim }}>Northern Ireland</div>
          </div>
          <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
            <div>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 26, color: "#FFB627", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>#{EURO_COEFFICIENT.rank}</div>
              <div style={{ fontSize: 12, color: dim, marginTop: 3 }}>rank · {EURO_COEFFICIENT.points.toFixed(2)} pts</div>
            </div>
            <div style={{ fontSize: 12, color: dim, lineHeight: 1.4 }}>
              from #{EURO_COEFFICIENT.lastSeason.rank} ({EURO_COEFFICIENT.lastSeason.points.toFixed(2)}) last season
            </div>
          </div>
          <div style={{ fontSize: 12, color: dim, marginTop: 8, lineHeight: 1.45 }}>{EURO_COEFFICIENT.note}</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {EURO.map((e, i) => {
          const c = CLUBS[e.club];
          return (
            <div key={e.club} style={{
              ...SURFACE.card, borderRadius: 14, padding: "14px",
              ...rise(i),
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                <Crest club={e.club} size={26} />
                <div style={{ flex: 1, minWidth: 140 }}>
                  <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk, lineHeight: 1 }}>
                    {c.name} <span style={{ color: dim, fontWeight: 600 }}>v</span> {e.opp}
                  </div>
                  <div style={{ fontSize: 12, color: dim, marginTop: 3 }}>{e.opp} · {e.oppCountry}</div>
                </div>
                <span style={{
                  fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase",
                  color: compColor(e.comp), background: `${compColor(e.comp)}1A`,
                  border: `1px solid ${compColor(e.comp)}55`, borderRadius: 999, padding: "3px 10px",
                }}>{e.comp}</span>
              </div>
              <div style={{ fontSize: 12, color: dim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{e.round}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {e.legs.map((l) => (
                  <div key={l.label} style={{ ...SURFACE.card, borderRadius: 10, padding: "9px 11px" }}>
                    <div style={{ fontSize: 12, color: dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>{l.label}</div>
                    <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: chalk, marginTop: 2 }}>{l.date}</div>
                    <div style={{ fontSize: 12, color: dim }}>{l.venue}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#FFB627", fontWeight: 600, marginBottom: 6 }}>→ {e.prize}</div>
              <div style={{ fontSize: 12, color: dim, lineHeight: 1.45 }}>{e.note}</div>
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

function FixturesView({ fixedClub } = {}) {
  const locked = !!fixedClub; // club-page mode: lock to one club, hide pickers/toggle
  const [club, setClub] = useState(fixedClub || "LAR");
  const [mode, setMode] = useState("club"); // 'club' | 'round'
  const [round, setRound] = useState(1);
  const [showAll, setShowAll] = useState(false);
  const [liveEv, setLiveEv] = useState(null);
  const [evLoading, setEvLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let on = true;
    fetch("/api/events")
      .then((r) => r.json())
      .then((j) => { if (on && j && j.ok) setLiveEv(j); })
      .catch(() => { if (on) setOffline(true); })
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
    <div className="gb-narrow" style={{ animation: "riseIn 0.4s ease-out" }}>
      {offline && <OfflineNote />}
      {!locked && (
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {[["club", "By club"], ["round", "By round"]].map(([m, label]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
            fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase",
            background: mode === m ? "#FFB627" : OVERLAY.fill,
            color: mode === m ? "#0B1512" : dim,
            border: `1px solid ${mode === m ? "#FFB627" : faint}`,
          }}>{label}</button>
        ))}
      </div>
      )}

      {!locked && mode === "round" && (() => {
        const r = FIXTURES_2627.find((x) => x.round === round) || FIXTURES_2627[0];
        return (
          <div style={{ animation: "riseIn 0.3s ease-out" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <button onClick={() => setRound(Math.max(1, round - 1))} disabled={round === 1} style={{
                padding: "8px 16px", borderRadius: 10, cursor: round === 1 ? "default" : "pointer", opacity: round === 1 ? 0.3 : 1,
                background: OVERLAY.fill, color: chalk, border: `1px solid ${faint}`,
                fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16,
              }} aria-label="Previous round">‹</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, color: chalk, textTransform: "uppercase" }}>Round {r.round} of 33</div>
                <div style={{ fontSize: 12, color: dim }}>{r.date}</div>
              </div>
              <button onClick={() => setRound(Math.min(33, round + 1))} disabled={round === 33} style={{
                padding: "8px 16px", borderRadius: 10, cursor: round === 33 ? "default" : "pointer", opacity: round === 33 ? 0.3 : 1,
                background: OVERLAY.fill, color: chalk, border: `1px solid ${faint}`,
                fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16,
              }} aria-label="Next round">›</button>
            </div>
            <div key={r.round} style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 10, animation: "riseIn 0.28s ease-out" }}>
              {r.matches.map((m, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", padding: "12px 14px",
                  borderBottom: i < r.matches.length - 1 ? `1px solid ${faint}` : "none",
                  background: i % 2 ? "rgba(240,255,245,0.02)" : "transparent",
                }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: chalk, textAlign: "right" }}>{CLUBS[m.h].name}</span>
                    <Crest club={m.h} size={19} />
                  </div>
                  <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#FFB627", padding: "0 12px" }}>V</span>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
                    <Crest club={m.a} size={19} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{CLUBS[m.a].name}</span>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: dim, lineHeight: 1.5, marginBottom: 6 }}>
              {r.matches.some((m) => m.d) ? "Highlighted dates: " + r.matches.filter((m) => m.d).map((m) => `${CLUBS[m.h].name} v ${CLUBS[m.a].name} (${m.d}${m.t ? " · " + m.t : ""})`).join(" · ") + ". Others " + r.date + ", 3pm." : `All matches ${r.date}, 3pm unless rearranged.`}
            </div>
            <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
              After round 33 the league splits — top six and bottom six play five more rounds against each other. Split fixtures released in March.
            </div>
          </div>
        );
      })()}

      {mode === "club" && (<>
      {!locked && (<>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 4 }}>
        BoyleSports Premiership 26/27 · pick your club
      </div>
      <div style={{ fontSize: 12, color: dim, marginBottom: 10, lineHeight: 1.5 }}>
        Opening night: Cliftonville v Crusaders under the Friday lights at Solitude, 7 Aug. Big Two derby as early as Round 2.
      </div>
      {evLoading && (
        <div style={{ marginBottom: 14 }}><SkelRows n={2} /></div>
      )}
      {!evLoading && !liveEv && (
        <div style={{ fontSize: 12, color: dim, marginBottom: 14, lineHeight: 1.5, animation: "riseIn 0.3s ease-out" }}>
          ⚡ The live results feed wakes up when the league does — opening night, Friday 7 August at Solitude.
        </div>
      )}
      {liveEv && liveEv.results && liveEv.results.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#3DDC84", display: "inline-block" }} />
            <span style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Latest results · auto-updated</span>
          </div>
          <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden" }}>
            {liveEv.results.slice(0, 6).map((m, i) => (
              <div key={m.h + m.a + m.date} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "9px 13px",
                borderBottom: i < Math.min(liveEv.results.length, 6) - 1 ? `1px solid ${faint}` : "none",
              }}>
                <span style={{ fontSize: 12, color: dim, width: 56, flexShrink: 0 }}>{m.date.slice(5)}</span>
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
            <Crest club={k} size={26} tappable={false} />
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <Crest club={club} size={24} tappable={false} />
        <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk }}>{c.name}</span>
        <span style={{ fontSize: 12, color: dim }}>· {c.ground}</span>
      </div>
      </>)}
      {euro && (
        <>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>In Europe first</div>
          <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 14 }}>
            {euro.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
                borderBottom: i < euro.length - 1 ? `1px solid ${faint}` : "none",
                opacity: f.opp.includes("*") ? 0.6 : 1,
              }}>
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#5EC8F2", width: 74, flexShrink: 0, lineHeight: 1.2 }}>{f.date}{f.res && <span style={{ color: "#FFB627" }}> {f.res}</span>}</div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{f.opp.replace("*", "")}{f.opp.includes("*") && <span style={{ fontSize: 12, color: dim }}> (provisional)</span>}</div>
                  <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>{f.comp}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 }}>
        Premiership · {showAll ? "full 33-round schedule" : "opening five"}
      </div>
      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden" }}>
        {nextLeague.map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "11px 13px",
            borderBottom: i < nextLeague.length - 1 ? `1px solid ${faint}` : "none",
          }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#FFB627", width: 74, flexShrink: 0, lineHeight: 1.2 }}>
              {f.date}
              <div style={{ fontSize: 12, color: dim, fontWeight: 600 }}>{f.time}</div>
            </div>
            <Crest club={f.opp} size={22} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: chalk }}>
                {CLUBS[f.opp].name} <span style={{ color: f.home ? "#3DDC84" : dim, fontSize: 12, fontWeight: 700 }}>{f.home ? "(H)" : "(A)"}</span>
              </div>
              <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>Round {f.round} · {f.venue}</div>
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setShowAll(!showAll)} style={{
        width: "100%", marginTop: 10, padding: "11px", borderRadius: 10, cursor: "pointer",
        background: OVERLAY.fill, color: chalk, border: `1px solid ${faint}`,
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>{showAll ? "Show opening five only" : `Show all ${leagueFixtures.length} league fixtures`}</button>
      <div style={{ fontSize: 12, color: dim, marginTop: 10, lineHeight: 1.5 }}>
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
    track("predictor_pick_saved", { gw: PREDICTOR_GW.id });
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
    track("share_card_generated", { gw: PREDICTOR_GW.id, scored: resultsIn });
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
        ctx.fillStyle = pts === 3 ? "#3DDC84" : pts === 1 ? "#FFB627" : "#E8663C";
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
        background: OVERLAY.fill, color: locked ? dim : "#FFB627", fontSize: 15, fontWeight: 800,
        opacity: locked ? 0.4 : 1,
      }}>+</button>
      <div style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 30, color: chalk,
        fontVariantNumeric: "tabular-nums", lineHeight: 1, minWidth: 30, textAlign: "center",
      }}>{picks[fid][side]}</div>
      <button onClick={() => bump(fid, side, -1)} disabled={locked} style={{
        width: 34, height: 26, borderRadius: 8, border: `1px solid ${faint}`, cursor: locked ? "default" : "pointer",
        background: OVERLAY.fill, color: locked ? dim : "#FFB627", fontSize: 15, fontWeight: 800,
        opacity: locked ? 0.4 : 1,
      }}>−</button>
    </div>
  );

  const TeamCell = ({ s }) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, width: 84 }}>
      {s.club
        ? <Crest club={s.club} size={30} />
        : <div style={{ width: 30, height: 34, borderRadius: 6, border: `1px dashed ${dim}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: dim, fontFamily: "'Barlow Condensed'", fontWeight: 700 }}>EUR</div>}
      <span style={{ fontSize: 12, fontWeight: 600, color: chalk, textAlign: "center", lineHeight: 1.25 }}>{sideName(s)}</span>
    </div>
  );

  return (
    <div className="gb-narrow" style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        borderRadius: 14, padding: "16px", marginBottom: 14,
        ...SURFACE.hero,
        display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap",
      }}>
        <div>
          <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
            The Predictor · {PREDICTOR_GW.name}
          </div>
          <div style={{ fontSize: 12, color: dim, marginTop: 4 }}>
            Exact score 3 pts · correct result 1 pt · {PREDICTOR_GW.deadline}
          </div>
          {!resultsIn && Object.keys(picks).length === 0 && (
            <div style={{ fontSize: 12, color: "#FFB627", marginTop: 6, lineHeight: 1.5 }}>
              All 0–0s? Bold strategy. Tap the arrows to call it properly — GIBSON's odds are just an opinion.
            </div>
          )}
          <div style={{ display: "none" }}>
          </div>
        </div>
        {resultsIn && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 30, color: "#3DDC84", lineHeight: 1, fontVariantNumeric: "tabular-nums", animation: "pop 0.45s ease-out" }}>{totalPts}</div>
            <div style={{ fontSize: 12, color: dim, marginTop: 4 }}>
              {totalPts === 0 ? "Blanked. Even the bookies get weeks like this." : totalPts >= 7 ? "Scenes. Frame this one." : totalPts >= 4 ? "Solid week's work." : "Points on the board — momentum builds."}
            </div>
            <div style={{ fontSize: 12, color: dim, letterSpacing: "0.1em", textTransform: "uppercase" }}>points</div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        {PREDICTOR_GW.fixtures.map((f, i) => {
          const pts = scoreFor(f);
          return (
            <div key={f.id} style={{
              ...SURFACE.card, border: `1px solid ${pts === 3 ? "#3DDC84" : pts === 1 ? "#FFB627" : faint}`,
              borderRadius: 14, padding: "14px 10px 12px",
              ...rise(i),
            }}>
              <div style={{ textAlign: "center", fontSize: 12, color: dim, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}>{f.comp}</div>
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
                  <span style={{ color: chalk, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{f.result[0]}–{f.result[1]}</span>
                  {pts !== null && <span style={{ color: pts === 3 ? "#3DDC84" : pts === 1 ? "#FFB627" : "#E8663C", fontWeight: 700 }}> · +{pts} pts</span>}
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
            background: OVERLAY.fill, color: chalk, border: `1px solid ${faint}`,
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
          background: OVERLAY.fill, color: copied ? "#3DDC84" : chalk, border: `1px solid ${copied ? "#3DDC84" : faint}`,
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{copied ? "✓ Copied!" : "📋 Copy as text"}</button>
      </div>

      {copied && (
        <div style={{ ...SURFACE.card, borderRadius: 10, padding: "10px 12px", fontSize: 12, color: dim, whiteSpace: "pre-line", marginBottom: 12 }}>
          {shareText()}
        </div>
      )}

      <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
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
        ...SURFACE.hero,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
          The Gibson Cup
        </div>
        <div style={{ fontSize: 13, color: dim, marginTop: 8, lineHeight: 1.55 }}>
          Contested since the league's founding era in 1890, the Gibson Cup is one of the oldest prizes
          in world football — and the trophy this site is named after.
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8, marginBottom: 20 }}>
        {RECORDS.map((r) => (
          <div key={r.label} style={{ ...SURFACE.card, borderRadius: 12, padding: "12px 13px" }}>
            <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 30, color: "#FFB627", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{r.big}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: chalk, marginTop: 6 }}>{r.label}</div>
            <div style={{ fontSize: 12, color: dim, marginTop: 3, lineHeight: 1.4 }}>{r.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>All-time league titles · current Premiership clubs</div>
      <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
        {ALL_TIME_TITLES.map((t, i) => {
          const c = CLUBS[t.club];
          return (
            <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 10, ...rise(i) }}>
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
      <div style={{ fontSize: 12, color: dim, marginBottom: 20, lineHeight: 1.5 }}>
        Historic totals also include clubs no longer in the league — most famously Belfast Celtic's 14 titles.
      </div>

      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Roll of honour · last 12 seasons</div>
      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden" }}>
        {ROLL_OF_HONOUR.map((r, i) => (
          <div key={r.season} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 13px",
            borderBottom: i < ROLL_OF_HONOUR.length - 1 ? `1px solid ${faint}` : "none",
            background: i === 0 ? "rgba(255,182,39,0.06)" : "transparent",
          }}>
            <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 14, color: dim, width: 62, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{r.season}</span>
            <Crest club={r.club} size={20} />
            <span style={{ fontSize: 13, fontWeight: 700, color: chalk, flex: 1 }}>{CLUBS[r.club].name}</span>
            {r.note && <span style={{ fontSize: 12, color: "#FFB627" }}>{r.note}</span>}
            {i === 0 && <span style={{ fontSize: 12 }}>🏆</span>}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Only in the Irish League · six true stories</div>
        <div className="gb-desk-2col" style={{ display: "grid", gap: 10 }}>
          {LEAGUE_LORE.map((l, i) => (
            <div key={l.id} style={{ ...SURFACE.card, borderRadius: 12, padding: "13px 14px", ...rise(i) }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, textTransform: "uppercase", color: "#FFB627", lineHeight: 1.15 }}>{l.title}</div>
              <div style={{ fontSize: 13, color: chalk, marginTop: 6, lineHeight: 1.55 }}>{l.fact}</div>
              <div style={{ fontSize: 12, color: dim, marginTop: 6 }}>{l.source}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Season Archive</div>
          <select value={archiveSeason} onChange={(e) => setArchiveSeason(e.target.value)} style={{
            background: "#12211B", color: chalk, border: `1px solid ${faint}`, borderRadius: 8,
            padding: "7px 10px", fontFamily: "'Barlow'", fontSize: 13,
          }}>
            {SEASON_ARCHIVE.map((s) => <option key={s.season} value={s.season}>{s.season}</option>)}
          </select>
        </div>
        <div style={{ ...SURFACE.card, borderRadius: 14, padding: "14px 15px", animation: "riseIn 0.35s ease-out" }} key={arch.season}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ fontSize: 12, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Champions 🏆</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#FFB627", textAlign: "right" }}>{arch.champion}{arch.champNote && <span style={{ color: dim, fontWeight: 400 }}> · {arch.champNote}</span>}</span>
            </div>
            {arch.runnerUp && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 12, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Runners-up</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{arch.runnerUp}</span>
              </div>
            )}
            {arch.cup && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 12, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Irish Cup</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{arch.cup}</span>
              </div>
            )}
            {arch.promotedIn && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 12, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Promoted in</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{arch.promotedIn}</span>
              </div>
            )}
            {arch.relegated && (
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <span style={{ fontSize: 12, color: dim, textTransform: "uppercase", letterSpacing: "0.08em", flexShrink: 0 }}>Relegated</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#E8663C" }}>{arch.relegated}</span>
              </div>
            )}
          </div>
          {arch.facts?.length > 0 && (
            <div style={{ marginTop: 12, borderTop: `1px solid ${faint}`, paddingTop: 10 }}>
              {arch.facts.map((f) => (
                <div key={f} style={{ fontSize: 12, color: dim, lineHeight: 1.5, display: "flex", gap: 8, marginBottom: 6 }}>
                  <span style={{ color: "#FFB627", flexShrink: 0 }}>›</span>{f}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 8 }}>
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
        ...SURFACE.hero,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
          The Stats Lab ⚡
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 4 }}>25/26 season · verified team-level numbers</div>
      </div>

      <div className="gb-desk-2col">
      <div>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        The Entertainment Index · goals per game in their matches
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
        {GOALS_STATS.map((t, i) => (
          <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 10, ...rise(i) }}>
            <Crest club={t.club} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[t.club].name}
                  <span style={{ color: dim, fontWeight: 400, fontSize: 12 }}> · O2.5 {t.o25}% · BTS {t.bts}%</span>
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
      <div style={{ fontSize: 12, color: dim, marginBottom: 20, lineHeight: 1.5 }}>
        Crusaders games were pure chaos (3.39 goals a game); Linfield games were chess (2.47). League average:
        {" "}{GOALS_LEAGUE_AVG.o25}% of matches went over 2.5 goals, both teams scored in {GOALS_LEAGUE_AVG.bts}%.
      </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ ...SURFACE.flat, borderRadius: 12, padding: "12px" }}>
          <div style={{ fontSize: 12, color: "#3DDC84", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>🧤 Clean sheet kings</div>
          {csSorted.map((t) => (
            <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <Crest club={t.club} size={15} />
              <span style={{ fontSize: 12, color: chalk, flex: 1 }}>{CLUBS[t.club].name}</span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#3DDC84", fontVariantNumeric: "tabular-nums" }}>{t.cs}%</span>
            </div>
          ))}
          <div style={{ fontSize: 12, color: dim, marginTop: 4 }}>% of games without conceding</div>
        </div>
        <div style={{ ...SURFACE.flat, borderRadius: 12, padding: "12px" }}>
          <div style={{ fontSize: 12, color: "#5EC8F2", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>⏱️ Half-time watch</div>
          <div style={{ fontSize: 26, fontFamily: "'Barlow Condensed'", fontWeight: 800, color: chalk, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}><CountUp value={1.66} decimals={2} /></div>
          <div style={{ fontSize: 12, color: dim, marginBottom: 8 }}>HT goals avg in Carrick games — the league's fastest starters</div>
          <div style={{ fontSize: 26, fontFamily: "'Barlow Condensed'", fontWeight: 800, color: chalk, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}><CountUp value={0.95} decimals={2} /></div>
          <div style={{ fontSize: 12, color: dim }}>in Linfield games — bring a coffee for the first half</div>
        </div>
      </div>
      </div>

      <div className="gb-desk-2col">
      <div>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        The xG Lab · expected goals per 90
      </div>
      <div style={{ display: "grid", gap: 8, marginBottom: 8 }}>
        {XG_TEAMS.map((t, i) => (
          <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 10, ...rise(i) }}>
            <Crest club={t.club} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[t.club].name}
                  <span style={{ color: dim, fontWeight: 400, fontSize: 12 }}> · xG {t.xg.toFixed(2)} · xGA {t.xga.toFixed(2)}</span>
                </span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: t.xgd >= 0 ? "#3DDC84" : "#E8663C", fontVariantNumeric: "tabular-nums" }}>
                  {t.xgd >= 0 ? "+" : "−"}{Math.abs(t.xgd).toFixed(2)}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden", display: "flex", justifyContent: "center" }}>
                <div style={{ width: "100%", position: "relative" }}>
                  <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1.5, background: "rgba(240,255,245,0.25)" }} />
                  <div style={{ position: "absolute", top: 0, bottom: 0,
                    left: t.xgd >= 0 ? "50%" : `${50 - (Math.abs(t.xgd) / 0.7) * 50}%`,
                    width: `${(Math.abs(t.xgd) / 0.7) * 50}%`,
                    background: t.xgd >= 0 ? "linear-gradient(90deg, #3DDC8455, #3DDC84)" : "linear-gradient(90deg, #E8663C, #E8663C55)",
                    borderRadius: 3 }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: dim, marginBottom: 20, lineHeight: 1.5 }}>
        The metric that stings east Belfast: Glentoran had the league's best xG difference (+0.68) and its meanest
        expected defence — and finished third. Larne conceded 0.68 goals per game against an expected 1.10:
        title-winning goalkeeping and game management.
      </div>
      </div>
      <div>

      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Clinical XI · goals vs expected goals
      </div>
      <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
        {XG_PLAYERS.map((p, i) => {
          const diff = p.goals - p.xg;
          return (
            <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 8, ...rise(i) }}>
              <Crest club={p.club} size={17} />
              <span style={{ fontSize: 12, fontWeight: 600, color: chalk, flex: 1 }}>{p.name}</span>
              <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums" }}>{p.goals}g / {p.xg.toFixed(1)} xG</span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, minWidth: 44, textAlign: "right",
                color: diff >= 2 ? "#3DDC84" : diff <= -1 ? "#E8663C" : chalk, fontVariantNumeric: "tabular-nums" }}>
                {diff >= 0 ? "+" : "−"}{Math.abs(diff).toFixed(1)}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 12, color: dim, marginBottom: 20, lineHeight: 1.5 }}>
        Hoban scored 26 from chances worth 16.8 — over nine goals of pure finishing, the most clinical season the
        league has seen in years. Source: FootyStats, including play-offs; totals may differ slightly from the
        league-only scorer chart above.
      </div>
      </div>
      </div>

      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        Goals scored & possession
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {TEAM_STATS_2526.map((t, i) => (
          <div key={t.club} style={{ display: "flex", alignItems: "center", gap: 10, ...rise(i) }}>
            <Crest club={t.club} size={20} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[t.club].name} <span style={{ color: dim, fontWeight: 400, fontSize: 12 }}>· {t.poss}% poss.</span></span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#3DDC84", fontVariantNumeric: "tabular-nums" }}>{t.goals} goals</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: faint, overflow: "hidden" }}>
                <div style={{ width: `${(t.goals / maxGoals) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[t.club].colors[0]}, ${CLUBS[t.club].colors[0]}AA)`, borderRadius: 3 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: dim, marginTop: 8, lineHeight: 1.5 }}>
        The quirk of 25/26: Coleraine outscored everyone — 10 more than champions Larne — and still finished second.
        All figures verified via AiScore and published stats tables, July 2026.
      </div>
      <div style={{ marginTop: 16 }}><ReportLink /></div>
    </div>
  );
}

function SupportView() {
  return (
    <div className="gb-narrow" style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        borderRadius: 14, padding: "20px 16px", marginBottom: 16,
        ...SURFACE.hero,
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
            ...rise(i),
          }}>
            {t.featured && (
              <div style={{
                position: "absolute", top: -9, left: 16, background: "#FFB627", color: "#0B1512",
                fontSize: 12, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase",
                borderRadius: 999, padding: "3px 10px",
              }}>Most popular</div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: t.color }}>
                {t.emoji} {t.name}
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, color: chalk, fontVariantNumeric: "tabular-nums" }}>{t.price}</span>
                <span style={{ fontSize: 12, color: dim }}> {t.cadence}</span>
              </div>
            </div>
            <ul style={{ listStyle: "none", display: "grid", gap: 6, marginBottom: 14 }}>
              {t.perks.map((p) => (
                <li key={p} style={{ fontSize: 13, color: chalk, display: "flex", gap: 8, lineHeight: 1.4 }}>
                  <span style={{ color: t.color, flexShrink: 0 }}>✓</span>{p}
                </li>
              ))}
            </ul>
            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" onClick={() => track("kofi_tapped", { tier: t.id })} style={{
              display: "block", textAlign: "center", textDecoration: "none",
              background: t.featured ? "#FFB627" : OVERLAY.fill,
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

      <div style={{ fontSize: 12, color: dim, marginTop: 14, lineHeight: 1.5 }}>
        Payments are handled securely by Ko-fi — GIBSON never sees your card details.
        Memberships can be cancelled any time from your Ko-fi account.
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 10 }}>The Roadmap</div>
        {[
          { v: "1.01", when: "Jul 2026", title: "The complete foundation", desc: "Official 25/26 archive, Stats Lab with xG, full 26/27 fixture browser, Predictor share cards and the live-data layer — shipped.", status: "done" },
          { v: "1.05", when: "Jul 2026", title: "Cleaner GIBSON", desc: "Five-tab navigation, Home screen, readability pass — shipped.", status: "done" },
          { v: "1.07", when: "Jul 2026", title: "Club pages: every club, one tap", desc: "A full page for all twelve clubs — season, squad, transfers, fixtures and honours — reachable from any shield in the app.", status: "done" },
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
              <div style={{ fontSize: 13, fontWeight: 700, color: chalk }}>
                {r.title}
                {r.status === "next" && <span style={{ fontSize: 12, fontWeight: 800, color: "#0B1512", background: "#FFB627", borderRadius: 999, padding: "2px 8px", marginLeft: 8, letterSpacing: "0.08em", textTransform: "uppercase", verticalAlign: "middle" }}>Up next</span>}
              </div>
              <div style={{ fontSize: 12, color: dim, marginTop: 3, lineHeight: 1.45 }}>{r.desc}</div>
              <div style={{ fontSize: 12, color: dim, marginTop: 3, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.when}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 12, color: dim, marginTop: 10, lineHeight: 1.5 }}>
          Season Ticket holders vote on what gets built first.
        </div>
      </div>
    </div>
  );
}

function LogoMark({ size = 42 }) {
  // The Gibson Cup on terrace steps — same geometry as the app icons and og-card
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="GIBSON logo — the Gibson Cup on terrace steps" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="lg-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFD873" /><stop offset="1" stopColor="#FFA51F" />
        </linearGradient>
      </defs>
      <g fill="url(#lg-amber)">
        <path d="M54 38 L146 38 L138 76 C133 101 118 114 100 114 C82 114 67 101 62 76 Z" />
        <path d="M56 46 C30 46 26 78 49 88 L54 78 C40 71 44 55 56 55 Z" />
        <path d="M144 46 C170 46 174 78 151 88 L146 78 C160 71 156 55 144 55 Z" />
        <rect x="92" y="114" width="16" height="15" rx="3" />
        <rect x="70" y="132" width="60" height="10" rx="2" />
        <rect x="57" y="145" width="86" height="10" rx="2" />
        <rect x="43" y="158" width="114" height="10" rx="2" />
      </g>
    </svg>
  );
}

function SubNav({ items, value, onChange }) {
  return (
    <div style={{
      display: "flex", gap: 8, position: "sticky", top: 0, zIndex: 5,
      background: "#0B1512", margin: "0 -18px 14px", padding: "10px 18px",
    }}>
      {items.map(([id, label]) => (
        <button key={id} onClick={() => onChange(id)} style={{
          flex: 1, padding: "9px", borderRadius: 10, cursor: "pointer",
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase",
          background: value === id ? "#FFB627" : OVERLAY.fill,
          color: value === id ? "#0B1512" : dim,
          border: `1px solid ${value === id ? "#FFB627" : faint}`,
        }}>{label}</button>
      ))}
    </div>
  );
}

function HomeView({ goTo }) {
  // Next unplayed, non-provisional Euro fixture per club — a club still stands if it has one
  const nextEuro = [];
  for (const club of Object.keys(CLUB_FIXTURES)) {
    const f = CLUB_FIXTURES[club].find((x) => !x.res && !x.opp.includes("*"));
    if (f) nextEuro.push({ club, ...f });
  }
  const opener = FIXTURES_2627[0];
  const openMatch = opener.matches[0];
  const resultsIn = PREDICTOR_GW.fixtures.every((f) => f.result);
  const feed = TRANSFERS.slice(0, 3);
  // One lore entry per day, rotating by day of year
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const lore = LEAGUE_LORE[dayOfYear % LEAGUE_LORE.length];
  const label = { fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6 };
  // Stadium scoreboard hero for the very next fixture. Prefers the soonest European
  // tie; off-season it falls back to the Premiership opener so the board always shows
  // a real upcoming match. External opponents get a derived code (RSB, HJK, TF).
  const heroFix = nextEuro[0] || null;
  const restEuro = nextEuro.slice(heroFix ? 1 : 0);
  const oppCode = (name) => {
    const first = name.split(" ")[0];
    return first === first.toUpperCase() && first.length <= 4
      ? first
      : name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3);
  };
  const board = heroFix
    ? { home: heroFix.club, away: oppCode(heroFix.opp), date: heroFix.date, sub: `${CLUBS[heroFix.club].name} v ${heroFix.opp} · ${heroFix.comp}` }
    : { home: openMatch.h, away: openMatch.a, date: (openMatch.d || opener.date).replace(/^\w+\s+/, ""), sub: `${CLUBS[openMatch.h].name} v ${CLUBS[openMatch.a].name} · Premiership opening night` };
  const heroDate = board.date.match(/^(\d+)(\S*)(.*)$/);
  return (
    <div className="gb-narrow" style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        position: "relative", overflow: "hidden", borderRadius: 14, padding: "20px 16px 15px",
        marginBottom: 14, textAlign: "center",
        background: "linear-gradient(180deg, #0A140F, #060D0A)",
        border: "1px solid rgba(255,182,39,0.28)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 0 26px rgba(255,182,39,0.07)",
        animation: "boardFlicker 0.4s ease-out",
      }}>
        <div aria-hidden="true" style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent, #FFB627, transparent)" }} />
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 12 }}>Next match</div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 26, letterSpacing: "0.2em", color: chalk, marginRight: "-0.2em" }}>{board.home}</span>
          <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 48, lineHeight: 1, color: "#FFB627", fontVariantNumeric: "tabular-nums", textShadow: "0 0 18px rgba(255,182,39,0.35)" }}>
            {heroDate ? <><CountUp value={parseInt(heroDate[1], 10)} />{heroDate[2]}</> : board.date}
            {heroDate && heroDate[3] && <span style={{ fontSize: 20, letterSpacing: "0.12em", color: dim }}>{heroDate[3].toUpperCase()}</span>}
          </span>
          <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 26, letterSpacing: "0.2em", color: chalk, marginRight: "-0.2em" }}>{board.away}</span>
        </div>
        <div style={{ height: 2, width: 130, margin: "13px auto 9px", background: "#FFB627", opacity: 0.7, borderRadius: 1 }} />
        <div style={{ fontSize: 12, color: dim }}>{board.sub}</div>
      </div>
      {(restEuro.length > 0 || heroFix) && (<>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ ...label, marginBottom: 0 }}>Next up</div>
          <button onClick={() => goTo("matches", "fixtures")} style={{
            fontSize: 12, fontWeight: 700, color: "#FFB627", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0,
          }}>See all →</button>
        </div>
        <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
          {restEuro.map((f) => (
            <div key={f.club + f.date} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px", borderBottom: `1px solid ${faint}` }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#5EC8F2", width: 74, flexShrink: 0, lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }}>{f.date}</div>
              <Crest club={f.club} size={22} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{CLUBS[f.club].name} v {f.opp}</div>
                <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>{f.comp}</div>
              </div>
            </div>
          ))}
          {heroFix && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 13px" }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: "#FFB627", width: 74, flexShrink: 0, lineHeight: 1.2 }}>{openMatch.d || opener.date}</div>
              <Crest club={openMatch.h} size={22} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: chalk }}>{CLUBS[openMatch.h].name} v {CLUBS[openMatch.a].name}</div>
                <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>Premiership opening night · Round {opener.round}{openMatch.t ? ` · ${openMatch.t}` : ""}</div>
              </div>
            </div>
          )}
        </div>
      </>)}

      {nextEuro.length > 0 && (<>
        <div style={label}>Euro Watch · still standing</div>
        <div style={{ display: "grid", gap: 6, marginBottom: 18 }}>
          {nextEuro.map((f) => (
            <button key={f.club} className="gb-row" onClick={() => goTo("matches", "europe")} style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", cursor: "pointer",
              ...SURFACE.card, borderRadius: 12, padding: "10px 13px",
            }}>
              <Crest club={f.club} size={22} />
              <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0 }}>
                {CLUBS[f.club].name} <span style={{ color: dim, fontWeight: 400 }}>v {f.opp} · {f.date}</span>
              </span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#5EC8F2", flexShrink: 0 }}>{f.comp.split(" · ")[0]}</span>
            </button>
          ))}
        </div>
      </>)}

      <div style={{
        borderRadius: 14, padding: "16px", marginBottom: 18,
        ...SURFACE.hero,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
          The Predictor · {PREDICTOR_GW.name} 🎯
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 4 }}>
          {PREDICTOR_GW.fixtures.length} fixtures · exact score 3 pts · {PREDICTOR_GW.deadline}
        </div>
        <button onClick={() => goTo("predictor")} style={{
          marginTop: 12, width: "100%", padding: "11px", borderRadius: 10, cursor: "pointer",
          background: "#FFB627", color: "#0B1512", border: "1px solid #FFB627",
          fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
        }}>{resultsIn ? "Results are in — see your score →" : "Make your picks →"}</button>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ ...label, marginBottom: 0 }}>Latest transfer talk</div>
        <button onClick={() => goTo("more", "transfers")} style={{
          fontSize: 12, fontWeight: 700, color: "#FFB627", background: "transparent", border: "none", cursor: "pointer",
        }}>See all →</button>
      </div>
      <div style={{ display: "grid", gap: 8 }}>
        {feed.map((t) => {
          const meta = STATUS_META[t.status];
          return (
            <div key={t.id} style={{
              ...SURFACE.card,
              borderLeft: `3px solid ${meta.color}`, borderRadius: 12, padding: "10px 13px",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15, color: chalk }}>{t.player}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{meta.label}</span>
              </div>
              <div style={{ fontSize: 12, color: dim, marginTop: 4, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{t.note}</div>
            </div>
          );
        })}
      </div>

      <div style={{ ...SURFACE.card, borderRadius: 14, padding: "14px", marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>Did you know? · Only in the Irish League</div>
          <button onClick={() => goTo("more", "history")} style={{ fontSize: 12, fontWeight: 700, color: "#FFB627", background: "transparent", border: "none", cursor: "pointer", flexShrink: 0 }}>See all →</button>
        </div>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, textTransform: "uppercase", color: "#FFB627", lineHeight: 1.15 }}>{lore.title}</div>
        <div style={{ fontSize: 13, color: chalk, marginTop: 6, lineHeight: 1.55 }}>{lore.fact}</div>
        <div style={{ fontSize: 12, color: dim, marginTop: 6 }}>{lore.source}</div>
      </div>
    </div>
  );
}

function PlayersView() {
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
  return (
    <div className="gb-narrow" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 18 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>GIBSON Index · 25/26 · beta</div>
          <div style={{ display: "flex", gap: 4 }}>
            {["rating", "goals", "assists"].map((s) => (
              <button key={s} onClick={() => setSort(s)} style={{
                fontSize: 12, padding: "4px 10px", borderRadius: 999, cursor: "pointer", textTransform: "capitalize",
                background: sort === s ? "rgba(255,182,39,0.15)" : "transparent",
                color: sort === s ? "#FFB627" : dim, border: `1px solid ${sort === s ? "rgba(255,182,39,0.4)" : faint}`,
              }}>{s}</button>
            ))}
          </div>
        </div>
        <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden" }}>
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
                <div style={{ fontSize: 12, color: dim, display: "flex", alignItems: "center", gap: 6 }}>
                  <Crest club={p.club} size={13} tappable={false} /> {CLUBS[p.club].name} · {p.pos}
                </div>
              </div>
              <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: ratingColor(p.rating) }}>{p.rating.toFixed(1)}</div>
                <div style={{ fontSize: 12, color: dim }}>{p.goals}g · {p.assists}a</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 12, color: dim, lineHeight: 1.5, marginTop: -8 }}>
        Goals cross-verified via AiScore and season reports; assists via Transfermarkt (may undercount).
        GIBSON Index ratings, radar profiles, xG and per-90 figures are our own model estimates.
      </div>
      <PlayerDetail player={player} />
      <div>
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Treatment Table · current injuries</div>
        <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden" }}>
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
              <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1 }}>{inj.player}</span>
              <span style={{ fontSize: 12, color: "#E8663C" }}>✚ {inj.injury}</span>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 6 }}>Via Transfermarkt, July 2026.</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Discipline · 25/26 card leaders</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ ...SURFACE.flat, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: "#FFB627", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>🟨 Most yellows</div>
            {DISCIPLINE.yellows.map((p) => (
              <div key={p.player} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Crest club={p.club} size={15} />
                <span style={{ fontSize: 12, color: chalk, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.player}</span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>{p.n}</span>
              </div>
            ))}
          </div>
          <div style={{ ...SURFACE.flat, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 12, color: "#E8663C", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>🟥 Most reds</div>
            {DISCIPLINE.reds.map((p) => (
              <div key={p.player} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Crest club={p.club} size={15} />
                <span style={{ fontSize: 12, color: chalk, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.player}</span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#E8663C", fontVariantNumeric: "tabular-nums" }}>{p.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 6 }}>
          Bangor's Lewis Harrison: 10 yellows AND 2 reds — the league's most booked man. Via AiScore.
        </div>
      </div>
      <div style={{ marginTop: 4 }}><ReportLink /></div>
    </div>
  );
}

/* ================= APP ================= */
// Full-app crash screen — mirrored by the pre-React window.onerror fallback in index.html
function CrashScreen({ minHeight = "100vh" }) {
  return (
    <div style={{ minHeight, background: "#0B1512", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", fontFamily: "'Barlow', sans-serif" }}>
      <div style={{ fontSize: 44, marginBottom: 12 }}>🏆</div>
      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 26, color: "#EDF5EF", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>GIBSON hit a post</div>
      <div style={{ fontSize: 13, color: "#8FA69B", lineHeight: 1.6, maxWidth: 340, marginBottom: 18 }}>
        Refresh to retry — if it keeps happening, a fix is usually live within the hour.
      </div>
      <button onClick={() => window.location.reload()} style={{
        padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer",
        background: "#FFB627", color: "#0B1512", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>Refresh to retry</button>
    </div>
  );
}

// Top-level boundary around the whole app — catches render crashes the per-tab
// GibsonBoundary can't (header, nav, footer, the boundary machinery itself)
class TopBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    if (this.state.err) return <CrashScreen />;
    return this.props.children;
  }
}

class GibsonBoundary extends React.Component {
  constructor(props) { super(props); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  render() {
    // One crash screen, one voice — reduced min-height so the header/nav stay usable
    // around it. Sections pass a compact minHeight so one failing block stays contained.
    if (this.state.err) return <CrashScreen minHeight={this.props.minHeight || "60vh"} />;
    return this.props.children;
  }
}

/* ================= CLUB PAGES (1.07) ================= */
// A section wrapper: its own error boundary (compact fallback) + eyebrow label, so one
// malformed dataset never takes down the whole club page.
function ClubSection({ title, children }) {
  return (
    <GibsonBoundary minHeight="160px">
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
        {children}
      </div>
    </GibsonBoundary>
  );
}

// The twelve current Premiership clubs (excludes archived GLV).
function ClubsGrid({ openClub }) {
  const clubs = Object.keys(CLUBS).filter((k) => k !== "GLV");
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Club pages · tap a shield</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))", gap: 10 }}>
        {clubs.map((k, i) => (
          <button key={k} onClick={() => openClub(k)} aria-label={`Open ${CLUBS[k].name} club page`} style={{
            ...SURFACE.card, borderRadius: 12, padding: "12px 6px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 6, ...rise(i),
          }}>
            <Crest club={k} size={34} tappable={false} />
            <span style={{ fontSize: 12, fontWeight: 600, color: chalk, textAlign: "center", lineHeight: 1.2 }}>{CLUBS[k].name}</span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: dim, marginTop: 12, lineHeight: 1.5 }}>
        Every club shield across the app is tappable — the table, fixtures, transfers, anywhere — and opens that club's page.
      </div>
    </div>
  );
}

function ClubPage({ club, onBack }) {
  const c = CLUBS[club];
  const c1 = c.colors[0];
  const ord = (n) => n + (n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th");
  const tableIdx = FULL_TABLE.findIndex((r) => r.club === club);
  const row = tableIdx >= 0 ? FULL_TABLE[tableIdx] : null;
  const pos = tableIdx >= 0 ? tableIdx + 1 : null;
  const mv = MARKET_VALUES.find((m) => m.club === club);
  const xg = XG_TEAMS.find((t) => t.club === club);
  const teamStat = TEAM_STATS_2526.find((t) => t.club === club);
  const goalsStat = GOALS_STATS.find((t) => t.club === club);
  const yellows = DISCIPLINE.yellows.filter((p) => p.club === club);
  const reds = DISCIPLINE.reds.filter((p) => p.club === club);
  const indexPlayers = PLAYERS.filter((p) => p.club === club).sort((a, b) => b.rating - a.rating);
  const scorers = XG_PLAYERS.filter((p) => p.club === club);
  const injuries = INJURIES.filter((p) => p.club === club);
  const win = WINDOW.find((w) => w.club === club);
  const feed = TRANSFERS.filter((t) => t.from === club || t.to === club);
  const titles = ROLL_OF_HONOUR.filter((r) => r.club === club);
  const noteLabel = { C: "Champions · Gibson Cup", IC: "Irish Cup winners", E: "Europe (automatic)", EPO: "Europe (play-off)", PO: "Relegation play-off", R: "Relegated" };

  const empty = (msg) => <div style={{ fontSize: 13, color: dim, fontStyle: "italic", padding: "8px 0" }}>{msg}</div>;
  const tile = (label, value, accent) => (
    <div style={{ ...SURFACE.card, borderRadius: 10, padding: "10px 12px", textAlign: "center" }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 24, color: accent || chalk, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{value}</div>
      <div style={{ fontSize: 12, color: dim, marginTop: 3 }}>{label}</div>
    </div>
  );
  const subhead = { fontSize: 12, color: dim, letterSpacing: "0.1em", textTransform: "uppercase", margin: "12px 0 6px" };
  const cardList = (items) => (
    <div style={{ ...SURFACE.flat, borderRadius: 12, overflow: "hidden" }}>{items}</div>
  );

  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <button onClick={onBack} style={{
        display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 14, padding: "7px 14px",
        borderRadius: 999, cursor: "pointer", background: OVERLAY.fill, color: chalk, border: `1px solid ${faint}`,
        fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase",
      }}>← Back</button>

      {/* Header — a subtle club-colour tint over the house dark green; GIBSON stays dominant */}
      <GibsonBoundary minHeight="140px">
        <div style={{
          background: `linear-gradient(135deg, ${c1}22, transparent 62%), rgba(240,255,245,0.03)`,
          border: `1px solid ${faint}`, borderRadius: 14, padding: "18px 16px", marginBottom: 22,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: row || mv ? 14 : 0 }}>
            <Crest club={club} size={54} tappable={false} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 26, textTransform: "uppercase", color: chalk, lineHeight: 1 }}>{c.name}</div>
              <div style={{ fontSize: 13, color: dim, marginTop: 4 }}>{c.ground}</div>
              {row && row.note && <div style={{ fontSize: 12, color: "#FFB627", marginTop: 4 }}>{noteLabel[row.note]} · 2025/26</div>}
            </div>
          </div>
          {row ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 8 }}>
              {tile("25/26", ord(pos), "#FFB627")}
              {tile("W-D-L", `${row.w}-${row.d}-${row.l}`)}
              {tile("Points", row.pts)}
              {mv && tile("Squad value", `€${mv.total.toFixed(2)}m`)}
            </div>
          ) : (
            <>
              {empty("Promoted from the Championship — no 25/26 Premiership record.")}
              {mv && <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 8 }}>{tile("Squad value", `€${mv.total.toFixed(2)}m`)}</div>}
            </>
          )}
        </div>
      </GibsonBoundary>

      {/* Season */}
      <ClubSection title="Season · 25/26">
        {xg ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
            {tile("xG for", xg.xg.toFixed(2), "#3DDC84")}
            {tile("xG against", xg.xga.toFixed(2))}
            {tile("xG diff", `${xg.xgd >= 0 ? "+" : "−"}${Math.abs(xg.xgd).toFixed(2)}`, xg.xgd >= 0 ? "#3DDC84" : "#E8663C")}
          </div>
        ) : empty("No expected-goals data for 25/26.")}
        {(teamStat || goalsStat) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))", gap: 8, marginBottom: 12 }}>
            {teamStat && tile("Goals", teamStat.goals, "#3DDC84")}
            {teamStat && tile("Possession", `${teamStat.poss.toFixed(0)}%`)}
            {goalsStat && tile("Goals/game", goalsStat.avg.toFixed(2))}
            {goalsStat && tile("Clean sheets", `${goalsStat.cs}%`)}
          </div>
        )}
        <div style={subhead}>Discipline · 25/26</div>
        {yellows.length || reds.length ? cardList(
          [...yellows.map((p) => [p, "🟨", "#FFB627"]), ...reds.map((p) => [p, "🟥", "#E8663C"])].map(([p, icon, col], i, arr) => (
            <div key={p.player + icon} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: i < arr.length - 1 ? `1px solid ${faint}` : "none" }}>
              <span style={{ fontSize: 13 }}>{icon}</span>
              <span style={{ fontSize: 13, color: chalk, flex: 1 }}>{p.player}</span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, color: col, fontVariantNumeric: "tabular-nums" }}>{p.n}</span>
            </div>
          ))
        ) : empty("No booking data recorded for 25/26.")}
      </ClubSection>

      {/* Squad */}
      <ClubSection title="Squad">
        {indexPlayers.length ? cardList(
          indexPlayers.map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderBottom: i < indexPlayers.length - 1 ? `1px solid ${faint}` : "none" }}>
              <Avatar player={p} size={40} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: chalk }}>{p.name}</div>
                <div style={{ fontSize: 12, color: dim }}>{p.pos} · {p.goals}g · {p.assists}a</div>
              </div>
              <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, color: ratingColor(p.rating), fontVariantNumeric: "tabular-nums" }}>{p.rating.toFixed(1)}</div>
            </div>
          ))
        ) : empty("No GIBSON Index players rated for this club yet.")}

        {scorers.length > 0 && (<>
          <div style={subhead}>Goals vs expected</div>
          {cardList(scorers.map((p, i) => {
            const diff = p.goals - p.xg;
            return (
              <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: i < scorers.length - 1 ? `1px solid ${faint}` : "none" }}>
                <span style={{ fontSize: 13, color: chalk, flex: 1 }}>{p.name}</span>
                <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums" }}>{p.goals}g / {p.xg.toFixed(1)} xG</span>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 14, minWidth: 44, textAlign: "right", color: diff >= 2 ? "#3DDC84" : diff <= -1 ? "#E8663C" : chalk, fontVariantNumeric: "tabular-nums" }}>{diff >= 0 ? "+" : "−"}{Math.abs(diff).toFixed(1)}</span>
              </div>
            );
          }))}
        </>)}

        <div style={subhead}>Treatment table</div>
        {injuries.length ? cardList(
          injuries.map((inj, i) => (
            <div key={inj.player} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderBottom: i < injuries.length - 1 ? `1px solid ${faint}` : "none" }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1 }}>{inj.player}</span>
              <span style={{ fontSize: 12, color: "#E8663C" }}>✚ {inj.injury}</span>
            </div>
          ))
        ) : empty("No current injuries — squad at full strength.")}
      </ClubSection>

      {/* Transfers */}
      <ClubSection title="Summer window 2026">
        {win ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[["→ In", win.ins, "#3DDC84"], ["← Out", win.outs, "#E8663C"]].map(([t, items, col]) => (
              <div key={t} style={{ ...SURFACE.flat, borderRadius: 12, padding: "10px 12px" }}>
                <div style={{ fontSize: 12, color: col, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>{t}</div>
                {items.length === 0 && <div style={{ fontSize: 12, color: dim, fontStyle: "italic" }}>None recorded</div>}
                {items.map(([p, place]) => (
                  <div key={p + place} style={{ marginBottom: 7 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: chalk, lineHeight: 1.3 }}>{p}</div>
                    <div style={{ fontSize: 12, color: dim }}>{place}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : empty("No confirmed window business recorded yet.")}
        {feed.length > 0 && (<>
          <div style={subhead}>In the transfer feed</div>
          <div style={{ display: "grid", gap: 8 }}>
            {feed.map((t) => {
              const meta = STATUS_META[t.status];
              return (
                <div key={t.id} style={{ ...SURFACE.card, borderLeft: `3px solid ${meta.color}`, borderRadius: 12, padding: "10px 13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15, color: chalk }}>{t.player}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: meta.color, textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>{meta.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: dim, marginTop: 4, lineHeight: 1.4 }}>{t.note}</div>
                </div>
              );
            })}
          </div>
        </>)}
      </ClubSection>

      {/* Fixtures — reuses the existing by-club fixtures view, locked to this club */}
      <ClubSection title="Fixtures · 26/27">
        <FixturesView key={club} fixedClub={club} />
      </ClubSection>

      {/* Honours */}
      <ClubSection title="Honours · league titles, last 12 seasons">
        {titles.length ? (
          <>
            <div style={{ fontSize: 13, color: chalk, marginBottom: 8 }}>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>{titles.length}</span> title{titles.length > 1 ? "s" : ""} since 2014/15
            </div>
            {cardList(titles.map((t, i) => (
              <div key={t.season} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 13px", borderBottom: i < titles.length - 1 ? `1px solid ${faint}` : "none" }}>
                <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 14, color: dim, width: 62, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{t.season}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1 }}>Champions 🏆</span>
                {t.note && <span style={{ fontSize: 12, color: "#FFB627" }}>{t.note}</span>}
              </div>
            )))}
          </>
        ) : empty("No league titles in the last 12 seasons.")}
      </ClubSection>
    </div>
  );
}

export default function App() {
  return (
    <TopBoundary>
      <AppShell />
    </TopBoundary>
  );
}

function AppShell() {
  const [tab, setTabState] = useState("home");
  const [matchesSub, setMatchesSub] = useState("table");
  const [statsSub, setStatsSub] = useState("lab");
  const [moreSub, setMoreSub] = useState("clubs");
  const [clubPage, setClubPage] = useState(null); // selected club code, or null

  // Any crest anywhere opens a club page; tapping a nav tab exits back to that tab.
  const openClub = (code) => { setClubPage(code); track("club_open", { club: code }); try { window.scrollTo(0, 0); } catch {} };
  const closeClub = () => setClubPage(null);

  // Wrap the tab setter so every switch — nav bar or in-app deep link — logs one event
  const setTab = (t) => {
    if (t !== tab) track("tab_switch", { tab: t });
    setClubPage(null);
    setTabState(t);
  };

  const goTo = (t, sub) => {
    if (t === "matches" && sub) setMatchesSub(sub);
    if (t === "stats" && sub) setStatsSub(sub);
    if (t === "more" && sub) setMoreSub(sub);
    setTab(t);
  };

  const tabs = [
    { id: "home", label: "Home" },
    { id: "matches", label: "Matches" },
    { id: "predictor", label: "Predictor 🎯" },
    { id: "stats", label: "Stats ⚡" },
    { id: "more", label: "More" },
  ];

  // Sliding active-tab pill: measured from the active button, animated via transform
  const tabRefs = useRef({});
  const [pill, setPill] = useState({ x: 0, y: 0, w: 0, h: 0 });
  useLayoutEffect(() => {
    const measure = () => {
      const b = tabRefs.current[tab];
      if (b) setPill({ x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [tab]);

  return (
    <ClubNavContext.Provider value={openClub}>
    <div style={{
      minHeight: "100vh", background: "radial-gradient(1200px 500px at 50% -10%, rgba(255,182,39,0.07), transparent), #0B1512",
      color: chalk, fontFamily: "'Barlow', sans-serif", padding: "0 0 40px",
    }}>
      <GlobalStyle />
      <header className="gb-header" style={{ padding: "22px 18px 14px", maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMark size={46} />
          <div style={{ flex: 1 }}>
            <h1 style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 38, letterSpacing: "0.04em",
              textTransform: "uppercase", lineHeight: 1,
              background: "linear-gradient(90deg, #EDF5EF, #FFB627)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Gibson</h1>
            <div style={{ fontSize: 12, color: dim, letterSpacing: "0.18em", textTransform: "uppercase", marginTop: 2 }}>
              The home of Irish League stats
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <a href={SOCIALS.x.url} target="_blank" rel="noopener noreferrer" aria-label={`GIBSON on X: ${SOCIALS.x.handle}`} style={{
              width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
              background: OVERLAY.fill, border: `1px solid ${faint}`, textDecoration: "none",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={chalk}>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a href={SOCIALS.tiktok.url} target="_blank" rel="noopener noreferrer" aria-label={`GIBSON on TikTok: ${SOCIALS.tiktok.handle}`} style={{
              width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
              background: OVERLAY.fill, border: `1px solid ${faint}`, textDecoration: "none",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill={chalk}>
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
          </div>
        </div>
        <nav className="gb-nav" style={{ display: "flex", gap: 6, marginTop: 16, flexWrap: "wrap", position: "relative" }} aria-label="Views">
          <div aria-hidden="true" style={{
            position: "absolute", top: 0, left: 0, borderRadius: 999, background: "#FFB627",
            width: pill.w, height: pill.h, transform: `translate(${pill.x}px, ${pill.y}px)`,
            transition: "transform 0.25s ease, width 0.25s ease", opacity: pill.w ? 1 : 0,
          }} />
          {tabs.map((t) => (
            <button key={t.id} ref={(el) => (tabRefs.current[t.id] = el)} className="gb-tab" onClick={() => setTab(t.id)} style={{
              position: "relative", padding: "8px 18px", borderRadius: 999, cursor: "pointer",
              fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase",
              background: "transparent",
              color: tab === t.id ? "#0B1512" : dim,
              border: `1px solid ${tab === t.id ? "transparent" : faint}`,
              transition: "color 0.2s ease",
            }}>{t.label}</button>
          ))}
        </nav>
      </header>

      <main className="gb-main" style={{ maxWidth: 760, margin: "0 auto", padding: "0 18px" }}>
        {clubPage ? (
          <GibsonBoundary key={`club-${clubPage}`}>
            <ClubPage club={clubPage} onBack={closeClub} />
          </GibsonBoundary>
        ) : (
        <GibsonBoundary key={tab}>
        {tab === "home" && <HomeView goTo={goTo} />}
        {tab === "matches" && (<>
          <SubNav items={[["table", "Table"], ["fixtures", "Fixtures"], ["europe", "Europe"]]} value={matchesSub} onChange={setMatchesSub} />
          {matchesSub === "table" && <TableView />}
          {matchesSub === "fixtures" && <FixturesView />}
          {matchesSub === "europe" && <EuropeView />}
        </>)}
        {tab === "predictor" && <PredictorView />}
        {tab === "stats" && (<>
          <SubNav items={[["lab", "Lab"], ["players", "Players"], ["duel", "Duel"]]} value={statsSub} onChange={setStatsSub} />
          {statsSub === "lab" && <StatsView />}
          {statsSub === "players" && <PlayersView />}
          {statsSub === "duel" && <DuelView />}
        </>)}
        {tab === "more" && (<>
          <SubNav items={[["clubs", "Clubs"], ["transfers", "Transfers"], ["history", "History"], ["support", "Support ♥"]]} value={moreSub} onChange={setMoreSub} />
          {moreSub === "clubs" && <ClubsGrid openClub={openClub} />}
          {moreSub === "transfers" && <TransfersView />}
          {moreSub === "history" && <HistoryView />}
          {moreSub === "support" && <SupportView />}
        </>)}
        </GibsonBoundary>
        )}
        <div style={{ textAlign: "center", padding: "26px 0 10px", fontSize: 12, color: "rgba(143,166,155,0.55)", letterSpacing: "0.12em", fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase" }}>
          GIBSON 1.07 · build 21 JUL · 🏆
        </div>
        <div style={{ textAlign: "center", padding: "0 0 14px" }}>
          <ReportLink />
        </div>
        <div style={{ textAlign: "center", padding: "0 0 24px", fontSize: 12, color: "rgba(143,166,155,0.55)", letterSpacing: "0.12em", fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase" }}>
          Unofficial fan project — not affiliated with the NIFL or any club · <a href="/privacy.html" style={{ color: "rgba(143,166,155,0.55)", textDecoration: "underline" }}>Privacy</a>
        </div>
      </main>
    </div>
    </ClubNavContext.Provider>
  );
}
