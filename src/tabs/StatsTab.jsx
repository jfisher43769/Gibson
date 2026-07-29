import React, { useState, useMemo } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from "recharts";
import {
  AXES, CLUBS, CLUB_META, DISCIPLINE, GOALS_LEAGUE_AVG, GOALS_STATS, INJURIES, PLAYERS, SEASON, TEAM_STATS_2526, TRAVEL, XG_PLAYERS, XG_TEAMS, liveSeasonId, seasonLabel, seasonStatus,
} from "../../data.js";
import { Avatar } from "../components/Avatar.jsx";
import { CountUp } from "../components/CountUp.jsx";
import { Crest } from "../components/Crest.jsx";
import { ReportLink } from "../components/ReportLink.jsx";
import { NoSeasonData, SeasonSwitch } from "../components/SeasonSwitch.jsx";
import { ShotMap } from "../components/ShotMap.jsx";
import { Sparkline } from "../components/Sparkline.jsx";
import { SURFACE, chalk, dim, faint, ratingColor, rise } from "../lib/theme.js";

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
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", padding: "6px 8px" }}>Skill Radar · {seasonLabel("PLAYERS")} · beta</div>
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

export function DuelView() {
  // Needs at least two rated players. After a season rollover PLAYERS is empty until the
  // new season's ratings land, so bail out cleanly instead of indexing into nothing.
  const [a, setA] = useState(() => PLAYERS[0]?.id ?? null);
  const [b, setB] = useState(() => PLAYERS[1]?.id ?? null);
  const pA = PLAYERS.find((p) => p.id === a);
  const pB = PLAYERS.find((p) => p.id === b);
  if (!pA || !pB) {
    return (
      <div className="gb-narrow" style={{ ...SURFACE.flat, borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
        <div style={{ fontSize: 26, marginBottom: 8 }}>⚔️</div>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 18, textTransform: "uppercase", color: chalk, marginBottom: 6 }}>Duel needs two rated players</div>
        <div style={{ fontSize: 13, color: dim, lineHeight: 1.5 }}>
          GIBSON Index ratings for {SEASON.current.display} arrive once the season is under way.
        </div>
      </div>
    );
  }
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
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", padding: "10px 12px 0" }}>Skill Radar · {seasonLabel("PLAYERS")}</div>
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

      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Tale of the tape · {seasonLabel("PLAYERS")}</div>
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

export function StatsView() {
  const status = seasonStatus();
  const [season, setSeason] = useState(status.defaultSeason);
  return (
    <div style={{ animation: "riseIn 0.4s ease-out" }}>
      <div style={{
        borderRadius: 14, padding: "16px", marginBottom: 16,
        ...SURFACE.hero,
      }}>
        <div style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 20, textTransform: "uppercase", color: chalk, lineHeight: 1.1 }}>
          The Stats Lab ⚡
        </div>
        <div style={{ fontSize: 12, color: dim, marginTop: 4 }}>
          {season === SEASON.current.id ? SEASON.current.display : `${SEASON.previous.display} · last season`} · verified team-level numbers
        </div>
      </div>
      <SeasonSwitch value={season} onChange={setSeason} status={status} />
      {season === liveSeasonId() && GOALS_STATS.length > 0 && TEAM_STATS_2526.length > 0
        ? <StatsBody />
        : <NoSeasonData status={status} what="Stats" seasonId={season} />}
      <TravelCard />
      <div style={{ marginTop: 16 }}><ReportLink /></div>
    </div>
  );
}

// Last season's completed team-level numbers. Split out of StatsView so the season
// selector can swap the whole body without nesting the entire view in a conditional.
function StatsBody() {
  // StatsView only renders this with data, but guard anyway — these `[0]` reads are what
  // crashed the build when a season rollover emptied the live arrays.
  const maxAvg = GOALS_STATS[0]?.avg || 1;
  const csSorted = [...GOALS_STATS].sort((x, y) => y.cs - x.cs).slice(0, 5);
  const maxGoals = TEAM_STATS_2526[0]?.goals || 1;
  return (
    <>
      <div className="gb-desk-2col">
      <div>
      <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>
        The Entertainment Index · goals per game in their matches · {seasonLabel("GOALS_STATS")}
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
          <div style={{ fontSize: 12, color: "#3DDC84", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>🧤 Clean sheet kings · {seasonLabel("GOALS_STATS")}</div>
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
        The xG Lab · expected goals per 90 · {seasonLabel("XG_TEAMS")}
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
        Clinical XI · goals vs expected goals · {seasonLabel("XG_PLAYERS")}
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
        Goals scored & possession · {seasonLabel("TEAM_STATS_2526")}
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
    </>
  );
}

// Longest away trips — derived from CLUB_META (Wikidata) coordinates + the 26/27 fixture
// list, so this is CURRENT-season data and sits outside the season selector's body: it's
// equally valid whichever season is selected. Empty state until CLUB_META has coordinates.
function TravelCard() {
  return (
      <div style={{ ...SURFACE.flat, borderRadius: 12, padding: "12px", marginTop: 16 }}>
        <div style={{ fontSize: 12, color: "#FFB627", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
          🚌 Longest away trips · 26/27
        </div>
        {(() => {
          const ranked = Object.entries(TRAVEL.clubs)
            .filter(([, t]) => t?.longestTrip)
            .sort((a, b) => b[1].longestTrip.miles - a[1].longestTrip.miles);
          if (!ranked.length) return <div style={{ fontSize: 12, color: dim, fontStyle: "italic" }}>Travel data not yet available.</div>;
          const maxMiles = ranked[0][1].longestTrip.miles;
          return (
            <div style={{ display: "grid", gap: 8 }}>
              {ranked.slice(0, 6).map(([code, t]) => (
                <div key={code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Crest club={code} size={18} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: chalk }}>{CLUBS[code].name} <span style={{ color: dim, fontWeight: 400 }}>to {t.longestTrip.opponent}</span></span>
                      <span style={{ fontFamily: "'Barlow Condensed'", fontWeight: 800, fontSize: 13, color: "#FFB627", fontVariantNumeric: "tabular-nums" }}>{t.longestTrip.miles} mi</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: faint, overflow: "hidden" }}>
                      <div style={{ width: `${(t.longestTrip.miles / maxMiles) * 100}%`, height: "100%", background: `linear-gradient(90deg, ${CLUBS[code].colors[0]}, ${CLUBS[code].colors[0]}AA)`, borderRadius: 3 }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })()}
        {TRAVEL.leagueAverageMiles && (
          <div style={{ fontSize: 12, color: dim, marginTop: 10 }}>League average season away miles: {TRAVEL.leagueAverageMiles.toLocaleString()}</div>
        )}
        <div style={{ fontSize: 11, color: "rgba(143,166,155,0.5)", marginTop: 6 }}>Straight-line distance from ground coordinates (Wikidata, CC0), not road/travel miles.</div>
      </div>
  );
}

export function PlayersView() {
  const status = seasonStatus();
  const [season, setSeason] = useState(status.defaultSeason);
  return (
    <div className="gb-narrow" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr)", gap: 18 }}>
      <SeasonSwitch value={season} onChange={setSeason} status={status} />
      {season === liveSeasonId() && PLAYERS.length > 0
        ? <PlayersBody />
        : <NoSeasonData status={status} what="Player stats" seasonId={season} />}

      {/* Treatment table — current injuries, not season-scoped, so it stays put whichever
          season is selected. */}
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
      <div style={{ marginTop: 4 }}><ReportLink /></div>
    </div>
  );
}

// Season-scoped player content: the GIBSON Index list, the selected player's detail card
// and the discipline leaders. Split out so the season selector swaps it as one unit.
function PlayersBody() {
  const [selected, setSelected] = useState(() => PLAYERS[0]?.id ?? null);
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
    <>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase" }}>GIBSON Index · {seasonLabel("PLAYERS")} · beta</div>
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
        <div style={{ fontSize: 12, color: dim, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Discipline card leaders · {seasonLabel("DISCIPLINE")}</div>
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
    </>
  );
}
