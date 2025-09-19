# Weather

## Purpose
Implements the Weather utility that powers the desktop tile and the direct /apps route. Provides the configurable weather dashboard, fake data adapters, and location search.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/weather.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/weather` route.
- `pages/apps/weather_widget.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/weather_widget` route.
- `apps.config.js` — registers the `weather` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/weather` or open the “Weather” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
