# Tower Defense

## Purpose
Provides the standalone view for the Tower Defense mini-game so it can run full-screen as well as inside the desktop window manager. Runs the tower defense game, enemy waves, and upgrade logic.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/tower-defense.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/tower-defense` route.
- `apps.config.js` — registers the `tower-defense` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/tower-defense` or open the “Tower Defense” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
