# Asteroids (App) Notes

## Controls & Inputs

- **Rotate:** Left/Right arrows (remappable)
- **Thrust:** Up arrow (remappable)
- **Fire:** Space (remappable)
- **Hyperspace:** H (remappable)
- **Inventory:** 1-9 to activate stored power-ups
- **Touch:** Drag on the left side to steer/thrust, top-right tap to fire, bottom-right tap for hyperspace
- **Help overlay:** `?` toggles the controls/help screen

## Settings & UX

- Pause, Restart, Snapshot, and Replay controls live in the game toolbar.
- Snapshot dumps the recorded input stream to a JSON file.
- Replay replays the recorded input stream using the game RNG state.

## Debugging Tips

- If inputs feel wrong, open **Help** and remap the keys.
- If the ghost feels out-of-date, clear progress with **Reset Progress** to discard saved ghost data.
- For deterministic repros, record a snapshot and replay with the same seed.

## Manual QA Checklist

- [ ] Keyboard: rotate, thrust, fire, hyperspace, inventory keys
- [ ] Remapped keys apply to fire/hyperspace/thrust
- [ ] Gamepad: stick to steer, button to fire
- [ ] Mobile: touch zones work without page scroll
- [ ] Pause/resume works when window loses focus
- [ ] Game over triggers when lives reach 0
