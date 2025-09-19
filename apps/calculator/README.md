# Calculator

## Purpose
Implements the Calculator utility that powers the desktop tile and the direct /apps route. Bootstraps the advanced calculator UI, math.js loader, and persistent history tape.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/calculator.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/calculator` route.
- `apps.config.js` — registers the `calculator` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/calculator` or open the “Calculator” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
