# GIBSON — Design System

Everything visual in the app is built from a small, fixed set of tokens defined at
the top of `App.jsx` (search `SHARED PIECES`). This note documents them so future UI
stays on-system. **When adding UI, reach for these first — don't invent a new
surface, size, or grey.** All content still lives in `data.js`; this file is about
how that content is *presented*.

## Colour

**Neutrals** (near-white on a dark green ground — the greys carry a slight green bias
on purpose, they're not pure greys):

| Token | Value | Use |
|---|---|---|
| page background | `#0B1512` | the app ground (set in `body` + the app-root radial) |
| `chalk` | `#EDF5EF` | primary text |
| `dim` | `rgba(237,245,239,0.7)` | secondary text, labels, captions |
| `faint` | `rgba(237,245,239,0.08)` | hairline borders |

**Brand accent** — amber. One hue, used for the single most important thing in any
view. Don't introduce a second accent.

| Value | Use |
|---|---|
| `#FFB627` | the accent — active nav, primary buttons, links, key figures |
| `#FFD873 → #FFA51F` | the amber gradient (logo mark, wordmark, share button) |

**Semantic colours** — meaning only, never decoration. These are *separate from the
accent*:

| Value | Meaning |
|---|---|
| `#3DDC84` green | good / win / positive |
| `#FFB627` amber | draw / caution (doubles as accent) |
| `#E8663C` orange | loss / danger / relegation *(shifted from red for red-green colour-blind separation — never use pure red)* |
| `#5EC8F2` blue | info / European qualification |
| `#8FA69B` muted | below-threshold / inactive |

Colour is never the sole carrier of meaning: form shows **W/D/L** letters, values
carry explicit **+/−** signs, and table states have text labels. Keep it that way.

## Surfaces

There are **exactly three** card treatments (`SURFACE`). Don't add a fourth or write
one-off backgrounds/borders:

- `SURFACE.flat` — transparent with a hairline border. Bordered lists.
- `SURFACE.card` — `rgba(240,255,245,0.03)` fill + hairline. The default panel.
- `SURFACE.hero` — amber diagonal gradient + hairline. A tab/section opener.

Spread them: `style={{ ...SURFACE.card, borderRadius: 12, padding: 14 }}`.

**Interactive chrome** (buttons, icon tiles) uses one fill token, `OVERLAY.fill`
(`rgba(240,255,245,0.06)`) — not an ad-hoc opacity. Card/hero backgrounds stay in
`SURFACE`; data-viz strokes and the CSS hover/scrollbar rules are deliberately
separate.

`borderRadius`: 10 (buttons), 12 (cards), 14 (large panels), 999 (pills).

## The signature element

Spend boldness in one place: the **Home "Next match" scoreboard** (`HomeView`). It's
the only element with its own bespoke treatment — a dark stadium-LED panel
(`linear-gradient(180deg,#0A140F,#060D0A)`, amber top-rule, inner glow, oversized
tabular numerals with a text-shadow, a one-time `boardFlicker` on load). It always
renders (Euro tie, else the Premiership opener). Everything else stays quiet so this
reads as special — don't give other cards a competing bespoke look.

## Type

Two families, loaded in `GlobalStyle`:

- **Barlow Condensed** (500–800) — display: the wordmark, headings, stat figures,
  labels, buttons. The app's voice.
- **Barlow** (400–700) — body / running text.

Scale (12 is the accessibility floor — never set text below it):

| px | role |
|---|---|
| 12 | labels, captions, footnotes |
| 13 | small / secondary body |
| 14 | body, list rows |
| 15 | button/control text |
| 16 | lead / emphasis |
| 20 | card & section titles |
| 24 / 26 | panel headings |
| 30 / 34 | large stat figures |
| 38 | header wordmark |
| 48 | scoreboard numerals |
| 120 | `PlayerDetail` background watermark |

Uppercase eyebrow labels use `letterSpacing: 0.14em` + `dim`. Any column of digits
gets `fontVariantNumeric: "tabular-nums"`.

## Spacing

Even steps only: **2 / 4 / 6 / 8 / 10 / 12 / 14 / 16 / 18 / 20 / 22 / 24**, applied
via flex/grid `gap` and margins. Tight 2–3px micro-spacing (form chips, label gaps)
is the one intentional exception. Lay groups out with `gap`, not stacked per-element
margins.

## Motion

Keyframes live in `GlobalStyle`; **all animation is disabled under
`prefers-reduced-motion`** via a global rule, so components don't need to check.

- `riseIn` — list/section entrance. Stagger rows with the `rise(i)` helper (~30ms per
  row, capped at 10).
- `boardFlicker` — the scoreboard's one-time load flicker (signature only).
- `livePulse` — the live-scores status dot. `shimmer` — skeleton loaders. `pop` /
  `ringDraw` / `bubblePop` — one-shot reveals on figures and charts.
- `useCountUp` / `<CountUp>` — count-up for the scoreboard date and Stats Lab
  figures; renders the final value immediately under reduced motion.

Transitions are short (0.12–0.25s ease). The active-nav pill slides via `transform`.

## Layout & responsiveness

Mobile-first (the owner is phone-only). Content column is centred and capped;
breakpoints widen it and enable desktop affordances (all in `GlobalStyle`):

- **≥768px** — column widens to 820px.
- **≥1100px** — column 1020px; header becomes a top bar; `.gb-desk-2col` puts paired
  sections two-up; `.gb-narrow` (780px) keeps text-heavy views readable.

## Resilience (part of the design)

- Two error boundaries render one shared `CrashScreen` ("GIBSON hit a post") — one
  voice. A pre-React `window.onerror` fallback in `index.html` mirrors it.
- Live-data fetches fail silently to saved `data.js` content with a quiet
  "Offline — showing saved data" note, never a broken or empty component.
- Absence is handled gracefully: sections hide when empty rather than showing blank
  headers; unverified numbers are omitted rather than faked.

## The one rule

Add UI by composing these tokens. If something seems to need a new surface, size,
grey, or accent, that's the signal to stop and reconsider — almost always one of the
above already fits. See `DESIGN-REVIEW.md` for how drift was found and corrected.
