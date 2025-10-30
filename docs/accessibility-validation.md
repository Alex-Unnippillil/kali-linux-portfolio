# Accessibility validation playbook

This project relies on two automated accessibility suites. Both now validate the default theme **and** the high-contrast override to make sure the colour palette and component tokens stay compliant.

## Pa11y + axe (Node script)

1. Start the production server locally, e.g. `yarn build && yarn start -p 3000`.
2. In a separate terminal run `BASE_URL=http://localhost:3000 yarn a11y`.
3. The Pa11y runner reads `pa11yci.json`, where each URL is exercised with multiple scenarios.
   * The `high-contrast` scenario seeds `localStorage` and forces the `html.high-contrast` class before Pa11y captures the DOM, guaranteeing the theme toggle is active.
   * Any violation logged by axe or HTML CodeSniffer marks the run as failed, so CI stops if a regression sneaks in.

## Playwright + axe-core

1. Launch `yarn dev` or `yarn start` in one terminal.
2. Run `npx playwright test playwright/a11y.spec.ts` in another.
3. Each test URL executes twice: once with the default palette, once after injecting the high-contrast preference via `localStorage`.
   * The helper waits until `document.documentElement` carries the `high-contrast` class before collecting results.
   * Thresholds are strict for critical/serious issues (0 allowed), which causes CI to fail immediately when new problems appear.

## When things fail

* Investigate the selectors logged by Pa11y or the detailed axe reports from Playwright to pinpoint the offending component.
* Fix the underlying markup or tokens, re-run the relevant command, and commit only after both suites pass in both theme modes.
