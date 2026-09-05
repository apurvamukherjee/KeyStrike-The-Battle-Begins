# Roadmap

## Shipped

- **Phase 1** — Rejoin-safe duel scoring (round-win tally survives a
  refresh mid-match) + touch/mobile support for the duel screens.
- **Phase 2** — 2v2 Team Duels.
- **Phase 2a** — Multiplayer duel discoverability (a "Duel a friend online"
  link from the solo Duel Ladder).
- **Phase 2b** — Free-for-all Duel (3-4 players), auto-targeting whoever
  has the lowest HP.

Duel Mode now supports 1v1, 2v2, and FFA, all discoverable from the Duel
Ladder screen and playable on touch devices.

## Up next

| Phase | What | Size |
|---|---|---|
| **3 — Endless/Survival Mode** | Solo mode: type continuously from a mixed word pool, speed ramps up over time, one miss (or a small miss budget) ends the run. Reuses the existing scoring engine unchanged. | Medium |
| **4 — In-browser Song Editor** | Author your own word/beat chart in a new screen, save it locally, share it via a URL-encoded link — no backend needed. | Medium-large |
| **5 — Persistent Global Leaderboard** | The one item needing new infrastructure — Postgres on Render + two REST endpoints, opt-in score submission. | Large (new infra) |
| **6 — Tournament Brackets** | Single-elimination bracket (4 or 8 entrants) wrapping the existing room/duel/race machinery. Needs its own scoping pass before starting. | Largest |

Phases 3 and 4 need no new backend and are the natural next steps. Phase 5
is the odd one out — it needs a real database (decided: Postgres on
Render). Phase 6 is sequenced last since it's the biggest and least
essential relative to its size.
