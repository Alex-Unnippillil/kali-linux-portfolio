# Pinball

## Purpose
Provides the standalone view for the Pinball mini-game so it can run full-screen as well as inside the desktop window manager. Mounts the canvas-based pinball game and keyboard controls.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/pinball.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/pinball` route.
- `apps.config.js` — registers the `pinball` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/pinball` or open the “Pinball” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
