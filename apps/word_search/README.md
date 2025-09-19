# Word Search

## Purpose
Provides the standalone view for the Word Search mini-game so it can run full-screen as well as inside the desktop window manager. Generates word search puzzles with solver logic and print/export options.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/word_search.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/word_search` route.
- `apps.config.js` — registers the `word-search` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/word_search` or open the “Word Search” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
