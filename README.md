# Roblox Studio Web

A browser-based Studio UI prototype with a local-only Roblox session bridge.

## Local Roblox connection

The `.ROBLOSECURITY` credential is read only by `server.mjs`. It is never bundled into the frontend, returned by an API response, or stored in browser storage.

1. Copy `.env.example` to `.env.local`.
2. Sign in at `https://www.roblox.com/login` and place your own cookie value in `ROBLOX_COOKIE`.
3. Run `npm run local` (the checked-in production bundle is served directly).
4. Open `http://127.0.0.1:4173`.

The server binds to `127.0.0.1` by default and exposes only two read-only routes:

- `GET /api/roblox/session` validates the current user.
- `GET /api/roblox/toolbox` searches the Creator Marketplace.

Do not deploy `.env.local`, commit it, paste the credential into browser code, or change `HOST` to `0.0.0.0` on an untrusted network. Revoking the Roblox session invalidates the cookie.

## Commands

- `npm run dev` starts the UI-only Vite development server.
- `npm run build` creates the production bundle.
- `npm run local` starts the bundled UI and local Roblox bridge.
- `npm start` serves an existing `dist` bundle through the local bridge.

On Android shared storage (`/sdcard`), native Vite/Rollup binaries may not execute because of mount restrictions. `npm run local` does not rebuild, so it remains usable there; rebuild from an app-private or regular Linux filesystem when changing the frontend source.
