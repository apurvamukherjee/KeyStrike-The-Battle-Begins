# KeyStrike battle server

A tiny Socket.IO relay for the 4-player Battle mode: room codes, a
synchronized start signal, and live race-progress broadcast. No database, no
accounts — rooms live in memory and expire after 30 minutes of inactivity.
Each client stays authoritative for its own gameplay timing and scoring; the
server mostly relays state between players in the same room, with two
exceptions where it has to act on its own: in 2v2 team mode it sums both
teammates' progress and declares the win itself once their combined total
crosses the finish line (no single client can see the pair's total), and it
matches a reconnecting client back to its existing seat by a client-generated
id so a refresh mid-lobby or mid-battle doesn't lose the player's spot.

## Run locally

```bash
cd server
npm install
npm start
```

Listens on `:8787` by default (`PORT` env var overrides it). The frontend
points at `http://localhost:8787` by default in dev — see below to change it.

## Deploy on Render

This folder includes `render.yaml`, so once this repo is pushed to a GitHub
remote you control:

1. In the Render dashboard: **New → Blueprint**, point it at the repo. Render
   reads `server/render.yaml` and creates the web service automatically
   (root dir `server`, `npm install` / `npm start`, free plan).
   - Alternatively, without the Blueprint: **New → Web Service**, pick the
     repo, set **Root Directory** to `server`, build command `npm install`,
     start command `npm start`.
2. Render assigns the service a URL like `https://keystrike-battle-server.onrender.com`
   and its own `PORT` — `index.js` already reads `process.env.PORT`, nothing
   to configure there.
3. Point the frontend at it: set `VITE_BATTLE_SERVER_URL` to that URL
   (a `.env.production` file, or an env var in whatever hosts the frontend
   build) and rebuild. Locally, an untracked `.env.local` with the same key
   overrides the `localhost:8787` default for testing against the deployed
   server.

Free-tier Render web services spin down after inactivity and take a few
seconds to wake on the next request — the first room creation after a quiet
period may take a moment to connect.
