# Lighthouse troubleshooting

These notes collect the fixes we lean on when Lighthouse CI drops below the team targets.
The `yarn lighthouse` script runs the same configuration as CI, so you can debug locally
before pushing a branch.

## Workflow reminders

1. Build the production bundle: `yarn build`.
2. Install the Chromium binary used in CI: `npx playwright install chromium`.
3. Run the audit with the CI config: `CHROME_PATH=$(node -e "const { chromium } = require('playwright'); console.log(chromium.executablePath());") yarn lighthouse`.
4. Inspect `.lighthouseci/reports/manifest.json` for raw scores or open the HTML report for a deep dive.

The CI job prints a score summary and points you back to the sections below when something fails.

## Performance

* **Trim main thread work.** The Ubuntu desktop bundle eagerly loads many simulation apps.
  Prefer lazy-loading heavy apps, defer canvas/WebGL work until the window is focused, and
  keep boot animations lightweight.
* **Reduce render-blocking assets.** Inline critical CSS with `next/head`, split large
  stylesheets per app, and load fonts with `display=swap` to avoid blocking first paint.
* **Cache aggressively.** Ensure API stubs and static JSON load through SWR or fetch wrappers
  with caching enabled. When possible, precompute expensive data during build instead of at runtime.

## Accessibility

* **Audit interactive controls.** Keyboard trap issues most often come from window chrome,
  draggable surfaces, and simulated terminals. Provide `aria-label`, `role`, and focus outlines.
* **Use semantic headings.** Apps added under `components/screen/desktop` should keep a logical
  heading hierarchy so the desktop view does not jump from `<h1>` directly to `<h4>`.
* **Cross-check with `yarn a11y`.** The pa11y smoke script highlights low-hanging color
  contrast and form labeling issues that Lighthouse also surfaces.

## Best Practices

* **Eliminate console errors.** Any rejected promise or missing asset during boot will trigger
  the "Browser errors logged to the console" audit. Guard optional APIs and wrap async calls
  with error boundaries in the desktop shell.
* **Upgrade third-party libraries.** Deprecated APIs in Phaser, Leaflet, or cytoscape can flag
  best-practice audits. Keep the versions in `package.json` fresh and remove unused polyfills.
* **Serve secure assets.** Ensure all images, iframes, and script embeds load over HTTPS and
  avoid inline `javascript:` links in legacy apps.

## SEO

* **Keep meta tags in sync.** Confirm `components/SEO/Meta` exports the correct `title`,
  `description`, and Open Graph tags for new desktop apps.
* **Link crawlable pages.** When adding app landing pages or docs, use standard `<a>` elements
  with descriptive text so Lighthouse can index them.
* **Avoid duplicate content.** Use canonical URLs in the SEO component and ensure locale or
  theme toggles do not create duplicate pages without proper `rel="canonical"` metadata.

## Still stuck?

* Run `lhci autorun --config=.lighthouseci/config.js --collect.numberOfRuns=5` to see if the
  regression is noise or reproducible.
* Compare the failing run against the last passing report stored under `.lighthouseci/reports/`.
* When performance fails only on CI, profile with Chrome DevTools in headless mode:
  `CHROME_PATH=… yarn lighthouse --collect.settings.throttlingMethod=provided` and inspect the
  trace files in the generated report.
