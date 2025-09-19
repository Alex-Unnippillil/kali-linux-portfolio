# Sokoban

## Purpose
Provides the standalone view for the Sokoban mini-game so it can run full-screen as well as inside the desktop window manager. Delivers the Sokoban puzzle with level data and undo support.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/sokoban.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/sokoban` route.
- `apps.config.js` — registers the `sokoban` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/sokoban` or open the “Sokoban” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
