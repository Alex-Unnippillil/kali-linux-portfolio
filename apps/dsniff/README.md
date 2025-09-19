# Dsniff

## Purpose
Hosts the full-screen simulation of Dsniff, keeping the demo strictly educational while mirroring the desktop window experience. Layers the educational notes, canned packet captures, and module toggles for the dsniff simulator.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `apps.config.js` — registers the `dsniff` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
