# 2048

## Purpose
Provides the standalone view for the 2048 mini-game so it can run full-screen as well as inside the desktop window manager. It exposes the seeded daily challenge, undo history, and IndexedDB replay recorder used by automated tests.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/2048.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/2048` route.
- `apps.config.js` — registers the `2048` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/2048` or open the “2048” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
