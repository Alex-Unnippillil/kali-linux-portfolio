# Testing Gates

## Playwright: 2048 Autoplay Stability

This Playwright spec guards against regressions in the 2048 desktop app by launching it in the window manager, running an automated play session, and checking cleanup behavior.

- **Run command:** `npx playwright test playwright/2048.spec.ts`
  - In CI the spec relies on `BASE_URL` or the default `http://localhost:3000`; ensure a dev server is listening before invoking it locally.
- **Scenario:** the test dispatches the `open-app` custom event to open 2048, applies 100 keyboard moves, triggers a restart, and uses the in-app **Close** button to dismiss the window.
- **Memory guard:** it samples `performance.memory.usedJSHeapSize` before opening the game and after the window is torn down. The run fails (and logs a `console.error`) if heap growth exceeds 5 MB.
- **Listener guard:** the spec injects an init script that wraps `addEventListener` / `removeEventListener` for `window` and `document`. After closing the app it asserts the listener counts match the pre-launch snapshot.
- **Frame metrics:** during the session it gathers 60 animation frame deltas, attaches the average/max to the Playwright report, and logs a failure if any frame exceeds 50 ms before failing the test.

Use this gate after changes to the 2048 implementation, the desktop window manager, or shared event/memory infrastructure to ensure interactive stability.
