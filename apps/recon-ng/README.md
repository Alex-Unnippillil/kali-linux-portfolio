# Recon-ng

## Purpose
Contains shared assets and domain logic that the Recon-ng experience depends on across multiple entry points. Provides planning widgets (data model explorer, module planner) consumed by the Recon-ng window.

## Entry Points
- `components/DataModelExplorer.tsx` — Explorer widget visualising recon-ng data models for simulations.
- `components/ModulePlanner.tsx` — Module planner UI wired into the desktop Recon-ng window.
- `apps.config.js` — registers the `recon-ng` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
