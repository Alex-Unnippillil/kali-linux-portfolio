# Volatility

## Purpose
Hosts the full-screen simulation of Volatility, keeping the demo strictly educational while mirroring the desktop window experience. Presents the memory forensics scenarios, plugin explorer, and timeline viewer.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/volatility.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/volatility` route.
- `apps.config.js` — registers the `volatility` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/volatility` or open the “Volatility” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
