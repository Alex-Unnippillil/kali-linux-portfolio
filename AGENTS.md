# AGENTS.md — Maintainer playbook for Codex agents

> Project: **Kali Linux Portfolio**  
> Live site: https://unnippillil.com  
> Repo: https://github.com/Alex-Unnippillil/kali-linux-portfolio

This document is the canonical guide for anyone (human or AI) contributing changes. Treat it as a contract: follow every rule
whose scope covers the files you touch and keep your updates aligned with the product vision.

---

## 1. Scope and mission

* **Scope.** This file sits at the repo root, so its instructions apply to the entire project unless a deeper `AGENTS.md`
overrides something.
* **Mission.** Build and maintain a desktop-style portfolio that imitates a Kali/Ubuntu experience: draggable windows, dock,
  context menus, and a curated catalog of utilities, retro games, and *simulated* security tooling.
* **Absolute boundary.** All security tooling must remain demonstrative. Never ship real offensive code, scanners, exploits,
  brute-force utilities, or outbound traffic to arbitrary hosts. Keep every experience educational and self-contained.
* **Legal safety.** Do not enable API routes, workers, or background jobs that can perform intrusive behavior. UI-only demos are
  acceptable; real attacks are not.

---

## 2. Stack quick-reference

| Area | Details |
| --- | --- |
| Framework | Next.js (pages router) with Tailwind CSS and partial TypeScript |
| Desktop shell | Window manager, dock, app launcher, context menus |
| Catalog | Games, utilities, Kali-style simulations |
| Analytics | Google Analytics wrapper plus Vercel Analytics & Speed Insights (gated by flags) |
| PWA | Generated service worker via build pipeline |
| Runtimes | `yarn dev` (SSR), `yarn build && yarn start` (serverful prod), `yarn export` (static) |
| QA toolbelt | Jest, Playwright, linting, manual smoke that walks `/apps/*` |

Refer to Appendix B for directory hints before you go spelunking.

---

## 3. Local setup & commands

```bash
nvm install && nvm use   # Honor the version in .nvmrc
yarn install             # Always use Yarn (lockfile controlled)
yarn dev                 # Development server

# Production preview
yarn build && yarn start

# Static export and optional local serve
yarn export
npx serve out

# Quick API stub check when serverful build is running
curl -X POST http://localhost:3000/api/dummy
```

> In static export mode there is no `/api/*`. Make sure UI features degrade gracefully.

---

## 4. Environment configuration

Duplicate `.env.local.example` → `.env.local` and populate only the keys you actually use. Relevant variables:

* `NEXT_PUBLIC_ENABLE_ANALYTICS` — set to `"true"` to send client analytics.
* `FEATURE_TOOL_APIS` — `"enabled"` or `"disabled"` toggles simulated tool APIs.
* `RECAPTCHA_SECRET`, `NEXT_PUBLIC_RECAPTCHA_*` — required if the contact form uses reCAPTCHA.
* `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` —
  used only when Supabase features are active.
* EmailJS public keys if you configure the "Gedit" contact app.

**Never** hardcode secrets. Prefer feature flags and ensure static-export modes fall back to demo data when server APIs are
unavailable.

---

## 5. Quality gates before you commit

```bash
yarn lint       # ESLint
yarn test       # Jest unit tests
yarn smoke      # Optional manual crawler over /apps/* during dev
npx playwright test   # E2E, if tooling is available locally
```

* Fix lint/type issues; do not silence them.
* Add or update tests covering any logic you touch.
* Record every command you ran in your PR summary.

---

## 6. Architecture guardrails

* Keep window state logic centralized in the desktop manager; avoid bespoke window managers per app.
* Follow existing patterns for simulated tools: deterministic outputs, offline datasets, no outbound requests.
* Co-locate feature-specific assets; large static items belong under `public/`.
* Maintain the dynamic app registry used by launchers, favorites, and the window system.
* Respect analytics gating — wrappers should no-op unless flags are enabled.

---

## 7. Code style & UX expectations

* Follow the repo ESLint config and TypeScript guidelines where applicable.
* Prefer functional React components and hooks; avoid legacy class components.
* Keep imports relative within the current feature area.
* Document props for shared components and keep TS types accurate.
* Preserve keyboard accessibility for the desktop shell: focus handling, menu navigation, and app grid traversal.

---

## 8. Analytics, privacy, and performance

* GA4 wrapper should remain inert unless `NEXT_PUBLIC_ENABLE_ANALYTICS` is truthy.
* Vercel Analytics and Speed Insights live in the app shell; avoid double-initializing.
* Introduce no new trackers without explicit flags and visible disclosure.
* Guard performance-sensitive code paths—window interactions should stay snappy.

---

## 9. Accessibility & performance checklist

* Use semantic roles/ARIA for window chrome, menus, and interactive controls.
* Validate keyboard navigation (Tab/Shift+Tab, arrow keys) whenever you touch desktop UI.
* Run an accessibility check locally if you change global UI structure.
* Watch for interaction latency regressions; Speed Insights trends should improve over time.

---

## 10. Deploy & environment notes

* GitHub Actions handle static exports to GitHub Pages.
* Vercel can run the serverful build so API stubs respond.
* Contributors without keys must leave sensitive features disabled and rely on demo data.
* Never commit `.env*` or other secret-bearing files.

---

## 11. Troubleshooting quick hits

* **Empty app grid in static export:** enable demo mode for features expecting `/api/*`.
* **Stale assets in service worker:** clear site data or bump the SW cache version.
* **Gamepad not detected:** inspect `navigator.getGamepads()` and adjust bindings in `input-remap`.
* **Missing analytics events:** confirm flags and wrapper rendering in `_app.jsx`.

---

## 12. Contribution workflow expectations

1. Read nested `AGENTS.md` files for any directory you modify.
2. Keep diffs scoped—no drive-by formatting outside the task.
3. Prefer Yarn scripts over raw binaries.
4. Document commands run (lint/tests/build) in the PR message.
5. Update any shorthand docs (`agent.md`, README pointers) when you change global guidance like this file.
6. Keep developer docs pointers up to date (see `docs/terminal-simulation.md`).

### Commit & PR rules

* Keep commits focused and descriptive.
* PR title format: `[area] short description`.
* In the PR body, include a checklist of tests you executed and any feature flags toggled.
* Attach screenshots or clips for UI changes.
* Ensure reviewers can test both serverful and static builds when `/api/*` behavior is affected.

---

## 13. Polish pass protocol (final-touch optimization)

When an issue asks for "polish", "final touches", or "overall UX improvements", treat the work as a focused finishing pass
instead of broad refactoring. Use this sequence:

1. **Visual consistency audit**
   * Normalize spacing, alignment, icon sizing, and typography across dock, launcher, top bar, and app windows.
   * Reuse existing Tailwind tokens and component patterns before adding new classes.
2. **Layout resilience audit**
   * Validate desktop shell behavior at common breakpoints (mobile landscape, tablet, laptop, ultrawide).
   * Confirm windows never render unreachable controls (close/minimize/maximize) and avoid off-screen spawn positions.
3. **Interaction quality audit**
   * Tighten drag/resize affordances, hover states, loading states, and empty states.
   * Ensure keyboard and pointer interactions are equivalent for menus, launcher search, and core app switching.
4. **Performance and reliability audit**
   * Prefer memoization/state-scope fixes over adding new dependencies.
   * Verify static export fallback behavior for anything that can touch `/api/*`.

Keep each polish PR scoped to user-perceivable improvements with measurable outcomes (for example, reduced overlap bugs,
improved keyboard traversal, or cleaner responsive alignment).

---

## 14. Next-priority feature backlog for AI agents

If no explicit roadmap item is provided, prioritize these features in order:

1. **Desktop UX finishing work**
   * Snap-to-grid or edge-aware window placement.
   * Better z-index/focus recovery when many windows are open.
   * Persisted per-app window bounds with safe reset behavior.
2. **Navigation and discoverability upgrades**
   * Faster launcher search relevance (aliases, tags, recent apps).
   * Quick actions from dock/context menus (open new window, pin/unpin, recent).
   * Clear onboarding hint layer that can be dismissed and remembered.
3. **App quality and content depth**
   * Expand educational copy in simulated security apps (what it demonstrates, what it does *not* do).
   * Add deterministic demo datasets and richer empty/error states.
   * Improve shared app chrome consistency (titles, action buttons, status text).
4. **Trust, accessibility, and platform fit**
   * Full keyboard parity for desktop shell flows.
   * ARIA and focus-visible improvements for all interactive controls.
   * Performance cleanup for drag/move/resize hot paths and animation jank.

For any backlog item implemented, include before/after screenshots (when UI-facing), note feature flags touched, and confirm
behavior in both serverful and static-export modes.

---

## Appendix A — Directory map (high level)

* `.github/workflows/` — CI including Pages export pipeline.
* `pages/` — `_app.jsx`, `_document.jsx`, `index.jsx`, `apps/`, `api/` stubs.
* `components/` — `ubuntu.tsx` shell, `screen/*`, `base/*`, `apps/*`, `SEO/Meta.js`, `util-components/*`.
* `public/` — images, wallpapers, icons, game assets.
* `hooks/` — persistent state, asset loader, canvas resize, etc.
* `__tests__/` — unit tests and smoke tests.
* `playwright/` — end-to-end test helpers.
* Root configs: `apps.config.js`, `tailwind.config.js`, `jest.config.js`, `playwright.config.ts`, `vercel.json`, `pa11yci.json`,
  `tsconfig*.json`.

---

## Appendix B — Local checklists

**Before commit**

- [ ] `yarn lint`
- [ ] `yarn test`
- [ ] Static export still renders key screens
- [ ] No new secrets or network calls

**Before merge**

- [ ] Screenshots or clip added for UI changes
- [ ] Docs updated for new flags/apps
- [ ] Reviewed in both serverful and static builds when `/api/*` is involved


---

## 13. Product polish priorities (final touches)

When a task asks for “final touches” or broad quality improvements, treat the following as the default execution order:

1. **Finish visual polish first.**
   * Normalize spacing, typography rhythm, icon sizing, and panel/window alignment.
   * Prefer small, deliberate Tailwind adjustments over large-scale rewrites.
   * Keep the Kali/Ubuntu desktop aesthetic cohesive (dark surfaces, readable contrast, restrained accent colors).
2. **Then improve layout and responsiveness.**
   * Verify desktop shell behavior at common breakpoints (mobile, tablet, laptop, widescreen).
   * Ensure draggable windows, dock items, launchers, and context menus avoid overlap traps and clipping.
   * Preserve keyboard flows while changing layout (focus order, escape behavior, arrow key handling).
3. **Then harden functionality and UX quality.**
   * Remove avoidable jank: reduce unnecessary renders, debounce heavy handlers, and avoid blocking interactions.
   * Validate fallback behavior in static export mode when `/api/*` is unavailable.
   * Favor deterministic demo data and clear empty/error states over silent failures.

**Definition of done for polish tasks**

- [ ] UI feels visually consistent across core desktop views.
- [ ] Interaction quality is improved (fewer mis-clicks, clearer affordances, stable focus behavior).
- [ ] Performance impact is neutral or better (especially drag/move/open/close flows).
- [ ] Notes include what changed in styling, layout, and behavior.

---

## 14. AI-suggested feature queue (next priorities)

If the request includes “integrate the next AI-suggested features,” implement from this queue in order unless product constraints override it:

1. **Desktop onboarding and discoverability**
   * Add a first-run helper (dismissible) that explains launcher, dock, window controls, and keyboard shortcuts.
   * Include a “show again” toggle in settings.
2. **Window/session persistence upgrades**
   * Persist open apps, window bounds, z-order intent, and favorites safely in local storage.
   * Recover gracefully when app definitions change between releases.
3. **Global command/search palette**
   * Provide a keyboard-invoked palette (e.g., `Ctrl/Cmd+K`) to launch apps, switch windows, and run quick actions.
   * Keep results deterministic and local-only (no remote querying).
4. **Accessibility pass for desktop primitives**
   * Add/verify ARIA labels, roles, and screen-reader announcements for window state changes.
   * Improve visible focus states and support reduced-motion preferences.
5. **Performance instrumentation and guardrails**
   * Add lightweight timing markers around high-frequency interactions (open, drag, resize).
   * Use feature flags for optional instrumentation and keep analytics opt-in behavior intact.

### Feature queue guardrails

* Every new capability must work in demo/offline mode.
* Any feature depending on secrets or network services must be behind explicit flags and disabled by default.
* Never introduce real offensive security behavior; simulations only.
* Add/update tests for any non-trivial state or interaction logic.

## Source notes for maintainers

* Project description, service worker behavior, analytics wiring, and directory structure mirror the repo README and file layout.
* Formatting and intent align with the AGENTS.md convention for guiding coding agents.
* PWA guidance references `@ducanh2912/next-pwa` documentation.
* Speed Insights usage follows Vercel docs and package recommendations.
* EmailJS notes cover the React integration pattern required when enabling the contact app.
* Supabase instructions follow the official client docs; keep the feature disabled without keys.
