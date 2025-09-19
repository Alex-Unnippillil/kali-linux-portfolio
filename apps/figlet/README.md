# Figlet

## Purpose
Implements the Figlet utility that powers the desktop tile and the direct /apps route. Combines the worker-based font renderer, preview canvas, and preset gallery for FIGlet text art.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/figlet.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/figlet` route.
- `apps.config.js` — registers the `figlet` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/figlet` or open the “Figlet” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
