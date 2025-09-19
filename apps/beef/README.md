# Beef

## Purpose
Hosts the full-screen simulation of Beef, keeping the demo strictly educational while mirroring the desktop window experience. Surfaces the BeEF simulation with a faux incident log beside the shared hook manager UI.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/beef.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/beef` route.
- `apps.config.js` — registers the `beef` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/beef` or open the “Beef” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
