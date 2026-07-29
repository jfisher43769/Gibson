import React, { useState } from "react";
import {
  CLUBS, FULL_TABLE, PREDICTOR_GW, store,
} from "../../data.js";
import { Crest } from "../components/Crest.jsx";
import { OddsDisclaimer, OddsStrip } from "../components/Odds.jsx";
import { roundRect } from "../lib/canvas.js";
import { OVERLAY, SURFACE, chalk, dim, faint, rise } from "../lib/theme.js";
import { track } from "../lib/track.js";

// One-off pre-season prediction of the final 26/27 table. Saved to localStorage like
// the gameweek picks; submissions lock after 7 August 2026 (season start). No scoring
// logic yet — that ships at the season's end.
export const TABLE_KEY = "gibson-table-2627";

export const TABLE_LOCK = Date.parse("2026-08-08T00:00:00"); // locked once the date is after 7 Aug 2026

export function TablePredictor() {
  const CURRENT = Object.keys(CLUBS).filter((k) => k !== "GLV"); // twelve current clubs
  const lastRank = (k) => { const i = FULL_TABLE.findIndex((r) => r.club === k); return i < 0 ? 99 : i; };
  const DEFAULT_ORDER = [...CURRENT].sort((a, b) => lastRank(a) - lastRank(b)); // last season's finish, promoted club last
  const saved = (() => { try { return JSON.parse(store.get(TABLE_KEY)) || null; } catch { return null; } })();
  const savedValid = Array.isArray(saved?.order) && saved.order.length === CURRENT.length && CURRENT.every((k) => saved.order.includes(k));

  const [order, setOrder] = useState(savedValid ? saved.order : DEFAULT_ORDER);
  const [submitted, setSubmitted] = useState(!!saved?.submitted);
  const dateLocked = Date.now() >= TABLE_LOCK;
  const readOnly = dateLocked || submitted;

  const move = (i, dir) => {
    if (readOnly) return;
    setOrder((o) => {
      const j = i + dir;
      if (j < 0 || j >= o.length) return o;
      const n = [...o]; [n[i], n[j]] = [n[j], n[i]]; return n;
    });
  };
  const lockIn = () => { store.set(TABLE_KEY, JSON.stringify({ order, submitted: true })); setSubmitted(true); track("table_pick_saved", {}); };
  const editTable = () => { store.set(TABLE_KEY, JSON.stringify({ order, submitted: false })); setSubmitted(false); };

  const shareTable = () => {
    track("share_card_generated", { card: "table_2627" });
    const W = 1080, H = 1080;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d");
    const bg = ctx.createLinearGradient(0, 0, W, H); bg.addColorStop(0, "#10241B"); bg.addColorStop(1, "#0B1512");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, 300, 60, W / 2, 300, 620);
    glow.addColorStop(0, "rgba(255,182,39,0.12)"); glow.addColorStop(1, "rgba(255,182,39,0)");
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#EDF5EF"; ctx.font = "bold 78px 'Barlow Condensed','Arial Narrow',sans-serif";
    ctx.fillText("MY 26/27 TABLE", W / 2, 128);
    ctx.fillStyle = "#FFB627"; ctx.font = "bold 30px 'Barlow Condensed','Arial Narrow',sans-serif";
    ctx.fillText("GIBSON · PREDICT THE TABLE 🏆", W / 2, 178);
    const startY = 232, rowH = 62;
    order.forEach((code, i) => {
      const y = startY + i * rowH;
      if (i % 2 === 0) { ctx.fillStyle = "rgba(240,255,245,0.04)"; roundRect(ctx, 100, y, W - 200, 52, 12); ctx.fill(); }
      ctx.textAlign = "right";
      ctx.fillStyle = i === 0 ? "#3DDC84" : i >= 10 ? "#E8663C" : "#FFB627";
      ctx.font = "bold 36px 'Barlow Condensed','Arial Narrow',sans-serif";
      ctx.fillText(String(i + 1), 170, y + 38);
      ctx.textAlign = "left";
      ctx.fillStyle = "#EDF5EF"; ctx.font = "bold 34px 'Barlow Condensed','Arial Narrow',sans-serif";
      ctx.fillText(CLUBS[code].name.toUpperCase(), 205, y + 38);
    });
    ctx.textAlign = "center"; ctx.fillStyle = "#FFB627"; ctx.font = "bold 28px 'Barlow Condensed','Arial Narrow',sans-serif";
    let host = ""; try { host = window.location.host; } catch {}
    ctx.fillText("🏆 GIBSON · " + host, W / 2, H - 36);
    cv.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "gibson-my-table.png", { type: "image/png" });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "MY 26/27 TABLE" }); return; } } catch {}
      const url = URL.createObjectURL(blob);
      const aEl = document.createElement("a"); aEl.href = url; aEl.download = "gibson-my-table.png"; aEl.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }, "image/png");
  };

  const reorderBtn = (disabled) => ({
    width: 30, height: 28, borderRadius: 8, border: `1px solid ${faint}`, cursor: disabled ? "default" : "pointer",
    background: OVERLAY.fill, color: disabled ? dim : "#FFB627", fontSize: 14, fontWeight: 800, opacity: disabled ? 0.4 : 1,
  });
  const primaryBtn = { padding: "12px", borderRadius: 10, cursor: "pointer", background: "#FFB627", color: "#0B1512", border: "1px solid #FFB627", fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase" };
  const secondaryBtn = { padding: "12px", borderRadius: 10, cursor: "pointer", background: OVERLAY.fill, color: chalk, border: `1px solid ${faint}`, fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase" };
  const rankColor = (i) => (i === 0 ? "#3DDC84" : i >= 10 ? "#E8663C" : dim);

  // Locked, but nothing was submitted on this device — don't present the default order
  // as if it were the user's prediction.
  if (dateLocked && !savedValid) {
    return (
      <div style={{ ...SURFACE.hero, borderRadius: 14, padding: "16px", marginBottom: 18 }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
          Predict the Table · 26/27 🏆
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 4, lineHeight: 1.5 }}>
          Predictions are closed for 26/27 — no table was locked in on this device before the season started. Scoring lands at the season's end.
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...SURFACE.hero, borderRadius: 14, padding: "16px", marginBottom: 18 }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
        Predict the Table · 26/27 🏆
      </div>
      <div style={{ fontSize: 12, color: dim, marginTop: 4, lineHeight: 1.5 }}>
        {dateLocked
          ? "Predictions are closed for 26/27 — your table is locked and will be scored at the season's end."
          : submitted
            ? "Locked in. You can still edit until the season starts on 7 August."
            : "Order all twelve clubs into your predicted 1–12 finish. Locks when the season starts on 7 August; scored at the season's end."}
      </div>

      <div style={{ ...SURFACE.flat, borderRadius: 12, overflow: "hidden", margin: "12px 0" }}>
        {order.map((code, i) => (
          <div key={code} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
            borderBottom: i < order.length - 1 ? `1px solid ${faint}` : "none",
            background: i % 2 ? "transparent" : "rgba(240,255,245,0.02)",
          }}>
            <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: rankColor(i), width: 22, textAlign: "center", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            <Crest club={code} size={22} tappable={false} />
            <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0 }}>{CLUBS[code].name}</span>
            {!readOnly && (
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${CLUBS[code].name} up`} style={reorderBtn(i === 0)}>↑</button>
                <button onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`Move ${CLUBS[code].name} down`} style={reorderBtn(i === order.length - 1)}>↓</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: dateLocked ? "1fr" : "1fr 1fr", gap: 8 }}>
        {!dateLocked && (submitted
          ? <button onClick={editTable} style={secondaryBtn}>✏️ Edit table</button>
          : <button onClick={lockIn} style={primaryBtn}>🔒 Lock in my table</button>
        )}
        <button onClick={shareTable} style={secondaryBtn}>📸 Share my table</button>
      </div>
      <div style={{ fontSize: 12, color: dim, marginTop: 8, lineHeight: 1.5 }}>
        Saved on this device. No points yet — every prediction is scored against the real final table when the season ends.
      </div>
    </div>
  );
}

export function PredictorView() {
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
      <TablePredictor />
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
