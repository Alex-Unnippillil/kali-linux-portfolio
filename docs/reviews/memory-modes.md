# Memory game modes

The desktop Memory app ships with a handful of play styles and quality-of-life
features that are now backed by shared controls and persistent records.

## Modes

- **Count Up.** Classic score chase where the timer increments until every pair
  is matched. High scores store the fewest moves and fastest completion time
  for each grid size, deck style, and preview length.
- **Countdown.** Race the clock with default allotments (30s for 2×2, 60s for
  4×4, 120s for 6×6). The completion time that beats the buzzer with the lowest
  move count is saved.
- **Two player split.** Launch a second synchronized board to track versus
  matches. Each player’s pause, audio, and reset state is isolated, and their
  personal bests persist independently.
- **Timed Attack (demo shell).** The simplified `/games/memory` route offers a
  rapid-fire challenge that shares the same high score ledger as the desktop
  variant while using the GameShell pause and mute hooks.

## Shared controls

Both the desktop window and the demo shell use the new `MemoryControls`
component. It standardises pause/resume, reset, and audio toggles so keyboard
shortcuts, accessibility labels, and future theming can evolve in one place.

## Persistence

High score tracking now flows through a dedicated `recordMemoryScore` helper.
It stores the best (lowest) move/time pair for each configuration in
`localStorage`, automatically migrating corrupt data and exposing utilities for
test resets. The demo shell consumes the same helper so finishing a run in
either experience updates the shared ledger.

