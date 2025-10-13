# Service worker Playwright scenarios

These end-to-end checks validate the PWA behaviour that is easiest to regress: the offline fallback page and the toast that prompts users to reload when a new build is ready.

## Prerequisites

1. Build the production bundle so the service worker is generated.

   ```bash
   yarn build
   ```

2. Start the production server on a known port.

   ```bash
   yarn start -p 3000
   ```

3. Export `BASE_URL` before running the Playwright suite so it targets the running server.

   ```bash
   export BASE_URL="http://localhost:3000"
   ```

## Running the scenarios

Execute only the service worker focused spec while the server is running.

```bash
npx playwright test tests/service-worker.spec.ts
```

## Expected outcomes

* **Offline fallback** – After the page is controlled by the service worker, toggling the browser context offline and navigating to a new route should render `public/offline.html` with the “Offline” heading and helper text.
* **Update toast** – Simulating a `waiting` Workbox event should surface the “New update available. Reload to apply the latest changes.” toast with a “Reload now” action. Triggering the `controlling` event dismisses the toast and requests a reload.

If either assertion fails, clear the browser storage (`npx playwright test --project chromium --headed` is helpful for debugging), rebuild the project, and rerun the spec to capture the regression.

