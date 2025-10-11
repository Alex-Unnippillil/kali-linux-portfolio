# Space Invaders Controls & Persistence

Space Invaders now shares the desktop game HUD for pause, reset, and audio toggles while keeping progress between sessions. Use this document as the quick reference for QA and future tuning.

## Controls

### Keyboard & Desktop
- **Move** – Arrow keys (← / →) or `A` / `D`
- **Fire** – `Space`
- **Pause / Resume** – `Esc` (also available from the on-screen HUD)
- **Difficulty** – Range slider in the top-right panel (1–3). Higher values accelerate enemy fire rate and movement.

### Touch
- On-screen buttons appear along the bottom edge for **Move Left**, **Fire**, and **Move Right** when the viewport is narrow.

### Accessibility & Gamepad Notes
- The HUD exposes Pause, Reset Progress, and Sound toggles with focus outlines for keyboard users.
- Gamepads pause automatically when disconnected; reconnecting clears the warning toast and resumes play.

## Persistence
- High scores are stored under `highscore:space-invaders`.
- Wave progress saves to `snapshot:space-invaders`, capturing **stage**, **score**, and remaining **lives**.
- Extra life thresholds are recalculated on load so players do not re-earn previously granted bonuses.

## Regression Checklist After Changes
- [ ] Pause/resume works via both `Esc` and the HUD button.
- [ ] Reset clears score, stage, and lives, and removes the saved snapshot.
- [ ] Toggling sound mutes the oscillator SFX and persists between reloads.
- [ ] Closing and reopening the app returns to the saved stage with the correct number of lives and score tally.
