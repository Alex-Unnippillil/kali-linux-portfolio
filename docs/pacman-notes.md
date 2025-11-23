# Pacman Implementation Notes

## Rendering and Game Loop
- The desktop app wraps the board in `GameLayout` and relies on `useCanvasResize(WIDTH, HEIGHT)` to keep the canvas responsive without manual scaling math.
- `useGameLoop` drives `loopTick`, which steps the simulation, polls the gamepad axes, and then calls the memoized `draw` routine. The loop is paused automatically whenever `statusRef` leaves `"Playing"` or `pausedRef` is set.
- `draw` caches the 2D context, clears using a reset transform, repaints the maze tiles, pellets, energizers, fruit, Pac-Man squash, and ghost trails each frame.

## Ghost Pathfinding
- Direction choices come from `getAvailableDirections`, which filters out walls (`1` tiles) and the reverse of the current vector before ranking candidates.
- `computeGhostTarget` expresses the personalities:
  - Scatter mode returns the fixed corners in `DEFAULT_SCATTER_CORNERS`.
  - Chase mode mirrors the arcade logic (Blinky chases, Pinky aims four tiles ahead, Inky mirrors Blinky, Clyde retreats when within eight tiles).
  - Frightened ghosts return `null`, forcing random movement.

## Power-Ups and Scoring
- Pellets (tile value `2`) award 10 points, energizers (`3`) award 50 points and set a six-second `frightTimer` with an aria announcement.
- Fruit spawns at author-defined times from `fruitTimes` (seconds → frames) and stays active for `FRUIT_DURATION` frames, rewarding 100 points on pickup with distinct tones.
- Crossing 10,000 points grants a single extra life, tracked on `pacRef.current.lives`.
- High scores persist via `usePacmanHighScore`, which wraps `usePersistentState` and exposes `recordScore`, `resetHighScore`, and `clearHighScore` helpers.

## Assets and External Data
- Layout presets and fruit timings live in `public/pacman-levels.json`, while control sliders render through `games/pacman/components/SpeedControls`.
- The in-app leaderboard is populated by `/api/pacman/leaderboard` when not running in static export mode.
