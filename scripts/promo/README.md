# Promo generators

Video generators rendering **1080x1920 (9:16) MP4s** for X and TikTok, plus two still sets:

| Script | Output | What it is |
|---|---|---|
| `render.mjs` | `gibson-season-launch.mp4` | Season-launch hype cut — the date, the twelve clubs, the champions, round one |
| `features.mjs` | `gibson-features.mp4` | Feature tour — nine cards showing what the app does, then what it deliberately doesn't have |
| `preview.mjs` | `gibson-preview-<h>-<a>.mp4` | Match preview — kick-off, last season, tale of the tape, team news, the call |
| `cards.mjs` | `gibson-card-*.png` | Five 1080x1350 stills: the round's fixtures, the headline tie, one number, the champions, the season |
| `goal.mjs` | `gibson-goal-<fixture>-<min>.jpg` | Live goal graphic — scorer, minute and the score as it stands, in the scoring club's colours |
| `status.mjs` | `gibson-<state>-<fixture>.jpg` | Half-time / full-time card — the state, the score, scorers, the ground across the top |
| `matchstats.mjs` | `gibson-stats-<fixture>-<title>.jpg` | Match stats card — possession, shots, corners and cards as split bars |
| `banner.mjs` | `gibson-x-banner-<w>x<h>.png` / `.jpg` | X header — the wordmark lockup and a twelve-club colour bar |
| `roundup.mjs` | `gibson-roundup-<state>-r<n>.jpg` | Multi-match round-up — every score in the round on one card |
| `motm.mjs` | `gibson-motm-<club>-<player>.jpg` | Man of the match — portrait, name, the line, the result |
| `poster.mjs` | `gibson-poster-<w>x<h>.png` / `.jpg` | Portrait season poster — headline type block, the season in four numbers, the twelve as a ranked list |

All share `kit.js`, the drawing kit (shields, the Gibson Cup mark, impact type, sweeps, grain).

## Running one

The two extra packages are **not** in `package.json` on purpose: `ffmpeg-static` is an ~80MB
binary and neither is needed to build or test the site, so leaving them out keeps CI installs
small. Install them on demand:

```bash
npm install --no-save ffmpeg-static @fontsource/barlow-condensed
node scripts/promo/render.mjs        # season launch
node scripts/promo/features.mjs      # feature tour
node scripts/promo/preview.mjs       # preview the current Predictor fixture
node scripts/promo/preview.mjs LIN BAL   # ...or any tie, by club code
node scripts/promo/cards.mjs         # five still cards for the next round
```

`cards.mjs` takes no arguments either: it finds the next round by kick-off time and shows
only that round's fixtures falling inside the coming week, so a game moved months ahead
(Larne v Bangor, shifted to September) doesn't appear on a matchday card. Set `NOW_MS` to
render as if it were another moment — useful for previewing next week's set early.

`preview.mjs` with no arguments previews the first fixture of the current `PREDICTOR_GW`, so
once the gameweek is rolled over it is a one-command job each week.

`poster.mjs` writes both a PNG (to print) and a JPEG (to post — the PNG is ~5MB, which phone
share sheets and some uploaders choke on). It defaults to 2000x2800; `POSTER_W=2480
POSTER_H=3508 node scripts/promo/poster.mjs` gives A4 at 300dpi. Everything is authored at
2000 wide and scales from `S = W/2000`, so any size holds its proportions.

## Goal graphics, mid-match

```bash
node scripts/promo/goal.mjs CLI "Ryan Curran" 23 1-0
node scripts/promo/goal.mjs CRU "Jordan Forsythe" 67 1-1 PEN
```

Club code of whoever scored, the scorer, the minute, the score home-first, and an optional
note (`PEN`, `OG`) that rides in the headline. Everything else — the fixture, the opponent,
both sets of colours, the ground, the round — is looked up from `data.js`. The fixture is
whichever of that club's unplayed games kicks off nearest to now, so mid-match it is the one
on the telly. `NOW_MS` overrides that for testing.

It refuses rather than guessing: unknown club, a minute outside 1–130, a scoreline that
doesn't parse, or a club with no unplayed fixture all exit with a message. A goal graphic
naming the wrong opponent is worse than no graphic, and nobody is checking one during a match.

The scoring club's colours carry the design and their side of the scoreline stays bright while
the other dims — that is the convention every club follows, and it is why a fan knows whose
goal it is before reading a word.

### Adding the scorer's photo

```bash
node scripts/promo/goal.mjs CLI "Ben Quinn" 11 1-0 "DEBUT GOAL" --photo=/path/to/headshot.jpg
```

The portrait is masked to a circle, and that mask is doing compliance work as well as design
work. A club headshot shows the shirt, and Irish League shirts carry bookmaker sponsors —
Cliftonville's is Sean Graham — which CLAUDE.md golden rule 2 keeps off anything GIBSON
publishes. The default crop (`0.125,0,0.75`, fractions of the image: x, y, side) frames head
and shoulders and stops above the front sponsor band, and the circular mask removes the
corners, which is where sleeve patches sit. Aim it at a different photo with `--crop`.

**Always look at the render before posting it.** The crop is a default, not a guarantee: a
photo framed differently can bring a sponsor back into shot, and no check in this repo can
see a logo.

A note containing the word GOAL replaces the headline rather than being appended to it, so
`"DEBUT GOAL"` reads as `DEBUT GOAL` and not `GOAL · DEBUT GOAL`. With a portrait the headline
and name share the left column and the minute disc hangs off the circle's lower-left; without
one they take the full width and the minute sits top-right.

## Half time and full time

```bash
node scripts/promo/status.mjs CLI HT 1-0 --home="Quinn 11'"
node scripts/promo/status.mjs CLI FT 2-1 --home="Quinn 11', Curran 78'" --away="Owens 62'"
node scripts/promo/status.mjs CLI HT 1-0 --home="Quinn 11'" --photo=/path/to/ground.jpg
```

Club, state (`HT`, `FT` or `KO`), score home-first. Scorer lines are free text under `--home`
and `--away` because they are editorial — nobody's goals are in `data.js` while the match is
still on — and they split on commas so a brace stacks instead of running off the card. The
panel grows to fit the deepest list, so a one-goal card isn't mostly empty panel. `KO` prints
"V" instead of a score.

`--photo` runs a ground shot across the top as a band, not full-bleed. A phone or drone shot is
usually around 800x600; covering 1080x1350 would mean upscaling past 2x and it goes to mush,
whereas a band is about 1.35x and holds. The lower edge fades into the card so the state
headline can straddle it.

Same warning as the goal portraits: **look at the render before posting.** Ground photography
picks up pitchside hoardings, and Irish League hoardings carry bookmakers. At band scale they
are normally an unreadable smear — verified on the Solitude shot by zooming the source before
using it — but a closer photo would not be, and nothing here can check that for you.

## Match stats

```bash
node scripts/promo/matchstats.mjs CLI "FIRST HALF" 1-0 \
  --stats="Possession,63,37,%;Total shots,4,7;Shots on target,2,5;Corners,1,0;Yellow cards,1,1"
```

Rows are `label,home,away[,suffix]` separated by semicolons, home first like every other
scoreline here. Up to seven; they share whatever height is left between the header rule and
the footer, so five breathe and seven still fit.

Bars are **gold for home, sky for away** rather than club colours, because two clubs can wear
the same one — Cliftonville against Crusaders is red against red. Same pairing the app's Duel
view uses, and each club name carries a rule beneath it in its bar colour, so the legend is
built in. The bigger number in each row is tinted; a 0-0 row leaves the track empty rather
than faking a split.

Percentage rows that don't total 100 stop the render. Transcribing numbers off a screenshot
mid-match is exactly where a digit gets fumbled, and a stats card that can't be trusted is
worse than no card.

## X banner

```bash
node scripts/promo/banner.mjs
node scripts/promo/banner.mjs --guides     # overlay the unsafe zones before redesigning it
```

1500x500. An X header is not a rectangle you can fill — the profile picture overlaps the
bottom-left corner and narrow viewports crop top and bottom, keeping roughly the middle band.
So the lockup sits right of the avatar and inside that band, and the corners carry texture
only: a ghost cup off the right edge, which is the first thing to get cropped.

The colour bar along the bottom is the twelve clubs in last season's finishing order, primary
over secondary, straight from `data.js` — so it reshuffles itself when the league does. It is
the only colour on the banner and is knocked back only slightly for that reason. It sits below
the safe band on purpose: it reads as a stripe whether or not a phone crops it.

`--guides` draws the avatar circle and the safe band so the next person editing this can see
what they're working around. It writes to its own filename, so a guide render can't be posted
by mistake.

## A whole round on one card

```bash
node scripts/promo/roundup.mjs HT "LIN 1-0 BAL" "CAR 0-0 POR" "DUN 2-1 COL" "GLE 1-1 LIM"
node scripts/promo/roundup.mjs FT "LIN 2-1 BAL" "CAR 0-0 POR"
```

`status.mjs` covers one match; this covers an afternoon. Six 3pm kick-offs is the normal shape
of a Saturday, so the half-time and full-time posts want every score on one card rather than
six cards nobody scrolls through. Up to six matches; rows are a fixed height and the block is
centred, so four don't stretch into tall empty panels. The leading club's name is lifted out of
the muted tone, so the card reads at a glance without doing the arithmetic.

**What the validation can and can't do.** Twelve clubs meeting three times means every ordered
pair happens at some point in a season, so "is this a real fixture?" cannot tell you a pairing
is wrong — it only rejects a club that isn't in the fixture list at all. The real work is done
by two other rules: each pairing resolves to the fixture **nearest today**, and a card whose
matches span more than one round is refused. Type one wrong pair on a Saturday and it lands in
a different round from its neighbours, and the render stops with both round numbers named. A
club appearing twice is refused for the same reason.

## The poster's headline

The headline is a named option rather than a literal, because it is the one part of the poster
that is a judgement call:

```bash
POSTER_HEADLINE=chase node scripts/promo/poster.mjs
```

| Key | Headline | Tone |
|---|---|---|
| `settle` *(default)* | 228 MATCHES / TO SETTLE IT. | The season at full size |
| `empty` | THE TABLE / IS EMPTY / AGAIN. | Sits directly above last season's finishing order, so the headline and the list argue with each other |
| `level` | EVERYBODY'S / TOP OF / THE LEAGUE. | The terrace joke on the morning of round one, when all twelve are level on nothing |
| `chase` | WHO TAKES IT / OFF LARNE? | The actual question of the season, and the one most likely to get a reply |
| `cup` | TWELVE CLUBS. / ONE CUP. | The original. Kept to compare against, not because it is any good |

The champion's name and the match count come from `data.js`, so no headline can go stale — `chase`
renames itself the season after somebody takes it off Larne. Each key writes its own file, so
variants don't overwrite each other.

Two rules keep the headline and the rest of the poster out of each other's way:

- **No number is printed twice.** A headline using a figure the four-number strip also carries
  (`settle` does) would waste a cell and read as a mistake, so the strip swaps that cell for the
  pre-split round count — the detail that explains why 38 and 228 are the right totals. Matching
  is whole-word, so a headline containing `228` doesn't knock out the cell reading `1`.
- **Type is sized by whichever runs out first**, the height of its zone or the width of the page,
  then hung from the floor of the zone. A three-line headline nearly fills the zone anyway; a
  two-line one is width-capped, and bottom-hanging drives it into the number strip and collects
  the slack at the top, where the ghost cup has room. Centring split that slack in two and left a
  gap above the strip that looked like an accident.

Two things in it are easy to get wrong if you edit it:

- **`FULL_TABLE` is in finishing order, not points order.** The league splits after round 33,
  so Carrick finished 7th on 53 points below Dungannon's 6th on 46. The array index is the
  position; re-sorting by `pts` would renumber half the league. A club missing from that
  table can only have come up, so it gets `NEW` rather than an invented finishing position —
  numbering Limavady 12th would be a fabricated stat.
- **The season is 38 rounds, not 33.** `FIXTURES_2627` holds only the pre-split phase, because
  the post-split fixtures don't exist until March. The poster adds `POST_SPLIT_DATES` to get
  38 rounds / 228 matches. A preflight throws if any round stops being `clubs / 2` matches,
  so the arithmetic can't quietly go wrong.

### Why the poster is drawn, not edited

It exists as an answer to the league's launch photograph, which GIBSON cannot use: the plinth
under the trophy carries two large bookmaker logos, they sit directly beneath the cup so no
crop removes them, and CLAUDE.md golden rule 2 keeps bookmaker branding off anything GIBSON
publishes. (It is also an NIFL press photo, which is a separate permission question.) So the
plinth here is ours and carries our name.

Videos land in `promo-out/` (gitignored). Override with `PROMO_OUT=/some/dir`.

Rendering takes a couple of minutes — every frame is drawn and encoded individually.

## Why the numbers are always right

**Nothing on screen is typed into these scripts.** They all import `data.js` and read the real
values — the season start date, the twelve clubs, the champions and their points, round one's
fixtures, player ratings, xG, transfers, capacity, travel miles. Change `data.js`, re-render,
and the video follows. That is the point: a promo that contradicts the app is exactly the kind
of wrong number CLAUDE.md's first golden rule exists to prevent.

Each script has a preflight that throws if any fact comes back missing, so a renamed export
fails the render loudly instead of quietly producing a video with a blank where a stat belongs.

`features.mjs` also carries a comment block mapping every claim it makes on screen
("works offline", "3 pts for an exact score", "no bookmakers") to the file that backs it up.
If you add a card, add its evidence line too.

## How it renders

Frames are drawn to a `<canvas>` in headless Chromium by a `draw(t)` function that is purely a
function of time — no CSS animation, no `requestAnimationFrame`. The renderer walks
`t = 0, 1/30s, 2/30s …`, pulls each frame out with `toDataURL` (faster than a screenshot) and
pipes the JPEG straight into ffmpeg's stdin. So:

- output is **deterministic** — the same commit renders the same video, frame for frame
- no intermediate frames ever touch disk
- retiming a section is just changing its duration constant

Timings are proportional to their section length, so raising `CARD` in `features.mjs` slows the
motion rather than leaving quick animations sitting on a longer hold.

## Editing

- **Pacing** — `INTRO`, `CARD`, `PLEDGE`, `OUTRO` in `features.mjs`; the `T` table in `render.mjs`
- **Which features appear** — the `CARDS` array in `features.mjs` (title, payoff line, accent, draw fn)
- **Which transfers appear** — `HEADLINE_IDS` in `features.mjs`. Pick ids whose `from`/`to` are
  both real clubs; some curated entries use `fromExternal` for a headline ("Triple swoop",
  "Window roundup") which would render as a club that doesn't exist
- **Colours and type** — `kit.js`, matching `src/lib/theme.js`

`preview.mjs` writes its own two editorial cards from the data rather than from hand-typed
copy: the "one number to know" card picks whichever side had the league's most eventful
matches (`GOALS_STATS.avg`), and the team-news card finds a departed top scorer via
`playerDeparture()`. Both therefore work for any tie without editing.

Home is drawn in gold and away in sky blue — the same pairing Duel uses — because two clubs
can wear the same colour (Cliftonville v Crusaders is red v red), so club colours alone
cannot carry a head-to-head.

## Odds on the preview card

`preview.mjs` shows the fixture's odds, which are **GIBSON estimates** from `data.js`, and
labels them on screen as estimates, informational only, not betting advice. Keep that
framing: a public video is the one place UK gambling-advertising rules bite hardest.
Never add a bookmaker name, logo, link or affiliate code to any of these scripts
(CLAUDE.md golden rule 2) — `scripts/verify.js` scans for bookmaker names, but it cannot
police a video file, so the guard here is the rule itself. To drop the card entirely,
remove the `odds` section from the timeline.

## Two things to know before posting

**No audio.** These render silent by design — add a trending sound in TikTok/CapCut, which the
algorithm favours anyway. Cuts land every 1.5–2s, so most tracks sync fine.

**Generated shields, not real crests.** Every one of these uses GIBSON's own shields for each club,
including clubs whose real crest ships in `public/crests/`. That is deliberate. The crest
permissions recorded in `CRESTS.md` are for *editorial and identification use* with *no implied
endorsement* — a promo ending on a gibsonstats.com call-to-action is marketing, which is a
different use. The generated shield carries no trademark, so it is safe in any context. Do not
swap real crests in here without permission that explicitly covers promotional use.

## Not wired into the build

Neither script runs during `npm run build`, in CI, or on deploy. They are run by hand when a
video is wanted, and they only ever write to `promo-out/`.
