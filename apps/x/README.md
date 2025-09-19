# X (Twitter)

## Purpose
Implements the X (Twitter) utility that powers the desktop tile and the direct /apps route. Wraps the X/Twitter embed timeline with theme toggles and focus guards.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/x.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/x` route.
- `apps.config.js` — registers the `x` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/x` or open the “X (Twitter)” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
