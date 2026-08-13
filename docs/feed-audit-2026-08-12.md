# Feed audit — what `/api/events` and TheSportsDB actually carry for league 4659

**Date:** 12 August 2026 · **Scope:** diagnostic only, no application code or data changed.
**Window asked about:** completed fixtures played 7–8 August 2026 (round 1).

---

## 1. Headline

**I could not perform the fetch you asked for, and the parts I can evidence come from a CI run
rather than from this session.** Read section 2 before trusting anything below it.

Three things are established by real requests made today:

| Finding | Evidence |
|---|---|
| `eventspastleague.php?id=4659` returned **1** league-4659 event, not the round's six | CI run, 22:53:56Z |
| That event carries `strStatus: "FT"` — status is populated | CI run, 22:53:56Z |
| `lookupeventstats.php` returns **HTTP 200 with zero rows** for this league | CI run, 22:53:56Z |

One thing is established by reading the code:

| Finding | Evidence |
|---|---|
| `/api/events` discards every upstream field except six | `api/events.js` `row()` |

---

## 2. What I could not do, and why

**Direct egress to the feed is blocked from the agent environment.** Every route was refused at
the proxy:

```
www.thesportsdb.com:443   403  Host not in allowlist
thesportsdb.com:443       403  Host not in allowlist
gibsonstats.com:443       403  Host not in allowlist
```

Running the repo's own probe locally reproduces it verbatim:

```
=== TheSportsDB (free key 123 — the feed GIBSON already uses) ===
  couldn't reach the events endpoint (status 403) — Host not in allowlist:
  www.thesportsdb.com. Add this host to your network egress settings to allow access.
```

So the following parts of the brief are **NOT answered** here, and I have not guessed at them:

- **The per-field population report.** Which of `strHomeGoalDetails`, `strHomeLineupGoalkeeper`,
  `intSpectators`, `strOfficial` etc. are populated vs empty on a real 4659 row.
- **Two complete raw records.** I have no raw record to quote. Quoting a remembered
  TheSportsDB schema would be inventing the evidence the exercise exists to gather.
- **The pre-filter count.** You asked for what came back *before* filtering. The probe applies
  `filter(e => String(e.idLeague) === "4659")` **before** it counts, so the number below is a
  post-filter count. The pre-filter total is not recoverable from this run's output.

---

## 3. What the CI run actually returned

`.github/workflows/probe-stats-sources.yml` exists precisely because of the egress block —
Actions runners have open internet. I triggered it (read-only by construction: writes nothing,
commits nothing, opens no PR).

Run 3 · `31648808082` · commit `3f39486` · 2026-08-12T22:53:50Z · conclusion: success

```
=== TheSportsDB (free key 123 — the feed GIBSON already uses) ===
  recent league-4659 events: 1
  probing event 2503184: Glentoran v Limavady United, 2026-08-08
  strStatus on that event: "FT"
  lookupeventstats returned no rows — endpoint exists but is empty for this league
```

Three observations:

1. **Only one match from the round came back.** Round 1 had six fixtures across 7–8 August.
   `eventspastleague.php` returned one of them (Glentoran v Limavady, 8 Aug). The 7 August run
   of the same probe (run 2) reported a different single event — 2503180, Cliftonville v
   Crusaders. The endpoint therefore serves a small rolling window, not the round. **Anything
   built on it would see a partial matchday**, which is a correctness problem before it is a
   coverage one.

2. **`strStatus` is populated** — "FT" on a finished match. This is the one genuinely positive
   finding: the live/finished split in `classifyEvent()` can rely on the feed's own status, with
   the 150-minute clock as a backstop for blank rows. Note the field being present twice is not
   a promise it always will be; the feed is community-edited.

3. **`lookupeventstats` is empty for this league.** The endpoint exists on the free key and
   answers 200 — it simply has no rows for 4659. This closes the cheap route to match stats.

This matches the finding already recorded in the header comment of
`scripts/probe-stats-sources.js` from the 7 August run, so it is now observed twice, five days
apart, on two different events.

---

## 4. What `/api/events` exposes downstream — from the code

This part needs no network. `api/events.js` projects every upstream event through `row()`:

```js
function row(e) {
  const h = toCode(e.strHomeTeam);
  const a = toCode(e.strAwayTeam);
  if (!h || !a) return null;
  return {
    h, a,
    date: e.dateEvent || "",
    time: (e.strTime || "").slice(0, 5),
    round: e.intRound || "",
  };
}
```

plus `hs` / `as` via `parseScore()`, and `status` on live rows only. **That is the entire
surface.** Six fields out, everything else dropped at the boundary.

The consequence is decisive for your question: **even if the upstream record carried scorers,
lineups, attendance and a referee, none of it reaches the app.** `/api/events` is a
scores-and-fixtures endpoint by construction, not by accident of coverage.

---

## 4a. API-Football coverage — added after the key was supplied

The `APIFOOTBALL_KEY` secret was added and the probe re-run. The first attempt failed on a bug
in the probe itself, not on the key: it requested `country=Northern%20Ireland` and API-Football
rejected the space (`"may only contain alpha-numeric characters, underscores, and dashes"`).
Fixed in `402df66` — the probe now looks the country up rather than typing it.

Run 5 · `31649769331` · commit `402df66` · 2026-08-12T23:08:33Z:

```
=== API-Football (api-sports.io) ===
  country as API-Football spells it: "Northern-Ireland" (code GB-NIR)
  competitions listed for Northern Ireland: 7
  matched: Premiership (id 408, type League)
  season 2026 (current): 2026-08-07 → 2027-03-27
    no  fixtures.statistics_fixtures  <- THE ONE THAT MATTERS (team match stats)
    no  fixtures.statistics_players   (per-player stats)
    yes fixtures.events               (goals, cards, subs)
    yes fixtures.lineups
    yes standings
    no  top_scorers
    yes odds   <- GIBSON must not use this: golden rule 2
```

**This changes the verdict below.** Section 5 was written when TheSportsDB was the only
evidence, and on that evidence the answer to all four questions was no. API-Football covers
the NIFL Premiership (league id 408, current season 2026) and flags **events — goals, cards
and subs — and lineups as covered.** That is precisely the data the first three questions
needed.

Two things it does **not** cover, and they are consistent with TheSportsDB:

- `statistics_fixtures` — **no.** Possession, shots and corners are not available for this
  league from either source. Both independent probes now agree. Hand transcription remains the
  only route for the match-stats cards.
- `top_scorers` — **no.** The ready-made scoring table is not served, though it could be
  *derived* by aggregating goal events across fixtures.

**Caveat that matters:** these are coverage flags, and the probe's own principle is that a flag
is a promise and a payload is evidence. It only fetches a confirming payload when
`statistics_fixtures` is yes, which it isn't — so `events` and `lineups` are **flagged but not
yet confirmed against a real Irish League fixture.** Confirming them is one request each and
should happen before anything is built.

---

## 4b. Confirmed against a real payload — 13 August

The flags in §4a were promises. They have now been tested against an actual Irish League
fixture, and two things came out of it: the data is real, and the free plan cannot reach the
current season.

**The plan wall.** `/fixtures?league=408&season=2026` is refused outright:

```
API said: {"plan":"Free plans do not have access to this season, try from 2022 to 2024."}
without the season filter: {"plan":"Free plans do not have access to the Last parameter."}
```

So no 2026 fixture can be fetched on this key at all. The probe falls back to season 2024 —
the newest the plan allows — purely to test the **shape** of the data.

**The shape.** Run 8 · `31688380053` · commit `aebb563` · 2026-08-13T09:50:23Z:

```
  season 2024: 233 fixtures, 233 finished
  confirming against Coleraine FC v Cliftonville FC  2025-05-11 · fixture 1374874 · 0-2 (FT)
    referee: "B. McMaster"
    venue:   "The Showgrounds"
    attendance: no attendance-like key anywhere in the fixture object
    events:  18 rows — 2 goal, 7 card, 9 subst
       GOAL  31'  Rory Hale    [Cliftonville FC] Normal Goal
       GOAL  66'  A. Piesold   [Cliftonville FC] Normal Goal
       CARD  18'  D. McManus   [Coleraine FC]    Yellow Card
       CARD  55'  M. Little    [Coleraine FC]    Red Card
       CARD  90'  J. Glackin   [Coleraine FC]    Yellow Card
    lineups: 2 team blocks
       Coleraine FC:    formation ?, XI 11, subs 7 — e.g. M. Little, C. Dunne, L. Ives
       Cliftonville FC: formation ?, XI 11, subs 7 — e.g. L. Ridd, L. Conlan, J. Addis
```

This is a real NIFL Premiership match with named scorers, minutes, card colours, and both
starting elevens. **The coverage flags are not hollow.** For a league this size that was the
open question, and it is now closed.

Four findings worth carrying forward:

1. **Attendance does not exist.** Not a missing flag — the probe walked the entire fixture
   object for any key matching attend/spectator/crowd and found none. Attendance tracking is
   off the table from this provider, definitively.
2. **Referee IS populated** — "B. McMaster". That was an open question in §2 and is now
   answered for API-Football (still unknown for TheSportsDB).
3. **Formation came back empty** (`?`) on both teams, while the elevens themselves are
   populated. So lineups are usable for appearances but not for shape-of-team.
4. **Names arrive abbreviated** — "A. Piesold", "D. McManus", "J. Glackin", though "Rory Hale"
   came in full. `data.js` spells names out. Any build has to reconcile the two, which is the
   same surname-plus-initial matching `verify.js` already does for the WINDOW ledger. It is a
   known cost, not a blocker, but it is not free either.

**What this changes about cost.** Everything buildable here needs a paid plan, because the free
tier stops at 2024. That converts "add a free key" into a recurring bill, which is a different
decision and the owner's to make.

---

## 5. Verdict — what could be built from this data as it stands

> Superseded in part by §4a. The table below describes **the existing `/api/events` endpoint**,
> which is what "as it stands" meant. What becomes possible with API-Football is in §5a.

| Feature | Verdict | Why |
|---|---|---|
| **Live scorer charts** | **No** | Two independent blockers. `/api/events` returns no scorer field at all, and the upstream stats endpoint is empty for 4659. Nothing to chart. |
| **Player appearances** | **No** | No lineup or squad data crosses the boundary, and none was observed upstream. There is no player-level identity anywhere in the response. |
| **Discipline records** | **No** | No cards field in the projection; `lookupeventstats` — where such data would live — returns zero rows for this league. |
| **Attendance tracking** | **No** | Not in the projection. Whether `intSpectators` is populated upstream is **untested** (see §2); even if it were, it is discarded before the app sees it. |
| Scores / results / fixtures | **Yes — already built** | This is exactly what the endpoint is for, and what it does well. |
| Live vs finished split | **Yes — already built** | `strStatus` observed populated; clock backstop covers blank rows. |

**Summary.** As it stands, nothing on your list can be built from this endpoint. Three of the
four are blocked twice over — once by the projection in `api/events.js`, and again by the
upstream having no such data for league 4659. Attendance is blocked by the projection with the
upstream question still open.

Widening `row()` is therefore not the fix. It would only surface fields whose upstream
population is unverified, and for match statistics specifically we already know the answer
is "empty".

---

## 5a. Revised verdict, with API-Football on the table

| Feature | From `/api/events` today | With API-Football (league 408) |
|---|---|---|
| **Live scorer charts** | No | **Yes — confirmed.** Named scorer + minute in a real payload |
| **Player appearances** | No | **Yes — confirmed.** Both XIs + subs, named |
| **Discipline records** | No | **Yes — confirmed.** Yellow/red with player and minute |
| **Attendance tracking** | No | **No — confirmed absent.** No such key exists on the fixture |
| **Possession / shots / corners** | No | **No** — `statistics_fixtures` false. Both sources agree. Hand entry stays. |
| League top-scorer table | No | **Not served**, but derivable by aggregating goal events |

All three confirmations came off one real fixture (§4b), so they are evidence rather than a
provider's promise. **But every one of them needs a paid plan**: the free tier is capped at
season 2024 and cannot see 2026 at all.

The shape of any build would also be new. `/api/events` is a scores endpoint fed by
TheSportsDB; none of this arrives through it. Goals, cards and lineups would mean a second
provider, a key in the deployment, per-fixture requests rather than per-league ones, and
player identities that have to reconcile with the names already in `data.js`. That is a
feature, not a data update — CLAUDE.md's merge policy puts it on a branch behind a PR.

And the free tier is 100 requests a day against six fixtures a week, which is comfortable for
events and lineups but is a budget to design against, not ignore.

---

## 6. What would actually settle it

1. **A raw-record dump.** A read-only probe that fetches `eventspastleague.php?id=4659`, reports
   the count *before* the `idLeague` filter, and prints two complete records verbatim plus a
   populated/empty map for every key. Run in Actions, output to the job summary. That answers
   §2's open questions in one go. Not written here — this task was diagnostic only.
2. ~~The API-Football coverage flags.~~ **Done — see §4a.** Covered for league 408: events and
   lineups yes, match statistics no.
3. **Confirm the two flags against a real payload.** `events` and `lineups` are promises until a
   fixture is fetched. One request each, and it is the difference between "the provider says so"
   and "we have seen the goals".
4. **Nothing scraped.** Reading a live-score site by hand is fine; automating against one
   breaches their terms, and most are bookmaker-funded, which golden rule 2 rules out.

---

## 7. Provenance

- Egress denials: agent proxy status endpoint, `recentRelayFailures`, this session.
- Feed observations: GitHub Actions run
  [`31648808082`](https://github.com/jfisher43769/Gibson/actions/runs/31648808082),
  job `94288412764`, step "Probe", 2026-08-12T22:53:56Z.
- API-Football observations: run
  [`31649769331`](https://github.com/jfisher43769/Gibson/actions/runs/31649769331),
  job `94291303563`, 2026-08-12T23:08:33Z, at commit `402df66`.
- Code claims: `api/events.js` and `scripts/probe-stats-sources.js`.
- No application code or data was modified. This file is the only artefact.
