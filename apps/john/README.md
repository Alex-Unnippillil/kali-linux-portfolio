# John the Ripper

## Purpose
Hosts the full-screen simulation of John the Ripper, keeping the demo strictly educational while mirroring the desktop window experience. Includes the John the Ripper workflow, rules presets, and sample crack output.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/john.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/john` route.
- `apps.config.js` — registers the `john` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/john` or open the “John the Ripper” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
