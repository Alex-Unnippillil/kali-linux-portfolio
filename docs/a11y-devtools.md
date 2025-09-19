# Accessibility Dev Tooling

This project now ships with two complementary accessibility helpers:

- an in-browser overlay powered by `axe-core` that surfaces violations and CSS selectors while you build;
- a repeatable Playwright scan that produces downloadable JSON reports for CI and local audits.

Use this guide to enable the overlay locally, generate structured reports, and track improvements over time.

## Developer overlay

The overlay is available on any page whenever the desktop UI runs in development.

### Enable or disable the overlay

- **Development:** the overlay is enabled by default. Set `NEXT_PUBLIC_ENABLE_A11Y_OVERLAY="false"` in your `.env.local` file to hide it temporarily.
- **Preview/production:** set `NEXT_PUBLIC_ENABLE_A11Y_OVERLAY="true"` during the build to ship the overlay in a preview. Leave the flag unset (or anything other than `true`) to omit it from production bundles.

### Using the overlay

1. Start the app with `yarn dev`.
2. Visit `http://localhost:3000` and open any window. A circular “A11y” pill sits in the lower-right corner.
3. Click the pill to open the overlay panel. The panel lists:
   - total violations and counts per impact (critical → minor);
   - each rule’s title, description, and WCAG guidance link;
   - selectors for every failing node, with inline HTML snippets and hover-based element highlighting.
4. Hover a selector entry to outline the matching DOM nodes on the page. Click **Rescan** after you fix a violation to re-run `axe-core` (the color contrast check is enforced by default).

Because the overlay runs only in non-production bundles (unless forced via the environment variable), there is no performance cost in live builds.

## Automated axe-core report

Use the Playwright-powered script to capture machine-readable reports:

```bash
yarn dev &
A11Y_BASE_URL="http://localhost:3000" yarn a11y:report
```

- `A11Y_BASE_URL` defaults to `http://localhost:3000`; override it when your site runs on another port.
- Output is stored under `reports/a11y/` (`latest.json` plus a timestamped file). The directory is git-ignored to avoid noisy diffs.
- Each JSON file contains totals, per-page summaries, and per-node selectors so you can diff results between runs.

Stop the dev server once the script finishes. You can also invoke `yarn a11y:report` in CI (the Accessibility workflow already does this after waiting for `yarn dev`).

## CI artifact

The **Accessibility** GitHub Action uploads an `axe-accessibility-report` artifact on every pull request. Download it from the workflow run to see:

- metadata (timestamp, base URL, GitHub run identifiers, axe-core engine version);
- total counts and per-page breakdowns;
- selectors for each violation, matching the overlay output.

Use consecutive artifacts to confirm that accessibility regressions are shrinking over time.

## Improvement log

| Date | Summary | Critical | Serious | Moderate | Minor |
|------|---------|----------|---------|----------|-------|
| 2025-09-19 | Baseline `yarn a11y:report` run while introducing the overlay and CI artifact. | 0 | 0 | 0 | 0 |

Update this table with counts from the latest artifact or local run whenever you land fixes.
