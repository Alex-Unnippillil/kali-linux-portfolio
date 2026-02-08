# Testing overview

This project relies on automated end-to-end scenarios in addition to the Jest
and lint suites already documented elsewhere. The Playwright specs simulate how
the desktop shell behaves and help catch regressions in interactive apps.

## Playwright scenarios

- `playwright/metasploit.spec.ts`
  - Opens the Metasploit desktop window through the internal `open-app` event
    so the test mirrors the real user flow of launching the tool from the dock.
  - Clicks the first 20 module cards to verify their detail panes render without
    throwing console errors.
  - Cycles through the severity filters (treated as tabs) to confirm state
    changes and badge updates even when certain severities have no data.
  - Runs a module search, records the latency of the generated `Enter`
    keystroke, and asserts it stays within 100&nbsp;ms.
  - Closes the window and compares DOM node counts via `getNodeCount` to make
    sure no detached nodes remain.

## Running locally

1. Start the development server: `yarn dev`.
2. In another terminal execute: `npx playwright test playwright/metasploit.spec.ts`.
3. Watch the logs for console errors reported by the spec and confirm the final
   DOM node counts return to their baseline after the window closes.

The CI workflow (`.github/workflows/a11y.yml`) runs this scenario alongside the
accessibility checks so every pull request validates the desktop Metasploit
experience.
