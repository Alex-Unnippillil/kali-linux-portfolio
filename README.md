# Kali Linux Portfolio 

A desktop-style portfolio built with Next.js and Tailwind that emulates a Kali/Ubuntu UI with windows, a dock, context menus, and a rich catalog of **security-tool simulations**, **utilities**, and **retro games**. This README is tailored for a professional full-stack engineer preparing **production deployment** and ongoing maintenance.

> Repo homepage: https://unnippillil.com/

---

## ⚠️ Disclaimer & Risk Overview

This repository showcases **static, non-operational simulations** of security tools for educational purposes only. Running real offensive commands against systems without explicit authorization is illegal and can cause damage or service disruption.

**Potential Risks**
- Network scans may trigger intrusion detection and block your IP.
- Brute-force attempts can lock accounts or corrupt data.
- Sample outputs are canned and not from live targets.

Always test inside controlled labs and obtain written permission before performing any security assessment.

---

## Setup

### Requirements
- **Node.js 20.19.5** (repo includes `.nvmrc`; run `nvm use`)
- **Yarn** or **npm**
- Recommended: **pnpm** if you prefer stricter hoisting; update lock/config accordingly.

### Install & Run (Dev)
```bash
cp .env.local.example .env.local  # populate with required keys
nvm install  # installs Node 20.19.5 from .nvmrc if needed
nvm use
yarn install
yarn dev
```

### Production Build
Serverful deployments run the built Next.js server so all API routes are available.
```bash
yarn build && yarn start
```
The service worker is automatically generated during `next build` via [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa).
After the server starts, exercise an API route to confirm server-side functionality:
```bash
curl -X POST http://localhost:3000/api/dummy
```

### Static Export (for GitHub Pages / S3 Websites)
This project supports static export. Serverless API routes will not be available; the UI falls back to demo data or hides features.
```bash
yarn export && npx serve out

```
Verify that features relying on `/api/*` return 404 or other placeholders when served statically.

### Install as PWA for Sharing

To send text or links directly into the Sticky Notes app:

1. Open the site in a supported browser (Chrome, Edge, etc.).
2. Use the browser's **Install** or **Add to Home screen** option.
3. After installation, use the system **Share** action and select "Kali Linux Portfolio".
4. The shared content will appear as a new note.

### Service Worker (SW)

- Generated via [`@ducanh2912/next-pwa`](https://github.com/DuCanhGH/next-pwa); output is `public/sw.js`.
- Only assets under `public/` are precached.
- Dynamic routes or API responses are not cached.
- Future work may use `injectManifest` for finer control.

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in required API keys:

- `NEXT_PUBLIC_ENABLE_ANALYTICS` – enable client-side analytics when set to `true`.
- `FEATURE_TOOL_APIS` – toggle simulated tool APIs (`enabled` or `disabled`).
- `RECAPTCHA_SECRET` and related `NEXT_PUBLIC_RECAPTCHA_*` keys for contact form spam protection.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` – Supabase credentials. When unset, Supabase-backed APIs and features are disabled.

See `.env.local.example` for the full list.

---

## Scripts

- `yarn install` – install project dependencies.
- `yarn dev` – start the development server with hot reloading.
- `yarn test` – run the test suite.
- `yarn lint` – check code for linting issues.
- `yarn export` – generate a static export in the `out/` directory.
- `yarn scan:secrets` – run [Gitleaks](https://github.com/gitleaks/gitleaks) using the repo's `.gitleaks.toml` allowlist.

---

## Local Development Tips

- Run `yarn lint` and `yarn test` before committing changes.
- For manual smoke tests, start `yarn dev` and in another terminal run `yarn smoke` to visit every `/apps/*` route.

## Secret Scanning

1. Install the [Gitleaks CLI](https://github.com/gitleaks/gitleaks/releases) so the `gitleaks` binary is available in your `PATH`.
   - macOS: `brew install gitleaks`
   - Linux: `curl -sSL https://github.com/gitleaks/gitleaks/releases/download/v8.28.0/gitleaks_8.28.0_linux_x64.tar.gz -o gitleaks.tar.gz && tar -xzf gitleaks.tar.gz gitleaks && sudo install gitleaks /usr/local/bin/gitleaks && rm gitleaks.tar.gz gitleaks`
2. Run `yarn scan:secrets` from the project root. The command redacts output and fails if any leak is detected.
3. Only extend `.gitleaks.toml` when adding new, intentional demo values. Unexpected findings should be investigated and scrubbed rather than allowlisted.

---

## Speed Insights

- Enable Speed Insights in the Vercel project dashboard.
- `<SpeedInsights />` is rendered in [`pages/_app.jsx`](./pages/_app.jsx) alongside `<Analytics />`.
- Validate collection by requesting `/_vercel/speed-insights/script.js` from a deployed build.
- No metrics are collected in development mode; ad blockers or network filters can block the script.

See Vercel's [Speed Insights Quickstart](https://vercel.com/docs/speed-insights/quickstart) and [troubleshooting guide](https://vercel.com/docs/speed-insights/troubleshooting) for more information.

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

### Gamepad Input & Remapping

Games can listen for normalized gamepad events via `utils/gamepad.ts`. The manager polls
`navigator.getGamepads`, emits button and axis changes, and triggers haptic feedback
through `gamepad.vibrationActuator` where available. Key bindings configured with
`components/apps/Games/common/input-remap` are persisted in the browser's Origin Private
File System (OPFS) so players can store per-game profiles.

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

### Prefetching dynamic apps
Dynamic app modules include a `webpackPrefetch` hint and expose a `prefetch()` helper. Desktop tiles call this helper on hover or
keyboard focus so bundles are warmed before launch. When adding a new app, export a default component and register it with
`createDynamicApp` to opt into this behaviour.

---

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in required values.

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
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | ReCAPTCHA site key used on the client. |
| `RECAPTCHA_SECRET` | ReCAPTCHA secret key for server-side verification. |
| `SUPABASE_URL` | Supabase project URL for server-side access. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for privileged operations. |
| `SUPABASE_ANON_KEY` | Supabase anonymous key for server-side reads. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL exposed to the client. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public Supabase anonymous key used on the client. |
| `ADMIN_READ_KEY` | Secret key required by admin message APIs. Configure this directly as an environment variable (e.g., in the Vercel dashboard). |
| `NEXT_PUBLIC_UI_EXPERIMENTS` | Enable experimental UI heuristics. |
| `NEXT_PUBLIC_STATIC_EXPORT` | Set to `'true'` during `yarn export` to disable server APIs. |
| `NEXT_PUBLIC_SHOW_BETA` | Set to `1` to display a small beta badge in the UI. |
| `FEATURE_TOOL_APIS` | Enable server-side tool API routes like Hydra and John; set to `enabled` to allow. |
| `FEATURE_HYDRA` | Allow the Hydra API (`/api/hydra`); requires `FEATURE_TOOL_APIS`. |

> In production (Vercel/GitHub Actions), set these as **environment variables or repo secrets**. See **CI/CD** below.

---

## Security Headers & CSP

Defined in `next.config.js`. See [CSP External Domains](#csp-external-domains) for allowed hostnames:

- **Content-Security-Policy (CSP)** (string built from `ContentSecurityPolicy[]`; see [CSP External Domains](#csp-external-domains))
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-Frame-Options: SAMEORIGIN`

### CSP External Domains

These external domains are whitelisted in the default CSP. Update this list whenever `next.config.js` changes.

| Domain | Purpose |
| --- | --- |
| `platform.twitter.com` | Twitter widgets and scripts |
| `syndication.twitter.com` | Twitter embed scripts |
| `cdn.syndication.twimg.com` | Twitter asset CDN |
| `*.twitter.com` | Additional Twitter content |
| `*.x.com` | X (Twitter) domain equivalents |
| `*.google.com` | Google services and Chrome app favicons |
| `example.com` | Chrome app demo origin |
| `developer.mozilla.org` | Chrome app demo origin |
| `en.wikipedia.org` | Chrome app demo origin |
| `cdn.jsdelivr.net` | Math.js library |
| `cdnjs.cloudflare.com` | PDF.js worker |
| `stackblitz.com` | StackBlitz IDE embeds |
| `www.youtube.com` | YouTube IFrame API |
| `www.youtube-nocookie.com` | YouTube video embeds (privacy-enhanced) |
| `open.spotify.com` | Spotify embeds |
| `vercel.live` | Vercel toolbar |

**Notes for prod hardening**
- Review `connect-src` and `frame-src` to ensure only required domains are present for your deployment.
- Consider removing `'unsafe-inline'` from `style-src` once all inline styles are eliminated.
- If deploying on a domain that serves a PDF resume via `<object>`, keep `X-Frame-Options: SAMEORIGIN`. Otherwise you can rely on CSP `frame-ancestors` instead.

---

## Deployment

### Static export (GitHub Pages)
Workflow: `.github/workflows/gh-deploy.yml`:
 - Installs Node, runs `yarn export`, adds `.nojekyll`, and deploys `./out` → `gh-pages` branch.
 - Uses **Node 20.19.5** to match `package.json`.
- Required env variables (GitHub Secrets):
  - `NEXT_PUBLIC_TRACKING_ID`
  - `NEXT_PUBLIC_SERVICE_ID`
  - `NEXT_PUBLIC_TEMPLATE_ID`
  - `NEXT_PUBLIC_USER_ID`
  - `NEXT_PUBLIC_YOUTUBE_API_KEY`
  - `NEXT_PUBLIC_BEEF_URL`
  - `NEXT_PUBLIC_GHIDRA_URL`
  - `NEXT_PUBLIC_GHIDRA_WASM`
  - `NEXT_PUBLIC_UI_EXPERIMENTS`

### Vercel deployment
- Create a Vercel project and connect this repo.
- Required env variables (Project Settings):
  - `NEXT_PUBLIC_TRACKING_ID`
  - `NEXT_PUBLIC_SERVICE_ID`
  - `NEXT_PUBLIC_TEMPLATE_ID`
  - `NEXT_PUBLIC_USER_ID`
  - `NEXT_PUBLIC_YOUTUBE_API_KEY`
  - `NEXT_PUBLIC_BEEF_URL`
  - `NEXT_PUBLIC_GHIDRA_URL`
  - `NEXT_PUBLIC_GHIDRA_WASM`
  - `NEXT_PUBLIC_UI_EXPERIMENTS`
  - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
  - `RECAPTCHA_SECRET`
  - `ADMIN_READ_KEY` (set manually in Vercel or your host)
- Build command: `yarn build`
- Output: Next.js (serverless by default on Vercel).
- If you keep API routes, Vercel deploys them as serverless functions. For a static build, disable API routes or feature-flag those apps.

### Docker image build/run
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

Build the image:
```bash
docker build -t kali-portfolio .
```

Run the container:
```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_TRACKING_ID=... \
  -e NEXT_PUBLIC_SERVICE_ID=... \
  -e NEXT_PUBLIC_TEMPLATE_ID=... \
  -e NEXT_PUBLIC_USER_ID=... \
  -e NEXT_PUBLIC_YOUTUBE_API_KEY=... \
  -e NEXT_PUBLIC_BEEF_URL=... \
  -e NEXT_PUBLIC_GHIDRA_URL=... \
  -e NEXT_PUBLIC_GHIDRA_WASM=... \
  -e NEXT_PUBLIC_UI_EXPERIMENTS=... \
  kali-portfolio
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
| VS Code | /apps/vscode | StackBlitz IDE embed |
| Spotify | /apps/spotify | Utility / Media |
| Youtube | /apps/youtube | Utility / Media |
| Weather | /apps/weather | Utility / Media |
| X / Twitter | /apps/x | Utility / Media |
| Todoist | /apps/todoist | Utility / Media |
| Gedit | /apps/gedit | Utility / Media |
| Settings | /apps/settings | Utility / Media |
| Trash | /apps/trash | Utility / Media |
| Project Gallery | /apps/project-gallery | Utility / Media |
| Quote | /apps/quote | Utility / Media |

> The VS Code app now embeds a StackBlitz IDE via iframe instead of the local Monaco editor.

The Spotify app lets you customize a mood-to-playlist mapping. Use the in-app form to
add, reorder, or delete moods; selections persist in the browser's Origin Private File
System so your choices restore on load. The last mood played is remembered, and
play/pause and track controls include keyboard hotkeys.

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
| Car Racer | /apps/car-racer | Game - ghost replays, lane assist, drift scoring |
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
| Metasploit Post | /apps/metasploit-post | Security Tool (simulated) |
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
- **`hooks/useSettings.tsx`** - global settings context exposing theme, accent, wallpaper and other preferences with persistence.
- **`components/apps/GameLayout.tsx`** - standardized layout and help toggle for games.
- **`components/apps/radare2`** - dual hex/disassembly panes with seek/find/xref; graph mode from JSON fixtures; per-file notes and bookmarks.
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

- [x] **Pin Node to 20.19.5** across runtime and CI.
- [ ] **Track Node.js `DEP0170` deprecation** for custom protocol URLs; update tooling/dependencies when Node fully removes support and ensure `yarn install` runs without related warnings.
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

## Calculator Syntax

The calculator supports a subset of math.js expressions with the following features:

- Operators: `+`, `-`, `*`, `/`, and `^` with standard precedence and parenthesis grouping.
- Built-in functions such as `sin`, `cos`, `tan`, `sqrt`, `abs`, `ceil`, `floor`, `round`, `exp`, and `log`.
- Unit suffixes like `cm`, `m`, `in`, or `ft` allowing mixed-unit arithmetic (e.g. `2m + 30cm`).
- The previous answer is accessible via `Ans`.

Invalid syntax is highlighted in the calculator input, selecting the character where parsing failed.

