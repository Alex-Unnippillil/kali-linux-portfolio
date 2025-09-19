# Metasploit

## Purpose
Hosts the full-screen simulation of Metasploit, keeping the demo strictly educational while mirroring the desktop window experience. Provides the module browser, session dashboard, and lab-safe command builder.

## Entry Points
- `index.tsx` — React entry point that renders the standalone experience.
- `pages/apps/metasploit-post.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/metasploit-post` route.
- `pages/apps/metasploit.jsx` — Next.js wrapper that dynamically imports this folder for the `/apps/metasploit` route.
- `apps.config.js` — registers the `metasploit` tile so the desktop launcher opens the shared window component.

## Local Development
1. `yarn dev`
2. Visit `http://localhost:3000/apps/metasploit` or open the “Metasploit” tile from the app grid.

## Owner
- Primary maintainer: Alex Unnippillil (alex.unnippillil@hotmail.com)
