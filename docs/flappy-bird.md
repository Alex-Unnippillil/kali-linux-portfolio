# Flappy Bird

## Overview

Flappy Bird is a canvas-driven arcade challenge focused on timing and rhythm. The goal is to keep the bird aloft while slipping through pipe gaps. The app now uses the shared GameLayout scaffolding, so pause, help, settings, and score HUDs are consistent with the other top-tier games.

## Controls

- **Flap**: Space (default), click/tap the play area, or press the primary gamepad button / push up on the stick.
- **Pause**: Use the toolbar pause button or the mapped Pause key (default: Escape).
- **Replay last run**: Press **R** on the game-over screen.

Key bindings for Flap and Pause can be remapped from the Settings panel.

## Modes & Options

- **Difficulty**: Easy, Normal, Hard (affects gravity).
- **Practice mode**: Wider gaps and relaxed collisions.
- **Ghost run**: Displays the best recorded run as a translucent guide.
- **Reduced motion**: Calms background animation for comfort.
- **120 Hz mode**: Higher refresh cadence for smoother play.
- **Skins**: Switch bird and pipe skins from the start screen or settings.

## Persistence

- **Settings**: Stored in localStorage under the `flappy-*` keys (skin selection, difficulty, ghost toggle, etc.).
- **Best run (ghost)**: Stored per difficulty via `flappy-bird-ghosts-*` and `flappy-bird-best-*` keys.
- **Best overall**: Stored under `flappy-bird-highscore`.

Legacy data from `flappy-records` and `flappy-highscore` is migrated automatically when present.

## Testing Notes

Relevant tests cover engine physics, ghost persistence, and UI wiring. Run:

```bash
yarn test flappyBird --runInBand
```
