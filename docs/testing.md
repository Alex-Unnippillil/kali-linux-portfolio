# Testing Gates

## Playwright

### YouTube app 1080p regression gate
- **Command:** `npx playwright test playwright/youtube.spec.ts`
- **Purpose:** Verifies the desktop YouTube app can play two 1080p videos end-to-end using the stubbed iframe API harness. The gate exercises playback controls, toggles theater mode and stats overlay, confirms both watch-later fixtures register playback in the harness, and ensures the window closes cleanly.
- **Quality bars:**
  - Both stubbed watch-later entries must report playback, ensuring two 1080p streams are exercised.
  - No console or page errors are emitted during the flow.
  - Cumulative Layout Shift must remain at or below 0.03 throughout the scenario.
  - Memory usage is sampled before and after the player window is closed to catch leaks; the after snapshot should not exceed the before snapshot by more than 10%.

Run this gate whenever you touch the YouTube desktop app, the fake YouTube harness, or the window manager to guard against regressions in media playback, layout stability, and teardown hygiene.
