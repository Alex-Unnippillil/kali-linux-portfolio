# Kali desktop reliability release

## Interaction contract

The homepage always opens the Kali/Linux operating-system clone. There is no
portfolio landing page or mode-selection detour. The brief existing boot and
return-visit behavior, wallpaper, launcher, dock, window chrome, settings and app
registry remain. About Alex opens in a normal window as before.

About → Projects and Project Gallery share one catalog. Selecting a project opens
its details **inside that window**; Back restores the search/filter state and
keyboard focus. `/about`, `/projects`, `/projects/[slug]` and `/contact` also mount
the same OS and open the relevant app. Their semantic `noscript` content is a
fallback for visitors without JavaScript, not a separate default interface.

## Responsive windows

Phones below 640 CSS pixels, and touch landscape viewports below 1024 × 500, use
full-work-area app windows. The navbar, minimize/close controls and task switching
remain accessible. Dragging/resizing and redundant maximize controls are disabled
only in this compact presentation. Tablet and desktop windows remain movable and
resizable. Visual viewport changes, including the on-screen keyboard, update the
work area. Temporary phone bounds never overwrite saved desktop geometry.

The window adapter passes `(id, width, height)` exactly once, and forwards position
updates. Focusing a window does not steal focus from an input inside it. Titlebar
controls are not nested inside a button role. The test-only native MessageChannel
polyfill is closed at suite teardown rather than forcing Jest to exit.

## Data and safety

Narratives live in `data/projects.json`; repository provenance lives in
`data/github-projects.json`. `lib/portfolio.ts` combines committed data without a
GitHub request on page views. Featured status fails closed for unknown metadata,
forks and archived repositories. Non-fork status alone is not proof of authorship.
No unverified contributions, star counts or impact metrics are claimed.

Run `node scripts/sync-portfolio.mjs` after narrative changes; `--check` detects
compatibility-mirror drift in `public/projects.json`. About and the gallery now
use the same catalog instead of independent project lists.

Security applications remain educational fixtures, not operational scanners or
credential attacks. No tool binaries or arbitrary-target connections are added.
The site is independent, not an official Kali Linux product. Analytics remain
opt-in. Preview builds do not register the production service worker.

## Reproducing validation

Use Node 24 and the committed Yarn 4.9.2 release via Corepack:

```sh
corepack enable
yarn install --immutable
yarn dedupe:check
yarn lint
yarn typecheck
yarn test --coverage --maxWorkers=2
yarn npm audit --severity high
yarn build
yarn export
yarn playwright install chromium
yarn playwright test --config=playwright.portfolio.config.ts
```

The browser suite tests the real OS at eight viewport sizes, application search,
project navigation, window controls, resizing, input focus, mobile work areas,
native contact/settings, keyboard launcher, scoped axe checks, no-JavaScript
fallbacks and 404 status. Screenshots, traces and failures are CI artifacts.
Passing one suite is not evidence that every game or simulation has been fully
exercised. The existing broad smoke and a11y scripts remain separate audits.

CI gates run independently and Vercel Git integration owns preview deployment.
Use the final commit's checks and preview, not earlier PR text, for release
approval. A READY state alone does not establish application runtime health.
