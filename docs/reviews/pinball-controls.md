# Pinball Controls Cheat Sheet

The Pinball simulation follows the shared game overlay rules so all inputs are
available by keyboard, gamepad, or on-screen controls.

## Core actions

- **Left flipper:** `ArrowLeft`
- **Right flipper:** `ArrowRight`
- **Nudge:** `N` on the keyboard or the right bumper on a connected gamepad.
  Nudging more than three times in rapid succession will trigger a tilt lockout
  for three seconds.

## Overlay commands

- **Pause / Resume:** Use the pause button in the overlay (top right of the
  playfield). The physics loop halts while paused.
- **Reset:** The reset button drops a fresh ball, clears the current score, and
  releases the flippers to their default positions.
- **Mute / Sound:** Toggle audio feedback for bumper hits and scoring without
  affecting other apps.

## Persistence

- High scores are stored locally per browser. Resetting the table keeps the
  saved high score intact.

Keep the canvas focused for keyboard control and refresh the page if a gamepad
is reconnected and not detected immediately.
