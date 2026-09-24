# Test coverage signals audit — 2026-07-23

Scope inspected without executing tests:

- `__tests__/*`
- `playwright/*`
- `tests/*` Playwright smoke specs
- `scripts/smoke-all-apps.mjs`

## Confirmed findings

### High — Playwright accessibility spec targets missing app routes

**Problem.** `playwright/a11y.spec.ts` hard-codes `/apps/chess`, `/apps/sudoku`, `/apps/youtube`, `/apps/trash`, and `/apps/todoist`, but those paths do not exist as files under `pages/apps`. Those experiences are registry/launched desktop apps, not direct page routes. The audit can therefore fail on 404/error content instead of auditing the intended app UI.

**Affected path/function.** `playwright/a11y.spec.ts` URL list and navigation loop.

**Required task stub.**

1. Replace the hard-coded app URLs with confirmed page routes from `pages/apps`, or explicitly open registry-only apps from `/apps`/the desktop launcher before running Axe.
2. Add a small route existence helper similar to `tests/apps.smoke.spec.ts` so future direct-route audits cannot silently drift from `pages/apps`.
3. Keep at least one core desktop-shell accessibility check for registry-only apps by launching a representative app from the desktop UI.
4. Document whether each audited target is a direct page route or a launcher-only app.

### High — Manual smoke script route list is stale and under-covers current app pages

**Problem.** `scripts/smoke-all-apps.mjs` uses a manually maintained route array. It omits existing direct app pages: `/apps/firefox`, `/apps/frogger`, `/apps/gomoku`, `/apps/mimikatz/offline`, and `/apps/subnet-calculator`. New or recently added app pages can therefore ship without `yarn smoke` coverage.

**Affected path/function.** `scripts/smoke-all-apps.mjs` route array.

**Required task stub.**

1. Generate smoke routes from `pages/apps` at runtime, excluding only documented non-route files if any are introduced.
2. Preserve the ability to append launcher-only smoke flows separately from direct page routes.
3. Add an assertion/log summary that reports the number of discovered routes and fails if discovery returns zero.
4. Update the script comment so maintainers do not manually append direct page routes anymore.

### Medium — Snapshot tests are broad and brittle around full app DOM output

**Problem.** The Hydra preview and Kismet page tests snapshot full rendered fragments/containers. These snapshots are likely to churn when Tailwind class ordering, copy, DOM wrappers, generated IDs, or unrelated layout markup changes, even if the user-facing behavior remains correct.

**Affected path/function.** `__tests__/apps/hydra/index.test.tsx` and `__tests__/kismet.test.tsx` snapshot assertions.

**Required task stub.**

1. Replace broad full-container snapshots with targeted role/text assertions for the stable content that matters.
2. If layout regression coverage is still needed, snapshot a small semantic subset rather than the entire app DOM.
3. Keep deterministic mocks such as fixed `Date.now`, but prefer explicit assertions for generated status/progress values.
4. Remove obsolete snapshot files after converting the assertions.

### Medium — Direct app-route smoke spec assumes every page route is linked from `/apps`

**Problem.** `tests/apps.smoke.spec.ts` discovers all files under `pages/apps`, then visits `/apps` and clicks `a[href="route"]`. This conflates direct route existence with app-catalog discoverability. A valid page that is intentionally hidden, nested, or launched another way will fail because the link is absent even though the route itself loads.

**Affected path/function.** `tests/apps.smoke.spec.ts` generated route loop.

**Required task stub.**

1. Split the test into two checks: direct `page.goto(route)` route-load smoke and a separate catalog-link coverage check for routes expected to appear in `/apps`.
2. Derive expected catalog links from the app registry or an explicit allowlist/denylist so intentionally hidden routes are clear.
3. Add a readable failure message that distinguishes "route does not render" from "catalog does not link this route".
4. Include nested routes such as `/apps/mimikatz/offline` in the direct-load smoke path.

### Low — Coverage exists for window primitives, but lacks end-to-end coverage of recent desktop performance changes

**Problem.** Unit tests cover many window snap, resize, z-index, taskbar, and command-palette primitives, but the recent performance/startup changes touched `components/screen/desktop.js` and `components/ubuntu.js` without an end-to-end assertion that launch/open/close/focus still works through the real shell after those optimizations.

**Affected path/function.** Desktop shell flows through `components/screen/desktop.js` and `components/ubuntu.js`; current coverage is concentrated in mocked Jest component tests.

**Required task stub.**

1. Add a Playwright smoke that starts at `/`, opens the launcher, launches two representative apps, switches focus between their taskbar/dock entries, minimizes/restores, and closes one app.
2. Assert user-visible shell state after each step rather than implementation internals.
3. Run the same flow with reduced motion enabled to protect accessibility/performance paths.
4. Keep the test local-only and avoid apps that require network services or secrets.

## Notes from inspection

- Static import scanning found no confirmed missing relative imports in the inspected Jest/Playwright/smoke files after accounting for Next/Jest extension resolution; the only extensionless import candidates were `../apps.config`, which maps to the existing `apps.config.js`.
- No critical policy violations were confirmed in the inspected test and smoke files.
