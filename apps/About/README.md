# About Alex

## Purpose
Defines the About Alex system surface that is shared between the desktop shell and the standalone route. Wraps the resume carousel, contact links, and profile metadata from `components/apps/About` into a full-page layout.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `apps.config.js` — registers the `about` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
