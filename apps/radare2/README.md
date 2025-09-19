# radare2

## Purpose
Hosts the full-screen simulation of radare2, keeping the demo strictly educational while mirroring the desktop window experience. Supplies the disassembly viewer, script console, and sample binary metadata.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `apps.config.js` — registers the `radare2` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
