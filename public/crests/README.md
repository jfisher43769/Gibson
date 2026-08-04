# Club crests

Real club crests, used **with the written permission of each club**.

## Naming

One file per club, named by its GIBSON club code, lowercase extension:

```
public/crests/GLE.png     → Glentoran
public/crests/LAR.png     → Larne
```

The codes are the keys of `CLUBS` in `data.js` (`LAR`, `COL`, `GLE`, `LIN`, `CLI`, `DUN`,
`BAL`, `POR`, `BAN`, `CAR`, `CRU`, `LIM`, plus archived `GLV`).

## How they get used

`src/components/Crest.jsx` looks for `/crests/{CODE}.png` at runtime. If it loads, the real
crest is shown; if it 404s, the generated shield is used instead. **Adding or removing a
club's crest is a file operation only — no code change anywhere.** Drop a PNG in here and
that club's crest appears everywhere a crest is drawn; delete it and the shield returns.

Crests are drawn at their natural aspect ratio inside a white rounded container, never
stretched, cropped or recoloured. The white container exists because most crests are
designed for light backgrounds and carry white or black detail that would disappear against
the app's dark green.

## Before adding a file here

**Permission must already be recorded in `CRESTS.md` at the repo root** — which club, who
granted it, when, and on what terms. A crest with no entry there is not permitted to ship,
and `scripts/verify.js` fails the build if one appears.

This is not a formality. These are trademarks owned by the clubs. GIBSON is an unofficial
fan project with no affiliation to the NIFL or any club, so every crest here is used by
explicit permission and on the terms the club set — typically editorial and identification
use only, unaltered, with no implied endorsement, revocable at any time.

If a club withdraws permission, delete the file. The shield takes over immediately and
nothing else needs touching.
