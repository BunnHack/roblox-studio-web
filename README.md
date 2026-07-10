# Roblox Studio Web

A browser-based Studio UI prototype with a server-side Roblox session bridge. The UI can run as a static Netlify site while its two Roblox routes run as Netlify Functions.

## Netlify deployment

The checked-in `netlify.toml` builds the Vite app, deploys the functions, and maps these same-origin routes:

- `GET /api/roblox/session` validates the configured Roblox user.
- `GET /api/roblox/toolbox` searches the Creator Marketplace.

To enable the bridge:

1. Open the Netlify site's **Environment variables** settings.
2. Add `ROBLOX_COOKIE` with either the raw cookie value or the full `.ROBLOSECURITY=...` value.
3. Trigger a new deploy so the functions receive the variable.
4. Keep the site's access protection enabled and verify that both the site and its function URLs require the intended access.

The credential is read only at function runtime. It is not bundled into `dist`, returned by an API response, or stored in browser storage. Do not put it in a `VITE_*` variable because those values are exposed to frontend code.

## Local Roblox connection

The `.ROBLOSECURITY` credential is read only by `server.mjs`. It is never bundled into the frontend, returned by an API response, or stored in browser storage.

1. Copy `.env.example` to `.env.local`.
2. Sign in at `https://www.roblox.com/login` and place your own cookie value in `ROBLOX_COOKIE`.
3. Run `npm run local` (the checked-in production bundle is served directly).
4. Open `http://127.0.0.1:4173`.

The local server binds to `127.0.0.1` by default and exposes the same two read-only routes:

- `GET /api/roblox/session` validates the current user.
- `GET /api/roblox/toolbox` searches the Creator Marketplace.

Do not deploy `.env.local`, commit it, paste the credential into browser code, or change `HOST` to `0.0.0.0` on an untrusted network. Revoking the Roblox session invalidates the cookie. Netlify access protection and the Roblox credential are separate controls; keep both private.

## Commands

- `npm run dev` starts the UI-only Vite development server.
- `npm run build` creates the production bundle.
- `npm run local` starts the bundled UI and local Roblox bridge.
- `npm start` serves an existing `dist` bundle through the local bridge.

On Android shared storage (`/sdcard`), native Vite/Rollup binaries may not execute because of mount restrictions. `npm run local` does not rebuild, so it remains usable there; rebuild from an app-private or regular Linux filesystem when changing the frontend source.
