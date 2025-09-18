# Tower Defense Playwright Coverage

The `tests/tower-defense.e2e.spec.ts` scenario automates a full endurance run of the Tower Defense simulator. It performs the following actions:

1. Launches the desktop shell, opens the Tower Defense app, and closes the tutorial overlay.
2. Draws two different map paths (one per session) while importing a 20-wave layout through the in-app JSON editor.
3. Starts each run, fast-forwards through all 20 waves via the Tower Defense test API, and verifies that the game reports completion.
4. Exercises the export/import workflow by saving the wave JSON after the first run, reloading the entire desktop, and re-importing the saved configuration before the second run.
5. Closes the app window at the end of each session to confirm that no requestAnimationFrame loops survive unmounting.

## Instrumentation

To keep the suite fast and deterministic the component exposes a small `window.__towerDefenseTestApi` object when it mounts. The API is only intended for automated tests and currently provides:

- `fastForward(totalMs, stepMs)` – temporarily suspends the render loop, advances the simulation clock, and then resumes the loop.
- `getState()` – reports the current wave, countdown timer, enemy count, and whether the simulation is running.
- `setPath`, `setWaves`, and `start` are also available for future tests but are not required by the current scenario.

The Playwright spec adds additional `requestAnimationFrame` and event-timing observers via `page.addInitScript()` so that it can assert:

- All scheduled animation frames are cancelled after the window closes.
- Click/tap event processing stays under 100 ms of latency.
- JavaScript heap usage stays within 10 MB of the baseline after closing the app.

## Running just this spec

```bash
npx playwright test tests/tower-defense.e2e.spec.ts
```

The test assumes a Chromium browser context because it relies on `performance.memory` and the Event Timing API.
