# Subnet Calculator

## Purpose
Implements the Subnet Calculator utility that powers the desktop tile and the direct /apps route. Calculates subnet ranges, CIDR math, and allocation tables for lab planning.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/subnet-calculator.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/subnet-calculator` route.
- `apps.config.js` — registers the `subnet-calculator` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/subnet-calculator` or open the “Subnet Calculator” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
