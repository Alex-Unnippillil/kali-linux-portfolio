# Kali Linux Portfolio

A desktop-style portfolio built with Next.js and Tailwind that recreates the look and feel of a Kali/Ubuntu workstation. It ships with resizable windows, a dock, context menus, and a catalog of **security tool simulations**, **utilities**, and **retro games**. This document is aimed at engineers preparing production deployments or long-term maintenance.

> Production site: https://unnippillil.com/

---

## Table of Contents
1. [Legal Notice & Risk Overview](#legal-notice--risk-overview)
2. [Quick Start](#quick-start)
3. [Project Architecture](#project-architecture)
4. [Desktop UX](#desktop-ux)
5. [App Catalog](#app-catalog)
6. [Configuration & Environment](#configuration--environment)
7. [Deployment Guides](#deployment-guides)
8. [Quality Gates & Tooling](#quality-gates--tooling)
9. [Security Hardening](#security-hardening)
10. [Troubleshooting](#troubleshooting)
11. [License](#license)

---

## Legal Notice & Risk Overview

This repository showcases **static, non-operational simulations** of common security tools. The demo UI is intended for education, portfolio review, and safe experimentation only. Running real offensive tooling against systems without explicit authorization is illegal and may cause damage or service disruption.

**Potential risks when adapting this project**
- Triggering IDS/IPS systems if real network scans are introduced.
- Locking user accounts or corrupting data if password brute-force logic is enabled.
- Confusing end users if canned output is mistaken for live data.

Always run experiments inside a controlled lab and obtain written permission before performing any security assessment. Do **not** add real exploitation logic or uncontrolled outbound traffic to this project.

---

## Quick Start

### Prerequisites
- **Node.js 20.19.5** (tracked in [`.nvmrc`](./.nvmrc)); install via `nvm install`.
- **Yarn** (the repo ships with `yarn.lock`). Other package managers are not supported by CI.
- Copy `.env.local.example` to `.env.local` and fill in any keys for the features you intend to test.

### Install & Run (Development)
```bash
nvm install          # Ensures Node 20.19.5 is available
nvm use              # Activates the matching runtime
cp .env.local.example .env.local
# Populate keys: analytics, EmailJS, Supabase, etc.
yarn install
yarn dev             # Starts Next.js with hot reload
```

### Production Build (Serverful)
Serverful deployments run the compiled Next.js server so API stubs are available.
```bash
yarn build
yarn start           # Boots the production server on port 3000 by default
```
After the server starts, probe any API stub to verify server routes are alive:
```bash
curl -X POST http://localhost:3000/api/dummy
```

### Static Export (GitHub Pages, S3, etc.)
The project supports fully static export. API routes are omitted, so the UI falls back to demo data or hides unsupported actions.
```bash
yarn export               # Builds static output into ./out with NEXT_PUBLIC_STATIC_EXPORT=true
npx serve out             # Optional: serve the exported site locally
```
Verify that features relying on `/api/*` degrade gracefully when served statically.

### Install as a Progressive Web App
1. Open the deployed site in a supported browser (Chrome, Edge, Brave, etc.).
2. Use the browser’s **Install** / **Add to Home Screen** action.
3. On mobile, share text/links to the installed app to create sticky notes automatically.

The service worker is generated during `next build` by [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa) and outputs to `public/sw.js`.

---

## Project Architecture

```
pages/
  _app.jsx            # Global providers (desktop shell, analytics, legal banner)
  _document.jsx       # HTML scaffold
  index.jsx           # Mounts <Ubuntu /> desktop
  api/                # Demo-only API routes (disabled during static export)
  apps/               # Example conventional pages

components/
  ubuntu.tsx          # Boot → lock → desktop state machine
  base/               # Window frame, chrome, and focus manager
  screen/             # Boot splash, lock screen, desktop, navbar
  apps/               # App catalog: games, utilities, and security simulations
  context-menus/      # Desktop and dock context menus
  SEO/Meta.js         # Structured metadata helpers
  util-components/    # Reusable UI primitives (buttons, layout helpers, etc.)

hooks/
  usePersistentState.ts   # Validated localStorage state with reset helper
  useSettings.tsx         # User preferences (theme, wallpaper, accent)
  useAssetLoader.ts       # Lazy asset loading for canvas games
  useCanvasResize.ts      # Responsive canvas sizing for games

public/
  images/             # Wallpapers, icons, avatars
  apps/               # Static assets for games (sprites, sounds, levels)
  sw.js               # Generated service worker after `next build`

__tests__/            # Jest unit tests, smoke tests, utilities
playwright/           # Playwright helpers for end-to-end testing
.github/workflows/    # GitHub Actions (static export pipeline, lint/test gates)
```

**Windowing model.** `components/screen/desktop.js` maintains the global window registry, handles z-index ordering, and orchestrates dock shortcuts, favorites, and analytics events.

**Dynamic app registry.** [`apps.config.js`](./apps.config.js) registers desktop apps with `createDynamicApp`, wrapping heavy apps in dynamic imports to reduce the initial bundle. Each app exports a `prefetch()` helper so tiles can warm bundles on hover or keyboard focus.

**Game layout.** Games share `components/apps/GameLayout.tsx`, which renders a standardized header, help toggle, and status footer. Gamepad bindings live in `components/apps/Games/common/input-remap` and persist to the Origin Private File System (OPFS) via `utils/opfs.ts`.

---

## Desktop UX

- **Boot & Lock Flow** – The desktop boots through a splash animation, transitions to a lock screen, and finally reveals the workspace. Auth is simulated; unlocking simply animates the transition.
- **Window Controls** – Windows are draggable, resizable, and keyboard focusable. Header controls hook into desktop state to minimize, maximize, or close.
- **Context Menus** – Right-click menus are powered by `components/context-menus/desktopContextMenu.tsx` and adjust options based on selection (wallpapers, new notes, etc.).
- **Dock & Favorites** – Dock entries and “All Applications” tiles are sourced from `apps.config.js`. Favorites persist through `usePersistentState`.
- **Terminal** – `/apps/terminal` emulates a shell with commands like `help`, `clear`, `whoami`, and canned security tool outputs.
- **Gamepad Support** – `utils/gamepad.ts` polls `navigator.getGamepads()` and normalizes input. Games may expose haptic feedback via `gamepad.vibrationActuator` where available.

---

## App Catalog

### Utilities & Media
| App | Route | Category |
| --- | --- | --- |
| Alex | `/apps/alex` | Utility / Media |
| Firefox | `/apps/firefox` | Utility / Media |
| VS Code | `/apps/vscode` | StackBlitz IDE embed |
| Spotify | `/apps/spotify` | Utility / Media |
| YouTube | `/apps/youtube` | Utility / Media |
| Weather | `/apps/weather` | Utility / Media |
| X / Twitter | `/apps/x` | Utility / Media |
| Todoist | `/apps/todoist` | Utility / Media |
| Gedit | `/apps/gedit` | Utility / Media (contact form) |
| Settings | `/apps/settings` | Utility / Media |
| Trash | `/apps/trash` | Utility / Media |
| Project Gallery | `/apps/project-gallery` | Utility / Media |
| Quote | `/apps/quote` | Utility / Media |

The Spotify app lets users map moods to playlists, persist preferences in OPFS, and recall the last session automatically.

The X / Twitter app supports both live embeds and a Saved view that reads from local storage so timelines still render when the public API or embed script is unavailable.

#### Converter units

The Converter app shares a single catalog of units defined in [`components/apps/converter/units.js`](./components/apps/converter/units.js). Supported categories include:

- **Length** – meter (m), kilometer (km), mile (mi), foot (ft)
- **Mass** – gram (g), kilogram (kg), pound (lb), ounce (oz)
- **Temperature** – celsius (°C), fahrenheit (°F), kelvin (K)
- **Time** – second (s), minute (min), hour, day
- **Digital storage** – byte (B), kilobyte (kB), megabyte (MB), gigabyte (GB)
- **Area** – square meter (m²), square kilometer (km²), square foot (ft²), square mile (mi²), acre
- **Volume** – liter (L), milliliter (ml), cubic meter (m³), cubic foot (ft³), gallon (gal)
- **Currency** – USD, EUR, GBP, JPY (demo exchange rates)

Each converter view (temperature-only and the multi-category unit converter) imports the shared catalog so new units only need to be added in one file.

### Games
| Game | Route |
| --- | --- |
| 2048 | `/apps/2048` |
| Asteroids | `/apps/asteroids` |
| Battleship | `/apps/battleship` |
| Blackjack | `/apps/blackjack` |
| Breakout | `/apps/breakout` |
| Candy Crush | `/apps/candy-crush` |
| Car Racer | `/apps/car-racer` |
| Checkers | `/apps/checkers` |
| Chess | `/apps/chess` |
| Connect Four | `/apps/connect-four` |
| Flappy Bird | `/apps/flappy-bird` |
| Frogger | `/apps/frogger` |
| Gomoku | `/apps/gomoku` |
| Hangman | `/apps/hangman` |
| Memory | `/apps/memory` |
| Minesweeper | `/apps/minesweeper` |
| Nonogram | `/apps/nonogram` |
| Pacman | `/apps/pacman` |
| Pinball | `/apps/pinball` |
| Platformer | `/apps/platformer` |
| Pong | `/apps/pong` |
| Reversi | `/apps/reversi` |
| Simon | `/apps/simon` |
| Snake | `/apps/snake` |
| Sokoban | `/apps/sokoban` |
| Solitaire | `/apps/solitaire` |
| Space Invaders | `/apps/space-invaders` |
| Sudoku | `/apps/sudoku` |
| Tetris | `/apps/tetris` |
| Tic Tac Toe | `/apps/tictactoe` |
| Tower Defense | `/apps/tower-defense` |
| Word Search | `/apps/word-search` |
| Wordle | `/apps/wordle` |

### Security Tools (Simulated)
| Tool | Route |
| --- | --- |
| Autopsy | `/apps/autopsy` |
| BeEF | `/apps/beef` |
| Bluetooth Tools | `/apps/bluetooth` |
| dsniff | `/apps/dsniff` |
| Ettercap | `/apps/ettercap` |
| Ghidra | `/apps/ghidra` |
| Hashcat | `/apps/hashcat` |
| Hydra | `/apps/hydra` |
| John the Ripper | `/apps/john` |
| Kismet | `/apps/kismet` |
| Metasploit | `/apps/metasploit` |
| Metasploit Post | `/apps/metasploit-post` |
| Mimikatz | `/apps/mimikatz` |
| Nessus | `/apps/nessus` |
| Nmap NSE | `/apps/nmap-nse` |
| OpenVAS | `/apps/openvas` |
| Radare2 | `/apps/radare2` |
| Reaver | `/apps/reaver` |
| Recon-ng | `/apps/reconng` |
| Volatility | `/apps/volatility` |
| Wireshark | `/apps/wireshark` |

All security-oriented apps are **non-operational** and render curated walkthroughs, faux output, or embedded documentation. They must never perform real exploitation or network activity.

---

## Configuration & Environment

### Environment Variables
Copy `.env.local.example` to `.env.local` and populate the keys relevant to your deployment.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | Toggles Google Analytics 4 tracking on the client. |
| `NEXT_PUBLIC_TRACKING_ID` | GA4 Measurement ID (`G-XXXXXXX`). |
| `NEXT_PUBLIC_SERVICE_ID` / `NEXT_PUBLIC_TEMPLATE_ID` / `NEXT_PUBLIC_USER_ID` | EmailJS identifiers for the Gedit contact app. |
| `NEXT_PUBLIC_YOUTUBE_API_KEY` | Loads the YouTube app playlist directory (channel sections + playlists). |
| `YOUTUBE_API_KEY` | Server-side YouTube Data API key used by `/api/youtube/*` to proxy playlist requests. |
| `NEXT_PUBLIC_BEEF_URL` / `NEXT_PUBLIC_GHIDRA_URL` / `NEXT_PUBLIC_GHIDRA_WASM` | Optional remote iframe targets for simulated tooling. |
| `NEXT_PUBLIC_UI_EXPERIMENTS` | Enables experimental UI heuristics. |
| `NEXT_PUBLIC_STATIC_EXPORT` | Set to `'true'` during static export to disable server APIs. |
| `NEXT_PUBLIC_SHOW_BETA` | Displays a beta badge when truthy. |
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | Client-side ReCAPTCHA key used by the contact form. |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side Supabase credentials (optional). |
| `FEATURE_TOOL_APIS` | `enabled` or `disabled`; wraps all tool API routes. |
| `FEATURE_HYDRA` | Additional toggle for `/api/hydra` demo route. |
| `RECAPTCHA_SECRET` | Server-side verification for ReCAPTCHA. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` | Server-side Supabase credentials. |
| `ADMIN_READ_KEY` | Secret used by admin message APIs; configure in the hosting platform. |

> Never commit secrets. Use local `.env.local`, CI secrets, or host-level configuration.

### Feature Flags & Static Export
Set `NEXT_PUBLIC_STATIC_EXPORT=true` during `yarn export` to disable API routes. UI components should guard their behaviour with the flag or the presence of required environment variables.

### Analytics
`utils/analytics.ts` wraps GA4. Analytics only fire when `NEXT_PUBLIC_ENABLE_ANALYTICS` is truthy. The project also renders `<Analytics />` and `<SpeedInsights />` from `@vercel/analytics` inside `_app.jsx`.

---

## Deployment Guides

### GitHub Pages (Static Export)
Workflow: [`.github/workflows/gh-deploy.yml`](./.github/workflows/gh-deploy.yml)
1. Installs Node 20.19.5 to match `.nvmrc` and `package.json`.
2. Runs `yarn install`, `yarn export`, and copies `out/` to the `gh-pages` branch.
3. Creates `.nojekyll` to bypass GitHub Pages Jekyll processing.

Required secrets include any public keys needed at build time (GA, EmailJS, optional tool URLs, UI experiments).

### Vercel (Serverless)
- Connect the repository to a Vercel project.
- Build command: `yarn build`.
- Runtime: Next.js 15.5 (serverless functions handle API stubs).
- Configure environment variables in the Vercel dashboard: analytics IDs, EmailJS keys, optional Supabase values, ReCAPTCHA keys, `ADMIN_READ_KEY`, and any tool URLs.
- If you prefer a static deployment on Vercel, run `yarn export` and serve the output with a static hosting provider or Vercel’s static project type.

### Docker
```Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
RUN yarn build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
CMD ["yarn", "start", "-p", "3000"]
```
Build and run locally:
```bash
docker build -t kali-portfolio .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_TRACKING_ID=... \
  -e NEXT_PUBLIC_SERVICE_ID=... \
  -e NEXT_PUBLIC_TEMPLATE_ID=... \
  -e NEXT_PUBLIC_USER_ID=... \
  -e YOUTUBE_API_KEY=... \
  -e NEXT_PUBLIC_YOUTUBE_API_KEY=... \
  -e NEXT_PUBLIC_BEEF_URL=... \
  -e NEXT_PUBLIC_GHIDRA_URL=... \
  -e NEXT_PUBLIC_GHIDRA_WASM=... \
  -e NEXT_PUBLIC_UI_EXPERIMENTS=... \
  kali-portfolio
```
Add any additional variables required by your configuration (ReCAPTCHA, Supabase, etc.).

NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_VERCEL_ENV=
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
NEXT_PUBLIC_TRACKING_ID=
NEXT_PUBLIC_USER_ID=
NEXT_PUBLIC_SERVICE_ID=
NEXT_PUBLIC_TEMPLATE_ID=
YOUTUBE_API_KEY=
NEXT_PUBLIC_YOUTUBE_API_KEY=YOUR_YOUTUBE_API_KEY
NEXT_PUBLIC_CURRENCY_API_URL=
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_UI_EXPERIMENTS=false
NEXT_PUBLIC_STATIC_EXPORT=false
NEXT_PUBLIC_SHOW_BETA=
NEXT_PUBLIC_GHIDRA_WASM=
NEXT_PUBLIC_GHIDRA_URL=
FEATURE_TOOL_APIS=disabled
FEATURE_HYDRA=disabled
RECAPTCHA_SECRET=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
---

## Quality Gates & Tooling

| Command | Purpose |
| --- | --- |
| `yarn lint` | ESLint (configured via `eslint.config.mjs`). |
| `yarn test` | Jest unit tests (jsdom environment; see `jest.setup.ts`). |
| `yarn test:watch` | Watch mode for Jest. |
| `yarn smoke` | Manual smoke runner that opens each `/apps/*` route in a headless browser. |
| `npx playwright test` | Playwright end-to-end suite (optional locally, required in E2E CI runs). |

Additional guidance:
- Fix lint and type issues instead of silencing rules.
- Co-locate new tests with related code under `__tests__/` or feature folders.
- Before PRs, confirm the static export still loads critical screens.
- For major UI updates, capture screenshots or short clips for reviewers.

Accessibility and performance checks using Lighthouse or Pa11y (`pa11yci.json`) are encouraged for desktop shell changes. Install Pa11y only when running those checks (for example: `PUPPETEER_SKIP_DOWNLOAD=true yarn add -D pa11y && yarn a11y`) so Vercel builds skip the Puppeteer download; CI environments with a browser available should set `PUPPETEER_SKIP_DOWNLOAD=true` during the install step.

---

## Security Hardening

### Security Headers & CSP
Default headers are configured in [`next.config.js`](./next.config.js):
- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: SAMEORIGIN`

CSP whitelists the origins needed for embedded tools: `stackblitz.com`, `www.youtube-nocookie.com`, `open.spotify.com`, `todoist.com`, `*.twitter.com`, `embed.x.com`, `vercel.live`, `developer.mozilla.org`, `en.wikipedia.org`, and the Kali partner sites (`kali.org`, `offsec.com`, `exploit-db.com`). Update the whitelist whenever you embed a new external resource. Consider removing `'unsafe-inline'` from `style-src` once inline styles are eliminated.

### Production Checklist
- [x] Pin Node.js to 20.19.5 across local, CI, and hosting environments.
- [ ] Track Node.js `DEP0170` deprecations for custom protocol URLs and update dependencies accordingly.
- [ ] Rotate EmailJS and other public keys regularly.
- [ ] Tighten CSP (`connect-src`, `frame-src`, remove unused domains or protocols).
- [ ] Disable or feature-flag demo API routes in production.
- [ ] Rate-limit any future server routes and sanitize input.
- [ ] Enforce HTTPS and HSTS at the edge (Vercel, CDN, or reverse proxy).
- [ ] Add error monitoring (e.g., Sentry) and review analytics dashboards.
- [ ] Run accessibility and Lighthouse audits before launch.
- [ ] Keep dynamic imports for heavy apps to protect initial load performance.
- [ ] Back up large static assets (wallpapers, JSON datasets) used by the portfolio.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Usage Error: Couldn't find the node_modules state file` when running a Yarn script | Install dependencies first with `yarn install`. Yarn 4 uses a node_modules state file to track installs, so commands fail until the workspace has been bootstrapped. |
| Blank app grid after static export | Ensure `NEXT_PUBLIC_STATIC_EXPORT=true` and that apps depending on `/api/*` are behind feature flags or demo data fallbacks. |
| Service worker ignores new assets | Clear site data or bump the cache version in the PWA config. |
| Gamepad input not detected | Confirm the browser supports `navigator.getGamepads()` and update bindings in `components/apps/Games/common/input-remap`. |
| Analytics not reporting | Verify `NEXT_PUBLIC_ENABLE_ANALYTICS` is `true`, confirm GA scripts load, and check ad blockers. |
| External embeds refuse to load | The remote site may send `X-Frame-Options` or restrictive CSP headers. Provide alternative content or documentation in-app. |

---

## License

Distributed under the [MIT License](./LICENSE).

---

_Last updated: 2025-10-12_

---

## Calculator Syntax Appendix

The calculator app supports a subset of math.js expressions:

- Operators: `+`, `-`, `*`, `/`, `^`, and parenthesis grouping.
- Built-in functions: `sin`, `cos`, `tan`, `sqrt`, `abs`, `ceil`, `floor`, `round`, `exp`, `log`, and more per math.js defaults.
- Unit-aware math: suffix values with units like `cm`, `m`, `in`, or `ft` to mix measurements (`2m + 30cm`).
- The previous answer is accessible via `Ans`.

Invalid syntax is highlighted in the calculator input, selecting the character where parsing failed.
