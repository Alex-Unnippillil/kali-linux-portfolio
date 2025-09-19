# Minesweeper

## Purpose
Provides the standalone view for the Minesweeper mini-game so it can run full-screen as well as inside the desktop window manager. Contains the classic Minesweeper grid logic, timer, and flag controls.

## Entry Points
- `index.js` — Vanilla JavaScript entry used by the standalone view.
- `pages/apps/minesweeper.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/minesweeper` route.
- `apps.config.js` — registers the `minesweeper` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/minesweeper` or open the “Minesweeper” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
