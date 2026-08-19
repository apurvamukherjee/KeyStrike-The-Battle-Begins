# Future features — Battle mode

Planning notes for five picked items from a larger brainstorm, written against
the current Battle implementation (`server/index.js`, `src/multiplayer/`,
`src/screens/{Lobby,Room,Battle,BattleResults}Screen/`). Nothing here is built
yet — this is the plan to build from next.

## 1. 2v2 team mode

**What:** Pair the room's up-to-4 players into two teams sharing one combined
car. Team vs. team finish line instead of a 4-way free-for-all.

**Team progress model:** each player keeps computing their own `carProgress`
exactly as today (same per-word `(1/totalWords) * multiplier` step, unchanged
client logic). The server sums a team's two members' progress and caps at 1:

```
teamProgress = min(1, memberA.progress.carProgress + memberB.progress.carProgress)
```

So two teammates together need to cover the same total distance a solo racer
does — both typing contributes, neither has to solo-carry the full bar, and
no client-side change is needed to how progress is calculated, only to how
it's aggregated for display and for the finish check.

**Why server-authoritative for the finish here, unlike FFA:** today a client
declares `finished` itself the moment its own `carProgress` hits 1 (see
`BattleScreen.tsx`'s `advanceCar`). A team's total lives across two sockets,
so no single client can know when the SUM crosses 1 — the server has to watch
both members' `progress` updates and emit the win itself once a team's total
reaches 1. This is the one place team mode's server logic genuinely diverges
from FFA, not just an aggregation layer on top.

**Changes:**
- `RoomPlayer` gains `team: 'A' | 'B' | null`. New event `select-team`
  (client → server, `{ team }`), capped at 2 players per team, only in lobby
  phase — mirrors `toggle-ready`'s shape.
- Room host gets a "Team Mode" toggle before starting (only enabled/relevant
  once exactly 4 players are present, or allow 2v1/1v1 as looser variants —
  worth a follow-up decision, not blocking the first version).
- Server tracks the finish condition itself when `room.teamMode` is on,
  instead of trusting the first `finished` event.
- `RaceTrack.tsx`: two lanes instead of up to four, each showing both
  teammates' avatars stacked on one shared car.
- `RoomScreen.tsx`: a team-pick UI (join Team A / Team B) alongside the
  existing ready/song controls.

## 2. On-screen "3…2…1…GO"

**What:** `BattleScreen` already computes `localDelayMs = startAtMs -
Date.now()` from the room's server-issued `startAtMs`. Right now that number
is only used to align audio scheduling — nothing renders during the gap, so
the transition from Room to Battle just looks like a load pause.

**Plan:** derive a `countdownSecondsLeft` value each animation frame
(`Math.ceil((startAtMs - Date.now()) / 1000)`) and render a centered overlay
while it's `> 0`, counting 3→2→1, then a brief "GO" flash at 0 before fading
— same visual family as the existing `.gameplay-judgement` pop-in animation,
just bigger and centered. No server or protocol change; this is entirely a
`BattleScreen.tsx` + CSS addition, reading a value that already exists.

## 3. One-click copy for the room code

**What:** a small copy button next to the "Room ABCD" heading in
`RoomScreen.tsx`, using `navigator.clipboard.writeText(room.code)` with a
"Copied" confirmation state — same interaction pattern already used for the
Settings sliders' immediate-feedback style, just a button instead. Falls back
to doing nothing silently if the Clipboard API is unavailable (same
defensive pattern as elsewhere in the app — no error surfaced to the user for
an unsupported API, just no-op).

## 4. Rejoin after refresh

**What:** a refresh (or accidental tab close) mid-lobby or mid-battle
currently loses your seat entirely — a new page load gets a new
`socket.id`, which the server has no way to link back to your old player
entry, so you'd have to rejoin as a brand-new player (and if the room's
already full or mid-battle, you can't get back in at all).

**Plan:** decouple "who you are in the room" from the socket connection:
- Client generates a random `clientId` (UUID) the first time it creates or
  joins a room, and persists `{ clientId, code, nickname }` in
  `sessionStorage` (tab-scoped on purpose — a rejoin should survive a
  refresh, not follow you into a new tab pretending to be the same seat).
- `RoomPlayer` gains a `clientId` field, set on `create-room`/`join-room`
  from a `clientId` the client now sends alongside `nickname`.
- New event `rejoin-room` (`{ code, clientId }`): server finds the existing
  player by `clientId` (not `socket.id`) in that room, re-associates it with
  the new socket, sets `connected: true`, and leaves nickname/avatar/team/
  progress/result untouched — the player picks back up where they were,
  including mid-battle, not just in the lobby.
- `App.tsx` / `LobbyScreen.tsx`: on mount, check `sessionStorage` for a
  pending room before showing the create/join form; if present, attempt
  `rejoin-room` first and only fall through to the normal lobby UI if that
  fails (room gone, expired, etc).
- Pairs naturally with item 5's reconnect-grace-period idea from the earlier
  brainstorm (not drafted here) — a rejoin only has something to reconnect
  *to* if the server hasn't already dropped the player.

## 5. Light nickname sanitization

**What:** nicknames are currently free-text, capped at 16 characters
server-side (`newPlayer()` in `server/index.js`), with no other filtering —
worth a floor given room codes get shared casually (screenshotted, sent in a
group chat, etc).

**Plan:** a small `sanitizeNickname(raw)` helper on the **server** (must be
authoritative there, since it's the one broadcasting names to everyone in the
room — a client-side-only filter wouldn't stop a modified client) that:
- Trims and collapses internal whitespace.
- Strips characters outside a safe printable set (letters, digits, spaces,
  a short allowlist of punctuation) rather than trying to blocklist specific
  words — simpler, doesn't need maintaining a profanity list for a low-stakes
  casual feature.
- Falls back to `'Player'` if the result is empty after cleaning (same
  fallback the code already has for a missing nickname).
Client-side (`LobbyScreen.tsx`) can mirror the same trim for instant feedback
in the input, but the server-side version is the one that actually matters.
