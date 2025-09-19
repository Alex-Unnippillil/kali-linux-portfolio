# Weather Widget

## Purpose
Implements the Weather Widget utility that powers the desktop tile and the direct /apps route. Supplies the compact weather widget demo with sample data loader.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/weather_widget.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/weather_widget` route.
- `apps.config.js` — registers the `weather-widget` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/weather_widget` or open the “Weather Widget” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
