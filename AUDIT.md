# Architecture Map

## Windowing System
- `components/base/window.js` – draggable, resizable window shell with analytics hooks.
- `src/wm/WindowSwitcher.tsx` – Alt+Tab overlay for switching between open windows.
- `src/wm/placement.ts` and `src/wm/keybindingManager.ts` – helpers for window placement and shortcuts.

## Dynamic App Loader
- `utils/createDynamicApp.js` – wraps `next/dynamic` with error boundaries and retry UI.
- `utils/prefetchDynamicImport.js` – HEAD-prefetch helper that skips large bundles.

## SEO / Meta
- No central `components/SEO/Meta.js`; meta tags are scattered across pages.

## Service Worker & PWA
- `worker/index.ts` – offline cache, periodicSync and custom fetch handlers.
- `pages/_app.jsx` – registers the service worker and periodic sync permissions.
- `next.config.js` – integrates `@ducanh2912/next-pwa` and precache manifest.

## Middleware & CSP
- `middleware.ts` – locale redirect, nonce generation and CSP header injection.
- `next.config.js` – additional static security headers.

## Tests & Verification
- Jest unit tests under `__tests__`; Playwright E2E tests in `tests/`.
- `pa11yci.json` – accessibility scans with axe and HTMLCS.
- `bundle-budgets.json` – per-chunk size limits enforced in CI.

# Findings

| # | Issue | Severity | Effort | Impact |
|---|-------|----------|--------|--------|
|1|Missing `worker-src` directive in CSP|High|S|High|
|2|Placeholder domains (`example.com`) in CSP|Medium|S|Medium|
|3|AdvancedTab CSP snippet still uses `'unsafe-inline'`|Medium|S|Medium|
|4|Plugin manager iframe CSP uses `'unsafe-inline'`|High|M|High|
|5|`manualRefresh` references `clients` in page context|Medium|S|Medium|
|6|No user notification when new service worker installed|Medium|M|Medium|
|7|Service worker `fetch` handles non‑GET requests|Medium|S|Medium|
|8|Service worker caches cross-origin requests|High|S|High|
|9|Hardcoded prefetch asset list in service worker|Medium|M|Medium|
|10|Prefetch assets lack timeout/abort|Low|S|Low|
|11|Dynamic app loader retry reloads entire page|Medium|M|Medium|
|12|Dynamic loader failure not reported to analytics|Low|S|Low|
|13|`prefetchDynamicImport` missing abort controller|Low|S|Low|
|14|`pa11yci.json` hardcodes `http://localhost:3000`|Low|S|Low|
|15|`bundle-budgets.json` not integrated in verify script|Medium|S|Medium|
|16|Missing centralized SEO meta component|Medium|M|Medium|
|17|Window component written in class-based JS|Low|L|Medium|
|18|Window component relies on manual DOM queries|Medium|M|Medium|
|19|AdvancedTab includes sample domain `example.com`|Low|S|Low|
|20|No automated test for service worker offline fallback|Medium|M|Medium|

## Issue Details

<details><summary>1. Add `worker-src` to CSP</summary>

```diff
--- middleware.ts
@@
-    "form-action 'self'"
+    "form-action 'self'",
+    "worker-src 'self'"
   ].join('; ');
```

</details>

<details><summary>2. Remove placeholder domains from CSP</summary>

```diff
--- middleware.ts
@@
-    "connect-src 'self' https://example.com https://*.twitter.com https://*.twimg.com https://*.x.com https://*.google.com https://stackblitz.com",
+    "connect-src 'self' https://*.twitter.com https://*.twimg.com https://*.x.com https://*.google.com https://stackblitz.com",
@@
-    "frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://react.dev https://example.com",
+    "frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://react.dev",
```

</details>

<details><summary>3. Update AdvancedTab snippet to drop `'unsafe-inline'`</summary>

```diff
--- apps/settings/components/AdvancedTab.tsx
@@
-  "script-src 'self' 'unsafe-inline' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://sdk.scdn.co",
+  "script-src 'self' 'nonce-<nonce>' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://sdk.scdn.co",
```

</details>

<details><summary>4. Restrict plugin manager iframe CSP</summary>

```diff
--- components/apps/plugin-manager/index.tsx
@@
-      const html = `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; connect-src 'none';"></head><body><script>${manifest.code}<\\/script></body></html>`;
+      const html = `<!DOCTYPE html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'self'; connect-src 'none';"></head><body><script src="plugin.js"><\\/script></body></html>`;
+      const scriptBlob = new Blob([manifest.code], { type: 'text/javascript' });
+      const scriptURL = URL.createObjectURL(scriptBlob);
+      const sanitized = html.replace('plugin.js', scriptURL);
```

</details>

<details><summary>5. Guard `manualRefresh` against missing registration</summary>

```diff
--- pages/_app.jsx
@@
-          window.manualRefresh = () => {
-            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
-            clients.claim();
-          };
+          window.manualRefresh = () => {
+            if (registration.waiting) {
+              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
+            }
+          };
```

</details>

<details><summary>6. Notify users when a new service worker is installed</summary>

```diff
--- pages/_app.jsx
@@
-              if (
-                installing.state === 'installed' &&
-                navigator.serviceWorker.controller
-              ) {
-                registration.update();
-              }
+              if (
+                installing.state === 'installed' &&
+                navigator.serviceWorker.controller
+              ) {
+                alert('A new version is available. Refresh to update.');
+              }
             });
```

</details>

<details><summary>7. Ignore non‑GET requests in service worker</summary>

```diff
--- worker/index.ts
@@
 self.addEventListener("fetch", (event: FetchEvent) => {
   const { request } = event;
-  const url = new URL(request.url);
-
-  if (url.pathname.startsWith("/apps/")) {
+  const url = new URL(request.url);
+  if (request.method !== "GET") return;
+  if (url.pathname.startsWith("/apps/")) {
```

</details>

<details><summary>8. Restrict caching to same-origin requests</summary>

```diff
--- worker/index.ts
@@
-  if (request.mode === "navigate") {
+  if (url.origin !== self.location.origin) return;
+  if (request.mode === "navigate") {
```

</details>

<details><summary>9. Load prefetch asset list from build manifest</summary>

```diff
--- worker/index.ts
@@
-const ASSETS = [
-  "/apps/weather.js",
-  "/feeds",
-  "/about",
-  "/projects",
-  "/projects.json",
-  "/apps",
-  "/apps/weather",
-  "/apps/terminal",
-  "/apps/checkers",
-  "/offline.html",
-  "/offline.css",
-  "/offline.js",
-  "/manifest.webmanifest",
-];
+const ASSETS: string[] = (self as any).__WB_MANIFEST || [];
```

</details>

<details><summary>10. Abort long-running prefetch requests</summary>

```diff
--- worker/index.ts
@@
-        const response = await fetch(url, { cache: "no-cache" });
+        const controller = new AbortController();
+        const response = await fetch(url, { cache: "no-cache", signal: controller.signal });
+        setTimeout(() => controller.abort(), 10000);
```

</details>

<details><summary>11. Retry dynamic app loading without full page reload</summary>

```diff
--- utils/createDynamicApp.js
@@
-            const handleRetry = () => window.location.reload();
+            const handleRetry = () => DynamicApp.preload();
```

</details>

<details><summary>12. Report dynamic loader failures to analytics</summary>

```diff
--- utils/createDynamicApp.js
@@
-          console.error(`Failed to load ${title}`, err);
+          console.error(`Failed to load ${title}`, err);
+          logEvent({ category: 'Application', action: `Error ${title}` });
```

</details>

<details><summary>13. Use `AbortController` in `prefetchDynamicImport`</summary>

```diff
--- utils/prefetchDynamicImport.js
@@
-  fetch(url, { method: 'HEAD' })
+  const controller = new AbortController();
+  fetch(url, { method: 'HEAD', signal: controller.signal })
@@
-    .catch(() => schedulePrefetch(prefetchFn));
+    .catch(() => schedulePrefetch(prefetchFn));
+  setTimeout(() => controller.abort(), 5000);
```

</details>

<details><summary>14. Parameterize base URL in pa11y config</summary>

```diff
--- pa11yci.json
@@
-    "http://localhost:3000/",
-    "http://localhost:3000/apps",
+    "${BASE_URL}/",
+    "${BASE_URL}/apps",
```

</details>

<details><summary>15. Enforce bundle budgets in verification script</summary>

```diff
--- package.json
@@
-    "verify:all": "node --import tsx/esm scripts/verify.mjs",
+    "verify:all": "node --import tsx/esm scripts/verify.mjs && yarn check-budgets",
```

</details>

<details><summary>16. Add central SEO `Meta` component</summary>

```diff
+// components/SEO/Meta.tsx
+export default function Meta({ title, description }: { title: string; description: string }) {
+  return (
+    <>
+      <title>{title}</title>
+      <meta name="description" content={description} />
+    </>
+  );
+}
```

</details>

<details><summary>17. Convert window component to TypeScript function</summary>

```diff
--- components/base/window.js
+++ components/base/Window.tsx
@@
-import { isBrowser } from '@/utils/env';
-import React, { Component } from 'react';
+import { isBrowser } from '@/utils/env';
+import { useEffect, useRef, useState } from 'react';
@@
-export class Window extends Component {
-    static defaultProps = { isFocused: true, zIndex: 1 };
-    constructor(props) { /* ... */ }
-    componentDidMount() { /* ... */ }
-    /* ... */
-}
+export function Window(props: WindowProps) {
+  const rootRef = useRef<HTMLDivElement>(null);
+  const [state, setState] = useState({ /* ... */ });
+  useEffect(() => { /* mount logic */ }, []);
+  return <div ref={rootRef}>{props.children}</div>;
+}
```

</details>

<details><summary>18. Replace manual DOM queries with refs</summary>

```diff
--- components/base/window.js
@@
-        const root = document.getElementById(this.id);
+        const root = this.rootRef.current;
```

</details>

<details><summary>19. Drop `example.com` from domain list</summary>

```diff
--- apps/settings/components/AdvancedTab.tsx
@@
-  { domain: "example.com", allowed: true, purpose: "Chrome demo" },
```

</details>

<details><summary>20. Add offline fallback test</summary>

```diff
+// tests/offline.spec.ts
+import { test, expect } from '@playwright/test';
+test('offline fallback renders', async ({ page }) => {
+  await page.goto('/offline.html');
+  await expect(page.locator('body')).toContainText('Offline');
+});
```

</details>

# Milestones

## Milestone 1 – Security & CSP
- [ ] Issues 1–5, 14, 15, 19
- **Exit check:** production build sends CSP without `example.com`, includes `worker-src`, and `yarn verify:all` passes including budgets.

## Milestone 2 – PWA & Performance
- [ ] Issues 6–10, 20
- **Exit check:** service worker passes manual update test, offline test succeeds, and no non‑GET or cross-origin requests cached.

## Milestone 3 – UX & Maintainability
- [ ] Issues 11–13, 16–18
- **Exit check:** dynamic apps retry without reload, Meta component used by pages, window refactor compiles under `tsc`.

# Risk Log

| Risk | Mitigation |
|------|------------|
| Removing domains from CSP could break embedded content | Verify external embeds after each change |
| Dynamic import retries may still fail on network errors | Log errors and surface to user |
| Window refactor may introduce regressions | Convert incrementally and add tests |

# How to verify

```bash
# install deps
corepack enable && yarn install

# type checking and lint
yarn typecheck

# run unit tests
yarn test

# accessibility scan
BASE_URL=http://localhost:3000 yarn a11y

# bundle size budgets
yarn check-budgets
```
