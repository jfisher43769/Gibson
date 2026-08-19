import React from "react";
import {
  PLAYER_VALUES_2627, SEASON, TOP_SCORERS_2627, aggregateMatchStats, clubName, clubTopScorers,
  currentSeasonStats, ordinal, recordedCoverage, tableStage, valueLabel,
} from "../../data.js";
import { ClubRuns, LeagueRuns } from "./Runs.jsx";
import { OpponentSplit } from "./OpponentSplit.jsx";
import { Crest } from "./Crest.jsx";
import { SURFACE, chalk, dim, faint } from "../lib/theme.js";

// "26/27 so far" — the new season's numbers from the moment there is one result, without
// waiting for the curated season blocks that don't exist until well into a campaign.
//
// Two kinds of number live here and they are treated differently:
//
//   Derived (points per game, clean sheets, home/away, goals per game) come from the results
//   themselves. They are complete by construction — if a match is recorded, it is in them.
//
//   Recorded (possession, shots) are typed in by hand after a match, and not every match gets
//   written up. Any TOTAL across them would flatter whoever happened to be recorded, so that
//   section only appears once coverage is complete. Partial data presented as a total is the
//   wrong-number problem golden rule 1 exists to prevent, and it is worse than showing nothing
//   because it looks authoritative.
//
// Top scorers come from TOP_SCORERS_2627, a sourced chart — NOT from totalling MATCH_EVENTS.
// That distinction is the whole point: match graphics aren't made for every game, so our own
// goal records are always a subset and a table built from them would understate everyone whose
// goals went unrecorded. A published chart has no such hole. The per-match records stay in
// data.js for the graphics; they are still never summed into a league table.

const label = { fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 };

// Both lists here printed the raw three-letter code — "LIN" where the row had room for
// "Linfield". The codes are an internal key, not something a reader should have to decode, and
// every other list in the app names the club. Same long/short pair the results rows use, so a
// narrow screen gets the real short name rather than a truncation.
function ClubName({ club }) {
  return (
    <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0, whiteSpace: "nowrap" }}>
      <span className="gb-nm-full">{clubName(club)}</span>
      <span className="gb-nm-short">{clubName(club, { short: true })}</span>
    </span>
  );
}

function Stat({ value, unit, name }) {
  return (
    // Sizing lives on .gb-stat-row, not here: a min-width on the tile is what produced the
    // 3 + 1 wrap this used to try to tune its way out of. The grid decides the columns.
    <div style={{ ...SURFACE.card, borderRadius: 12, padding: "12px 10px", minWidth: 0 }}>
      <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 28, color: "#FFB627", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}<span style={{ fontSize: 15, color: dim }}>{unit || ""}</span>
      </div>
      <div style={{ fontSize: 11, color: dim, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 5, lineHeight: 1.3 }}>{name}</div>
    </div>
  );
}

// The league's scoring chart. Exported because the Stats Lab and the Players page both want it
// and a component defined twice is how the two start disagreeing — the Players page in
// particular had no current-season content at all while this sat one tab away.
export function LeadingScorers({ limit }) {
  const rows = limit ? TOP_SCORERS_2627.slice(0, limit) : TOP_SCORERS_2627;
  if (rows.length === 0) return null;
  return (
    <div data-leading-scorers style={{ marginBottom: 18 }}>
      <div style={{ ...label, marginTop: 4 }}>Leading scorers · {SEASON.current.display}</div>
      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
        {rows.map((p, i) => (
          <div key={p.player} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
            borderBottom: i < rows.length - 1 ? `1px solid ${faint}` : "none",
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 14, color: dim,
              width: 16, textAlign: "center", fontVariantNumeric: "tabular-nums",
            }}>{i + 1}</span>
            <Crest club={p.club} size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.player}</span>
            <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {p.apps} app{p.apps === 1 ? "" : "s"}
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17, color: "#3DDC84",
              fontVariantNumeric: "tabular-nums", width: 22, textAlign: "right",
            }}>{p.goals}</span>
          </div>
        ))}
      </div>
      {/* Said plainly, because a top ten cut off at ten says nothing about number eleven. */}
      <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
        The top of the chart, not all of it — via Transfermarkt.
      </div>
    </div>
  );
}

// The league's most valuable players, from Transfermarkt's current chart. Sits beside the
// scoring chart on the Players page: one says who is scoring, the other who is worth most, and
// they rarely agree — which is the interesting part.
export function MostValuable({ limit }) {
  const rows = limit ? PLAYER_VALUES_2627.slice(0, limit) : PLAYER_VALUES_2627;
  if (rows.length === 0) return null;
  return (
    <div data-most-valuable style={{ marginBottom: 18 }}>
      <div style={{ ...label, marginTop: 4 }}>Most valuable · {SEASON.current.display}</div>
      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
        {rows.map((p, i) => (
          <div key={p.player} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
            borderBottom: i < rows.length - 1 ? `1px solid ${faint}` : "none",
          }}>
            <span style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 700, fontSize: 14, color: dim,
              width: 16, textAlign: "center", fontVariantNumeric: "tabular-nums",
            }}>{i + 1}</span>
            <Crest club={p.club} size={20} />
            <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.player}</span>
            <span style={{ fontSize: 12, color: dim, whiteSpace: "nowrap" }}>{p.pos}</span>
            <span style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: "#FFB627",
              fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap",
            }}>{valueLabel(p.value)}</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
        The top of the list, not all of it — via Transfermarkt.
      </div>
    </div>
  );
}

export function SeasonSoFar() {
  const s = currentSeasonStats();
  if (!s.matches) return null;                     // nothing has been played; say nothing

  const cover = recordedCoverage();
  const byPpg = [...s.clubs].filter((c) => c.p > 0).sort((a, b) => b.ppg - a.ppg || b.gd - a.gd);
  const teamStats = cover.statsComplete ? aggregateMatchStats().slice(0, 6) : [];
  const g = s.league;

  return (
    // data-season-sofar is the browser harness's handle on this panel — it asserts the current
    // season's numbers actually reach the page, which a green build cannot tell you.
    <div data-season-sofar style={{ marginBottom: 18 }}>
      <div style={label}>{SEASON.current.display} so far · {s.matches} match{s.matches === 1 ? "" : "es"}</div>

      <div className="gb-stat-row" style={{ marginBottom: 12 }}>
        <Stat value={g.avgGoals} name="Goals per game" />
        <Stat value={g.o25Pct} unit="%" name="Over 2.5" />
        <Stat value={g.btsPct} unit="%" name="Both scored" />
        <Stat value={g.homeWinPct} unit="%" name="Home wins" />
      </div>

      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
        {byPpg.map((c, i) => (
          <div key={c.club} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
            borderBottom: i < byPpg.length - 1 ? `1px solid ${faint}` : "none",
          }}>
            <Crest club={c.club} size={20} />
            <ClubName club={c.club} />
            <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {c.gf}–{c.ga} · {c.cs} CS
            </span>
            <span style={{
              fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17, color: chalk,
              fontVariantNumeric: "tabular-nums", width: 42, textAlign: "right",
            }}>{c.ppg}</span>
            <span style={{ fontSize: 11, color: dim, letterSpacing: "0.08em", textTransform: "uppercase" }}>ppg</span>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 12, color: dim, lineHeight: 1.5, marginBottom: teamStats.length ? 16 : 0 }}>
        Derived from every recorded result — points per game, clean sheets and goal rates need
        nothing but the scorelines, so they are complete for the {s.matches} match{s.matches === 1 ? "" : "es"} played.
      </div>

      <LeagueRuns />

      <OpponentSplit />

      <LeadingScorers />

      {teamStats.length > 0 && (<>
        <div style={{ ...label, marginTop: 4 }}>Possession &amp; shooting · per match</div>
        <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
          {teamStats.map((t, i) => (
            <div key={t.club} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
              borderBottom: i < teamStats.length - 1 ? `1px solid ${faint}` : "none",
            }}>
              <Crest club={t.club} size={20} />
              <ClubName club={t.club} />
              <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                {t.shots ?? "—"} shots{t.accuracy === null ? "" : ` · ${t.accuracy}% on target`}
              </span>
              <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>
                {t.poss === null ? "—" : `${t.poss}%`}
              </span>
            </div>
          ))}
        </div>
      </>)}

      {/* Say why a section is missing rather than leaving a silent gap — an absent top-scorer
          table with no explanation reads as a bug rather than as a deliberate omission. */}
      {!cover.statsComplete && (
        <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
          Possession and shooting are entered by hand and cover {cover.stats} of the {cover.played}{" "}
          match{cover.played === 1 ? "" : "es"} played. Averages appear once every match has been
          written up — figures built from some of the games would flatter whoever happened to be
          recorded.
        </div>
      )}
    </div>
  );
}

// The same numbers, for one club.
//
// The club page had no current-season stats at all: its Season section is gated on the curated
// exports (XG_TEAMS, TEAM_STATS_2526 and friends), which are hand-compiled and do not exist
// until well into a campaign, so picking 2026/27 on any club page returned "no stats yet" while
// the Stats tab was showing 2026/27 numbers two taps away. An app disagreeing with itself about
// whether data exists is worse than an app that has none.
//
// So the rule is the one the Stats tab already follows, applied here: derived numbers appear
// from the first result and sit ABOVE the season switch, because they are the only current-
// season figures there are and burying them under a control that defaults to last season would
// hide them. Recorded numbers (possession, shooting) still wait for complete coverage.
//
// Every figure below comes from the same currentSeasonStats() the league view uses, filtered —
// so a club page and the Stats tab cannot report different numbers for the same club.
export function ClubSeasonSoFar({ club }) {
  const s = currentSeasonStats();
  if (!s.matches) return null;

  // s.clubs is built from currentTable(), so its order IS the league table order.
  const idx = s.clubs.findIndex((c) => c.club === club);
  const c = idx >= 0 ? s.clubs[idx] : null;
  if (!c || !c.p) return null;                     // club exists but hasn't played yet

  const stage = tableStage();
  const cover = recordedCoverage();
  const mine = cover.statsComplete ? aggregateMatchStats().find((t) => t.club === club) : null;
  const scorers = clubTopScorers(club);
  const gdSign = c.gd > 0 ? "+" : c.gd < 0 ? "−" : "";

  // Home and away read as one row each rather than a grid of tiles: with two or three games
  // played the interesting thing is the shape of the split, not a precise rate.
  const Split = ({ name, side }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px", borderTop: `1px solid ${faint}` }}>
      <span style={{ fontSize: 12, color: dim, letterSpacing: "0.1em", textTransform: "uppercase", width: 52 }}>{name}</span>
      <span style={{ fontSize: 13, color: chalk, flex: 1, fontVariantNumeric: "tabular-nums" }}>
        {side.p} played · {side.w}-{side.d}-{side.l}
      </span>
      <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{side.gf}–{side.ga}</span>
      <span style={{
        fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 16, color: chalk,
        fontVariantNumeric: "tabular-nums", width: 26, textAlign: "right",
      }}>{side.pts}</span>
    </div>
  );

  return (
    <div data-club-sofar={club} style={{ marginBottom: 18 }}>
      <div style={label}>
        {SEASON.current.display} so far{stage ? ` · ${stage.complete ? "after " : ""}round ${stage.round}` : ""}
      </div>

      <div className="gb-stat-row" style={{ marginBottom: 12 }}>
        <Stat value={ordinal(idx + 1)} name="Position" />
        <Stat value={c.pts} name="Points" />
        <Stat value={c.ppg} name="Per game" />
        <Stat value={`${gdSign}${Math.abs(c.gd)}`} name="Goal diff" />
      </div>

      <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 13px" }}>
          <Crest club={club} size={20} tappable={false} />
          <span style={{ fontSize: 13, color: chalk, flex: 1, fontVariantNumeric: "tabular-nums" }}>
            {c.p} played · {c.w}-{c.d}-{c.l}
          </span>
          <span style={{ fontSize: 12, color: dim, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
            {c.gf}–{c.ga} · {c.cs} CS
          </span>
        </div>
        {c.home.p > 0 && <Split name="Home" side={c.home} />}
        {c.away.p > 0 && <Split name="Away" side={c.away} />}
      </div>

      {/* Rates are shares of THIS club's games, not of the league's — worth saying, because
          "50% over 2.5" off two matches is one match and reads like a season-long tendency. */}
      <div style={{ fontSize: 12, color: dim, lineHeight: 1.5, marginBottom: mine ? 16 : 0 }}>
        {c.o25Pct}% of their matches went over 2.5 goals, both sides scored in {c.btsPct}%, and they
        kept a clean sheet in {c.csPct}%. Derived from the {c.p} match{c.p === 1 ? "" : "es"} they have
        played — scorelines are all these need, so they are complete rather than sampled.
      </div>

      <ClubRuns club={club} />

      {scorers.length > 0 && (<>
        <div style={{ ...label, marginTop: 4 }}>On the scoresheet</div>
        <div style={{ ...SURFACE.flat, borderRadius: 14, overflow: "hidden", marginBottom: 10 }}>
          {scorers.map((p, i) => (
            <div key={p.player} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "9px 13px",
              borderBottom: i < scorers.length - 1 ? `1px solid ${faint}` : "none",
            }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: chalk, flex: 1, minWidth: 0,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.player}</span>
              <span style={{ fontSize: 12, color: dim, whiteSpace: "nowrap" }}>{p.pos}</span>
              <span style={{
                fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 17, color: "#3DDC84",
                fontVariantNumeric: "tabular-nums", width: 22, textAlign: "right",
              }}>{p.goals}</span>
            </div>
          ))}
        </div>
        {/* An absent club has nobody in the league's top ten — which is not the same as nobody
            having scored, so this only ever appears when there IS someone. */}
        <div style={{ fontSize: 12, color: dim, lineHeight: 1.5, marginBottom: mine ? 16 : 0 }}>
          Their players in the league's leading scorers — via Transfermarkt.
        </div>
      </>)}

      {mine && (<>
        <div style={{ ...label, marginTop: 4 }}>Possession &amp; shooting · per match</div>
        <div className="gb-stat-row" style={{ marginBottom: 10 }}>
          <Stat value={mine.poss === null ? "—" : mine.poss} unit={mine.poss === null ? "" : "%"} name="Possession" />
          <Stat value={mine.shots ?? "—"} name="Shots" />
          <Stat value={mine.sot ?? "—"} name="On target" />
          <Stat value={mine.accuracy === null ? "—" : mine.accuracy} unit={mine.accuracy === null ? "" : "%"} name="Accuracy" />
        </div>
      </>)}

      {!cover.statsComplete && (
        <div style={{ fontSize: 12, color: dim, lineHeight: 1.5 }}>
          Possession and shooting are entered by hand and cover {cover.stats} of the {cover.played}{" "}
          match{cover.played === 1 ? "" : "es"} played league-wide. Per-club averages appear once every
          match has been written up.
        </div>
      )}
    </div>
  );
}
