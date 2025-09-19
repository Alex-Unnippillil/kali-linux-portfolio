# Password Generator

## Purpose
Implements the Password Generator utility that powers the desktop tile and the direct /apps route. Delivers the password generator with entropy meter, clipboard helpers, and preset recipes.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/password_generator.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/password_generator` route.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/password_generator` or open the “Password Generator” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
