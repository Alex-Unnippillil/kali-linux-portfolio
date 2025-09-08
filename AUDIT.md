# Architecture Map

## Windowing System
- `components/base/window.js` – class-based window component handling drag, snap and analytics reporting.
- `src/wm/WindowSwitcher.tsx` – Alt+Tab overlay with keyboard navigation for open windows.
- `src/wm/placement.ts` and `keybindingManager.ts` – helpers for window placement and shortcuts.

## Dynamic App Loader
- `utils/createDynamicApp.js` – wraps `next/dynamic` imports with error boundaries and retry UI.
- `utils/prefetchDynamicImport.js` – network-aware prefetch helper limiting downloads to small bundles.

## SEO / Meta
- README references `components/SEO/Meta.js` for meta tags and JSON‑LD, but the file is absent, suggesting SEO handling is currently fragmented.

## Service Worker & PWA
- `worker/index.ts` – custom offline/cache logic and periodic sync prefetching.
- `pages/_app.jsx` – registers the service worker and handles periodic sync permissions.
- `next.config.js` – integrates `@ducanh2912/next-pwa` and sets build‑time CSP headers.

## Middleware & CSP
- `middleware.ts` – locale redirects, runtime nonce generation, and Content‑Security‑Policy injection.
- `next.config.js` – static security headers applied in production builds.

## Tests & Verification
- Unit tests under `__tests__/` run with Jest; Playwright E2E tests in `tests/`.
- Accessibility tests configured in `pa11yci.json`.
- Bundle size limits enforced by `bundle-budgets.json`.

# Findings

| # | Issue | Sev. | Effort | Impact |
|---|-------|------|--------|--------|
|1|CSP in `middleware.ts` uses `'unsafe-inline'`.|🔥 High|💡 S|💥 H|
|2|CSP in `next.config.js` also uses `'unsafe-inline'`.|🔥 High|💡 M|💥 H|
|3|No `worker-src` directive in CSP.|🔥 Med.|💡 S|💥 Med.|
|4|Service worker prefetch list is hardcoded.|🔥 Med.|💡 M|💥 Med.|
|5|SW `fetch` handler handles all methods.|🔥 Med.|💡 S|💥 Med.|
|6|`manualRefresh` assumes registration is ready.|🔥 Low|💡 S|💥 Med.|
|7|No user notice when a new SW takes control.|🔥 Med.|💡 M|💥 Med.|
|8|Dynamic app loader logs only to console.|🔥 Med.|💡 S|💥 Med.|
|9|Retry in loader reloads entire page.|🔥 Low|💡 S|💥 Med.|
|10|Prefetch helper unused in loader.|🔥 Low|💡 S|💥 Low|
|11|WindowSwitcher icons lack alt text.|🔥 Low|💡 S|💥 Med.|
|12|WindowSwitcher lacks dialog roles.|🔥 Low|💡 S|💥 Low|
|13|`window.js` remains class‑based JS.|🔥 Med.|💡 L|💥 H|
|14|Event listeners in `window.js` managed manually.|🔥 Low|💡 M|💥 Med.|
|15|Central SEO component missing.|🔥 Med.|💡 M|💥 H|
|16|Bundle budgets ignore vendor chunk.|🔥 Low|💡 S|💥 Med.|
|17|Accessibility script not part of verify pipeline.|🔥 Med.|💡 S|💥 Med.|
|18|No Jest coverage for SW offline path.|🔥 Low|💡 M|💥 Med.|
|19|SW prefetch failures are silent.|🔥 Low|💡 S|💥 Low|
|20|`pa11yci.json` misses key routes.|🔥 Low|💡 S|💥 Med.|

### Suggested Diffs

<details><summary>1. Remove `'unsafe-inline'` in middleware CSP</summary>

```diff
--- a/middleware.ts
+++ b/middleware.ts
@@
-      `script-src 'self' 'unsafe-inline' 'nonce-${n}' https://vercel.live https://*.twitter.com https://*.twimg.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://sdk.scdn.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
+      `script-src 'self' 'nonce-${n}' https://vercel.live https://*.twitter.com https://*.twimg.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://sdk.scdn.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
```
</details>

<details><summary>2. Remove `'unsafe-inline'` in `next.config.js`</summary>

```diff
--- a/next.config.js
+++ b/next.config.js
@@
-  "script-src 'self' 'unsafe-inline' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://sdk.scdn.co",
+  "script-src 'self' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://sdk.scdn.co",
```
</details>

<details><summary>3. Add `worker-src` directive</summary>

```diff
--- a/middleware.ts
+++ b/middleware.ts
@@
-    "form-action 'self'"
+    "form-action 'self'",
+    "worker-src 'self'"
     ].join('; ');
```
</details>

<details><summary>4. Generate SW asset list</summary>

```diff
--- a/worker/index.ts
+++ b/worker/index.ts
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
+import precacheManifest from '../precache-manifest.json';
+const ASSETS = precacheManifest.map(({ url }) => url);
```
</details>

<details><summary>5. Restrict SW fetch to GET</summary>

```diff
--- a/worker/index.ts
+++ b/worker/index.ts
@@
-  const { request } = event;
-  const url = new URL(request.url);
+  const { request } = event;
+  if (request.method !== 'GET') return;
+  const url = new URL(request.url);
```
</details>

<details><summary>6. Await service worker readiness</summary>

```diff
--- a/pages/_app.jsx
+++ b/pages/_app.jsx
@@
-          const registration = await navigator.serviceWorker.register('/service-worker.js');
-
-          window.manualRefresh = () => {
-            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
-            clients.claim();
-          };
+          const registration = await navigator.serviceWorker.register('/service-worker.js');
+          await navigator.serviceWorker.ready;
+          window.manualRefresh = () => {
+            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
+            clients.claim();
+          };
```
</details>

<details><summary>7. Notify users of SW updates</summary>

```diff
--- a/pages/_app.jsx
+++ b/pages/_app.jsx
@@
           registration.addEventListener('updatefound', () => {
             const installing = registration.installing;
             if (!installing) return;
             installing.addEventListener('statechange', () => {
               if (
                 installing.state === 'installed' &&
                 navigator.serviceWorker.controller
               ) {
                 registration.update();
               }
             });
           });
+
+          registration.addEventListener('controllerchange', () => {
+            window.dispatchEvent(new Event('sw-update'));
+          });
```
</details>

<details><summary>8. Structured error logging in loader</summary>

```diff
--- a/utils/createDynamicApp.js
+++ b/utils/createDynamicApp.js
@@
-        logEvent({ category: 'Application', action: `Loaded ${title}` });
-        return mod.default;
-      } catch (err) {
-          console.error(`Failed to load ${title}`, err);
+        logEvent({ category: 'Application', action: `Loaded ${title}` });
+        return mod.default;
+      } catch (err) {
+          logEvent({ category: 'Application', action: `Load failed: ${title}`, label: err?.message });
+          console.error(`Failed to load ${title}`, err);
```
</details>

<details><summary>9. Retry without full reload</summary>

```diff
--- a/utils/createDynamicApp.js
+++ b/utils/createDynamicApp.js
@@
-          const Fallback = () => {
-            const handleRetry = () => window.location.reload();
+          const Fallback = () => {
+            const handleRetry = () => DynamicApp.preload?.();
             return (
```
</details>

<details><summary>10. Use prefetch helper</summary>

```diff
--- a/utils/createDynamicApp.js
+++ b/utils/createDynamicApp.js
@@
-import { logEvent } from './analytics';
+import { logEvent } from './analytics';
+import prefetchDynamicImport from './prefetchDynamicImport';
@@
   const DynamicApp = dynamic(
@@
   );
+  if (typeof window !== 'undefined') {
+    prefetchDynamicImport(DynamicApp.preload, `/apps/${id}.js`);
+  }
```
</details>

<details><summary>11. Alt text for WindowSwitcher icons</summary>

```diff
--- a/src/wm/WindowSwitcher.tsx
+++ b/src/wm/WindowSwitcher.tsx
@@
-            <img src={win.icon} alt="" style={{ width: '32px', height: '32px' }} />
+            <img src={win.icon} alt={`${win.title} icon`} style={{ width: '32px', height: '32px' }} />
```
</details>

<details><summary>12. Dialog semantics for WindowSwitcher</summary>

```diff
--- a/src/wm/WindowSwitcher.tsx
+++ b/src/wm/WindowSwitcher.tsx
@@
-      <div
-        className="window-switcher-overlay"
+      <div
+        className="window-switcher-overlay"
+        role="dialog"
+        aria-modal="true"
         style={{
```
</details>

<details><summary>13. Convert window component to functional TypeScript</summary>

```diff
-// components/base/window.js
-class Window extends Component {
-  // ...
-}
+// components/base/window.tsx
+export function Window(props: WindowProps) {
+  const [state, setState] = useState(/* ... */);
+  // ...
+}
```
</details>

<details><summary>14. Manage listeners with `useEffect`</summary>

```diff
-  componentDidMount() {
-    window.addEventListener('resize', this.debouncedResizeBoundries);
-    // ...
-  }
-  componentWillUnmount() {
-    window.removeEventListener('resize', this.debouncedResizeBoundries);
-  }
+  useEffect(() => {
+    window.addEventListener('resize', debouncedResizeBoundries);
+    return () => window.removeEventListener('resize', debouncedResizeBoundries);
+  }, [debouncedResizeBoundries]);
```
</details>

<details><summary>15. Central SEO meta component</summary>

```diff
+// components/SEO/Meta.tsx
+import Head from 'next/head';
+
+export default function Meta({ title, description, url }) {
+  return (
+    <Head>
+      <title>{title}</title>
+      <meta name="description" content={description} />
+      <link rel="canonical" href={url} />
+      <meta property="og:title" content={title} />
+      <meta property="og:description" content={description} />
+      <meta property="og:url" content={url} />
+    </Head>
+  );
+}
```
</details>

<details><summary>16. Expand bundle budgets</summary>

```diff
--- a/bundle-budgets.json
+++ b/bundle-budgets.json
@@
   "^chunks/framework": 300000,
-  "^chunks/main-app": 350000
+  "^chunks/main-app": 350000,
+  "^chunks/react": 150000
 }
```
</details>

<details><summary>17. Include a11y in verify pipeline</summary>

```diff
--- a/package.json
+++ b/package.json
@@
-    "verify:all": "node --import tsx/esm scripts/verify.mjs",
+    "verify:all": "node --import tsx/esm scripts/verify.mjs && yarn a11y",
```
</details>

<details><summary>18. Jest test for SW offline path</summary>

```diff
+// __tests__/service-worker.offline.test.ts
+import { readFileSync } from 'fs';
+
+test('offline fallback is referenced', () => {
+  const sw = readFileSync('worker/index.ts', 'utf8');
+  expect(sw).toContain('/offline.html');
+});
```
</details>

<details><summary>19. Log SW prefetch errors</summary>

```diff
--- a/worker/index.ts
+++ b/worker/index.ts
@@
-      } catch {
-        // Ignore individual failures
-      }
+      } catch (err) {
+        console.warn('SW prefetch failed', url, err);
+      }
     }),
```
</details>

<details><summary>20. Add route to `pa11yci.json`</summary>

```diff
--- a/pa11yci.json
+++ b/pa11yci.json
@@
     "http://localhost:3000/apps/todoist",
+    "http://localhost:3000/daily-quote"
   ],
```
</details>

# Milestones

## Milestone 1 – Security & Reliability
**Scope:** Issues 1–7, 16, 19.

**Acceptance Criteria**
- CSP headers contain no `'unsafe-inline'` and include `worker-src`.
- Service worker loads asset list from manifest and handles non‑GET requests.
- Bundle budget check passes with new vendor rule.
- Prefetch failures logged in development.

**Exit Checks**
- `curl -I` shows updated CSP.
- `yarn check-budgets` succeeds.
- Offline navigation works after `yarn build && yarn start` and logs on failures.

## Milestone 2 – UX & Accessibility
**Scope:** Issues 7, 10–12, 15, 20.

**Acceptance Criteria**
- WindowSwitcher announces icons and acts as a modal dialog.
- Meta component applied to main pages with correct tags.
- pa11y covers the new route and passes in default & high‑contrast modes.

**Exit Checks**
- `yarn a11y` reports zero violations.
- Manual test shows SW update toast when a new worker activates.
- `View Source` includes canonical and OG meta tags.

## Milestone 3 – Maintainability & Testing
**Scope:** Issues 8–9, 13–14, 17–18.

**Acceptance Criteria**
- Dynamic app loader logs structured errors and retries without page reload.
- Window component rewritten to functional TypeScript with hook‑based listeners.
- `verify:all` runs unit, a11y and bundle checks.
- New Jest test passes and increases coverage.

**Exit Checks**
- `yarn verify:all` succeeds.
- `git grep class Window` returns no matches in `components/base`.
- Jest coverage report includes `service-worker.offline.test.ts`.

# Risk Log
- Removing `'unsafe-inline'` may break inline scripts; audit all `<Script>` usages.
- Service worker refactor could invalidate caches for existing users.
- Converting the window component may introduce regression in drag/snap behaviors; requires thorough manual testing.
- Expanding test suite increases CI time; consider parallelization.

# How to Verify
1. `yarn lint`
2. `yarn test`
3. `yarn a11y`
4. `yarn check-budgets`
