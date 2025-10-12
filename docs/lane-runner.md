# Lane Runner Gameplay Notes

Lane Runner is the lightweight traffic-dodging mini game that ships inside the Kali Linux portfolio. The canvas loop now plugs into the shared helpers for pausing, resetting, audio control, and score storage.

## Difficulty Modes

The game exposes three difficulty presets that can be switched at any time from the HUD:

- **Easy** – Starts with five lives, slows overall lane speed by 15%, and reduces obstacle spawn frequency for a relaxed run.
- **Normal** – Baseline experience with three lives, original lane speeds, and default spawn timing.
- **Hard** – Drops the player to two lives, increases lane speed growth by roughly 20%, and tightens spawn intervals for a faster-paced run.

Changing difficulty immediately restarts the current session so the new rules apply without stale state.

## Shared Game Controls

- A standard overlay provides **Pause/Resume**, **Mute/Unmute**, and an FPS counter via `components/apps/Games/common/Overlay.tsx`.
- The left-side HUD keeps a **Reset** button alongside curve, control, sensitivity, and import/export utilities.
- Keyboard and tilt controls remain available; tilt continues to request device orientation permissions before activating.

## Persistence

High scores and snapshot data are now stored through `useGamePersistence('lane-runner')`, keeping the best run in `localStorage` and ensuring imports immediately refresh the HUD with the stored record.
