# Architecture Map

## Windowing System
- `components/desktop/Window.tsx` – resizable, draggable window component with snap preview and z-index focus management.
- `src/wm/WindowSwitcher.tsx` – Alt+Tab overlay for switching windows.
- `src/wm/placement.ts`, `src/wm/keybindingManager.ts` – helpers for window placement and keyboard shortcuts.

## Dynamic App Loader
- `utils/createDynamicApp.js` – wraps `next/dynamic` imports with error boundaries and retry UI.
- `apps.config.js` – catalog of apps defined through `createDisplay` wrappers.

## SEO / Meta
- `lib/metadata.ts` – base metadata object for Next.js pages.
- Pages currently manage `<Head>` tags manually; no shared `Meta` component.

## Service Worker & PWA
- `workers/service-worker.js` – custom caching strategy and periodic sync.
- `pages/_app.jsx` – registers the service worker and periodic background sync.
- `next.config.js` – integrates `@ducanh2912/next-pwa` and precache manifest.

## Middleware & CSP
- `middleware.ts` – locale redirects, runtime CSP with nonce, security headers.
- `next.config.js` – production security headers and cache-control policies.

## Tests & Quality Gates
- Jest unit tests under `__tests__/` and Playwright E2E tests in `tests/`.
- Accessibility checks configured in `pa11yci.json`.
- Bundle size budgets tracked in `bundle-budgets.json`.

# Findings

| # | Issue | Severity | Effort | Impact |
|---|-------|----------|--------|--------|
|1|Missing `worker-src` in CSP (`middleware.ts`).|High|Small|Medium|
|2|Service worker uses hardcoded asset list.|Medium|Medium|Medium|
|3|SW `fetch` handler processes non-GET requests.|Medium|Small|Medium|
|4|`manualRefresh` assumes waiting worker exists.|Low|Small|Low|
|5|No user notice when a new service worker is ready.|Medium|Medium|High|
|6|Dynamic app loader logs only to console.|Low|Small|Medium|
|7|Retry in loader forces full page reload.|Low|Small|Low|
|8|`createDynamicApp` does not expose `preload`.|Low|Small|Medium|
|9|Frequent apps not prefetched.|Low|Small|Low|
|10|`Window` component lacks dialog role and ESC close.|Medium|Small|Medium|
|11|WindowSwitcher icons lack descriptive alt text.|Low|Small|Medium|
|12|WindowSwitcher overlay missing dialog semantics.|Low|Small|Low|
|13|WindowSwitcher does not announce selected window.|Low|Small|Low|
|14|Legacy class-based `components/base/window.js` remains.|Low|Medium|Medium|
|15|No shared Meta component for SEO.|Medium|Medium|High|
|16|Bundle budgets omit vendor chunk.|Low|Small|Medium|
|17|`verify:all` script omits lint and a11y checks.|Medium|Small|High|
|18|No Jest coverage for offline service worker path.|Low|Small|Medium|
|19|SW prefetch errors are silent.|Low|Small|Low|
|20|`pa11yci.json` misses `/daily-quote` route.|Low|Small|Low|

# Suggested Diffs

<details><summary>1. Add `worker-src` directive</summary>

```diff
--- a/middleware.ts
+++ b/middleware.ts
@@
   const csp = [
     "default-src 'self'",
     "img-src 'self' https: data:",
     "style-src 'self' https://fonts.googleapis.com",
     "font-src 'self' https://fonts.gstatic.com",
-    `script-src 'self' 'nonce-${n}' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.twimg.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://sdk.scdn.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
+    `script-src 'self' 'nonce-${n}' https://vercel.live https://platform.twitter.com https://syndication.twitter.com https://cdn.syndication.twimg.com https://*.twitter.com https://*.twimg.com https://*.x.com https://www.youtube.com https://www.google.com https://www.gstatic.com https://sdk.scdn.co https://cdn.jsdelivr.net https://cdnjs.cloudflare.com`,
     "connect-src 'self' https://example.com https://*.twitter.com https://*.twimg.com https://*.x.com https://*.google.com https://stackblitz.com",
     "frame-src 'self' https://vercel.live https://stackblitz.com https://*.google.com https://*.twitter.com https://*.x.com https://www.youtube-nocookie.com https://open.spotify.com https://react.dev https://example.com",
     "frame-ancestors 'self'",
     "object-src 'none'",
     "base-uri 'self'",
-    "form-action 'self'"
+    "form-action 'self'",
+    "worker-src 'self'"
   ].join('; ');
```
</details>

<details><summary>2. Generate SW asset list from precache manifest</summary>

```diff
--- a/workers/service-worker.js
+++ b/workers/service-worker.js
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
-  "/manifest.webmanifest",
-];
+import precacheManifest from '../precache-manifest.json';
+const ASSETS = precacheManifest.map(({ url }) => url);
```
</details>

<details><summary>3. Guard non-GET requests in SW fetch</summary>

```diff
--- a/workers/service-worker.js
+++ b/workers/service-worker.js
@@
 self.addEventListener("fetch", (event) => {
   const { request } = event;
+  if (request.method !== "GET") return;
   const url = new URL(request.url);
```
</details>

<details><summary>4. Check for waiting worker in `manualRefresh`</summary>

```diff
--- a/pages/_app.jsx
+++ b/pages/_app.jsx
@@
-          window.manualRefresh = () => {
-            registration.waiting.postMessage({ type: 'SKIP_WAITING' });
-            clients.claim();
-          };
+          window.manualRefresh = () => {
+            if (registration.waiting) {
+              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
+              clients.claim();
+            }
+          };
```
</details>

<details><summary>5. Notify user when new SW is ready</summary>

```diff
--- a/pages/_app.jsx
+++ b/pages/_app.jsx
@@
             installing.addEventListener('statechange', () => {
               if (
                 installing.state === 'installed' &&
                 navigator.serviceWorker.controller
               ) {
-                registration.update();
+                alert('New version available. Refresh to update.');
+                registration.update();
               }
             });
           });
```
</details>

<details><summary>6. Structured logging for dynamic app errors</summary>

```diff
--- a/utils/createDynamicApp.js
+++ b/utils/createDynamicApp.js
@@
-      } catch (err) {
-          console.error(`Failed to load ${title}`, err);
+      } catch (err) {
+          logEvent({ category: 'Application', action: `Error loading ${title}` });
+          console.error(`Failed to load ${title}`, err);
           const Fallback = () => {
             const handleRetry = () => window.location.reload();
             return (
```
</details>

<details><summary>7. Retry dynamic load without full reload</summary>

```diff
--- a/utils/createDynamicApp.js
+++ b/utils/createDynamicApp.js
@@
-            const handleRetry = () => window.location.reload();
+            const handleRetry = () => DynamicApp.preload?.();
```
</details>

<details><summary>8. Expose `preload` from `createDynamicApp`</summary>

```diff
--- a/utils/createDynamicApp.js
+++ b/utils/createDynamicApp.js
@@
   const WrappedApp = (props) => (
     <ErrorBoundary>
       <DynamicApp {...props} />
     </ErrorBoundary>
   );
 
   WrappedApp.displayName = `${title}WithErrorBoundary`;
-  return WrappedApp;
+  WrappedApp.preload = DynamicApp.preload;
+  return WrappedApp;
 };
```
</details>

<details><summary>9. Prefetch terminal app on load</summary>

```diff
--- a/apps.config.js
+++ b/apps.config.js
@@
 const displayTerminal = createDisplay(TerminalApp);
+displayTerminal.prefetch();
```
</details>

<details><summary>10. Add dialog role and ESC close to `Window`</summary>

```diff
--- a/components/desktop/Window.tsx
+++ b/components/desktop/Window.tsx
@@
   const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
+  const handleKeyDown = (e: React.KeyboardEvent) => {
+    if (e.key === 'Escape') onClose?.();
+  };
@@
       <div
         ref={winRef}
+        role="dialog"
+        aria-label={title}
+        tabIndex={0}
+        onKeyDown={handleKeyDown}
         onPointerDown={bringToFront}
         style={{
```
</details>

<details><summary>11. Provide alt text for WindowSwitcher icons</summary>

```diff
--- a/src/wm/WindowSwitcher.tsx
+++ b/src/wm/WindowSwitcher.tsx
@@
-            <img src={win.icon} alt="" style={{ width: '32px', height: '32px' }} />
+            <img src={win.icon} alt={win.title} style={{ width: '32px', height: '32px' }} />
```
</details>

<details><summary>12. Add dialog semantics to WindowSwitcher overlay</summary>

```diff
--- a/src/wm/WindowSwitcher.tsx
+++ b/src/wm/WindowSwitcher.tsx
@@
-    <div
-      className="window-switcher-overlay"
-      style={{
+    <div
+      className="window-switcher-overlay"
+      role="dialog"
+      aria-modal="true"
+      style={{
```
</details>

<details><summary>13. Announce selected window in WindowSwitcher</summary>

```diff
--- a/src/wm/WindowSwitcher.tsx
+++ b/src/wm/WindowSwitcher.tsx
@@
-      <div
-        className="window-switcher-list"
-        style={{ display: 'flex', gap: '1rem' }}
-      >
+      <div
+        className="window-switcher-list"
+        aria-live="assertive"
+        style={{ display: 'flex', gap: '1rem' }}
+      >
```
</details>

<details><summary>14. Remove legacy `components/base/window.js`</summary>

```diff
--- a/components/base/window.js
+++ /dev/null
@@
-/* obsolete class-based window component */
```
</details>

<details><summary>15. Introduce shared `Meta` component</summary>

```diff
+++ b/components/Meta.tsx
+import Head from 'next/head';
+import { baseMetadata } from '../lib/metadata';
+
+export default function Meta({ title = baseMetadata.title, description = baseMetadata.description }) {
+  return (
+    <Head>
+      <title>{title}</title>
+      <meta name="description" content={description} />
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
 {
   "^chunks/framework": 250000,
-  "^chunks/main-app": 300000"
+  "^chunks/main-app": 300000,
+  "^chunks/react": 150000
 }
```
</details>

<details><summary>17. Run lint and a11y in verify script</summary>

```diff
--- a/package.json
+++ b/package.json
@@
-    "verify:all": "node --import tsx/esm scripts/verify.mjs",
+    "verify:all": "node --import tsx/esm scripts/verify.mjs && yarn lint && yarn a11y",
```
</details>

<details><summary>18. Add Jest test for SW offline path</summary>

```diff
+++ b/__tests__/service-worker.offline.test.ts
+import { readFileSync } from 'fs';
+
+test('offline fallback is referenced', () => {
+  const sw = readFileSync('workers/service-worker.js', 'utf8');
+  expect(sw).toContain('/offline.html');
+});
```
</details>

<details><summary>19. Log SW prefetch errors</summary>

```diff
--- a/workers/service-worker.js
+++ b/workers/service-worker.js
@@
-      } catch (err) {
-        // Ignore individual failures
-      }
+      } catch (err) {
+        console.warn('SW prefetch failed', url, err);
+      }
     }),
   );
 }
```
</details>

<details><summary>20. Add `/daily-quote` to pa11y run</summary>

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

## Milestone 1 – Security & Performance
**Scope:** Issues 1–5,16,19

**Acceptance Criteria**
- CSP includes `worker-src` and service worker asset list is manifest-driven.
- SW fetch handler only caches GET requests and warns on prefetch failures.
- Users are alerted to new SW versions.
- Bundle budget checks include vendor chunk.

**Exit Checks**
- `curl -I` responses show updated CSP.
- `yarn check-budgets` passes after build.
- Manual offline test confirms update alert and caching.

## Milestone 2 – UX & Accessibility
**Scope:** Issues 10–13,20

**Acceptance Criteria**
- Window component and switcher meet basic ARIA guidance.
- pa11y covers `/daily-quote` and reports no violations.

**Exit Checks**
- `yarn a11y` completes with zero errors.
- Keyboard and screen reader tests confirm dialog roles and announcements.

## Milestone 3 – Maintainability & Testing
**Scope:** Issues 6–9,14–18

**Acceptance Criteria**
- Dynamic app loader provides structured logs, retry without reload, and exposes `preload` used by terminal app.
- Legacy window component removed.
- Shared `Meta` component adopted.
- `verify:all` runs lint and a11y; Jest includes SW test.

**Exit Checks**
- `yarn verify:all` runs lint, a11y, and tests successfully.
- `git ls-files components/base/window.js` returns no results.
- `yarn test __tests__/service-worker.offline.test.ts` passes.

# Risk Log
- Updating CSP or service worker could break existing integrations; validate in staging first.
- Removing legacy window code may impact apps that still import it.
- New Meta component requires review of all pages to avoid duplicate tags.
- Additional checks increase CI time; monitor pipeline duration.

# How to Verify
1. `yarn lint AUDIT.md`
2. `yarn test __tests__/metadata.test.ts`
3. `yarn a11y`
4. `yarn check-budgets`
