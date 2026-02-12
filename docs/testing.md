# Testing Expectations

## Playwright Coverage for Minesweeper

The `playwright/minesweeper.spec.ts` scenario exercises the desktop windowed
Minesweeper app end-to-end:

- The desktop boot and lock screens are skipped via local storage so the test can
  reach the dock instantly.
- Minesweeper is launched from the application grid, and the in-app tutorial
  overlay is dismissed if present.
- The Intermediate session is reproduced with the share code `1-0-0`, which
  expands to seed `1` and a top-left starting reveal. The generator logic in the
  spec matches the app implementation so that the remaining safe cells can be
  solved deterministically.
- All unrevealed safe cells for that board are clicked until the "You win!"
  banner appears. During the run the spec subscribes to the `fps` pub/sub channel
  exposed by `PerfOverlay` and asserts that more than 20 samples were collected
  with a minimum frame rate above 30 FPS and a maximum below 120 FPS.
- The reset face button is pressed five times. After each reset the script opens
  a new board by clicking the centre cell to ensure timers, animation loops and
  FPS tracking continue to run.
- Closing the window triggers teardown checks: the Minesweeper window node,
  canvas, and "Export JSON" control disappear, the FPS sample buffer stops
  growing after a short wait, and the perf subscription is explicitly
  unsubscribed.

## Maintenance Notes

- Any change to the Minesweeper generator, canvas size, or share code format
  must be reflected in the helper functions inside the spec and in the expected
  board layout described above.
- If additional canvases are introduced on the desktop, update the cleanup
  assertions so they target Minesweeper-specific nodes (e.g. `#minesweeper`)
  while still verifying that FPS samples stop increasing post-close.
