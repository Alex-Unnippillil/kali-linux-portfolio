# Accessibility instrumentation

This project now boots `@axe-core/react` automatically in development when the desktop shell mounts. The utility lives in `utils/initAxe.js` and lazily loads Axe in the browser so production bundles stay untouched. Components that should trigger audits — the main Ubuntu shell and the Whisker application launcher — call `initAxe(React)` during their mount effects.

## Running the in-app audit

1. Start the development server with `yarn dev`.
2. Open the desktop UI in the browser. When the shell or Whisker menu mounts, Axe runs against the rendered tree and prints issues to the browser console every second.
3. Resolve any reported violations, reload, and repeat until the console no longer shows critical issues.

## Component adjustments

- The Whisker menu now exposes labelled controls, dialog semantics, and labelled search results so Axe can verify categories, search, and the results grid.
- App tiles adjust their focus styling to keep a 4.5:1 contrast ratio and provide a visible focus ring.

Refer to the console output from Axe for the exact rule IDs and remediation guidance.
