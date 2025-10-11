# Platformer Loop & State Review

## Engine primitives
- `Player` models position, velocity, hit box, and jump affordances (coyote and buffer timers).
- `updatePhysics` applies acceleration, gravity, jump buffering, and clamps, while `movePlayer` resolves collisions tile-by-tile in both axes.
- `collectCoin` clears coins, and the new helpers `cloneTiles` and `countCoins` support immutable tile copies and coin totals for progression logic.

## Game loop integration
- `components/apps/platformer.js` now relies on the shared `useGameLoop` hook, splitting state updates and rendering for deterministic ticks.
- Background parallax, particle effects, and the player update within `update` while respecting reduced-motion preferences.
- Rendering draws tiles, player, particles, and HUD text inside `draw`, ensuring a single canvas paint per frame.

## Persistent state & progression
- `usePersistentState('platformer-progress')` tracks level index, checkpoint coordinates, and the campaign high score.
- `prepareLevel` clones level tiles, restores checkpoint or spawn, clears transient effects, and seeds background layers.
- `advanceLevel` promotes to the next level or freezes the game when the final stage is cleared, keeping the best score.
- `countCoins` + `collectCoin` gate progression; once remaining coins hit zero the next level is queued and an aria update announces completion.

## Controls and overlays
- Keyboard: `←`/`→` for movement, `Space` to jump, `P` pause/resume, `R` reset, `M` mute. The shared `Overlay` mirrors pause and mute state.
- Blur/visibility automatically pause, and screen-reader updates surface score, checkpoints, and level completion.

## QA checkpoints
- Jest coverage (`__tests__/platformer-engine.test.ts`) confirms `movePlayer` collision resolution and coin-driven progression bookkeeping.
- Manual QA focuses on checkpoint resets, level completion overlay, and persistent high score between sessions.

## Roadmap implication
- The platformer now matches the shared game scaffolding (loop, pause/reset, audio toggle, high-score persistence). Update the roadmap entry to "QA ready" post verification.
