# Pacman App

## Entrypoint and structure
- App entrypoint: `components/apps/pacman/index.tsx`.
- Main app shell: `PacmanApp.tsx`.
- Engine and rules: `apps/pacman/engine.ts` and docs under `apps/pacman/`.
- Rendering helpers: `rendering/renderer.ts` and `rendering/sprites.ts`.
- UI sections: `ui/*`.

## Controls
- Keyboard: arrows, WASD, space to start.
- Pause: `p` or `Escape` via `GameLayout`.
- Restart: `r`.
- Touch: virtual pad.
- Gamepad: left stick with thresholding.

## Settings
- Difficulty, sound mute, classic only, random levels, retro render mode.
- Speed controls for scatter/chase/game speed.

## Level loading and fallback
- Primary source is `/pacman-levels.json`.
- If loading fails or payload is invalid, the app falls back to a built in level and shows an accessible status message.

## Maze editor
- The editor now builds full `LevelDefinition` objects instead of raw grids.
- Supports save/load, JSON import/export, level metadata, and resize controls.
- Stored under versioned storage keys prefixed with `pacman:level:v2:`.

## Adding levels
1. Append a valid `LevelDefinition` entry to `public/pacman-levels.json`.
2. Include rectangular `maze`, optional `fruit`, and either `fruitTimes` or `fruitPelletThresholds`.
3. Optional spawn overrides: `pacStart` and `ghostStart`.
