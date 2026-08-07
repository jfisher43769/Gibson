import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import {
  SOCIALS,
} from "./data.js";
import { ClubPage } from "./src/club/ClubPage.jsx";
import { GibsonBoundary, TopBoundary } from "./src/components/Boundary.jsx";
import { BUILD_TIME, BuildStamp } from "./src/components/BuildStamp.jsx";
import { ClubNavContext } from "./src/components/Crest.jsx";
import { GlobalStyle } from "./src/components/GlobalStyle.jsx";
import { LogoMark } from "./src/components/LogoMark.jsx";
import { ReportLink } from "./src/components/ReportLink.jsx";
import { SubNav } from "./src/components/SubNav.jsx";
import { applyMeta, initialPath, pathForState, stateFromPath } from "./src/lib/routes.js";
import { OVERLAY, chalk, dim, faint } from "./src/lib/theme.js";
import { track } from "./src/lib/track.js";
import { HomeView } from "./src/tabs/HomeTab.jsx";
import { EuropeView, FixturesView, TableView } from "./src/tabs/MatchesTab.jsx";
import { ClubsGrid, HistoryView, SupportView, TransfersView } from "./src/tabs/MoreTab.jsx";
import { PredictorView } from "./src/tabs/PredictorTab.jsx";
import { DuelView, PlayersView, StatsView } from "./src/tabs/StatsTab.jsx";

// Brand glyphs for the header's social links, keyed to SOCIALS in data.js. The handles and
// URLs live in data.js because they are content; the paths live here because they are UI.
// Add a network to SOCIALS and it needs an entry in both maps — scripts/verify.js fails the
// build if it doesn't, so a new account can't ship as a blank square.
const SOCIAL_ICONS = {
  x: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  tiktok: "M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z",
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.325 6.162 6.162 0 0 0 0-12.325zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z",
};
const SOCIAL_NAMES = { x: "X", tiktok: "TikTok", instagram: "Instagram" };

export default function App() {
  return (
    <TopBoundary>
      <AppShell />
    </TopBoundary>
  );
}

function AppShell() {
  const init0 = stateFromPath(initialPath()); // deep-link support: open the right view on load
  const [tab, setTabState] = useState(init0.tab || "home");
  const [matchesSub, setMatchesSub] = useState(init0.matchesSub || "table");
  const [statsSub, setStatsSub] = useState(init0.statsSub || "lab");
  const [moreSub, setMoreSub] = useState("clubs");
  const [clubPage, setClubPage] = useState(init0.clubPage || null); // selected club code, or null

  // Keep the URL, title and meta in sync with the current view; push a history entry on
  // real navigation (path differs), stay put on back/forward (path already matches).
  useEffect(() => {
    const path = pathForState({ tab, matchesSub, statsSub, clubPage });
    try {
      if (typeof window !== "undefined" && window.location.pathname !== path) {
        window.history.pushState(null, "", path);
      }
    } catch {}
    applyMeta(path);
  }, [tab, matchesSub, statsSub, clubPage]);

  // Back/forward: map the popped URL back into app state.
  useEffect(() => {
    const onPop = () => {
      const s = stateFromPath(window.location.pathname);
      setClubPage(s.clubPage || null);
      if (s.tab) setTabState(s.tab);
      if (s.matchesSub) setMatchesSub(s.matchesSub);
      if (s.statsSub) setStatsSub(s.statsSub);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

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
      {/* Present on every route, invisible to users — the production canary reads this. */}
      <div data-testid="gibson-build-stamp" aria-hidden="true" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
        {`GIBSON-BUILD:${BUILD_TIME}`}
      </div>
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
            {Object.entries(SOCIALS).map(([key, { url, handle }]) => (
              <a key={key} href={url} target="_blank" rel="noopener noreferrer"
                aria-label={`GIBSON on ${SOCIAL_NAMES[key]}: ${handle}`} style={{
                  width: 34, height: 34, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
                  background: OVERLAY.fill, border: `1px solid ${faint}`, textDecoration: "none",
                }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={chalk} aria-hidden="true">
                  <path d={SOCIAL_ICONS[key]} />
                </svg>
              </a>
            ))}
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
        <BuildStamp />
        <div style={{ textAlign: "center", padding: "0 0 14px" }}>
          <ReportLink />
        </div>
        <div style={{ textAlign: "center", padding: "0 0 24px", fontSize: 12, color: "rgba(143,166,155,0.55)", letterSpacing: "0.12em", fontFamily: "'Barlow Condensed'", fontWeight: 700, textTransform: "uppercase" }}>
          Unofficial fan project — not affiliated with the NIFL or any club · <a href="/privacy.html" style={{ color: "rgba(143,166,155,0.55)", textDecoration: "underline" }}>Privacy</a> · <a href="/rss.xml" style={{ color: "rgba(143,166,155,0.55)", textDecoration: "underline" }}>RSS</a>
        </div>
      </main>
    </div>
    </ClubNavContext.Provider>
  );
}
