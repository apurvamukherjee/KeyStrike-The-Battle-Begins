# KeyStrike

### The Battle Begins

A browser typing-rhythm game. By Apurva.

<p align="center">
  <img src="screenshots/11-battle.png" width="820" alt="KeyStrike 4-player Battle mode — a car race track above the word-typing stage" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-e0263f?style=flat-square&labelColor=0a0a0c" alt="React 18" />
  <img src="https://img.shields.io/badge/TypeScript-5-e0263f?style=flat-square&labelColor=0a0a0c" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/Vite-5-e0263f?style=flat-square&labelColor=0a0a0c" alt="Vite 5" />
  <img src="https://img.shields.io/badge/Socket.IO-4-e0263f?style=flat-square&labelColor=0a0a0c" alt="Socket.IO 4" />
  <img src="https://img.shields.io/badge/PWA-installable-e0263f?style=flat-square&labelColor=0a0a0c" alt="Installable PWA" />
  <img src="https://img.shields.io/badge/license-MIT-e0263f?style=flat-square&labelColor=0a0a0c" alt="MIT License" />
</p>

One word at a time, centered on screen, with a shrinking timer underneath —
type it before the clock runs out. Finish before the deadline for a
**Perfect**, just after for a **Good**; run out the clock and it's a **Miss**.
Every song is synthesized live in the browser via the Web Audio API — no
external audio files, nothing to license.

**Play it:** not deployed yet — clone and run it locally for now (see
[Development](#development) below).

## Showcase

<table>
<tr>
<td width="50%">
  <img src="screenshots/01-loader.png" alt="Loader screen with an animated keyboard wave and the By Apurva credit" />
  <p align="center"><sub><b>Loader</b> — animated keyboard, By Apurva</sub></p>
</td>
<td width="50%">
  <img src="screenshots/02-home.png" alt="Home screen with Play, Battle, Stats, and Settings" />
  <p align="center"><sub><b>Home</b></sub></p>
</td>
</tr>
<tr>
<td width="50%">
  <img src="screenshots/03-song-select.png" alt="Song select screen with an Easy/Normal/Hard difficulty picker and a Practice button" />
  <p align="center"><sub><b>Song Select</b> — 5 songs, 3 difficulties each</sub></p>
</td>
<td width="50%">
  <img src="screenshots/04-gameplay.png" alt="Gameplay screen — the active word, a Perfect judgement popup, and the live keyboard display" />
  <p align="center"><sub><b>Gameplay</b> — type the word, beat the clock</sub></p>
</td>
</tr>
<tr>
<td width="50%">
  <img src="screenshots/05-results.png" alt="Results screen showing an S grade with a flawless run" />
  <p align="center"><sub><b>Results</b> — grade, score, hit breakdown</sub></p>
</td>
<td width="50%">
  <img src="screenshots/06-settings.png" alt="Settings screen with volume, input offset, game speed, text size, colorblind palette, and reduce motion controls" />
  <p align="center"><sub><b>Settings</b> — speed, text size, accessibility</sub></p>
</td>
</tr>
<tr>
<td width="50%">
  <img src="screenshots/07-stats.png" alt="Lifetime stats screen — plays, words typed, best combo, total score, longest word cleared" />
  <p align="center"><sub><b>Stats</b> — lifetime totals</sub></p>
</td>
<td width="50%">
  <img src="screenshots/08-practice.png" alt="Practice mode with speed and loop controls" />
  <p align="center"><sub><b>Practice</b> — loop a section, adjust speed</sub></p>
</td>
</tr>
<tr>
<td width="50%">
  <img src="screenshots/10-room.png" alt="Battle room screen with two players, avatars, song and difficulty picker" />
  <p align="center"><sub><b>Battle Room</b> — up to 4 players, no login</sub></p>
</td>
<td width="50%">
  <img src="screenshots/12-battle-results.png" alt="Battle results screen with a ranked leaderboard" />
  <p align="center"><sub><b>Battle Results</b> — first past the post wins</sub></p>
</td>
</tr>
<tr>
<td width="50%">
  <img src="screenshots/13-copy-code.png" alt="Battle room heading with a one-click Copy button next to the room code, showing the Copied confirmation state" />
  <p align="center"><sub><b>Copy Room Code</b> — one click, "Copied" confirmation</sub></p>
</td>
<td width="50%">
  <img src="screenshots/14-team-mode-room.png" alt="Battle room with Team Mode on, four players split into Team A and Team B" />
  <p align="center"><sub><b>Team Mode</b> — pick a side, 2 players per team</sub></p>
</td>
</tr>
<tr>
<td width="50%">
  <img src="screenshots/15-countdown.png" alt="Battle screen showing a large 3-2-1-GO countdown overlay before the race starts" />
  <p align="center"><sub><b>3…2…1…GO</b> — an on-screen countdown before the race</sub></p>
</td>
<td width="50%">
  <img src="screenshots/16-team-battle.png" alt="Battle screen in team mode showing two lanes, each with two stacked teammate avatars sharing one car" />
  <p align="center"><sub><b>Team Race</b> — two lanes, one shared car per team</sub></p>
</td>
</tr>
<tr>
<td colspan="2" align="center">
  <img src="screenshots/17-team-results.png" alt="Battle results screen in team mode, grouped by team, with Team A marked as the winner" width="410" />
  <p align="center"><sub><b>Team Results</b> — grouped by team, not just by player</sub></p>
</td>
</tr>
</table>

## How to play

Type each word before its timer runs out. Every correct next letter locks
in; wrong ones are simply ignored — no penalty, same forgiveness as an
ordinary typing test.

- **Perfect** — finished at or before the deadline
- **Good** — finished just after, within a short grace period
- **Miss** — the grace period ran out unfinished; breaks your combo
- `Esc` — pause / resume (solo and Practice only — Battle has no pause)

Combo builds a score multiplier as you chain hits, and longer words are
worth more. Five original songs are included (each with its own hand-curated
word bank), every one playable at **Easy**, **Normal**, or **Hard** — Easy
uses shorter words with more time between them, Hard is the opposite. Best
score per song+difficulty and lifetime stats (words typed, best combo,
longest word ever cleared) are saved locally in your browser.

## Battle mode (4 players, no login)

Create a room, get a 4-character code, share it — up to three friends join
by typing it in. No accounts, nothing to remember. The host picks a song and
difficulty and starts the race.

Progress is shown as a **car race**: each player's car advances along the
track as they type, sped up by combo the same way scoring is — a hot streak
visibly pulls your car ahead. **First car to the finish line wins**, even if
the song is still playing for everyone else. Ranked results show everyone's
score and accuracy once the race ends.

The interesting design constraint: syncing every keystroke over the network
would be both slow and unfair, so **each client stays authoritative for its
own run** — the same local engine as solo play, same local judging. The
server ([`server/`](server/)) only relays room membership, a synchronized
start signal, and a periodic progress snapshot from each player so everyone
sees everyone else live. See [`server/README.md`](server/README.md) for
running or deploying it.

### What's new

- **2v2 team mode** — toggle Team Mode in the room and pick a side (2
  players per team). Each teammate keeps typing their own words with the
  same local scoring as always, but their progress bars now share one car —
  the server sums both members' progress and calls the win itself once a
  team's combined total crosses the finish line, since no single client can
  see the pair's combined total. Results are grouped by team instead of one
  flat leaderboard.
- **3…2…1…GO countdown** — the gap between the room and the first word used
  to be a silent pause; it now counts down on screen before the race starts.
- **Copy room code** — a one-click copy button next to the room heading,
  with a "Copied" confirmation, for sharing the code without a screenshot.
- **Rejoin after refresh** — a refresh or accidental tab close mid-lobby or
  mid-battle used to lose your seat for good. Each tab now keeps a small
  session token and reclaims its spot on reconnect — including picking a
  race back up mid-battle — instead of starting over.
- **Nickname sanitization** — nicknames are trimmed, collapsed, and
  filtered to a safe character set, live as you type and authoritatively on
  the server (which broadcasts them to everyone else in the room).

## Everything else

- **Practice mode** — loop any section of a song (`[` / `]` to mark it,
  `R` to clear), scrub speed 25%–200% with `←` `→`. No score kept; it's for
  learning a hard passage, not grading it.
- **Accessibility** — Settings has a Game Speed slider (more time per word),
  a text-size slider, a colorblind-safe amber palette (swaps out red, which
  is otherwise the app's only accent), and an in-app Reduce Motion toggle
  that supplements the OS-level setting.
- **Mobile** — typing needs a keyboard, so on a touch device a "Tap to
  Start" screen opens your device's on-screen keyboard via a focused hidden
  input, rather than blocking play outright.
- **Installable PWA** — offline-capable; add it to your home screen or
  desktop dock.
- **Fullscreen toggle** — top-right corner, on every screen.

## Development

Requires Node 18+.

```bash
npm install
npm run dev       # start the dev server
npm run build     # type-check and build a production bundle to dist/
npm run preview   # serve the production build locally
npm run test      # run the unit tests
npm run lint      # lint the project
```

Battle mode needs its relay server running too — see
[`server/README.md`](server/README.md) (`cd server && npm install && npm start`,
then the frontend's `VITE_BATTLE_SERVER_URL` points at it, defaulting to
`http://localhost:8787` in dev).

## How the music works

Each song in `src/data/songs/` is an original word bank plus a chord
progression (see `src/engine/songBuilder.ts`), which `buildWordSong`
expands into three difficulty charts (word choice and spacing vary by
difficulty) and a synthesized backing track — bass, a soft pad, and hats,
played through oscillators and noise bursts in `src/engine/audioEngine.ts`.
Word-completion sounds are short reactive chimes played live rather than
pre-scheduled, since the three difficulties don't share one timeline to bake
sounds into ahead of time.

## Project structure

```
src/
├── components/     shared UI (AnimatedKeyboard, Avatar, RaceTrack, Slider, FullscreenButton)
├── screens/        one folder per screen — solo, practice, and battle all live here
├── engine/         word-judging logic, audio synthesis, song building/scaling
├── multiplayer/    RoomClient (socket.io-client wrapper) and shared room types
├── data/songs/     the five song definitions (word banks + chord progressions)
├── utils/          localStorage-backed settings, high scores, and lifetime stats
├── types/          shared TypeScript types
└── styles/         theme tokens and global styles

server/             the battle relay — see server/README.md
```

## License

MIT — see [LICENSE](LICENSE).
