# Blackjack

## Purpose
Provides the standalone view for the Blackjack mini-game so it can run full-screen as well as inside the desktop window manager. Exposes the blackjack game board, dealer logic, and score tracking for the standalone route.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/blackjack.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/blackjack` route.
- `apps.config.js` — registers the `blackjack` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/blackjack` or open the “Blackjack” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
