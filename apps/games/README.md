# Games

## Purpose
Contains shared assets and domain logic that the Games experience depends on across multiple entry points. Holds reusable game logic such as RNG helpers, puzzles, and physics engines used across mini-games.

## Entry Points
- `rng.ts` — Shared pseudo-random generator used across multiple games.
- `sudoku/` — Puzzle-specific helpers referenced by the desktop Sudoku window.
- `tower-defense/` — Core tower-defense engine consumed by the windowed game.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
