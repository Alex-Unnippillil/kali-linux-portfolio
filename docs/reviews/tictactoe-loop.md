# Tic Tac Toe – Loop & Persistence Integration

## Canvas and Game Loop
- The app now renders the board on a resizable canvas using `useCanvasResize`, so the grid scales cleanly across window sizes.
- Win lines animate via the shared `useGameLoop` hook, which drives `lineProgress` and re-renders the board each frame until the strike-through is complete.
- Pointer events map to board coordinates to keep click/tap handling consistent with the rendered canvas.

## Persistent State
- Variant results are stored under `tictactoe:stats` with wins, losses, draws, current streak, and best streak. Legacy data in `tictactoeStats` is migrated automatically on load.
- The global best streak feeds the shared high-score channel through `useGamePersistence`, persisting in `highscore:tictactoe`.
- Audio preferences use `useGameSettings`, persisting mute state to `game:tictactoe:muted` alongside the pause toggle.

## Controls & UX
- A toolbar exposes Pause/Resume, Mute/Sound, Restart Match, Change Options, and Reset Stats actions to comply with the shared game controls expectations.
- The help overlay copy now calls out the toolbar so users know where to find pause, audio, and stats controls.
- Variant statistics and the best streak appear in the header for quick reference and align with GameLayout’s scoreboard props.

## Tests
- Persistence regression tests confirm that wins/losses/streaks survive reloads, streak resets on losses, and legacy localStorage keys migrate to the new schema.
