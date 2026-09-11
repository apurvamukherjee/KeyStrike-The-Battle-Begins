# Expansion Plan — Story Mode, Paragraph Mode, Profiles, Menu Regroup

Consolidates everything on the roadmap — the new direction (Story Mode,
Paragraph Mode, Profiles, menu regroup) *and* the previously-separate
Endless/Song Editor/Leaderboard/Tournament items — into 3 big phases plus a
closing optimization phase. Nothing is dropped; ROADMAP.md carries the
short 4-phase table, this doc is the detailed design behind it.

## What's being asked for

1. "Sword Man Mode" — a real campaign: 50 levels, more bosses, harder as you go.
2. Paragraph Mode — type a whole paragraph as one continuous flow (not
   word-by-word gated like Sentences), solo and multiplayer.
3. More bosses, harder tiers.
4. Custom swords + character select + player name, in Settings/Profile,
   unlocked by fighting-level progress.
5. 50-level story mode structure.
6. A normal/hard selector for free play.
7. Fewer top-level tabs, grouped, kept in the current black/red aggressive-premium style.

## Grounding: what already exists

- No router — `App.tsx` is one `useReducer` state machine over `ScreenState` (`src/types/game.ts`). Adding a screen = adding an action + a case, not a route.
- `HomeScreen.tsx` renders 6 flat `.cap` buttons (Play/Sentences/Battle/Duel/Stats/Settings) in theme.css's black-bg/single-red-accent system — no new visual system needed, just new layout.
- `src/data/enemies.ts` is already a ranked boss ladder (5 entries) with a working unlock gate in `src/utils/duelProgress.ts` (`isEnemyUnlocked`, rank N needs N-1 beaten). This is the pattern Story Mode reuses at 10x the size.
- `src/components/Swordsman/Swordsman.tsx` is an 8-recipe color-swap SVG fighter, already used for every CPU opponent's visuals in Duel.
- `Difficulty = 'easy'|'normal'|'hard'` (`src/types/song.ts`) already exists and already has a working UI pattern (`difficulty-picker` radiogroup) in both `SongSelectScreen` and `SentenceScreen`. **Item 6 is not a new setting — it's reusing this existing picker for the new Paragraph mode.**
- No profile/character/sword concept exists yet. `src/utils/nickname.ts` is a transient multiplayer display name only, capped at 16 chars, sanitized client+server. This is the one piece Profile should subsume (nickname defaults to `profile.name`).
- Combat visuals (HP bars, strike animation, lunge/recoil) already exist in `components/DuelArena` — Story Mode fights reuse this rather than building new combat UI.

## 1. Menu regroup

Current: 6 flat buttons. Adding Story, Paragraph, and Profile as first-class
destinations would push that to 9 — too many for the "clean and premium"
look. Group into 3 clusters + 1 hero button:

```
                    KEYSTRIKE
         Type to the beat. Beat the clock.

        ┌──────────────────────────────┐
        │      ⚔ STORY MODE ⚔          │   ← hero CTA, primary red-filled
        └──────────────────────────────┘      button (replaces today's "Play"
                                                as the primary autofocus action)

   [ PLAY ▾ ]     [ VERSUS ▾ ]     [ PROFILE ▾ ]
```

- **PLAY ▾** — Free Play (today's word/beat-chart Play), Sentences, Paragraph (solo).
- **VERSUS ▾** — Battle, Duel (1v1/2v2/FFA), Paragraph Race (multiplayer).
- **PROFILE ▾** — Stats, Customize (name/character/sword), Settings.

Each `▾` opens a flyout panel using the existing `.panel`/`.cap` classes
(same visual language, no new components needed) — click opens it, click
elsewhere or Esc closes it, matching the existing Esc-to-pause convention
elsewhere in the app. Keyboard nav (arrow keys cycling, Enter to confirm)
should mirror what `HomeScreen.tsx` already does for the Enter-to-Play
shortcut.

**File touch:** `HomeScreen.tsx` + `HomeScreen.css` (rewritten), `App.tsx`
(new `ScreenState` variants for `STORY_LADDER`, `STORY_FIGHT`, `PARAGRAPH`,
`PARAGRAPH_ROOM`, `PROFILE`), `src/types/game.ts` (the new action/state
union members).

## 2. Profile & customization

New files:
- `src/utils/profile.ts` — localStorage `keystrike:profile:v1`: `{ name: string; characterId: string; swordId: string }`. `getProfile()`/`setProfile()`, same pattern as `settings.ts`. `nickname.ts`'s sanitizer gets reused here for `name`, not duplicated.
- `src/data/characters.ts` — extends the existing `Swordsman` recipe table into named, unlockable entries: `{ id, name, swordsmanIndex, unlockLevel }`. The 8 existing recipes become the first 8 characters (unlockLevel 1, i.e. free), new ones added as story-level rewards past that.
- `src/data/swords.ts` — cosmetic only: `{ id, name, bladeColor, trailColor, unlockLevel }`. Requires extending `Swordsman.tsx` to accept an optional `swordSkin` prop that overrides the blade's fill/glow instead of only deriving it from the body recipe (small, additive change — recipe's `glow` becomes the *default* skin, not the only one).
- `src/utils/storyProgress.ts` (see §3) is what unlock checks read from — `isCharacterUnlocked(id, progress)`, `isSwordUnlocked(id, progress)`, same shape as `duelProgress.ts`'s `isEnemyUnlocked`.

UI: a **Customize** screen under Profile ▾ — name text input (reuse
nickname sanitizer/limit), a character grid and a sword grid, each tile
either selectable or shown locked (dimmed + "Unlocks at Story Lv N", no
padlock icon needed if dimming + caption reads clearly against the
black/red theme). A live `Swordsman` preview with the selected
character+sword updates as you pick.

**Open question:** does the player's own fighter actually render anywhere
today (Duel/Battle arenas)? Investigation didn't confirm the player side
uses `Swordsman` the same way the CPU does — needs a quick check before
implementing, since if the player is invisible today, loadout customization
needs a preview screen at minimum even if it doesn't yet show up mid-fight.

## 3. Story Mode ("Sword Man Mode") — 50 levels

New file `src/data/storyLevels.ts`, generated by formula rather than
hand-authored 50 times, with boss levels overriding the formula:

```ts
export interface StoryLevel {
  level: number;              // 1-50
  kind: 'grunt' | 'miniboss' | 'boss';
  name: string;
  swordsmanIndex: number;
  profile: CpuProfile;        // wordsPerMinute + accuracy
  contentMode: 'words' | 'sentences' | 'paragraph';
  unlocks?: { characterId?: string; swordId?: string };
}
```

- **Difficulty curve** — linear-ish ramp, tuned against the existing 5-enemy
  ladder as anchor points (rank1 wpm18/acc.65 → rank5 wpm47/acc.93 across 5
  steps today). Stretched over 50: roughly wpm 10→75, accuracy .50→.97,
  front-loaded easy (levels 1-10 gentle, so early game isn't a wall) and
  back-loaded hard (levels 40-50 are the real test).
- **Boss cadence** — every 5th level (5,10,...,50) is at minimum a
  `miniboss` (named, stat spike, flavor text); levels 10/20/30/40/50 are
  full `boss` tier (bigger stat jump + one special mechanic — e.g. a
  time-limited "enrage" speed-up in the last 20% of the fight, or longer
  words only). That's 10 named encounters total layered onto 40 procedural
  grunts — reuses the existing 5 `ENEMIES` as the levels-1-25 grunt/miniboss
  cast (so nothing already shipped gets wasted) with new entries for 26-50.
- **Content mode by range** — levels 1-15 use the existing word/beat-chart
  engine, 16-35 use `sentenceRunner`, 36-50 use the new `paragraphRunner`
  (see §4). This is what makes Paragraph Mode load-bearing rather than a
  side mode — the story campaign's endgame is paragraph fights.
- **Progress persistence** — `src/utils/storyProgress.ts`, localStorage
  `keystrike:storyProgress:v1`: `{ highestLevelCleared: number; starsPerLevel: Record<number, 1|2|3> }`. Stars per level (e.g. 1★ clear, 2★ no misses, 3★ under a time bar) are optional polish, not required for v1 — flag as a follow-up, not blocking.

Screens: `StoryLadderScreen` (level-select grid, locked levels dimmed past
`highestLevelCleared + 1`, mirrors `DuelSelectScreen`'s ladder UI) →
`StoryFightScreen` (thin wrapper choosing words/sentence/paragraph runner by
`contentMode`, otherwise reuses `DuelScreen`'s CPU-fight skeleton — HP race,
`DuelArena`, `cpuOpponent.ts` — so this is composition over new combat code).

## 4. Paragraph Mode

The distinguishing feature vs. Sentences: no per-sentence reveal/reset — one
continuous target string, cursor advances character-by-character across
word boundaries without stopping, matching the game's existing rule
("correct letters lock in, wrong ones are ignored") applied at paragraph
scope instead of per-word/per-sentence scope.

- `src/engine/paragraphRunner.ts` — pure module (same shape as
  `sentenceRunner.ts` conceptually, but one buffer instead of a queue of
  reveal windows): tracks a single cursor index into the full paragraph,
  advances on correct input, ignores incorrect, computes WPM/accuracy over
  the whole thing at completion. Needs its own Vitest coverage, matching how
  `engine/` is tested today.
- `src/data/paragraphs.ts` — paragraph pools bucketed by the existing
  `Difficulty` type, same picker component pattern as Sentences/Play (this
  is where item 6's "normal/hard selector" lands — no new Settings work).
- `ParagraphScreen` (solo) — difficulty picker → live paragraph typing view
  → results (WPM, accuracy, time), local high scores via the existing
  `highScores.ts` pattern (new key, same module shape).
- **Multiplayer** — reuses the Battle/Duel room infrastructure
  (`multiplayer/RoomClient.ts`, `server/index.js`), adding a `paragraph`
  room kind: same paragraph broadcast to every player in the room, progress
  = % of characters correctly typed (like Battle's HP/progress bar today),
  win = first to 100% or best % when the clock runs out. New
  `ParagraphArena` component parallel to `DuelArena`/`BattleArena` (whatever
  Battle's arena component is called — verify exact name before implementing).
  **This is a server change**, same category of work as the existing Battle
  room logic — size it like Phase 2 (2v2 Team Duels), not like a small UI addition.

## 5. More bosses

Don't build two separate boss rosters. Story Mode (§3) is the primary venue
for new boss content since it needs ~10 named encounters anyway. The
existing free-standing Duel ladder (`enemies.ts`, 5 enemies) gets 3-5 more
entries at the top for players who want quick CPU duels without going
through the full campaign — reusing the same `Enemy` shape, no new system.

## 6. Difficulty selector for free play

Already exists as a pattern (`Difficulty`, `DIFFICULTIES`, the
`difficulty-picker` radiogroup used in `SongSelectScreen` and
`SentenceScreen`). Paragraph Mode's solo screen adopts the same picker.
Story Mode does **not** get this selector — its difficulty is the fixed
per-level curve in `storyLevels.ts`, that's the whole point of a campaign.

## 7. Endless/Survival Mode

Solo mode: type continuously from a mixed word pool, speed ramps up over
time, one miss (or a small miss budget) ends the run. Reuses the existing
scoring engine unchanged — no new engine module needed, just a new screen
(`EndlessScreen`) that feeds `chartEngine`/`WordRunner` an infinite,
accelerating queue instead of a fixed chart. Lives under **Play ▾** in the
regrouped menu, alongside Free Play/Sentences/Paragraph. Local high score
via the existing `highScores.ts` pattern (best survival time / word count).

## 8. In-browser Song Editor

Author your own word/beat chart in a new screen, save it locally, share it
via a URL-encoded link — no backend needed. New `SongEditorScreen`
producing a `SongDefinition` (same shape `src/data/songs.ts` already uses),
persisted to localStorage and optionally serialized into the URL (base64/URL-safe
encoding of the chart JSON) so a link alone reproduces it on another
device — no server round-trip. Feeds back into **Play ▾**: custom songs
appear in `SongSelectScreen` alongside the built-in list.

## 9. Persistent Global Leaderboard

The one item needing new infrastructure — Postgres on Render (the `server/`
directory already deploys there) + two REST endpoints (`POST /scores`,
`GET /scores/:songId`), opt-in score submission gated behind the player's
Profile name (§2) so submissions are attributable without requiring
accounts/auth. Surfaces as a new tab inside `StatsScreen` or its own
`LeaderboardScreen` reachable from **Profile ▾**.

## 10. Tournament Brackets

Single-elimination bracket (4 or 8 entrants) wrapping the existing
room/duel/race machinery (`server/index.js`, `RoomClient.ts`) — a bracket is
just a sequence of Duel/Battle rooms with the winner advancing, so this is
orchestration on top of Phase 3-established infra rather than new combat
code. Needs its own scoping pass once Phase 5 starts (bracket state
persistence, spectator view for eliminated players, and reconnect handling
all need concrete decisions this doc doesn't make yet).

## Phasing

Consolidated into 3 big phases (each bundles items that share
dependencies or infrastructure) plus a closing optimization phase — see
ROADMAP.md for the short version.

### Phase 3 — Foundation & Solo Depth (Large)

Everything solo, no new backend — the systems Phases 4 and 5 build on.

- Profile & Loadout (§2): `profile.ts`, `characters.ts`, `swords.ts`, Customize screen, `Swordsman` sword-skin prop.
- Menu regroup (§1): Play ▾ / Versus ▾ / Profile ▾ + Story Mode hero CTA (IA only — Story itself ships in Phase 4).
- Paragraph Mode, solo (§4): `paragraphRunner.ts` + tests, `paragraphs.ts`, `ParagraphScreen`, local high scores.
- Duel ladder expansion (§5): +3-5 enemies at the top of `enemies.ts`.
- Endless/Survival Mode (§7): `EndlessScreen`, reuses `chartEngine` unchanged.

### Phase 4 — The Campaign (Large)

Depends on Phase 3 (needs the loadout system to unlock into, and the
paragraph engine for levels 36-50).

- Story Mode (§3): `storyLevels.ts` (50 levels, 10 named boss encounters), `storyProgress.ts`, `StoryLadderScreen`, `StoryFightScreen`, unlock wiring into Phase 3's Profile.
- In-browser Song Editor (§8): `SongEditorScreen`, URL-shareable chart encoding, integration into `SongSelectScreen`.

### Phase 5 — Connected & Competitive (Large, new infra)

Bundled because all three touch the server, and Leaderboard + Tournament
share the same backend work.

- Paragraph Mode, multiplayer (§4): server `paragraph` room kind, `ParagraphArena`, lobby wiring.
- Persistent Global Leaderboard (§9): Postgres on Render, `POST`/`GET /scores` endpoints, opt-in submission via Profile name.
- Tournament Brackets (§10): bracket orchestration over existing room machinery, needs its own scoping pass first.

### Phase 6 — Optimization & Polish (Medium)

No new features — makes everything above feel finished once there's a full
surface to work with.

- Performance pass: render/re-render audits on the hottest screens (`GameplayScreen`, `DuelScreen`, `BattleScreen`), bundle size check, animation smoothness on lower-end/mobile devices (GSAP timelines, `DuelArena`).
- Bug-fix sweep across every mode shipped in Phases 3-5, prioritized by player-facing severity.
- UX rough edges: loading/empty/error states, mobile/touch parity for the new screens (Story ladder, Paragraph, Customize), keyboard-nav completeness for the new flyout menus.
- Accessibility pass: colorblind palette (`[data-palette='alt']`) and reduce-motion coverage extended to every new screen, not just the ones that existed before this expansion.

Suggested order: **3 → 4 → 5 → 6.** Phase 3 unlocks both 4 and 5; Phase 6
runs last on purpose, once there's a full surface to profile and fix rather
than polishing a moving target.

## Open questions for you

1. Does Duel Mode stay as-is (quick CPU practice, 5-then-10 enemies) fully
   separate from the new 50-level Story campaign, or should Story *replace*
   Duel's solo ladder? Plan above assumes **separate** — Duel = fast
   practice, Story = the real campaign.
2. Boss visuals: new SVG art, or new color recipes on the existing
   `Swordsman` silhouette (fast, consistent, no art pipeline)? Plan assumes
   **recipes**, matching how the 5 existing enemies already work.
3. Multiplayer paragraph race — real-time simultaneous (Phase 5, server
   work) or an async best-time leaderboard entry instead (cheaper, and could
   piggyback on Phase 5's leaderboard endpoints directly)?
4. Stars/grading per story level — in scope for Phase 4, or a later pass?
5. Tournament Brackets (Phase 5) needs a scoping pass of its own before
   work starts — bracket persistence, spectator view, and reconnect
   handling aren't decided yet. Fine to leave that scoping until Phase 5
   begins, or do you want it settled now?
