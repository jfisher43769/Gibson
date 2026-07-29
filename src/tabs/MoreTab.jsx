import React, { useState } from "react";
import {
  ALL_TIME_TITLES, CLUBS, KOFI_URL, LEAGUE_LORE, RECORDS, ROLL_OF_HONOUR, SEASON_ARCHIVE, STATUS_META, SUPPORT_TIERS, TRANSFERS, WINDOW,
} from "../../data.js";
import { Crest } from "../components/Crest.jsx";
import { ExternalBadge } from "../components/ExternalBadge.jsx";
import { OVERLAY, SURFACE, chalk, dim, faint, rise } from "../lib/theme.js";
import { track } from "../lib/track.js";

export function ClubLedger() {
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

export function TransfersView() {
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

export function HistoryView() {
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

export function SupportView() {
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

// The twelve current Premiership clubs (excludes archived GLV).
export function ClubsGrid({ openClub }) {
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
