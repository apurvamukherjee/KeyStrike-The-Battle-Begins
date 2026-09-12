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

- **Phase 3 — Foundation & Solo Depth** — Profile/loadout system (name,
  unlockable characters & swords, `Customize` screen), the Home screen
  regrouped into `Play ▾` / `Versus ▾` / `Profile ▾` clusters, Paragraph
  Mode (solo), Duel ladder expansion (9 enemies total), Endless/Survival
  Mode.
- **Phase 4a — Story Mode** — the 50-level campaign ("Sword Man Mode"): a
  smooth grunt difficulty curve plus 10 named boss/miniboss milestones
  (reusing the Duel ladder's cast for levels 5-45, a new campaign-exclusive
  final boss at 50), a `Story Mode` hero button on Home, level-by-level
  progression with retry-on-loss, and two Story-exclusive loadout rewards
  (a sword at level 25, a character at level 50) layered onto Phase 3's
  unlock system without disturbing its existing Duel-ladder-based unlocks.

## Up next

| Phase | What | Size |
|---|---|---|
| **4b — Song Editor** | The other half of Phase 4: an in-browser word/beat chart editor, saved locally and shareable via a URL-encoded link — no backend needed. Deliberately split from 4a so Story Mode didn't wait on it. | Medium-large |
| **5 — Connected & Competitive** | Paragraph Mode (multiplayer, extends the existing room server), Persistent Global Leaderboard (needs Postgres on Render — the only phase requiring new infra), Tournament Brackets (single-elimination, 4 or 8 entrants, wraps the room/duel/race machinery). Bundled together since all three touch the server and the latter two share the same backend work. | Large (new infra) |
| **6 — Optimization & Polish** | Performance pass (render/bundle profiling, animation smoothness on lower-end devices), bug-fix sweep across all modes shipped so far, UX rough edges (loading states, error handling, mobile/touch parity), accessibility check. No new features — makes everything above feel finished. | Medium |

Full design in [EXPANSION_PLAN.md](EXPANSION_PLAN.md). Suggested order:
4b → 5 → 6.
