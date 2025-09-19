# Sticky Notes

## Purpose
Implements the Sticky Notes utility that powers the desktop tile and the direct /apps route. Contains the sticky notes board with share-target handling and OPFS persistence.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/sticky_notes.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/sticky_notes` route.
- `apps.config.js` — registers the `sticky_notes` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/sticky_notes` or open the “Sticky Notes” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
