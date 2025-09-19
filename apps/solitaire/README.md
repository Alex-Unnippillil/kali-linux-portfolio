# Solitaire

## Purpose
Provides the standalone view for the Solitaire mini-game so it can run full-screen as well as inside the desktop window manager. Hosts the solitaire game with drag-and-drop interactions and auto-complete helpers.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/solitaire.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/solitaire` route.
- `apps.config.js` — registers the `solitaire` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/solitaire` or open the “Solitaire” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
