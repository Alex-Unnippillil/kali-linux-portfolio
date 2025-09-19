# Input Lab

## Purpose
Implements the Input Lab utility that powers the desktop tile and the direct /apps route. Hosts the accessibility playground that captures keyboard, pointer, and gamepad events.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/input-lab.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/input-lab` route.
- `apps.config.js` — registers the `input-lab` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/input-lab` or open the “Input Lab” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
