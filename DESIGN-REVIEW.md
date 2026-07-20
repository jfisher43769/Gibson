# GIBSON — Design Review

Reviewed against `.claude/skills/frontend-design/SKILL.md` (fetched from
[anthropics/skills](https://github.com/anthropics/skills), `skills/frontend-design`).
Scope: `App.jsx` only, current state on `main`. No code was changed to produce this
review — findings only.

The skill's core test for an interface like this is: *"Spend your boldness in one
place, keep everything around it quiet."* Judged against that, and against its
guidance on type pairing, structure-as-information, deliberate motion, and writing
as design material, the app is disciplined in several real ways (a single `SURFACE`
token system, a real focus-visible/reduced-motion floor, a consistent uppercase
"eyebrow" label convention used 30+ times) but has drifted in the places below —
roughly in order of how much they cost the app.

---

## 1. The one signature element is invisible for most of the season

**Component:** `HomeView`, the "Next match" scoreboard hero (`App.jsx` ~L1830–1845).

This is the app's only genuine *signature element* in the skill's sense — oversized
tabular numerals, letterspaced club codes, a count-up, a one-time `boardFlicker`
entrance. It is exactly the kind of "hero as thesis" moment the skill asks for.

The problem: it only renders when `nextEuro[0]` exists —

```
const heroFix = nextEuro[0] || null;
```

`nextEuro` is built from clubs with an *unplayed, non-provisional* European fixture.
Irish League clubs are routinely out of Europe by late July/August. For the entire
domestic season (roughly September–May), `heroFix` is `null`, the hero block simply
doesn't render, and Home falls straight to a plain bordered list ("Next up") that
looks identical to a dozen other lists in the app. The "Euro Watch · still standing"
section a few lines below has the same problem and will also render empty.

**Cost:** the app's most distinctive design idea is a summer-only easter egg, not a
year-round identity. For most of the season Home has no hero at all — just an
eyebrow label and a bordered list, indistinguishable from Fixtures or Transfers.

---

## 2. The "hero" treatment is spent eight times, so nothing reads as special

**Component:** `SURFACE.hero` (`App.jsx` L56), used at L324 (Table), L489
(`PlayerDetail` header), L1252 (Predictor intro), L1360 (History "Gibson Cup" intro),
L1505 (Stats Lab intro), L1664 (Support intro), L1833 (Home scoreboard), L1892 (Home
Predictor card).

Consolidating every section-opening card onto one `SURFACE.hero` gradient was the
right move for *consistency* (see the skill's warning against one-off variants), but
it also means the one card in the app that's supposed to be a genuine signature
moment (the Home scoreboard, #1 above) is wearing the identical amber diagonal
gradient as the Stats Lab intro, the Support intro, the History intro, and five
others. Per the skill's own instruction — spend boldness in *one* place — the
scoreboard needs a treatment that doesn't already belong to seven other cards, or
the other seven need to be quieter than `hero`.

---

## 3. Two crash screens, two voices, one broken product

**Components:** `CrashScreen` (`App.jsx` L2055–2069, used by `TopBoundary`) vs. the
inline fallback inside `GibsonBoundary` (L2086–2099).

Both exist to catch the same category of failure and are shown to the same user in
the same session depending only on *where* the crash happened, yet they disagree on
every visible detail:

| | `CrashScreen` | `GibsonBoundary` inline |
|---|---|---|
| Emoji size | 44px | 40px |
| Heading | "GIBSON hit a post" | "VAR is checking something" |
| Heading size | 26px | 24px |
| Body copy | "Refresh to retry — if it keeps happening…" | "Something in the latest data update didn't parse. It's on us, not your phone…" |
| Button label | "Refresh to retry" | "Try again" |
| `fontFamily` string | `"'Barlow Condensed', sans-serif"` | `"'Barlow Condensed'"` (no fallback) |

Per the skill's writing guidance — *"errors don't apologize, and they are never vague
… the vocabulary of an interface is the signposting for someone navigating the
product"* — a user who trips the tab-level boundary and later trips the top-level
one (or reports a screenshot to `@GibsonStats`, per the new `ReportLink`) will see
what looks like two different apps failing in two different ways.

---

## 4. Type scale has no rhythm — 23 distinct sizes, one dominant catch-all

**Component:** all of `App.jsx`; representative sample via `fontSize:` literal count.

The file uses 23 distinct `fontSize` values (10, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16,
17, 18, 19, 20, 22, 24, 26, 30, 32, 34, 38, 40, 44, 48, plus the 120px `PlayerDetail`
watermark). Several are used exactly once or twice (18, 19, 32, 34, 38, 40, 44) with
no evident relationship to the sizes around them — not a ratio, not a shared
increment.

More significant: **`fontSize: 12` alone accounts for 180 of the file's ~380 sized
text elements** — eyebrow labels, secondary meta text, card body copy, footnotes,
and small stat captions are now visually the same size. This is a direct side
effect of the earlier "raise every font-size below 12 to 12" accessibility pass: it
fixed a real legibility floor, but it also erased the size distinction that used to
separate, e.g., a card's headline sub-text from its footnote. Weight and colour
(`chalk` vs `dim`) are now carrying hierarchy that size used to help with, and in
several places (e.g. `TransfersView` note text, `HistoryView` archive rows) two
adjacent pieces of text at different logical levels are set at the identical 12px.

---

## 5. Spacing has no base unit

**Component:** all of `App.jsx`; `gap`, `marginBottom`, `marginTop` literals.

Across `gap`, `marginBottom`, and `marginTop`, nearly every integer from 2 through 24
is used somewhere (2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 16, 18, 20, 22, 24…). There's
no consistent base unit (a 4px or 8px grid would collapse most of this to 6–8
values). The effect is subtle rather than glaring — nothing looks broken — but
spacing reads as "whatever looked right in the moment" rather than a rhythm, and it
makes the desktop two-column grid work (`gb-desk-2col`, added in the 1.06/desktop
pass) harder to keep visually aligned as more sections are added.

---

## 6. The near-white overlay token has ~10 unmanaged opacity steps

**Component:** every `rgba(240,255,245,0.0X)` / `rgba(237,245,239,0.0X)` literal
outside the `SURFACE` system — button fills (nav-arrow buttons, share/copy buttons,
social icons at L2175/L2183), dividers (L1584), skeleton loaders.

`SURFACE` disciplined *card* backgrounds into three treatments, but the same
near-white overlay is independently reused at 0.02, 0.03, 0.04, 0.05, 0.06, 0.07,
0.1, 0.12, 0.15, and 0.25 opacity for buttons and hairlines that sit outside that
system — and on top of that, two slightly different "white" base triples are in play
(`rgba(240,255,245,…)` for surfaces/buttons vs. `rgba(237,245,239,…)`, which is
`chalk`'s and `dim`'s own base). Neither is wrong on its own, but together they mean
a "quiet button fill" and a "card background" are visually almost, but not quite,
the same material, for no apparent reason.

---

## 7. Three adjacent warm colours carry three different meanings on one strip

**Component:** `TableView`, `noteColor` map (`App.jsx` L227):
`{ C: "#3DDC84", IC: "#5EC8F2", E: "#FFB627", EPO: "#5EC8F2", PO: "#E0A252", R:
"#E8663C" }`, rendered as the table row's left border colour.

The recent colour-vision-accessibility pass correctly moved danger states from red
to orange (`#E8663C`) so they'd read distinctly from the green states. But it left
`PO` (relegation play-off) at `#E0A252` — a third warm hue sitting almost exactly
between brand amber (`#FFB627`) and the new danger orange (`#E8663C`) on the hue
wheel. On the final table, three different left-border colours in the warm band
(`E`, `PO`, `R`) now carry three different meanings (safe Europe spot, play-off
danger, relegation) at a visual distance that's smaller than the gap the
colour-blindness pass just worked to create between green and orange elsewhere.

---

## 8. Three different phrasings for the same "see more" pattern, on one screen

**Component:** `HomeView` — "All fixtures →" (L1851, Title Case), "See all →"
(L1911, Sentence case), "more in History →" (L1934, lowercase-led). All three do the
same job (jump to a fuller list elsewhere in the app) and sit within one scroll of
each other on the same page.

The skill's writing section is explicit that vocabulary is signposting and
consistency is how people learn their way around an interface. A single convention
— pick one case and one shape ("See all fixtures →", "See all transfers →", "More
lore →") — would read as one design decision instead of three separate ones made at
three separate times (which, per the git history, is exactly what happened: each
was added in a different pass).

---

## 9. The header wordmark competes with the page's actual hero

**Component:** the `<header>` block (`App.jsx` ~L2159–2170) — the large
`linear-gradient(90deg, #EDF5EF, #FFB627)` "Gibson" title with letterspaced tagline
— rendered identically above *every* tab, including Home.

It's brand chrome, not content, but visually it's built exactly like a hero: large
Barlow Condensed display type, a gradient treatment, generous padding. On Home, a
user scrolls past one gradient-styled "hero-shaped" element (the header) to reach
the real one (the scoreboard, when it exists at all — see #1). On every other tab,
it's the only large gradient-text moment on the screen, which is fine on its own,
but it means the identical device is doing two jobs — "this is the app" (every tab)
and, incidentally, "this is the most important thing on this page" (visually, on
first paint, before any content loads) — for a piece of chrome that never changes.

---

## Summary

| # | Issue | Component | Severity |
|---|---|---|---|
| 1 | Signature hero absent outside Euro season | `HomeView` scoreboard | High |
| 2 | `SURFACE.hero` reused 8×, so nothing is bold | `SURFACE.hero` call sites | High |
| 3 | Two error screens disagree on voice & sizing | `CrashScreen` / `GibsonBoundary` | Medium–High |
| 4 | 23-size type scale, 180× flattened to 12px | global `fontSize:` usage | Medium |
| 5 | No spacing base unit | global `gap`/`margin` usage | Medium |
| 6 | Near-white overlay fragmented into ~10 steps | button/divider backgrounds | Low–Medium |
| 7 | Three warm hues too close on one meaning-strip | `TableView.noteColor` | Low–Medium |
| 8 | Three phrasings for one "see more" pattern | `HomeView` links | Low |
| 9 | Header wordmark visually competes with page hero | `<header>` | Low |
