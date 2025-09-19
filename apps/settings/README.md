# Settings

## Purpose
Defines the Settings system surface that is shared between the desktop shell and the standalone route. Manages theme selection, wallpaper state, and feature toggles for the desktop shell.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/settings.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/settings` route.
- `apps.config.js` — registers the `settings` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/settings` or open the “Settings” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
