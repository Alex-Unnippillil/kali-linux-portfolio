# Checkers

## Purpose
Provides the standalone view for the Checkers mini-game so it can run full-screen as well as inside the desktop window manager. Renders the checkers board with move validation and keyboard shortcuts.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/checkers.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/checkers` route.
- `apps.config.js` — registers the `checkers` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/checkers` or open the “Checkers” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
