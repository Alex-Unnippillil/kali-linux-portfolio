# HTTP Builder

## Purpose
Implements the HTTP Builder utility that powers the desktop tile and the direct /apps route. Builds the HTTP request composer with method toggles, header editor, and response preview.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/http.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/http` route.
- `apps.config.js` — registers the `http` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/http` or open the “HTTP Builder” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
