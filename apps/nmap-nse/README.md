# Nmap NSE

## Purpose
Hosts the full-screen simulation of Nmap NSE, keeping the demo strictly educational while mirroring the desktop window experience. Runs the NSE script selector, sample outputs, and worker-based emulation.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/nmap-nse.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/nmap-nse` route.
- `apps.config.js` — registers the `nmap-nse` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/nmap-nse` or open the “Nmap NSE” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
