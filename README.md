# KeyStrike

### The Battle Begins

<table>
<tr>
<td width="50%">
  <img src="screenshots/11-battle.png" width="100%" alt="Four racers neck-and-neck in a KeyStrike Battle, each car pulling ahead on the strength of a clean combo" />
  <p align="center"><sub><b>Battle</b> — four racers, first car to the line wins</sub></p>
</td>
<td width="50%">
  <img src="screenshots/25-duel-mode.png" width="100%" alt="A KeyStrike sword duel mid-fight — a landed strike flashing red on the rival's swordsman under a torii gate and rising moon" />
  <p align="center"><sub><b>Duel Mode</b> — a sword strike for every clean word</sub></p>
</td>
</tr>
</table>

<p align="center"><em>Your keyboard, turned into the fastest weapon in the room.</em></p>

Type the word before the clock runs out. That's the whole rule — and underneath
it is a rhythm game, a four-player race, a moonlit sword duel, and a running
record of your own best self, all sharing one deceptively simple mechanic.

## Why KeyStrike exists

Most typing tests measure you against a stopwatch and hand you a WPM number at
the end. That's it — no stakes, no feel, nothing to chase tomorrow. KeyStrike
starts from a different question: what if typing well felt the way playing well
feels in any other game?

So every track has a bassline, a pad, and a beat, all live while you play — get
in the pocket and the music leans into it, building as your combo grows; miss a
few and it falls back to quiet. Land enough clean words in a row and you bank a
strike you can use to burst ahead of a rival or blur their view mid-race. Come
back the next day and your own best run from last night is waiting on the
track as a ghost, there to be beaten.

Or leave the track behind entirely and step into a dojo at night — torii gate,
falling sakura, a rival across the mat — where every clean word isn't a lap,
it's a sword strike. Land enough of them before they land theirs and you take
the round; take two rounds and you take the match.

None of it asks for an account. A race with friends is a four-letter code,
typed in and shared — nobody signs up, nobody installs anything, and the game
remembers your progress on the device you played it on. It's built to be picked
up in ten seconds and to still have new ground to cover a hundred races later.

## Modules

| Module | What you get | Where |
|---|---|---|
| **Solo Play** | Five original tracks, three difficulties each — one word at a time against a shrinking clock | Solo |
| **Practice** | Loop any stretch of a track and scrub the tempo from a crawl to double speed | Solo |
| **Sentence Mode** | A full paragraph revealed through fog as you type it — no clock, just clarity | Solo |
| **Battle** | Race up to three friends on a shared 4-letter code — first car to the line wins | Multiplayer |
| **Team Battles** | Pair up 2-on-2 behind one shared car; your combined pace is the only thing that matters | Multiplayer |
| **Sudden Death** | One miss crashes you out of the race for good — survive to keep a shot at winning | Multiplayer |
| **Power-Ups** | Bank a hot streak into an instant burst of speed, or a blinding counter-attack on your rival | Multiplayer |
| **Ghost Rivals** | Your best-ever run comes back as a translucent rival car every time you replay a track | Solo |
| **Duel Mode** | Face a rival across a moonlit dojo — every clean word is a sword strike, first to fully land theirs wins | Solo & Multiplayer |
| **Duel Ladder** | Climb a five-rival gauntlet, from a wandering ronin to a horned warlord, unlocking the next by winning a match | Solo |
| **Best-of-3 Matches** | A duel is decided over up to three rounds, with the running score tracked live on screen | Solo & Multiplayer |
| **Living Music** | The backing track intensifies in real time as your combo climbs, and eases off when it breaks | Everywhere |
| **Stats & Heatmap** | Lifetime totals, plus a key-by-key map of exactly where you're fast and where you fumble | Solo |
| **Accessibility Suite** | Game speed, a colorblind-safe palette, reduced motion, and adjustable text size | Everywhere |

## Design philosophy

**One word, one beat.** The whole game rests on a single readable unit — a word,
a deadline, a judgement. Nothing is asked of you that isn't shown on screen.

**Forgiving by default.** A wrong letter is simply ignored, never punished. The
only thing that costs you is running out the clock — the same grace an ordinary
typing test gives you, kept intact even under pressure.

**Music that listens back.** The soundtrack isn't a fixed backing track playing
underneath you — it responds to how you're doing, live, every run. Two players
on the same song at the same difficulty can hear two different performances.

**Competitive without a scoreboard to guard.** Racing a friend or racing your
own ghost both work the same way: the pressure is real, but nobody's climbing a
global leaderboard or getting matched against strangers. The stakes are always
local and personal.

**Everyone's invited.** Game speed, a colorblind-safe palette, and a reduced
motion mode aren't buried in an options menu as an afterthought — they sit right
next to difficulty as first-class ways to play.

**No accounts, no friction.** Nothing you do requires a login. Progress lives on
your device; a multiplayer race lives for as long as the room does. Closing the
tab costs you nothing you can't get back by opening it again.

## Platform

KeyStrike runs entirely in the browser, on desktop or mobile.

- **Keyboard-first, touch-friendly.** The core experience is built around a
  physical keyboard; on a touch device, a tap opens your on-screen keyboard so
  the same game works on the go.
- **Install it like an app.** Add it to your home screen or desktop dock and
  it keeps working offline — no store, no update prompts.
- **Multiplayer without infrastructure.** A battle room is a shared four-letter
  code. Close your laptop mid-race and reopen it — your seat, your progress,
  and your score are all still there waiting.
- **Fullscreen everywhere.** A single toggle, present on every screen, for
  sessions with nothing else on the display.

## Tech stack

| Layer | Technology | What it's for |
|---|---|---|
| UI | React 18 + TypeScript | Every screen — menus, gameplay, results — as typed, composable components; one reducer in `App.tsx` drives all navigation |
| Build tooling | Vite | Dev server with instant reload, and the production bundle |
| Audio | Web Audio API | Every song and sound effect is synthesized live with oscillators and noise bursts — no audio files shipped or licensed, and the backing track can react to your combo in real time |
| Duel animation | GSAP (`gsap` + `@gsap/react`) | The sword-swing, lunge, hit-recoil, and victory/defeat choreography in Duel Mode |
| Multiplayer relay | Socket.IO (server + `socket.io-client`) | Room creation/joining, a synchronized start signal, live progress and power-up events — over a small Node.js server, in-memory only, no database |
| Offline support | vite-plugin-pwa | Installable, offline-capable Progressive Web App packaging |
| Persistence | Browser `localStorage` | Best scores, lifetime stats, ghost replays, and duel ladder progress — entirely client-side, no accounts |
| Testing | Vitest | Unit tests for the gameplay engine — scoring, timing, chart generation, and the CPU opponent simulation |
| Linting | ESLint + typescript-eslint | Keeps the codebase's style and type usage consistent |
| Deployment target | Render (server) + any static host (frontend) | `server/render.yaml` is a ready-to-go Blueprint for the relay; the frontend build is a plain static site deployable anywhere |

---

Created by Apurva · MIT Licensed — see [LICENSE](LICENSE).
