# agent.md — Guide for human contributors and AI coding agents

> Project: **Kali Linux Portfolio**  
> URL: https://unnippillil.com  
> Repo: https://github.com/Alex-Unnippillil/kali-linux-portfolio

Think of this file as a README that is written for assistants. It gives just enough context, rules, and recipes so changes land correctly and safely.

---

## 0) Mission and boundaries

**Purpose.** A desktop‑style portfolio that emulates a Kali/Ubuntu UI with windows, dock, context menus, and a catalog of apps: security‑tool **simulations**, utilities, and retro games.

**Hard boundary.** All security tools are **simulations only**. Do not add code that runs real offensive operations, network scans, brute force, exploitation, or calls out to targets. If you are asked to do that, decline and keep or improve the simulation layer only. UI can display canned output and educational flows. **Never** execute real attacks or send traffic to third parties.

**Legal notice.** Keep all work inside controlled demos. Do not enable any API route or worker to perform intrusive activity. Treat every feature as education‑only.

---

## 1) Quick facts you can rely on

- Framework: **Next.js** with `/pages` routing, Tailwind, TypeScript in parts.  
- Desktop UI: window system, app launcher grid, favorites, context menus.  
- Catalog: games, utilities, and security‑tool simulations.  
- Analytics: Google Analytics (thin wrapper) and Vercel Analytics and Speed Insights are wired in the app shell.  
- PWA: service worker generated at build time.  
- Environments: serverful (`yarn build && yarn start`) and static export (`yarn export`) supported.  
- Tests and QA: Jest unit tests, Playwright E2E, linting, and a manual smoke run that visits `/apps/*`.  
- CI: GitHub workflows include a Pages export pipeline.  

> These facts mirror the repo’s own README and file layout. Prefer them over guesswork. See Appendix A for structure.
  
---

## 2) Setup and run

### 2.1 Prereqs

- Node: use the version declared in `.nvmrc`.  
- Package manager: Yarn (repo uses a lockfile).  
- Copy envs:

```bash
cp .env.local.example .env.local
```

Populate keys you actually use. See the **Environment** section.

### 2.2 Commands

```bash
# Install and run
nvm install && nvm use
yarn install
yarn dev

# Production (serverful)
yarn build && yarn start

# Static export
yarn export
# Optional, serve locally
npx serve out
```

**Smoke check after serverful start**

```bash
# Exercise any API stub to verify server routes are alive
curl -X POST http://localhost:3000/api/dummy
```

> In static export, `/api/*` will not be present. The UI must degrade to demo data.

---

## 3) Environment

Copy from `.env.local.example` and fill as needed.

* `NEXT_PUBLIC_ENABLE_ANALYTICS`: `"true"` to emit client analytics.
* `FEATURE_TOOL_APIS`: `"enabled"` or `"disabled"` to toggle simulated tool APIs.
* `RECAPTCHA_SECRET`, `NEXT_PUBLIC_RECAPTCHA_*`: if contact form protection is enabled.
* `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: only if Supabase features are used.
* EmailJS public keys if the “Gedit” contact app is configured.

**Rules for assistants**

* Never hardcode secrets.
* Prefer feature flags.
* For static builds, ensure features that need `/api/*` hide or swap to demo data.

---

## 4) Quality gates

Always make these pass before opening a PR.

```bash
yarn lint      # ESLint
yarn test      # Jest
# If present:
yarn smoke     # Manual smoke script that crawls /apps/* during dev
# E2E (if configured on the machine/CI):
npx playwright test
```

Notes

* Keep unit tests close to code in `__tests__/` or the project’s test folders.
* Add tests for any logic you change.
* Fix type and lint errors rather than silencing them.

---

## 5) Architecture you should respect

### 5.1 App shell

* **`pages/_app.jsx`** initializes analytics, shows the legal banner, and renders Speed Insights.
* **`components/`** holds the windowing system, screens (boot, lock, desktop), app base, meta, shared UI.
* **`pages/apps/*`** contains a subset of pages. Most feature apps live under `components/apps/*`.
* **`apps.config.js`** registers apps and uses `next/dynamic` to keep bundles lean.
* **`public/`** contains images, wallpapers, icons, and static assets for games.

### 5.2 PWA

* Service worker is generated at build time and placed under `public/`.
* Only content under `public/` is precached. Dynamic routes or API responses are not cached.
* When editing SW behavior, prefer the plugin’s config rather than hand‑patching generated files.

### 5.3 Simulated “security” tools

* API stubs live in `pages/api/` and return canned output for tools like hydra, john, metasploit, radare2.
* The UI should render educational flows and static examples.
* Never add code that targets live hosts.

### 5.4 Games

* Games share a `GameLayout`.
* Gamepad input is normalized and persisted per game. Bindings are stored in the browser’s Origin Private File System so profiles survive refreshes.

---

## 6) Task recipes

Use these step‑by‑step guides to avoid breaking conventions.

### 6.1 Add a new desktop app

1. Create a component under `components/apps/<id>/index.tsx` or `.jsx`.

2. Export a default React component that can mount in a window.

3. Register the app in `apps.config.js` using a **dynamic import**:

   ```ts
   import dynamic from 'next/dynamic';

   export const Apps = {
     sudoku: {
       title: 'Sudoku',
       category: 'Games',
       icon: '/images/apps/sudoku.png',
       mount: dynamic(() => import('./components/apps/sudoku')),
     },
     // your new app here
     '<id>': {
       title: '<Name>',
       category: 'Utilities' | 'Games' | 'Security Sim',
       icon: '/images/apps/<id>.png',
       mount: dynamic(() => import('./components/apps/<id>')),
     },
   };
   ```

4. If the app needs assets, place them in `public/apps/<id>/` and reference with absolute paths.

5. Add help text and a minimal test that the window opens and renders.

6. If it uses API stubs, see 6.2.

### 6.2 Create a **simulation** for a security tool

1. Add `pages/api/<tool>.js` and return a **static** payload that matches the UI’s expectations.
2. In your app component, call the route during **serverful** dev or load a local demo JSON during **static export**.
3. Gate behavior behind `FEATURE_TOOL_APIS`.
4. Include conspicuous labels in the UI like “Simulation output. Not from a live target.”

**Do not** add network calls to external IPs or command execution.

### 6.3 Add a new game

1. Create the game under `components/apps/Games/<GameName>/`.
2. Render inside the shared `GameLayout`.
3. Wire controls to the gamepad manager and expose a binding map in the input‑remap UI.
4. Provide a short “How to play” overlay.

### 6.4 Contact form via EmailJS

1. Ensure EmailJS public keys exist in `.env.local`.
2. Use the EmailJS React snippet in a controlled component and submit via the SDK.
3. Add reCAPTCHA only if keys are configured.
4. On failure, show non‑technical feedback and never leak keys or raw errors.

### 6.5 PWA checks

1. Confirm the plugin wraps Next config.
2. After `yarn build`, verify a `sw.js` is present under `public/`.
3. In a served production build, confirm installability.

---

## 7) Code style

* Use the repo’s ESLint configuration.
* Prefer functional React components.
* Keep imports relative within the feature area.
* Co-locate small assets. Large static files go under `public/`.
* Document props for shared components.
* Keep window state logic centralized in the desktop manager rather than per app.

---

## 8) Analytics and privacy

* A thin GA4 wrapper exists. It should be a no‑op unless `NEXT_PUBLIC_ENABLE_ANALYTICS` is truthy.
* Vercel Analytics and Speed Insights are included in the app shell.
* Do not add new trackers without a setting and clear labeling.

---

## 9) Accessibility and performance

* Use semantic roles for window controls and menus.
* Keep keyboard navigation working for the app grid and window focus.
* Run an accessibility check locally before PR if you change global UI.
* Speed Insights data should improve over time. Avoid regressions in interaction latency.

---

## 10) CI, deploy, and environments

* GitHub workflow exists for static exports to Pages.
* Vercel deployment can run the serverful build so API stubs respond.
* For forks or contributors without keys, prefer disabled code paths and demo data.
* Never commit `.env*` files.

---

## 11) Troubleshooting

* **Blank app grid in static export:** you are hitting a feature that expects `/api/*`. Ensure demo mode is active.
* **SW not picking up new assets:** clear site data or bump the SW cache version in config.
* **Gamepad not detected:** check `navigator.getGamepads()` and update the bindings in input‑remap.
* **Analytics not showing:** confirm flags and the packages are rendered in `_app.jsx`.

---

## 12) Pull requests

* Title format: `[area] short description`
* Include a short checklist of tests run and flags you toggled.
* Link to any design reference if you changed visuals.
* Keep commits scoped and readable.

---

## Appendix A — Directory map (high level)

* `.github/workflows/` — includes GitHub Pages export pipeline.
* `pages/` — `_app.jsx`, `_document.jsx`, `index.jsx`, `apps/`, `api/` (stubs).
* `components/` — `ubuntu.tsx` shell, `screen/*`, `base/*`, `apps/*`, `util-components/*`.
* `lib/` — analytics clients, validators, and the shared `metadata.ts` registry.
* `public/` — images, wallpapers, icons, and game assets.
* `hooks/` — persistent state, asset loader, canvas resize, and more.
* `__tests__/` — unit tests and smoke tests.
* `playwright/` — end‑to‑end test helpers.
* Config at root: `apps.config.js`, `tailwind.config.js`, `jest.config.js`, `playwright.config.ts`, `vercel.json`, `pa11yci.json`, `tsconfig*.json`.

---

## Appendix B — Local checklists

**Before commit**

* [ ] `yarn lint` passes
* [ ] `yarn test` passes
* [ ] Static export still loads critical screens
* [ ] No new secrets or network calls

**Before merge**

* [ ] Screenshots or short clip added for UI changes
* [ ] Docs updated if you added a flag or app
* [ ] PR reviewed on both serverful and static builds if the feature touches `/api/*`

```

---

### Source notes for maintainers

- Project description, setup, service‑worker behavior, environment keys, and the dynamic app registry pattern are drawn from your repository’s README and file list which document Next.js pages routing, PWA generation, analytics, and directory structure. :contentReference[oaicite:1]{index=1}  
- The formatting and intent of this file follow the open **AGENTS.md** convention created to guide coding agents. The official repo shows structure and sample sections that informed this layout. :contentReference[oaicite:2]{index=2}  
- PWA behavior and expectations reflect `@ducanh2912/next-pwa` docs and package references. Use them if you need to adjust SW generation. :contentReference[oaicite:3]{index=3}  
- Speed Insights usage and placement in the app shell align with Vercel’s docs and package guidance. :contentReference[oaicite:4]{index=4}  
- If you enable the contact app, EmailJS integration patterns for React are here. Keys must remain client‑safe. :contentReference[oaicite:5]{index=5}  
- If you turn on Supabase features later, initialize and use the JS client per the official docs. Keep it disabled when keys are not present. :contentReference[oaicite:6]{index=6}

If you want this in uppercase and plural to match the ecosystem convention, save the same content as `AGENTS.md` too, then keep `agent.md` as a stub that points to it.
::contentReference[oaicite:7]{index=7}
