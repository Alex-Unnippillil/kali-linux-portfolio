# Connect Four

## Purpose
Provides the standalone view for the Connect Four mini-game so it can run full-screen as well as inside the desktop window manager. Ships a lightweight vanilla Connect Four board for the direct `/apps` route.

## Entry Points
- `index.js` — Vanilla JavaScript entry used by the standalone view.
- `pages/apps/connect-four.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/connect-four` route.
- `apps.config.js` — registers the `connect-four` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/connect-four` or open the “Connect Four” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
