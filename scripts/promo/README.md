# Promo video generators

Two social-video generators that render **1080x1920 (9:16) MP4s** for X and TikTok:

| Script | Output | What it is |
|---|---|---|
| `render.mjs` | `gibson-season-launch.mp4` | Season-launch hype cut — the date, the twelve clubs, the champions, round one |
| `features.mjs` | `gibson-features.mp4` | Feature tour — nine cards showing what the app does, then what it deliberately doesn't have |

Both share `kit.js`, the drawing kit (shields, the Gibson Cup mark, impact type, sweeps, grain).

## Running one

The two extra packages are **not** in `package.json` on purpose: `ffmpeg-static` is an ~80MB
binary and neither is needed to build or test the site, so leaving them out keeps CI installs
small. Install them on demand:

```bash
npm install --no-save ffmpeg-static @fontsource/barlow-condensed
node scripts/promo/render.mjs      # season launch
node scripts/promo/features.mjs    # feature tour
```

Videos land in `promo-out/` (gitignored). Override with `PROMO_OUT=/some/dir`.

Rendering takes a couple of minutes — every frame is drawn and encoded individually.

## Why the numbers are always right

**Nothing on screen is typed into these scripts.** Both import `data.js` and read the real
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

## Two things to know before posting

**No audio.** These render silent by design — add a trending sound in TikTok/CapCut, which the
algorithm favours anyway. Cuts land every 1.5–2s, so most tracks sync fine.

**Generated shields, not real crests.** Both videos use GIBSON's own shields for every club,
including clubs whose real crest ships in `public/crests/`. That is deliberate. The crest
permissions recorded in `CRESTS.md` are for *editorial and identification use* with *no implied
endorsement* — a promo ending on a gibsonstats.com call-to-action is marketing, which is a
different use. The generated shield carries no trademark, so it is safe in any context. Do not
swap real crests in here without permission that explicitly covers promotional use.

## Not wired into the build

Neither script runs during `npm run build`, in CI, or on deploy. They are run by hand when a
video is wanted, and they only ever write to `promo-out/`.
