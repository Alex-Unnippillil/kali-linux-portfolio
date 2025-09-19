# QR Tool

## Purpose
Implements the QR Tool utility that powers the desktop tile and the direct /apps route. Ships the QR generator and scanner with logo uploads, presets, and download utilities.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/qr.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/qr` route.
- `apps.config.js` — registers the `qr` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/qr` or open the “QR Tool” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
