# Trash

## Purpose
Defines the Trash system surface that is shared between the desktop shell and the standalone route. Implements the trash bin with restore, purge, and metadata tracking.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `apps.config.js` — registers the `trash` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
