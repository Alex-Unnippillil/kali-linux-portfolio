# Chrome

## Purpose
Implements the Chrome utility that powers the desktop tile and the direct /apps route. Packages the simulated browser tabs, address bar, and reader mode preview for standalone use.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `apps.config.js` — registers the `chrome` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
