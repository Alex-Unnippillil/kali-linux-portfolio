# Terminal

## Purpose
Defines the Terminal system surface that is shared between the desktop shell and the standalone route. Wires the Xterm wrapper, command registry, and scripting tabs for the simulated terminal.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `apps.config.js` — registers the `terminal` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
