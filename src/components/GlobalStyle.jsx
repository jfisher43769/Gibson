import React from "react";

/* ================= FONTS + GLOBAL ================= */
export const GlobalStyle = () => (
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
