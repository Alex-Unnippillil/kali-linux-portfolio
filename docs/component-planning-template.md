# Component Planning Template

This guide tracks the long-term plan for each major code area noted in the project README. Every section follows the same structure so contributors can record the current implementation status, outstanding risks, upcoming feature work, and the validation steps that keep regressions out of production.

## Reusable Section Format
For each directory listed below, capture the following:

- **Current State** – Snapshot of what the directory delivers today.
- **Tech Debt** – Implementation shortcuts or structural issues that merit refactoring.
- **Next Feature** – The highest-impact enhancement queued next.
- **Blockers** – Cross-team or external dependencies preventing progress.
- **Test Strategy** – How changes in this directory should be verified (unit, integration, manual smoke, etc.).

> When adding new areas, copy the heading structure so future planning stays consistent.

## Inventory Overview
| Directory | Scope Snapshot | Planning Section |
| --- | --- | --- |
| `components/base` | Window chrome, focus, and layout primitives | [components/base](#componentsbase)
| `components/screen` | Boot flow, lock screen, and desktop surface | [components/screen](#componentsscreen)
| `components/apps` | App catalog shells, games, and simulators | [components/apps](#componentsapps)
| `hooks` | Shared state, persistence, and device helpers | [hooks](#hooks)
| `modules` | Supporting domain modules and shared logic | [modules](#modules)
| `services` | Client-side service clients and API bridges | [services](#services)
| `workers` | Service worker and background task scripts | [workers](#workers)
| `pages` | Next.js routing entry points and API stubs | [pages](#pages)
| `public` | Static assets, wallpapers, and generated SW | [public](#public)
| `__tests__` | Jest unit tests and smoke suites | [__tests__](#__tests__)
| `playwright` | End-to-end helpers and fixtures | [playwright](#playwright)
| `.github/workflows` | CI pipelines for lint, test, and export | [.github/workflows](#githubworkflows)

---

## components/base
### Current State
- Provides the reusable window frame, chrome controls, and focus manager that every app relies on for desktop behavior.

### Tech Debt
- Window registration still uses bespoke wiring per app; once `createDynamicApp` lands the base layer should expose a smaller integration surface to reduce duplicate wiring.【F:docs/tasks.md†L6-L12】

### Next Feature
- Adopt the planned dynamic app factory (`createDynamicApp`) so window chrome can enforce consistent analytics and sizing defaults across the catalog.【F:docs/tasks.md†L6-L14】

### Blockers
- Requires consensus on the shared `display*` helper API so base components can assume stable props; coordination needed with `components/apps` owners.【F:docs/tasks.md†L8-L13】

### Test Strategy
- Expand existing window-behavior Jest suites to validate minimize/maximize interactions after the factory refactor; run smoke tests covering multi-window focus to prevent regressions.【F:docs/tasks.md†L6-L13】

---

## components/screen
### Current State
- Orchestrates boot animations, lock screen transitions, and the desktop workspace rendered inside `<Ubuntu />`.

### Tech Debt
- Focus handling between the desktop surface and dock context menus is ad-hoc; discovery work needed to document expected keyboard flows before changing the hierarchy.

### Next Feature
- Explore integrating the "reset desktop" control planned for Settings so the desktop shell can listen for a reset event and restore defaults; scope and interfaces are still undefined, requiring discovery with the Settings team.【F:docs/tasks.md†L61-L66】

### Blockers
- Depends on new settings store APIs (see `hooks` and `components/apps/settings`) that have not been implemented yet.【F:docs/tasks.md†L61-L66】

### Test Strategy
- Manual smoke through boot → lock → desktop flows, plus accessibility spot checks for keyboard focus when new reset interactions are introduced.

---

## components/apps
### Current State
- Hosts utility, media, game, and security-simulator apps registered through `apps.config.ts` with dynamic imports and shared layout primitives.

### Tech Debt
- Many apps still hand-roll registration instead of using a shared factory, leading to inconsistent window sizes and analytics hooks.【F:docs/tasks.md†L6-L15】

### Next Feature
- Maintain the terminal session manager and expand the command registry as new utilities are defined so `/apps/terminal` keeps shell parity.【F:docs/tasks.md†L18-L28】

### Blockers
- Some embed-based apps (Spotify, YouTube, X) require updated iframe policies and local storage helpers; validating them demands test credentials or mocked responses that are not yet defined.【F:docs/tasks.md†L34-L60】

### Test Strategy
- Add targeted Jest tests for high-traffic apps (terminal, YouTube) and ensure each new app follows `docs/new-app-checklist.md`; run the desktop smoke suite after major catalog updates.【F:docs/tasks.md†L18-L60】

---

## hooks
### Current State
- Provides persistent state utilities (settings, notes), asset loaders, and responsive canvas helpers shared across games and utilities.

### Tech Debt
- Settings persistence lacks reset semantics, making it hard to wipe localStorage when the upcoming reset feature arrives.【F:docs/tasks.md†L61-L66】

### Next Feature
- Extend `useSettings` to power theme, wallpaper, and "reset desktop" actions referenced in the Settings backlog.【F:docs/tasks.md†L61-L66】

### Blockers
- Requires alignment on storage schema with `components/apps/settings` and desktop shell consumers; schema discovery is still pending.【F:docs/tasks.md†L61-L66】

### Test Strategy
- Write unit tests covering persistence reset flows and confirm OPFS-backed hooks still hydrate correctly after a reset; rerun affected Jest suites.

---

## modules
### Current State
- Houses cross-cutting domain modules that support apps and desktop infrastructure.

### Tech Debt
- Inventory of shared modules is incomplete; discovery needed to catalogue responsibilities and find duplication with hooks/services.

### Next Feature
- Identify candidates for the planned dynamic app factory so module boundaries can offer typed helpers to both apps and base components.【F:docs/tasks.md†L6-L14】

### Blockers
- Requires auditing current module exports and comparing with app-level factories; no owner assigned yet—flag for product discovery.

### Test Strategy
- Ensure any new shared helpers include unit tests and integration coverage where consumed (apps, services), especially for analytics and window sizing logic.

---

## services
### Current State
- Wraps external integrations (e.g., analytics, optional Supabase, EmailJS) to keep API calls centralized.

### Tech Debt
- Fake tool simulators still mix data loading with view logic; extracting read-only data accessors into services would clarify boundaries.【F:docs/tasks.md†L39-L54】

### Next Feature
- Provide mockable data providers for security simulators so canned outputs and command builders can pull from a single source of truth.【F:docs/tasks.md†L39-L54】

### Blockers
- Needs agreement on data formats for each simulator and coordination with documentation for the "lab mode" flag; content curation in progress.【F:docs/tasks.md†L39-L54】

### Test Strategy
- Create service-level unit tests that validate fixtures load correctly and ensure simulators fall back gracefully when lab mode is disabled.

---

## workers
### Current State
- Contains service worker logic and background helpers to support offline behavior and caching.

### Tech Debt
- Custom service worker lacks hashing optimizations flagged in the housekeeping backlog.【F:docs/tasks.md†L116-L121】

### Next Feature
- Evaluate `fast-glob` updates and implement deterministic asset hashing to improve cache busting during deploys.【F:docs/tasks.md†L116-L121】

### Blockers
- Requires compatibility verification with `@ducanh2912/next-pwa` output and potential updates to build tooling before enabling new hashing strategies.【F:docs/tasks.md†L116-L121】

### Test Strategy
- Run `yarn build` and PWA smoke checks after service worker changes; confirm offline mode works and caches invalidate on version bump.

---

## pages
### Current State
- Next.js routing entry point for the desktop shell, app pages, and demo API routes used during serverful deploys.

### Tech Debt
- API stubs are minimally documented; discovery needed to document contract expectations before expanding features.

### Next Feature
- Harden `/apps/*` static export by ensuring pages degrade gracefully when APIs are absent, mirroring the static export checklist.【F:README.md†L54-L78】【F:README.md†L87-L105】

### Blockers
- Requires coordination with service mocks in `services` and data loaders in `hooks` to detect static export mode reliably.

### Test Strategy
- Execute `yarn export` validation and manual smoke tests against the static build to confirm fallback behavior matches expectations.【F:README.md†L70-L104】

---

## public
### Current State
- Stores wallpapers, icons, app assets, and the generated service worker output post-build.

### Tech Debt
- Icon assets are inconsistent in format and resolution, prompting the planned icon refresh effort.【F:docs/tasks.md†L123-L135】

### Next Feature
- Inventory all app logos and replace low-resolution bitmaps with curated SVGs per the icon refresh plan.【F:docs/tasks.md†L123-L135】

### Blockers
- Requires sourcing licensed assets and updating manifests/references; depends on design input and legal review.【F:docs/tasks.md†L123-L135】

### Test Strategy
- After asset swaps, run visual regression smoke in the desktop shell to confirm icons render crisply in launcher, dock, and window chrome states.【F:docs/tasks.md†L123-L135】

---

## __tests__
### Current State
- Hosts Jest unit tests, smoke suites, and utilities mirroring key desktop behaviors.

### Tech Debt
- Coverage gaps exist for newer utility apps; backlog tasks call for tests when adding new utilities to prevent regressions.【F:docs/tasks.md†L11-L12】【F:docs/tasks.md†L58-L60】

### Next Feature
- Add Jest suites for upcoming YouTube and Todoist features to enforce data persistence and component rendering expectations.【F:docs/tasks.md†L52-L60】

### Blockers
- Requires fixtures and mocked storage responses that align with the new feature specs; discovery needed for realistic sample data.

### Test Strategy
- Keep `yarn test` green and integrate coverage thresholds for high-traffic apps once new suites land.

---

## playwright
### Current State
- Contains helpers for Playwright-based end-to-end testing of the desktop UX.

### Tech Debt
- No coverage currently exists for the simulated security tools; discovery needed to determine safe scripted flows.

### Next Feature
- Author an E2E scenario that opens multiple apps (terminal, Spotify) and validates window focus handling and context menus in a single session.【F:docs/tasks.md†L18-L60】

### Blockers
- Requires stable selectors from `components/base` and consistent app registration once the dynamic factory ships; sequencing the work after factory adoption is recommended.【F:docs/tasks.md†L6-L28】

### Test Strategy
- Run `npx playwright test` locally before merging changes to ensure cross-browser coverage when E2E suites expand.

---

## .github/workflows
### Current State
- Automates linting, testing, and static export validation via GitHub Actions.

### Tech Debt
- Static export workflow does not currently assert PWA cache busting; discovery needed to add checks once worker hashing improves.【F:docs/tasks.md†L116-L121】

### Next Feature
- Extend CI to include the planned icon inventory report so asset regressions surface automatically.【F:docs/tasks.md†L123-L135】

### Blockers
- Requires scripts in `public`/`scripts` to generate reports and may depend on new dependencies that need approval.

### Test Strategy
- Validate workflow updates with `act` locally (when available) or run them on a feature branch before merge; document required secrets if new ones are introduced.

---

## Maintenance Ritual
Conduct a **monthly planning review** during the first week of each month:

1. **Inventory Audit** – Confirm the directory table still reflects active code areas; add/remove sections as the architecture evolves.
2. **Backlog Sync** – Cross-check each "Next Feature" entry against `docs/tasks.md` and any open issues to ensure priorities match reality.
3. **Debt Triaging** – Reevaluate "Tech Debt" notes; promote any aging items into tracked tasks or tickets.
4. **Testing Verification** – Ensure the documented test strategies still match the automation suite; update commands or tooling references if scripts change.
5. **Ownership Update** – Assign or reaffirm owners for discovery items and unresolved blockers so work keeps moving.

Record the review date and outcomes at the top of each directory section (or link to meeting notes) so future contributors know when plans were last refreshed.
