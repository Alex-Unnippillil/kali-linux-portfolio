# QA gates

## Desktop shell regression gate

This Playwright scenario exercises the desktop shell with a dense icon grid and
verifies that desktop affordances continue to work without throwing runtime
errors.

### What the gate covers

The `tests/desktop-shell.gate.spec.ts` script performs the following steps:

1. Seeds 50 deterministic desktop shortcuts using the helper in
   `tests/fixtures/desktopState.ts` so future icon additions do not break the
   layout expectations.
2. Launches the desktop, performs a marquee selection drag, and opens the
   context menu.
3. Chooses **Change Background…**, switches to a different wallpaper, and then
   reloads to confirm the wallpaper persists.
4. Fails the run if any `console.error` or uncaught page errors are emitted.

Before any UI steps execute, Playwright’s global setup runs the project quality
checks in this order:

1. `yarn typecheck` (TypeScript `tsc --noEmit`)
2. `yarn lint` (ESLint with `--max-warnings=0`)
3. `yarn build` (`next build` for the production bundle)

If any of these commands exit with a non-zero status, the gate stops
immediately.

### Running the gate locally

```bash
# 1. Install dependencies if you have not already
yarn install

# 2. Run the desktop shell regression gate
yarn qa:desktop-shell
```

The Playwright configuration will build the project (through the global setup
step) and then launch `yarn start` automatically. You do not need to start a
server manually. If you prefer to reuse an already running server, set
`PLAYWRIGHT_SKIP_WEB_SERVER=1` and provide `BASE_URL` that points to your
instance.

```bash
PLAYWRIGHT_SKIP_WEB_SERVER=1 BASE_URL=http://localhost:3000 yarn qa:desktop-shell
```

### Troubleshooting

- **Build keeps re-running** – the global setup intentionally enforces the
  typecheck, lint, and build steps so that the gate mirrors CI. Cache the `.next`
  directory between runs to speed up subsequent executions.
- **Tests fail with fewer than 50 icons** – ensure the Playwright test was run
  with the fixture seeding logic. Manually clearing `localStorage` between runs
  can help if you have custom overrides in your browser profile.
