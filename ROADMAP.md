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

Everything previously planned (the new Story/Paragraph/Profile direction
*and* the old Endless/Song Editor/Leaderboard/Tournament items) is
consolidated into 3 big phases, grouped by dependency and infra needs, plus
a closing polish phase. Nothing from either list was dropped. Full design
for Phases 3 & 4's new items in [EXPANSION_PLAN.md](EXPANSION_PLAN.md).

| Phase | What | Size |
|---|---|---|
| **3 — Foundation & Solo Depth** | Profile/loadout system (name, unlockable characters & swords), menu regroup into Play/Versus/Profile clusters, Paragraph Mode (solo), Duel ladder expansion (+3-5 enemies), Endless/Survival Mode. All solo, no new backend — this is what everything else in Phases 4-5 builds on. | Large |
| **4 — The Campaign** | Story Mode: 50-level campaign, boss fights every 5 levels, unlock rewards feeding Phase 3's loadout. Plus the in-browser Song Editor (custom word/beat charts, URL-shareable, no backend) as the other big single-player content piece. | Large |
| **5 — Connected & Competitive** | Paragraph Mode (multiplayer, extends the existing room server), Persistent Global Leaderboard (needs Postgres on Render — the only phase requiring new infra), Tournament Brackets (single-elimination, 4 or 8 entrants, wraps the room/duel/race machinery). Bundled together since all three touch the server and the latter two share the same backend work. | Large (new infra) |
| **6 — Optimization & Polish** | Performance pass (render/bundle profiling, animation smoothness on lower-end devices), bug-fix sweep across all modes shipped so far, UX rough edges (loading states, error handling, mobile/touch parity), accessibility check. No new features — makes everything above feel finished. | Medium |

Suggested order: 3 → 4 → 5 → 6. Phase 3 is the prerequisite for Phase 4's
unlock rewards and Phase 5's Paragraph engine reuse; Phase 6 runs last on
purpose, once there's a full surface to profile and fix.
