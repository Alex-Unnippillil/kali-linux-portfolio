# Visual Studio Code

## Purpose
Implements the Visual Studio Code utility that powers the desktop tile and the direct /apps route. Embeds the StackBlitz-powered VS Code surface plus workspace persistence.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/vscode.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/vscode` route.
- `apps.config.js` — registers the `vscode` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/vscode` or open the “Visual Studio Code” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
