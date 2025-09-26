# PWA & Offline Support

This project ships as a Progressive Web App using [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa). The plugin runs at build time and writes a Workbox-powered service worker to `public/sw.js`, so every production build or export packages the offline runtime alongside the static assets.

## Build-time configuration

- The service worker is generated during `next build` with `dest: 'public'` so the output lives at `/sw.js`, and it is skipped in development builds for faster iteration.【F:next.config.js†L64-L85】
- `navigateFallback` is pointed at `/offline.html`, and key marketing and utility routes are added to the precache manifest via `additionalManifestEntries`. These entries are shipped without revisions so they can be edited without bumping hashes, but they still benefit from offline caching once fetched.【F:next.config.js†L69-L83】
- In production the client registers the generated worker from `_app.jsx`. On successful registration it exposes `window.manualRefresh` to trigger an update and attempts to opt into periodic background sync when the browser allows it.【F:pages/_app.jsx†L47-L79】

## Offline experience

- When navigation falls back, the browser serves `public/offline.html`, which provides a retry button and a list of cached apps so users can reopen experiences that were previously loaded.【F:public/offline.html†L1-L20】【F:public/offline.js†L1-L36】
- The offline helper script inspects every cache the worker manages, looks for entries under `/apps/`, and renders friendly links. Errors are caught and converted into helpful UI so the fallback stays accessible even if the Cache Storage API is unavailable.【F:public/offline.js†L6-L36】
- Because registration happens only in production builds, developers can rely on live reload and React Fast Refresh during development without worrying about stale caches, then validate the offline path via `yarn build && yarn start` or a static export preview.【F:pages/_app.jsx†L47-L79】

## Cache naming and build IDs

- The Workbox runtime defines named caches such as `start-url`, `next-static-js-assets`, and `next-image` to separate navigation requests, precached bundles, and runtime image optimization. These names show up in the offline helper UI when enumerating cached content.【F:public/sw.js†L1-L1】【F:public/offline.js†L9-L20】
- Every precached Next.js bundle is served from `/_next/static/<build-id>/…`. The build ID (for example `Kr6lLV3N4QcgzqzHuuiHe`) is baked into the precache manifest inside `sw.js`, so deploying a new build automatically points clients at a fresh cache namespace.【F:public/sw.js†L1-L1】

## Cache-busting checklist

Follow these steps whenever you need to invalidate cached assets:

1. Run `yarn build` (or the CI build) so `@ducanh2912/next-pwa` produces a new `sw.js` alongside a new Next.js build ID. When deployed, clients download the new worker, which references the updated `/_next/static/<build-id>` paths and leaves the old caches to be cleaned up by Workbox.【F:next.config.js†L64-L85】【F:public/sw.js†L1-L1】
2. After a deployment, prompt users to refresh by calling `window.manualRefresh()` from the browser console or by wiring a UI affordance to that helper; it invokes `registration.update()` and speeds up the worker swap.【F:pages/_app.jsx†L47-L71】
3. If you modify files listed in `additionalManifestEntries` (such as `/offline.html` or `/manifest.webmanifest`), update their `revision` fields or change the URL so the service worker picks up the new payload immediately. Otherwise Workbox will reuse the cached response until a hard refresh clears it.【F:next.config.js†L69-L83】
4. For stubborn caches in the field, instruct users to clear storage via the browser application panel, or ship a one-off change that temporarily removes the affected URL from `additionalManifestEntries`, deploy, and then add it back with a fresh revision tag.【F:next.config.js†L69-L83】

With these guardrails, the portfolio keeps its desktop-like experience available offline while still allowing maintainers to ship updates without leaving users stuck on stale assets.
