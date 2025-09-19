# Autopsy

## Purpose
Hosts the full-screen simulation of Autopsy, keeping the demo strictly educational while mirroring the desktop window experience. Adds tabbed navigation between the simulated case workspace and the keyword tester while persisting the selection in the URL hash.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/autopsy.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/autopsy` route.
- `apps.config.js` — registers the `autopsy` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/autopsy` or open the “Autopsy” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
