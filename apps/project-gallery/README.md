# Project Gallery

## Purpose
Implements the Project Gallery utility that powers the desktop tile and the direct /apps route. Renders the paginated project cards, filter chips, and detail modal for the portfolio gallery.

## Entry Points
- `pages/index.tsx` — Next.js page module that renders the gallery grid and filters.
- `components/` — UI fragments (filter chips, cards) reused by both desktop and standalone views.
- `pages/apps/project-gallery.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/project-gallery` route.
- `apps.config.js` — registers the `project-gallery` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/project-gallery` or open the “Project Gallery” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
