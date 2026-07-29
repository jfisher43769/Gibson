import React, { useState, useEffect } from "react";
import {
  CLUBS, CLUB_FIXTURES, EURO, EURO_COEFFICIENT, FINAL_PLACINGS, FIXTURES_2627, FULL_TABLE, LEAGUE_FACTS, MARKET_VALUES, MID_TABLE, POST_SPLIT_DATES, seasonLabel,
} from "../../data.js";
import { Crest } from "../components/Crest.jsx";
import { OddsDisclaimer, OddsStrip } from "../components/Odds.jsx";
import { OfflineNote } from "../components/OfflineNote.jsx";
import { Skel, SkelRows } from "../components/Skeleton.jsx";
import { OVERLAY, SURFACE, chalk, dim, faint, formColor, rise } from "../lib/theme.js";
import { LiveTeaser } from "../components/LiveTeaser.jsx";

export function TableView() {
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
          Sports Direct Premiership · {seasonLabel("FULL_TABLE")}
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
          bottom-six group). Verified.
        </div>
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
            Squad Market Values · {seasonLabel("MARKET_VALUES")} · Transfermarkt
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
                    <div style={{ width: `${Math.max((m.total / (MARKET_VALUES[0]?.total || 1)) * 100, 3)}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[m.club].colors[0]}, ${CLUBS[m.club].colors[0]}AA)`, borderRadius: 3 }} />
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
        Sports Direct Premiership · {seasonLabel("FULL_TABLE")}
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
          Squad Market Values · {seasonLabel("MARKET_VALUES")} · Transfermarkt
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
                  <div style={{ width: `${Math.max((m.total / (MARKET_VALUES[0]?.total || 1)) * 100, 3)}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[m.club].colors[0]}, ${CLUBS[m.club].colors[0]}AA)`, borderRadius: 3 }} />
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

export function EuropeView() {
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

export function FixturesView({ fixedClub } = {}) {
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
