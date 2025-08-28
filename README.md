# Kali Linux Portfolio 

A desktop-style portfolio built with Next.js and Tailwind that emulates a Kali/Ubuntu UI with windows, a dock, context menus, and a rich catalog of **security-tool simulations**, **utilities**, and **retro games**. This README is tailored for a professional full-stack engineer preparing **production deployment** and ongoing maintenance.

> Repo homepage: https://unnippillil.com/

---

## Quick Start

### Requirements
- **Node.js 20.x**
- **Yarn** or **npm**
- Recommended: **pnpm** if you prefer stricter hoisting; update lock/config accordingly.

### Install & Run (Dev)
```bash
yarn install
yarn dev
```

### Production Build
```bash
# Next.js production build & start
yarn build
yarn start
```

### Static Export (for GitHub Pages / S3 Websites)
This project supports static export. Serverless API routes will not be available in a static export; the UI gracefully degrades.
```bash
yarn export        # outputs to ./out
```

### Install as PWA for Sharing

To send text or links directly into the Sticky Notes app:

1. Open the site in a supported browser (Chrome, Edge, etc.).
2. Use the browser's **Install** or **Add to Home screen** option.
3. After installation, use the system **Share** action and select "Kali Linux Portfolio".
4. The shared content will appear as a new note.

---

## Tech Stack

- **Next.js 15** (app uses `/pages` routing) + **TypeScript** in parts
- **Tailwind CSS** with custom Ubuntu/Kali theme tokens (`styles/index.css`, `tailwind.config.js`)
- **React GA4** via a thin wrapper in `utils/analytics.ts`
- **Vercel Analytics** (`@vercel/analytics`)
- **EmailJS** for the contact (“Gedit”) app
- Simple in-memory rate limiter for the contact API (not distributed across instances)
- Client-side only **simulations** of security tools (no real exploitation)
- A large set of games rendered in-browser (Canvas/DOM), with a shared `GameLayout`

---

## App Shell & Architecture

```
pages/
  _app.jsx               # global providers (Legal banner, GA init, Vercel Analytics)
  _document.jsx
  index.jsx              # mounts <Ubuntu />
  api/                   # (dev/server) stub routes for demo-only features
  apps/                  # a few example pages

components/
  ubuntu.tsx             # state: boot, lock, desktop; wires screens & navbar
  base/                  # window system, app base component
  screen/                # booting_screen, desktop, lock_screen, navbar
  apps/                  # the catalog (games, utilities, “security” sims, media)
  SEO/Meta.js            # meta tags and JSON-LD
  util-components/       # shared UI helpers

public/
  images/                # wallpapers, icons
  apps/platformer/       # static assets for games
  chess/, checkers-worker.js, …

hooks/
  usePersistentState.ts, useAssetLoader.ts, useCanvasResize.ts, …

pages/api/
  hydra.js, john.js, metasploit.js, radare2.js   # demo stubs (disabled in static export)

__tests__/
  *.test.(ts|tsx|js)      # smoke tests & per-app logic tests

.github/workflows/
  gh-deploy.yml           # GitHub Pages export pipeline
```

**Windowing model.** The desktop (`components/screen/desktop.js`) manages:
- z-ordering and focus of windows
- global context menus (`components/context-menus/`)
- favorites vs “All Applications” grid
- analytics events for user actions

**App registry.** `apps.config.js` registers apps using dynamic imports to keep the initial bundle lean:
```ts
import dynamic from 'next/dynamic';

const SudokuApp = dynamic(() => import('./components/apps/sudoku'));
export const displaySudoku = () => <SudokuApp />;
```
Heavy apps are wrapped with **dynamic import** and most games share a `GameLayout` with a help overlay.

---

## Environment Variables

| Name | Purpose |
| --- | --- |
| `NEXT_PUBLIC_TRACKING_ID` | GA4 measurement ID (e.g., `G-XXXXXXX`). |
| `NEXT_PUBLIC_SERVICE_ID` | EmailJS service id. |
| `NEXT_PUBLIC_TEMPLATE_ID` | EmailJS template id. |
| `NEXT_PUBLIC_USER_ID` | EmailJS public key / user id. |
| `NEXT_PUBLIC_YOUTUBE_API_KEY` | Used by the YouTube app for search/embed enhancements. |
| `NEXT_PUBLIC_BEEF_URL` | Optional URL for the BeEF demo iframe (if used). |
| `NEXT_PUBLIC_GHIDRA_URL` | Optional URL for a remote Ghidra Web interface. |
| `NEXT_PUBLIC_GHIDRA_WASM` | Optional URL for a Ghidra WebAssembly build. |
| `NEXT_PUBLIC_UI_EXPERIMENTS` | Enable experimental UI heuristics. |

> In production (Vercel/GitHub Actions), set these as **environment variables or repo secrets**. See **CI/CD** below.

---

## Security Headers & CSP

Defined in `next.config.js`:

- **Content-Security-Policy (CSP)** (string built from `ContentSecurityPolicy[]`)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: SAMEORIGIN`

**Notes for prod hardening**
- The sample CSP currently **permits wide `connect-src` and `frame-src`** to enable sandboxed iframes (Chrome app) and demos. In production, **tighten** these to the exact domains you embed. Remove `http:` origins; prefer `https:` only.
- Consider removing `'unsafe-inline'` from `style-src` once all inline styles are eliminated.
- If deploying on a domain that serves a PDF resume via `<object>`, keep `X-Frame-Options: SAMEORIGIN`. Otherwise you can rely on CSP `frame-ancestors` instead.

---

## CI/CD

### GitHub Pages (static)
Workflow: `.github/workflows/gh-deploy.yml`:
- Installs Node, runs `yarn build && yarn export`, adds `.nojekyll`, and deploys `./out` → `gh-pages` branch.
- **Action item:** update matrix to **Node 20.x** to match `package.json`.
- Exposes env via repo **Secrets**:
  - `NEXT_PUBLIC_TRACKING_ID`, `NEXT_PUBLIC_SERVICE_ID`, `NEXT_PUBLIC_TEMPLATE_ID`, `NEXT_PUBLIC_USER_ID`.

### Vercel (serverless) - optional
- Create a Vercel project, set the environment variables above.
- Build command: `yarn build`
- Output: Next.js (serverless by default on Vercel).
- If you keep API routes, Vercel will deploy them as serverless functions. If you go **static** on Vercel, disable API routes or feature-flag those apps.

### Docker (self-hosted) - optional
```Dockerfile
# node:20-alpine
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
CMD ["yarn","start","-p","3000"]
```

---

## Testing

Jest is configured via `jest.config.js` with a **jsdom** environment and helpers in `jest.setup.ts`:
- Mocks for `Image`, `OffscreenCanvas`, `AudioContext`, `Worker`, etc.
- `__tests__/apps.smoke.test.tsx` dynamically imports each app and renders it to catch runtime errors.
- Per-app logic tests (e.g., `blackjack.test.ts`, `sokoban.test.ts`, `nonogram.test.ts`).

Commands:
```bash
yarn test
yarn test:watch
yarn lint
```

---

## Feature Overview

Browse all apps, games, and security tool demos at `/apps`, which presents a searchable grid built from `apps.config.js`.

### Utilities & Media
| App | Route | Category |
| --- | --- | --- |
| Alex | /apps/alex | Utility / Media |
| Chrome | /apps/chrome | Utility / Media |
| Vscode | /apps/vscode | Utility / Media |
| Spotify | /apps/spotify | Utility / Media |
| Youtube | /apps/youtube | Utility / Media |
| Weather | /apps/weather | Utility / Media |
| X / Twitter | /apps/x | Utility / Media |
| Todoist | /apps/todoist | Utility / Media |
| Gedit | /apps/gedit | Utility / Media |
| Settings | /apps/settings | Utility / Media |
| Trash | /apps/trash | Utility / Media |
| Project Gallery | /apps/project-gallery | Utility / Media |
| Quote_Generator | /apps/quote_generator | Utility / Media |

### Terminal Commands
- `clear` – clears the terminal display.
- `help` – lists available commands.

### Games
| Game | Route | Category |
| --- | --- | --- |
| 2048 | /apps/2048 | Game |
| Asteroids | /apps/asteroids | Game |
| Battleship | /apps/battleship | Game |
| Blackjack | /apps/blackjack | Game |
| Breakout | /apps/breakout | Game |
| Candy Crush | /apps/candy-crush | Game |
| Car Racer | /apps/car-racer | Game |
| Checkers | /apps/checkers | Game |
| Chess | /apps/chess | Game |
| Connect Four | /apps/connect-four | Game |
| Flappy Bird | /apps/flappy-bird | Game |
| Frogger | /apps/frogger | Game |
| Gomoku | /apps/gomoku | Game |
| Hangman | /apps/hangman | Game |
| Memory | /apps/memory | Game |
| Minesweeper | /apps/minesweeper | Game |
| Nonogram | /apps/nonogram | Game |
| Pacman | /apps/pacman | Game |
| Pinball | /apps/pinball | Game |
| Platformer | /apps/platformer | Game |
| Pong | /apps/pong | Game |
| Reversi | /apps/reversi | Game |
| Simon | /apps/simon | Game |
| Snake | /apps/snake | Game |
| Sokoban | /apps/sokoban | Game |
| Solitaire | /apps/solitaire | Game |
| Space Invaders | /apps/space-invaders | Game |
| Sudoku | /apps/sudoku | Game |
| Tetris | /apps/tetris | Game |
| Tic Tac Toe | /apps/tictactoe | Game |
| Tower Defense | /apps/tower-defense | Game |
| Word Search | /apps/word-search | Game |
| Wordle | /apps/wordle | Game |

### Security Tools (Simulated)
| Tool | Route | Category |
| --- | --- | --- |
| Autopsy | /apps/autopsy | Security Tool (simulated) |
| BeEF | /apps/beef | Security Tool (simulated) |
| Bluetooth Tools | /apps/bluetooth | Security Tool (simulated) |
| dsniff | /apps/dsniff | Security Tool (simulated) |
| Ettercap | /apps/ettercap | Security Tool (simulated) |
| Ghidra | /apps/ghidra | Security Tool (simulated) |
| Hashcat | /apps/hashcat | Security Tool (simulated) |
| Hydra | /apps/hydra | Security Tool (simulated) |
| John the Ripper | /apps/john | Security Tool (simulated) |
| Kismet | /apps/kismet | Security Tool (simulated) |
| Metasploit | /apps/metasploit | Security Tool (simulated) |
| Metasploit Post | /apps/msf-post | Security Tool (simulated) |
| Mimikatz | /apps/mimikatz | Security Tool (simulated) |
| Nessus | /apps/nessus | Security Tool (simulated) |
| Nmap NSE | /apps/nmap-nse | Security Tool (simulated) |
| OpenVAS | /apps/openvas | Security Tool (simulated) |
| Radare2 | /apps/radare2 | Security Tool (simulated) |
| Reaver | /apps/reaver | Security Tool (simulated) |
| Recon-ng | /apps/reconng | Security Tool (simulated) |
| Volatility | /apps/volatility | Security Tool (simulated) |
| Wireshark | /apps/wireshark | Security Tool (simulated, lab use only) |

> All security apps are **non-operational simulations** intended for education/demos. They **do not** execute exploits and should not be used for any unauthorized activity.
> All reports and feed data are canned examples and not generated from live systems.

---

## Notable Components

- **`components/base/window.js`** - draggable, focusable window with header controls; integrates with desktop z-index.
- **`components/screen/*`** - lock screen, boot splash, navbar, app grid.
- **`hooks/usePersistentState.ts`** - localStorage-backed state with validation + reset helper.
- **`components/apps/GameLayout.tsx`** - standardized layout and help toggle for games.
- **`components/common/PipPortal.tsx`** - renders arbitrary UI inside a Document Picture-in-Picture window. See [`docs/pip-portal.md`](./docs/pip-portal.md).

---

## Adding a New App

1. Create your component under `components/apps/my-app/index.tsx`.
2. Register it in `apps.config.js` using dynamic import:
   ```ts
   const MyApp = dynamic(() => import('./components/apps/my-app'));
   export const displayMyApp = () => <MyApp />;
   ```
3. Add metadata (icon, title) where appropriate.
4. If the app needs persistent state, use `usePersistentState(key, initial, validator)`.
5. If the app embeds external sites, **whitelist** the domain in `next.config.js` CSP (`connect-src`, `frame-src`, `img-src`) and `images.domains`.

---

## Production Hardening Checklist

- [ ] **Pin Node to 20.x** across runtime and CI.
- [ ] **Tighten CSP** (`connect-src`, `frame-src`, remove `http:` and `'unsafe-inline'`).
- [ ] **Set env vars** in the hosting platform; rotate EmailJS keys regularly.
- [ ] **Disable/flag API demo routes** for production or protect behind feature flags.
- [ ] **Rate-limit** any future server routes; validate and sanitize inputs.
- [ ] **Turn on HTTPS/HSTS** at the edge (Vercel / CDN / reverse proxy).
- [ ] **Monitor** with GA4 and server logs; track errors (consider Sentry).
- [ ] **Accessibility pass** (semantic labels, focus order, contrast); fix any Lighthouse issues.
- [ ] **Perf budget** for initial JS; keep heavy apps dynamically imported and idle-loaded.
- [ ] **Backup** any hosted static assets (wallpapers, levels, JSON data).

---

## Known Constraints

- **Static export** disables Next API routes; security/demo apps requiring `/api/*` will be stubbed client-side.
- Some embeds (e.g., arbitrary external sites in the **Chrome** app) may refuse to render in iframes due to **X-Frame-Options** or CSP set by the target site.

---

## License

See [`LICENSE`](./LICENSE).

---

*Generated on 2025-08-26*


---

## NPM/Yarn Scripts

- `dev` → `next dev`
- `build` → `next build`
- `start` → `next start`
- `export` → `next export`
- `test` → `jest`
- `test:watch` → `jest --watch`
- `lint` → `next lint`
- `smoke` → `node scripts/smoke-all-apps.mjs`

### Smoke Tests

Start the development server in one terminal:

```bash
npm run dev
```

In another terminal, run the Playwright smoke test which visits every `/apps/*` route and fails on console errors:

```bash
npm run smoke
```

