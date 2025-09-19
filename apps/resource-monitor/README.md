# Resource Monitor

## Purpose
Defines the Resource Monitor system surface that is shared between the desktop shell and the standalone route. Collects system metrics, FPS sampler, and export helpers for monitoring demos.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `apps.config.js` — registers the `resource-monitor` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
