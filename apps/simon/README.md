# Simon

## Purpose
Provides the standalone view for the Simon mini-game so it can run full-screen as well as inside the desktop window manager. Implements the Simon memory game with audio cues and difficulty scaling.

## Entry Points
- `index.js` — Vanilla JavaScript entry used by the standalone view.
- `pages/apps/simon.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/simon` route.
- `apps.config.js` — registers the `simon` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/simon` or open the “Simon” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
