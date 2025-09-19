# Contact

## Purpose
Implements the Contact utility that powers the desktop tile and the direct /apps route. Composes the EmailJS contact form, validation state machine, and sent-message history panel.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/contact.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/contact` route.
- `apps.config.js` — registers the `contact` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/contact` or open the “Contact” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
