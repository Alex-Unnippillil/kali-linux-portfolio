# Wireshark

## Purpose
Hosts the full-screen simulation of Wireshark, keeping the demo strictly educational while mirroring the desktop window experience. Delivers the packet capture explorer, display filters, and annotation tools.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/wireshark.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/wireshark` route.
- `apps.config.js` — registers the `wireshark` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/wireshark` or open the “Wireshark” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
