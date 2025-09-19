# Mimikatz

## Purpose
Hosts the full-screen simulation of Mimikatz, keeping the demo strictly educational while mirroring the desktop window experience. Wraps the credential dump simulator alongside the offline walkthrough entry point.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/mimikatz/offline.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/mimikatz/offline` route.
- `apps.config.js` — registers the `mimikatz` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/mimikatz/offline` or open the “Mimikatz” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
