# Changelog

## v2 — word-typing rewrite, feature batch, Battle mode

The core mechanic was rebuilt from scratch: four abstract tap lanes (`D F J
K`) became typing real words against a per-word deadline. Reasoning: the
lane version's design had drifted close to another typing-rhythm game's
specific creative signature (letters-in-circles, connector lines, per-letter
rhythm timing); typing whole words is a different, decades-old genre
convention (Typing of the Dead, ZType, TypeRacer) with its own original
visual language here — centered word, typed/untyped letter highlighting, a
blinking next-letter cursor, a shrinking time bar, no canvas.

Judging model: **Perfect** = finished at/before the word's deadline, **Good**
= finished within a grace period after, **Miss** = grace period elapsed
unfinished. Wrong letters are ignored, not penalized. Score gets a
length bonus on top of the existing perfect/good + combo-multiplier shape.

Landed alongside the rewrite:

- **Easy/Normal/Hard** — derived programmatically from one authored word
  bank per song (word-length filter + beat spacing), not hand-authored per
  tier.
- **Practice mode** — loop a section (`[`/`]` markers), scrub speed
  25%–200% (`←`/`→`). Notes/audio are time-scaled together (`1/speed`) —
  since every note is synthesized rather than decoded from a file, this
  changes tempo without pitch-shifting.
- **Lifetime stats** — plays, words typed, best combo ever, total score,
  longest word ever cleared, stored in `localStorage`.
- **Accessibility settings** — Game Speed (more time per word), text size,
  a colorblind-safe amber palette swapped in for red, an in-app Reduce
  Motion toggle alongside the OS-level media query.
- **Mobile support** — typing needs a keyboard, so touch devices get a "Tap
  to Start" screen that focuses a hidden input to summon the on-screen
  keyboard, rather than blocking play. The in-game AnimatedKeyboard widget
  is hidden on touch to leave more room for the OS keyboard.
- **PWA** — installable, offline-capable (`vite-plugin-pwa`), icons
  generated from the new mark.
- **New mark** — the favicon/app icon changed from a plain "K" to a
  lightning-bolt mark with a motion-echo shadow.
- **Animated keyboard widget** — one component, two uses: an idle wave on
  the Loader screen, and a live currently-held-key highlight during
  gameplay.
- **Fullscreen toggle** — persistent corner control, available on every
  screen.
- **Browser back/forward sync** — every screen push a history entry;
  the browser's own Back button now replays whatever "back" already means
  for the screen on top (same as its own Back/Quit/Leave button), rather
  than trying to reconstruct in-flight state.
- **Scroll fix** — `.screen` containers gained `overflow-y: auto`; Settings
  had grown past a typical viewport height and its Back button was
  genuinely unreachable with the old `overflow: hidden`.

Dropped from the original 10-feature list because they no longer fit the
mechanic: **hold notes** (a multi-letter word already carries that
"sustained engagement") and **remappable keys** (typing real words needs the
real alphabet — there are no lanes left to remap).

## Battle mode (4 players, no login)

Real-time multiplayer, added last since it's additive (new screens + a
battle variant of the gameplay engine) rather than a change to solo-mode
code, and is the most novel/highest-risk piece.

- **Server** (`server/`) — a small Socket.IO relay, in-memory only (no
  database, no accounts), separate `package.json` from the frontend. Rooms:
  create/join by a 4-character code, host picks song + difficulty, host
  starts. Each client stays authoritative for its own gameplay timing and
  scoring — the server only relays room membership, a synchronized start
  signal, and a periodic progress snapshot per player. First player to
  finish wins the room outright ("first past the post"), not "wait for
  everyone."
- **Race visualization** — progress is shown as cars on a track with a
  checkered finish line (the TypeRacer convention: car speed reflects
  typing performance via the same combo multiplier that drives scoring, not
  raw song-playback position — since every client's audio plays at the same
  real-time rate regardless of skill, only a performance-weighted distance
  metric lets someone genuinely finish first).
- **Avatars** — 10 original, generatively-varied vector faces (spiky hair
  silhouette + simple eyes, color and spike count vary per recipe),
  assigned round-robin as players join.
- **Deployment** — `server/render.yaml` for a one-config Render Blueprint
  deploy once the repo is pushed to a remote the user controls.

## v1 — KeyStrike (initial build)

Built from scratch as an original React/TypeScript/Vite rhythm game — 4-lane
tap mechanic (`D F J K`), 5 synthesized songs, black/red theme, loader,
settings, local high scores. See git history for the full detail; superseded
by the v2 rewrite above before ever being deployed.
