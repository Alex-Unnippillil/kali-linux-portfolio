# Converter

## Purpose
Implements the Converter utility that powers the desktop tile and the direct /apps route. Loads the multi-tool unit converter pages and drives the embedded navigation.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/converter.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/converter` route.
- `apps.config.js` — registers the `converter` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/converter` or open the “Converter” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
