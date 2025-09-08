# Progressive Web App

This project uses `next-pwa` with a custom service worker (`sw.ts`) built via Workbox's `injectManifest` mode. The worker allows fine grained control over how each asset is cached so new deployments remain predictable while the site stays fast offline.

## Caching strategy

| Route / Asset | Strategy | Notes |
|---------------|----------|-------|
| `/icons/*` | `StaleWhileRevalidate` | icons update in the background while the last copy serves immediately |
| `/projects.json` | `NetworkFirst` | always try the network for the app index; falls back to cache when offline |
| `/wallpapers/*` | `CacheFirst` | large background images are cached once and reused |
| `/apps/*` | `CacheFirst` | game assets load from cache for instant startup |
| navigation requests | network with offline fallback | `/offline.html` is returned when the network fails |

### Never cache
- API routes under `/api/*`
- authentication or user specific pages (`/admin`, `/private`)
- Next.js data requests (`/_next/data/*`)
- the service worker script itself (`/service-worker.js`) and the manifest

## Migration notes

Older builds used a generated service worker with broad runtime caching rules. Clients that still have the old worker should refresh once to pick up the new one. If problems persist, clear old caches from DevTools > Application > Storage and unregister any existing service workers.

## Manual test plan

1. `yarn build && yarn start` and load the site.
2. Open DevTools > Network and enable **Slow 3G** throttling.
3. Reload: icons come from cache while `/projects.json` fetches from the network.
4. Switch to **Offline** and navigate: `/offline.html` is shown.
5. Deploy a new build, reload the page and observe the "Update available" toast; click **Reload** to activate the update.
