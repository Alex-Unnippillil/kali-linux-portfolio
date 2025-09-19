# Timer & Stopwatch

## Purpose
Implements the Timer & Stopwatch utility that powers the desktop tile and the direct /apps route. Stores the vanilla timer/stopwatch widget used for legacy demos.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/timer_stopwatch.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/timer_stopwatch` route.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/timer_stopwatch` or open the “Timer & Stopwatch” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
