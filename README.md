# Kali Linux Portfolio

A desktop-style portfolio built with Next.js and Tailwind CSS that recreates the look and feel of a Kali Linux or Ubuntu workstation. It ships with a window manager, dock, launcher, context menus, theming, and a curated catalog of security-tool simulations, utilities, and retro games. This README is for contributors, operators, and anyone running the portfolio in production or preview environments.

Live site: https://unnippillil.com/
Repository: https://github.com/Alex-Unnippillil/kali-linux-portfolio

## Table of contents

- [Project goals](#project-goals)
- [Legal notice and risk overview](#legal-notice-and-risk-overview)
- [What you get](#what-you-get)
- [App catalog](#app-catalog)
- [Tech stack](#tech-stack)
- [Repository layout](#repository-layout)
- [How it works](#how-it-works)
  - [Desktop shell](#desktop-shell)
  - [App runtime and dynamic loading](#app-runtime-and-dynamic-loading)
  - [Simulation-first security model](#simulation-first-security-model)
  - [Persistence model](#persistence-model)
  - [PWA and offline](#pwa-and-offline)
- [Quick start](#quick-start)
- [Configuration](#configuration)
  - [Environment variables](#environment-variables)
  - [Feature flags](#feature-flags)
  - [Content Security Policy and security headers](#content-security-policy-and-security-headers)
- [Developer workflows](#developer-workflows)
  - [Scripts](#scripts)
  - [Testing](#testing)
  - [Accessibility](#accessibility)
  - [Linting and type safety](#linting-and-type-safety)
- [Deployment](#deployment)
  - [Vercel](#vercel)
  - [GitHub Pages export](#github-pages-export)
- [Operations](#operations)
  - [Analytics](#analytics)
  - [Error reporting](#error-reporting)
- [Contributing](#contributing)
- [Changelog and versioning](#changelog-and-versioning)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Project goals

1. Provide a portfolio that demonstrates product engineering depth through a complex, OS-like user interface.
2. Keep security tooling demonstrative and non-operational. The project is safe to run on personal devices and safe to share publicly.
3. Maintain strong quality gates: type safety, tests, accessibility checks, and secure-by-default deployment headers.
4. Keep the codebase approachable for long-term iteration with documentation, checklists, and repeatable workflows.

## Legal notice and risk overview

This repository includes UI simulations inspired by common security tools. These experiences are for education, portfolio review, and safe experimentation only. Do not adapt this codebase to perform real offensive actions, brute-force attempts, scanning, exploitation, or any unauthorized activity.

If you contribute new tool experiences, they must remain self-contained demos. Prefer fixtures, offline datasets, and deterministic output generation over any real network behavior.

## What you get

### Desktop UX

- Window management with draggable, resizable, snapping, focus, and z-index handling.
- Dock and launcher experiences for organizing apps and favorites.
- Context menus and panels for system controls and notifications.
- Theming and personalization: accent color, wallpaper, density, motion, contrast, audio, and haptics.

### App ecosystem

The app catalog is defined in `apps.config.js` and implemented primarily in `components/apps/**` plus a small set of specialized modules in `apps/**`, `modules/**`, and `workers/**`.

Representative apps include:

- Productivity and media: Notes, Sticky Notes, YouTube, Spotify, Todoist, File Explorer, Camera, Screen Recorder.
- Developer tools: Terminal, VSCode embed, request builders, ASCII tools.
- Simulations: Wireshark, Kismet, Nessus, Nikto, Recon-ng, Mimikatz, Metasploit (simulated), password tooling (simulated).
- Games: Minesweeper, Snake, Solitaire, Tetris, Pacman, Asteroids, Candy Crush, Chess, Checkers, Battleship, Tower Defense.

### Safety, privacy, and controls

- External network access from the client is guarded behind `allowNetwork` in Settings.
- Optional integrations are explicitly gated behind environment variables.
- Production deployments ship with security headers and CSP constraints.

## App catalog

All applications are lazy-loaded via `apps.config.js` to ensure optimal initial load performance. The lists below are representative and include the primary implementation paths used by the desktop shell or builder pages.

### Security tools (simulations)

These tools are simulations designed for educational purposes. They do not perform real network attacks.

| App | Implementation details | Primary path |
| --- | --- | --- |
| Autopsy | Digital forensics interface mockup that simulates file analysis reports and evidence browsing using static data. | `components/apps/autopsy` |
| BeEF | Browser Exploitation Framework simulation that renders a static control panel to demonstrate hooked browser management. | `components/apps/beef` |
| Bluetooth | Simulates `bluetoothctl` and `hcitool` scanning/pairing sequences using pre-recorded device lists. | `components/apps/ble-sensor` |
| Dsniff | Network auditing tool simulation that displays static packet capture logs and example credentials. | `components/apps/dsniff` |
| Ettercap | Man-in-the-middle suite simulation that visualizes host lists and ARP poisoning workflows without actual packets. | `components/apps/ettercap` |
| Ghidra | Reverse engineering suite simulation with drag-and-drop analysis and optional WASM decompiler wiring. | `components/apps/ghidra` |
| Hashcat | Password recovery simulation with progress bars and deterministic outputs. | `components/apps/hashcat` |
| Hydra | Login cracker simulation with adjustable speed and thread settings against a dummy service. | `components/apps/hydra` |
| John the Ripper | Offline password cracking simulation with terminal-style output. | `components/apps/john` |
| Kismet | Wireless network detector simulation with randomized network lists. | `components/apps/kismet.jsx` |
| Metasploit | Console-based simulation with command parsing, sessions, jobs, and mock exploit metadata. | `components/apps/metasploit` |
| Metasploit Post | Post-exploitation module extension for Metasploit simulation. | `components/apps/msf-post` |
| Mimikatz | Credential tool simulation with deterministic output for credential and token commands. | `components/apps/mimikatz` |
| Mimikatz Offline | Offline credential simulation data set. | `components/apps/mimikatz/offline` |
| Nessus | Vulnerability scanner simulation with dashboard reports and charts. | `components/apps/nessus` |
| Nikto | Web scanner simulation with canned findings and metadata. | `components/apps/nikto` |
| Nmap NSE | Script-engine scan simulation with deterministic service outputs. | `components/apps/nmap-nse` |
| OpenVAS | Vulnerability scanner simulation with task management and report panels. | `components/apps/openvas` |
| Radare2 | Reverse engineering console simulation with disassembly output. | `components/apps/radare2` |
| Reaver | WPS brute-force simulation with progress updates and mock results. | `components/apps/reaver` |
| Recon-ng | OSINT workflow simulation with dummy targets and module flows. | `components/apps/reconng` |
| Volatility | Memory forensics simulation for memory image inspection. | `components/apps/volatility` |
| Wireshark | Packet analyzer simulation with virtualized packet lists and details. | `components/apps/wireshark` |

### Utilities and productivity

| App | Implementation details | Primary path |
| --- | --- | --- |
| About Alex | Profile and portfolio overview window. | `components/apps/alex` |
| ASCII Art | ASCII art generator for terminal-style output. | `components/apps/ascii_art` |
| Calculator | Scientific calculator with unit conversions using `math.js`. | `components/apps/calculator` |
| Camera | Uses `navigator.mediaDevices.getUserMedia` to capture images locally. | `components/apps/camera` |
| Contact (Gedit) | Text editor simulation that doubles as a contact form via EmailJS. | `components/apps/contact` |
| Converter | Unit converter with shared definitions for length, mass, temperature, and more. | `components/apps/converter` |
| Desktop Folder | Folder window for desktop items and shortcuts. | `components/apps/desktop-folder` |
| Evidence Vault | Evidence storage and review surfaces for forensics flows. | `components/apps/evidence-vault` |
| File Explorer | File manager with navigation, preview, and basic operations. | `components/apps/file-explorer` |
| Firefox | Iframe-based browser shell with allow-listed destinations. | `components/apps/firefox` |
| Figlet | ASCII banner generator. | `components/apps/figlet` |
| Input Lab | Input component testing and demo surface. | `components/apps/input-lab` |
| Notepad | Lightweight note editor. | `components/apps/notepad` |
| Plugin Manager | Plugin catalog and management surface. | `components/apps/plugin-manager` |
| Project Gallery | Project and work showcase gallery. | `components/apps/project-gallery` |
| QR Tool | QR code generator and decoder. | `components/apps/qr` |
| Quote | Quote generator and display surface. | `components/apps/quote` |
| Resource Monitor | System-style resource charts and telemetry. | `components/apps/resource_monitor` |
| Screen Recorder | Uses `MediaRecorder` for screen capture and local saving. | `components/apps/screen-recorder` |
| Serial Terminal | Serial console simulation for device communication. | `components/apps/serial-terminal` |
| Settings | Desktop settings and personalization controls. | `components/apps/settings` |
| Spotify | Embedded Spotify web player with constrained iframe permissions. | `components/apps/spotify` |
| Sticky Notes | Sticky notes widget with local persistence. | `components/apps/sticky_notes` |
| Subnet Calculator | IPv4 subnetting calculator and reference tables. | `components/apps/subnet-calculator` |
| Terminal | `xterm.js` shell simulation with custom parsing and OPFS integration. | `components/apps/terminal` |
| Todoist | Embedded Todoist web interface. | `components/apps/todoist` |
| Trash | Virtual trash bin with restore and delete actions. | `components/apps/trash` |
| Visual Studio Code | Embedded StackBlitz editor for repository browsing. | `components/apps/vscode` |
| Weather | Weather dashboard with live or demo data. | `components/apps/weather` |
| Weather Widget | Compact weather widget for the desktop. | `components/apps/weather_widget` |
| X | Social feed simulation with static or API-fed timelines. | `components/apps/x` |
| YouTube | YouTube player and channel browser via iframe API. | `components/apps/youtube` |

### Builder apps (standalone pages)

These apps live under `pages/apps` and are accessed via `/apps/*` routes.

| App | Implementation details | Primary path |
| --- | --- | --- |
| SSH Command Builder | Compose SSH commands with structured inputs. | `apps/ssh` |
| HTTP Request Builder | Build HTTP requests with headers and payloads. | `apps/http` |
| HTML Rewriter | Client-side HTML transformation playground. | `apps/html-rewriter` |

### Games

Most games use React state for logic and HTML, CSS, or Canvas for rendering. Some complex games use Phaser.

| Game | Engine or logic | Details | Primary path |
| --- | --- | --- | --- |
| 2048 | React grid | Tile-sliding game with persistent high scores. | `components/apps/2048` |
| Asteroids | Canvas | Arcade shooter with a custom game loop. | `components/apps/asteroids` |
| Battleship | React | Grid-based strategy with localized AI state. | `components/apps/battleship.js` |
| Blackjack | React | Card game logic using a shuffled deck state. | `components/apps/blackjack` |
| Breakout | Canvas | Brick breaker with physics collision detection. | `components/apps/breakout` |
| Candy Crush | React grid | Match-3 logic with cascades and animations. | `components/apps/candy-crush` |
| Car Racer | Canvas | Top-down racing game with scrolling track. | `components/apps/car-racer` |
| Checkers | React | Move validation and capture logic. | `components/apps/checkers` |
| Chess | WASM and canvas | Uses `chess.js` for validation and Stockfish for AI. | `components/apps/chess` |
| Connect Four | React | Grid logic with four-in-a-row detection. | `components/apps/connect-four` |
| Flappy Bird | Canvas | Side-scroller with gravity and collision loops. | `components/apps/flappy-bird` |
| Frogger | Canvas | Lane-based entity movement logic. | `components/apps/frogger` |
| Gomoku | React | Five-in-a-row board state logic. | `components/apps/gomoku` |
| Hangman | React | Word guessing with dictionary-backed word selection. | `components/apps/hangman` |
| Lane Runner | Canvas | Endless runner lane-switching game. | `components/apps/lane-runner` |
| Memory | React | Card matching with flipped-state tracking. | `components/apps/memory` |
| Minesweeper | React | Recursive flood-fill logic for empty squares. | `components/apps/minesweeper` |
| Nonogram | React | Grid validation against row and column hints. | `components/apps/nonogram` |
| Pacman | React and HTML | Maze navigation and ghost pathfinding logic. | `components/apps/pacman` |
| Pinball | Canvas and Matter.js | Physics simulation with a 2D engine. | `components/apps/pinball` |
| Platformer | Phaser | Side-scrolling platformer with physics and sprites. | `components/apps/platformer` |
| Pong | Canvas | Classic paddle game with simple collisions. | `components/apps/pong` |
| Reversi | React | Valid move highlighting and piece flipping. | `components/apps/reversi` |
| Simon | React | Sequence memory with timed playback. | `components/apps/simon` |
| Snake | React grid | Grid-based movement with queue data structure. | `components/apps/snake` |
| Sokoban | React | Box-pushing puzzle logic. | `components/apps/sokoban` |
| Solitaire | React | Klondike implementation with drag-and-drop stacks. | `components/apps/solitaire/index` |
| Space Invaders | Canvas | Shooter with entity manager for waves and collisions. | `components/apps/space-invaders` |
| Sudoku | React | Backtracking generator for valid puzzles. | `components/apps/sudoku` |
| Tetris | React grid | Matrix rotation and collision logic. | `components/apps/tetris` |
| Tic Tac Toe | React | Minimax for unbeatable difficulty. | `components/apps/tictactoe` |
| Tower Defense | Canvas | Pathing, targeting, and wave management. | `components/apps/tower-defense` |
| Word Search | React | Grid generation with multi-direction placement. | `components/apps/word-search` |
| Wordle | React | Dictionary validation and streak persistence. | `components/apps/wordle` |

## Tech stack

- Next.js (pages router for UI, plus `app/api` for route handlers where appropriate)
- React (hybrid JS and TS codebase)
- Tailwind CSS for styling
- TypeScript for typed modules and tests
- PWA build pipeline via `@ducanh2912/next-pwa` (service worker generated at build time)
- Testing
  - Jest unit tests: `__tests__/**`
  - Playwright end-to-end and accessibility tests: `playwright/**`
  - Pa11y-ci checks: `pa11yci.json`
- Tooling
  - ESLint (including custom rules in `eslint-plugin-no-top-level-window`)
  - Corepack-managed Yarn 4 with immutable installs

## Repository layout

High-level map (not exhaustive):

```text
.
├─ pages/                  # Primary UI routes and API routes
│  ├─ api/                 # Serverless handlers (fixtures, simulations, integrations)
│  └─ index.tsx            # Desktop entry point
├─ app/api/                # Route handlers (Next app router API)
├─ components/             # Desktop shell, apps, shared UI building blocks
├─ hooks/                  # Shared React hooks (settings, guards, etc.)
├─ utils/                  # Cross-cutting utilities (storage, analytics, CSP helpers)
├─ public/                 # Static assets, fixtures, PWA assets, demo data
├─ docs/                   # Architecture notes, checklists, and deep dives
├─ __tests__/              # Jest tests
├─ playwright/             # Playwright tests and helpers
├─ scripts/                # Dev/build automation, lint tooling, CI helpers
├─ plugins/                # Plugin catalog and sandboxed plugin demos
└─ vercel.json             # Vercel build and runtime configuration
```

## How it works

### Desktop shell

The desktop experience is mounted from `pages/index.tsx`, which renders `components/ubuntu.js` as the top-level shell. That shell coordinates boot and lock screens, desktop layout, and system-level UI concerns.

### App runtime and dynamic loading

Apps are loaded with dynamic imports via the registry defined in `apps.config.js` (see the `createDynamicApp` helpers in `utils/createDynamicApp.js`). This keeps the initial bundle lean and makes the system feel responsive because large apps compile and load only when opened.

### Simulation-first security model

This repo is intentionally structured so security tooling remains demonstrative:

- UI flows are designed to look authentic while producing deterministic, safe output.
- API routes in `pages/api/**` are gated behind feature flags and are implemented as simulation endpoints with fixtures, offline datasets, or deterministic generators.
- The Settings provider can block off-origin network requests in the browser when `allowNetwork` is disabled.

If you are extending the platform, treat the simulation boundary as a hard requirement. The maintainer playbook in `AGENTS.md` is the contract for contributions.

### Persistence model

User preferences are stored client-side:

- Settings use IndexedDB (via `idb-keyval`) and safe local-storage fallbacks where appropriate.
- The desktop experience may also persist layout and recent items through utilities in `utils/**` (see `utils/safeStorage.ts`, `utils/recentStorage.ts`, and related modules).

### PWA and offline

A service worker is generated during `yarn build` and emitted to `public/sw.js`. Offline fallback assets live in `public/offline.*` and are used to keep the experience usable even when network access is limited.

## Quick start

### Prerequisites

- Node.js 20 (see `.nvmrc`)
- Yarn 4.9.2 via Corepack (see `package.json#packageManager`)

### Install

```bash
corepack enable
corepack prepare yarn@4.9.2 --activate
yarn install --immutable
```

### Run (development)

```bash
yarn dev
```

The dev server runs at http://localhost:3000.

Development convenience flags:

- Clean dev dist directory: `yarn dev --clean` (also accepts `--clean-dist` or `--reset-cache`)
- Control Turbopack forwarding: `yarn dev --turbo` or `yarn dev --no-turbo`

### Build and run (production)

```bash
yarn build
yarn start
```

### One-command verification

Runs the full local quality gate pipeline (lint, typecheck, tests, smoke checks as configured):

```bash
yarn verify:all
```

## Configuration

### Environment variables

Start from `.env.local.example` (local) or `.env.example` (reference). The project is designed to run with no secrets in demo mode, but some integrations require keys.

Core flags and integrations:

| Variable | Default | Purpose |
| --- | --- | --- |
| NEXT_PUBLIC_DEMO_MODE | false | Enables safe demo fallbacks for integrations (recommended for Preview). |
| NEXT_PUBLIC_ENABLE_ANALYTICS | false | Enables `@vercel/analytics` wiring. |
| NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS | false | Enables Vercel Speed Insights wiring. |
| NEXT_PUBLIC_UI_EXPERIMENTS | false | Enables optional UI experiments. |
| NEXT_PUBLIC_STATIC_EXPORT | false | Enables static export mode (used for GitHub Pages builds). |
| NEXT_PUBLIC_BASE_PATH / BASE_PATH | empty | Base path override for subpath deployments. |
| NEXT_PUBLIC_RECAPTCHA_SITE_KEY / RECAPTCHA_SECRET | empty | Contact form spam protection. |
| NEXT_PUBLIC_USER_ID / NEXT_PUBLIC_SERVICE_ID / NEXT_PUBLIC_TEMPLATE_ID | empty | EmailJS configuration for contact forms. |
| NEXT_PUBLIC_YOUTUBE_API_KEY / YOUTUBE_API_KEY | empty | YouTube API usage (optional). |
| NEXT_PUBLIC_YOUTUBE_CHANNEL_ID | empty | Channel scoping for YouTube app. |
| NEXT_PUBLIC_CURRENCY_API_URL | empty | Currency conversion API endpoint (optional). |
| NEXT_PUBLIC_GHIDRA_WASM / NEXT_PUBLIC_GHIDRA_URL | empty | Ghidra simulation wiring (optional). |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY | empty | Supabase client configuration. |
| SUPABASE_SERVICE_ROLE_KEY | empty | Server-side Supabase operations where needed. |

### Feature flags

Feature flags intentionally keep potentially sensitive functionality inert unless explicitly enabled:

| Variable | Values | Scope |
| --- | --- | --- |
| FEATURE_TOOL_APIS | enabled or disabled | Wraps simulation API routes that present tool-like outputs. Default should remain disabled for safety. |
| FEATURE_HYDRA | enabled or disabled | Additional gating for the Hydra simulation surfaces. Default should remain disabled. |

### Content Security Policy and security headers

This repo takes a secure-by-default posture with CSP and other headers configured in:

- `next.config.js` (static header policies)
- `middleware.ts` (per-request nonce generation and CSP assembly)

If you add new embeds, external media, analytics, or script sources, update the CSP allowlists accordingly. Keep the set as small as possible and prefer same-origin hosting for assets.

## Developer workflows

### Scripts

The most common scripts (see `package.json#scripts` for the full list):

- `yarn dev`: local development server (custom wrapper in `scripts/dev.mjs`)
- `yarn build`: production build (Next.js)
- `yarn start`: run production server
- `yarn test`: Jest test suite
- `yarn test:watch`: Jest watch mode
- `yarn lint`: repo lint gate (changed-file aware wrapper in `scripts/lint-changed.mjs`)
- `yarn typecheck`: TypeScript no-emit check
- `yarn a11y`: local accessibility run (Pa11y and Playwright)
- `yarn smoke`: smoke tests that open and validate the entire app catalog
- `yarn analyze`: bundle analysis build (sets `ANALYZE=true`)
- `yarn module-report`: generates module report artifacts
- `yarn verify:all`: run the local CI-equivalent suite

### Testing

- Jest unit tests live in `__tests__/`.
- Playwright tests live in `playwright/` and `playwright.config.ts`.
- Accessibility pipeline can run locally via `yarn a11y` and in GitHub Actions via `.github/workflows/a11y.yml`.

### Accessibility

Accessibility is treated as a first-class requirement:

- Automated checks: Pa11y-ci plus Playwright accessibility coverage.
- Keyboard navigation: skip links and desktop landmarks are implemented in the shell; see `docs/keyboard-only-test-plan.md` and `docs/desktop-layout-landmarks.md`.

### Linting and type safety

- ESLint is enforced in CI and locally with `yarn lint`.
- TypeScript no-emit checks are enforced with `yarn typecheck`.
- `eslint-plugin-no-top-level-window` prevents patterns that break SSR or static analysis.

## Deployment

### Vercel

This repo is configured for deterministic Vercel builds:

- `vercel.json` sets `installCommand` to `corepack enable && yarn install --immutable`.
- `vercel.json` sets `buildCommand` to `yarn build`.
- Functions runtime is pinned for both `pages/api` and `app/api` routes.

Preview environment recommendations:

- `NEXT_PUBLIC_DEMO_MODE=true`
- `FEATURE_TOOL_APIS=disabled`
- `NEXT_PUBLIC_ENABLE_ANALYTICS=false`
- `NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=false`

Preview deployments are designed to be shareable and isolated from production. The repo includes documentation on keeping Preview builds deterministic and avoiding accidental builds of `gh-pages`: see `docs/vercel.md`.

### GitHub Pages export

A static export path exists for demos where serverless APIs are not required:

- Use `yarn export` to build with `NEXT_PUBLIC_STATIC_EXPORT=true`.
- The workflow `.github/workflows/gh-deploy.yml` can publish the output to a `gh-pages` branch.

If you are using both Vercel and GitHub Pages in the same repo, ensure Vercel is not attempting to build the `gh-pages` branch (see `docs/vercel.md` and `scripts/vercel-ignore-build.sh`).

## Operations

### Analytics

Analytics are opt-in:

- `NEXT_PUBLIC_ENABLE_ANALYTICS=true` enables Vercel Analytics.
- `NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=true` enables Vercel Speed Insights.

Keep analytics disabled by default for local development and previews unless you explicitly need the data.

### Error reporting

Client error logging is routed through a Next route handler in `app/api/log-client-error/route.ts`. Keep error payloads minimal and avoid including sensitive user data.

## Contributing

Read these first:

- `AGENTS.md` (maintainer playbook and contribution contract)
- `docs/new-app-checklist.md` (how to add new apps without degrading UX or performance)
- `docs/terminal-simulation.md` (terminal UX and output design constraints)

General principles:

- Preserve the simulation boundary: no real offensive logic, no uncontrolled outbound network traffic.
- Keep the desktop responsive: prefer dynamic imports, chunk boundaries, and small shared primitives.
- Maintain quality gates: tests, linting, typecheck, and accessibility should remain green.

## Changelog and versioning

Human-readable changes are tracked in `CHANGELOG.md`. The changelog format follows Keep a Changelog and should remain curated rather than auto-dumped from git logs.

## Security

- Default-deny for external network access from the client (`allowNetwork` in Settings).
- Serverless routes intended for tool-like outputs are feature-gated behind environment flags.
- CSP and security headers are configured in `next.config.js` and `middleware.ts`.

If you discover a security issue, open a GitHub Security Advisory or contact the maintainer privately.

## Troubleshooting

### Node version mismatch

If installs or builds fail, ensure Node 20 is active:

```bash
nvm install
nvm use
node -v
```

### Yarn immutable install failures

If `yarn install --immutable` fails:

- Ensure you did not modify `yarn.lock` without committing it.
- Delete `node_modules` and retry with a clean install.
- Avoid mixing package managers.

### Preview deployments failing on Vercel

Common causes:

- Vercel attempting to build the `gh-pages` branch (should be disabled or ignored).
- Missing Corepack or Yarn version pinning.
- Optional integrations enabled without providing required environment variables.

See `docs/vercel.md` for a hardened configuration checklist.

### Playwright browser install issues

In CI or on fresh machines:

```bash
npx playwright install --with-deps
```

### CSP breaks embeds or external content

If a new embed fails to load:

- Update the CSP allowlists in `middleware.ts` and `next.config.js`.
- Prefer same-origin assets whenever possible.

## License

See [LICENSE](LICENSE).
