# Kismet

## Purpose
Hosts the full-screen simulation of Kismet, keeping the demo strictly educational while mirroring the desktop window experience. Pairs the sample capture viewer with filters, map view, and device timeline.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/kismet.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/kismet` route.
- `apps.config.js` — registers the `kismet` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/kismet` or open the “Kismet” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
