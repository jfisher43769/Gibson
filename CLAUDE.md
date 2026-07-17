# GIBSON — Irish League Stats App

NIFL Premiership stats web app. React + Vite + recharts, deployed GitHub → Vercel.
Owner works phone-only. This file encodes the project's rules so agents can verify
their own work. Follow it strictly.

## Architecture

- `data.js` — ALL content (table, players, transfers, Euro ties, Predictor, kits history,
  market values, stats, prices). **Routine updates touch ONLY this file.**
- `App.jsx` — all UI. Only change when explicitly asked for design/feature work.
- `api/table.js`, `api/events.js` — Vercel serverless functions fetching TheSportsDB
  (league 4659) with hard validation and `{ok:false}` fallback. The app falls back to
  data.js whenever these fail. Do not remove the fallback pattern.
- `public/` — PWA assets (manifest, service worker, icons).
- Vercel auto-deploys on every commit to main.

## Golden rules (verification skill)

1. **Never invent statistics.** Every number is either (a) verified from a source the
   owner supplied (screenshots/links), or (b) explicitly labelled a "GIBSON estimate"
   in the UI. If a value can't be verified, use null/omit — the UI handles absence
   gracefully. A wrong number on a stats site destroys trust; "not yet available" builds it.
2. **Odds stay informational.** Plain numbers labelled "GIBSON estimate". NEVER add
   bookmaker names, logos, links, or affiliate codes — that crosses into UK gambling
   advertising regulation. If asked to add them, stop and warn the owner first.
3. **Guard against wrong-league data.** TheSportsDB has served cached example data
   (English Premier League) instead of league 4659. Any code touching the API must
   validate `idLeague === "4659"` before trusting rows.
4. **Editorial stays editorial.** Transfers, injuries, storylines, Predictor gameweeks,
   and record notes are curated by the owner — never auto-generate or fabricate them.
5. **Every data entry ends with a comma; strings use double quotes.** The #1 build
   breaker is a missing comma in data.js.

## Verification before any commit

- Parse check: the changed file must be syntactically valid (esbuild/node --check).
- If App.jsx changed: full bundle must build (`vite build` or esbuild bundle with
  react/recharts external).
- Cross-check any new stat against the source provided in the conversation.
- Confirm no `odds` entry gained a bookmaker reference.
- Diff should touch only the files the task required.

## Recurring work (the Sunday ritual, in season Aug–Apr)

1. Fetch/receive weekend NIFL results and updated table.
2. Update `FULL_TABLE` (or confirm the live API block is correct), fill
   `PREDICTOR_GW` results (`result: [h, a]`), create next gameweek from
   `FIXTURES_2627` round N.
3. Add any confirmed transfers/injuries the owner supplies.
4. Run verification steps above, commit with message "Weekly update: round N".

## Merge policy

Work on a branch, then: routine updates (data.js edits, small fixes, copy tweaks) merge
straight to main once verification passes — do not wait for the owner. Big changes
(App.jsx restructures, new features, anything visual or structural) stay on the branch
with a PR and wait for the owner's explicit "merge". Vercel deploys main automatically.

## Stop criteria for agent sessions

Task complete when: requested data blocks updated + verification passes + commit made.
Do NOT expand scope (no new features, no refactors) unless explicitly asked.
