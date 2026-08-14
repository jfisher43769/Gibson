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
    .gb-tab:focus-visible, .gb-row:focus-visible, button:focus-visible, a:focus-visible { outline: 2px solid #FFB627; outline-offset: 2px; }

    /* Results rows: fixed tracks so the score column cannot drift between rows. The two name
       cells share what is left, and the long/short name pair below decides which one fits. */
    .gb-score-row { grid-template-columns: 46px minmax(0,1fr) 48px minmax(0,1fr) 18px; }
    .gb-nm-short { display: none; }
    @media (max-width: 560px) {
      .gb-score-row { grid-template-columns: 42px minmax(0,1fr) 44px minmax(0,1fr) 16px; }
      .gb-nm-full { display: none; }
      .gb-nm-short { display: inline; }
    }

    /* The nav is one scrolling row rather than a wrapping block: five pills do not fit 360px,
       and wrapping them cost a whole second row of height on the screen that can least afford
       it. Sticky because reaching the bottom of the results list used to mean scrolling all
       the way back up to change tab. */
    .gb-nav { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x proximity;
      -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .gb-nav::-webkit-scrollbar { display: none; }
    .gb-tab { scroll-snap-align: center; }
    .gb-navwrap { position: sticky; top: 0; z-index: 30;
      background: linear-gradient(180deg, #0B1512 72%, rgba(11,21,18,0.92) 100%);
      backdrop-filter: blur(6px); }

    /* A single scrolling row of crests. The club picker was a 2x6 grid that pushed the page
       30px wider than a 360px phone — the whole screen scrolled sideways because of it. */
    .gb-hscroll { display: flex; gap: 8px; overflow-x: auto; overflow-y: hidden;
      scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch;
      scrollbar-width: none; padding-bottom: 2px; }
    .gb-hscroll::-webkit-scrollbar { display: none; }
    .gb-hscroll > * { scroll-snap-align: start; flex: 0 0 auto; }

    /* The mark's base is three courses of winners' plaques stepping outward — a terrace in
       profile. Three hairlines at three widths says the same thing between sections, and
       nothing else in the app uses it. */
    .gb-steps { border: 0; height: 14px; margin: 18px auto; width: 100%; max-width: 190px;
      background:
        linear-gradient(#FFB627, #FFB627) center 0/100% 2px no-repeat,
        linear-gradient(#FFB627, #FFB627) center 6px/66% 2px no-repeat,
        linear-gradient(#FFB627, #FFB627) center 12px/34% 2px no-repeat;
      opacity: 0.3; }
    @media (min-width: 768px) {
      .gb-header, .gb-main { max-width: 820px !important; }
    }
    @media (min-width: 1100px) {
      .gb-header, .gb-main { max-width: 1020px !important; }
      .gb-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
      .gb-nav { margin-top: 0 !important; overflow: visible; }
      .gb-narrow { max-width: 780px; margin-left: auto; margin-right: auto; }
      .gb-desk-2col { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 22px; align-items: start; }
      .gb-desk-2col > div { margin-top: 0 !important; }
    }
  `}</style>
);
