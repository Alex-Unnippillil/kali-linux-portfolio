# SSH Command Builder

## Purpose
Implements the SSH Command Builder utility that powers the desktop tile and the direct /apps route. Builds the SSH command generator with option toggles, saved presets, and copy helpers.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/ssh.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/ssh` route.
- `apps.config.js` — registers the `ssh` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/ssh` or open the “SSH Command Builder” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
