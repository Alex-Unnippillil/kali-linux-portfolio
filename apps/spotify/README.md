# Spotify

## Purpose
Implements the Spotify utility that powers the desktop tile and the direct /apps route. Implements the playlist editor, crossfade audio player, and visualizer for the Spotify clone.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/spotify.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/spotify` route.
- `apps.config.js` — registers the `spotify` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/spotify` or open the “Spotify” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
