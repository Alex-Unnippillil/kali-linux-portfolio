# Testing notes

## Playwright desktop suites

The Playwright configuration now exposes two groups:

- **`apps-smoke`** – legacy smoke checks under `tests/` that ensure every `/apps/*` route renders.
- **`desktop-e2e`** – interaction-heavy specs in `playwright/` that simulate desktop workflows.

Run one or both projects with:

```bash
npx playwright test --project=desktop-e2e
npx playwright test --project=apps-smoke
```

## Wireshark performance gate

`playwright/wireshark.spec.ts` exercises the Wireshark simulation end to end:

1. Opens `/apps/wireshark` and loads the bundled HTTP capture from `public/samples/wireshark`.
2. Applies the HTTP preset filter, selects the first packet to “follow” the stream, and exports the active display filter via the Copy control.
3. Captures a Playwright trace and samples `window.performance.memory` before launching the capture and after navigating away. The test fails if the used JS heap grows by more than **5 MB**.
4. Scrolls the packet table while logging the measured frames-per-second as a test annotation to track UI responsiveness.
5. Fails on any browser console errors so regressions are caught quickly.

Keep these behaviours in mind when modifying the Wireshark app: memory, console hygiene, and scroll performance are now part of the automated acceptance criteria.
