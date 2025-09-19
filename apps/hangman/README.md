# Hangman

## Purpose
Contains shared assets and domain logic that the Hangman experience depends on across multiple entry points. Exports the pure hangman engine and dictionaries shared by the windowed UI.

## Entry Points
- `engine.ts` — Pure hangman game logic shared by the desktop implementation.
- `apps.config.js` — registers the `hangman` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Open `http://localhost:3000` and launch the app from the desktop grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
