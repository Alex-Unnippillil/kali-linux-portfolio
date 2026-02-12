# Testing Overview

## Spotify playback regression

The `playwright/spotify.spec.ts` scenario exercises the desktop Spotify simulation, verifies audio cleanup, and ensures UI performance stays consistent.

### Prerequisites

- Start the Next.js server (for example `yarn dev` or `yarn start` after a production build).
- Install the Chromium browser for Playwright if it has not been downloaded yet:
  ```bash
  npx playwright install chromium
  ```
- Export `BASE_URL` if the app is served from a non-default port.

### Running the test

Run the end-to-end flow directly:

```bash
npx playwright test playwright/spotify.spec.ts --config=playwright.config.ts
```

The script drives the Ubuntu desktop shell, opens Spotify through the Whisker menu, imports a 10 track playlist, and repeatedly seeks while advancing the queue. Quick Settings is used to flip the theme before the Spotify window is closed.

### Assertions and instrumentation

- Network calls to external audio and lyric providers are stubbed with deterministic responses so the run is offline-friendly.
- WebAudio contexts are wrapped to confirm they close after the window is dismissed.
- Timers and animation frames scheduled while Spotify is open are tracked; the test asserts that none remain after closing the app.
- `page.metrics()` samples FPS before, during, and after playback to ensure frame rate stays within a steady range.

Review the spec for additional implementation details and helper utilities.
