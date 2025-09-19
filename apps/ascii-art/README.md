# Ascii Art

## Purpose
Implements the Ascii Art utility that powers the desktop tile and the direct /apps route. Provides font selection, ANSI color wrapping, and image-to-ASCII helpers for demos.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/ascii-art.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/ascii-art` route.
- `apps.config.js` — registers the `ascii-art` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/ascii-art` or open the “Ascii Art” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
