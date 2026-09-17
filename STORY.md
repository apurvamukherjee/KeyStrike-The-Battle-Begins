# Story Mode

The 50-level campaign: what the story is, how it's assembled, and where to edit it.

Two files own it:

| File | Owns |
|---|---|
| [`src/data/storyScript.ts`](src/data/storyScript.ts) | Dialogue — acts, milestone scenes, the rival, grunt lines |
| [`src/data/storyLevels.ts`](src/data/storyLevels.ts) | Opponents — names, portraits, difficulty, unlocks |

They are kept in sync by [`storyScript.test.ts`](src/data/storyScript.test.ts), which
fails if the rival's levels, name or portrait drift apart between them.

---

## The premise

You were a student at a dojo that burned. You walked out with your master's
sword and one name he spoke before he died.

The climb reveals what he never told you: he *did* run. Decades earlier he
taught a student who surpassed him, and the sword you carry was that student's
first blade. Your master fled rather than face what he had made, and died of it
eleven years later. The man at the top of the ladder has been waiting for
someone to finish the conversation.

He is not a monster. He is the other half of a lesson: your master taught him to
win and nothing else, and taught you to keep going. The final fight decides
which lesson holds. When you win he sits down on a floor he has kept swept for
years, and you carry the sword back down the mountain.

---

## Structure

Five acts of ten levels. Each act sets a mood and a stage of the revelation:

| Act | Levels | Title | The turn |
|---|---|---|---|
| I | 1–10 | The Road Out | You leave the ash. Nobody takes you seriously |
| II | 11–20 | The Iron Road | The bounty on the sword outgrows you |
| III | 21–30 | What the Blade Remembers | You learn your master ran, and start asking why |
| IV | 31–40 | The Debt | The truth lands: he made the thing at the top |
| V | 41–50 | The Sword Saint | His keepers stand aside. He has been expecting you |

An act's opening narration plays once, on its first level, prepended to whatever
scene that level already has.

### Level types

| Type | Levels | Scenes |
|---|---|---|
| **Boss** | 10, 20, 30, 40, 50 | Bespoke. The plot advances here |
| **Miniboss** | 5, 15, 25, 35, 45 | Bespoke |
| **Rival** | 7, 18, 28, 38, 48 | Bespoke. Kaede — see below |
| **Grunt** | the other 30 | Assembled from the act's pools |

Milestones 5–45 reuse the Duel ladder's nine enemies (`data/enemies.ts`) in
order, so their hand-tuned difficulty profiles land as natural spikes over the
grunt curve. Level 50's Sword Saint is campaign-exclusive.

---

## Kaede, the rival

She appears five times, once per act, and is the campaign's only recurring face.
She is never a boss — she is a peer, always a little further along her own road,
and the point of her is continuity: fifty fights against strangers is a queue,
not a story.

| Level | Where she is |
|---|---|
| 7 | Finds you. Wants to know if the famous sword was wasted on you |
| 18 | Beaten by one of his men. Needs to know whether she slipped or he's simply that far ahead |
| 28 | You know the truth now. She checks whether you'll quit or get insufferable |
| 38 | She reached the fourth gate — further than she can go. One last honest fight |
| 48 | On the bottom step of the final stair. Won't talk you out of it, won't let you go up cold |

Her arc closes without resolution by design: she doesn't join you, doesn't get
avenged, and is still at the bottom of the mountain when you come down.

She fights at **1.12× the grunt WPM curve** and +4% accuracy, and keeps one
portrait (`swordsmanIndex: 6`, sakura) for the whole campaign.

---

## How a scene is assembled

`getLevelScript(level)` returns `{ before, after }`.

- `before` plays on the way into the fight.
- `after` plays **only on a win**. A loss replays `before`, so retrying a level
  replays its setup rather than dropping you straight back into the fight.

For a milestone or rival level, both are hand-written. For a grunt level:

```
before: [ enemy taunt, hero reply ]     ← rotated from the act's pools by level
after:  [ narrator victory line ]
```

Pools are indexed by `level - act.from`, not randomised — the same level always
produces the same exchange. Current pool sizes:

| Act | Taunts | Replies | Victories |
|---|---|---|---|
| I–IV | 7 | 7 | 5 |
| V | 6 | 6 | 5 |

Since no act has more than six grunt levels, no taunt repeats within an act.

### Speakers

`hero` · `enemy` · `narrator` — this picks the dialog box's side, colour and
portrait. `narrator` lines are italic with no portrait highlighted. The `name`
field overrides the displayed name, which is how Kaede is named on levels where
the opponent would otherwise be a generic grunt.

---

## Presentation

[`StoryDialog.tsx`](src/components/StoryDialog/StoryDialog.tsx) renders a scene:
portraits facing each other with the speaker lit and the listener dimmed, and a
text box framed by a blade — edge pointing left for you, right for the enemy,
neutral gold for narration.

- Text types out at 58 characters/second.
- Enter, Space or a click advances. The first press **completes** the line
  rather than skipping it.
- Escape or Skip exits the whole scene.
- Under reduced motion the typewriter is skipped and lines appear whole.

The flow per level is `intro → fight → outro`, held in `ScreenState`
(`types/game.ts`) as `phase`.

---

## Rewards

| Level | Grants |
|---|---|
| 25 | Sun-Forged Edge (sword) |
| 50 | Sword Saint (character, portrait index 8) |

Both are story-only — `unlockLevel: Infinity` in `data/swords.ts` /
`data/characters.ts` means the Duel ladder can never grant them. Progress and
claimed rewards live in `utils/storyProgress.ts` under
`keystrike:storyProgress:v1`.

---

## Known issue: the endgame difficulty dips

The final boss is set at a fixed **72 WPM**, but the grunt curve has overtaken
it by then:

| Level | WPM |
|---|---|
| 47 | 73 |
| 48 (Kaede) | 83 |
| 49 | 76 |
| **50 (Sword Saint)** | **72** |

So the last three fights before the finale are all faster than the finale
itself, and the campaign's hardest fight is Kaede on 48. Narratively the Sword
Saint should be the wall.

This is left as-is because it's a balance decision, not a bug — and the fix is a
one-line change either way:

- Raise the boss: `MILESTONES[50].profile.wordsPerMinute` in `storyLevels.ts`.
  Around 90 would put him clearly above everything.
- Or flatten the tail: lower the `1.3` exponent in `curveWpm`.

He is already at 98% accuracy, so accuracy has no headroom left — speed is the
only lever.

---

## Editing

**Change a grunt line** — edit the act's `taunts` / `replies` / `victories` in
`storyScript.ts`. Pools may be any length; they're cycled modulo their size.

**Rewrite a bespoke scene** — edit `MILESTONE_SCRIPTS[level]` or
`RIVAL_LEVELS[level]`.

**Move the rival** — update `RIVAL_LEVELS` in *both* files. The test suite fails
if they disagree, and asserts she never lands on a multiple of 5 (a boss level).

**Change an opponent's difficulty** — `MILESTONES` for a named fight, or the
`curveWpm` / `curveAccuracy` functions for the grunt ramp.

**Replace the story wholesale** — `storyScript.ts` is pure data behind
`getLevelScript`. Nothing outside it knows the plot.

After any edit:

```bash
npm run verify   # typecheck + lint + CSS audit + tests
```

The story tests check that every level has both scenes, no line is empty, every
speaker is valid, act ranges tile 1–50 without gaps, and consecutive grunt
fights don't repeat a taunt.
