# Testing and Performance Thresholds

This project relies on Playwright end-to-end tests to keep the desktop-style window manager
responsive and memory-efficient. The window orchestration workflow is exercised in
`playwright/tests/window-manager.spec.ts` and enforces the following limits:

- **Window manager input latency:** tiling, workspace switching inside Recon-ng, minimize,
  restore, and close affordances must acknowledge the input in **≤ 120&nbsp;ms**. The spec
  watches for the relevant DOM state transitions (snap transforms, minimized class toggles,
  workspace activation styles, and the `closed-window` flag) and fails if any interaction
  exceeds the budget.
- **Heap recovery:** after opening eight apps, tiling them, cycling workspaces, and restoring
  from the dock, the test captures `JSHeapUsedSize` via the Chrome DevTools Protocol. After all
  windows are closed the heap must fall to within **5&nbsp;%** of the pre-close reading.

During the run we also instrument `EventTarget.addEventListener` to surface `getEventListeners`
data and assert that no listeners remain attached to detached window nodes.

To execute the full suite locally run:

```bash
npx playwright test
```

The window manager spec assumes a Chromium runtime so Playwright should be allowed to install
its bundled browser binaries before running.
