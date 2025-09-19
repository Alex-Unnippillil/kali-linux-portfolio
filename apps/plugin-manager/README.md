# Plugin Manager

## Purpose
Implements the Plugin Manager utility that powers the desktop tile and the direct /apps route. Exposes the plugin registry UI used to toggle experimental desktop modules.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `apps.config.js` — registers the `plugin-manager` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
