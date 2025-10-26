# Updating pa11y Baselines

The accessibility suite relies on `pa11y` to crawl key desktop flows (About, Contact,
Project Gallery, and the `/apps` catalog) in both default and high-contrast modes.
When the UI changes, refresh the stored baseline so reviewers can compare new
violations against the previous run.

> **Tip:** The first time you generate a baseline on a fresh machine, install the
> Playwright browser bundle so Chromium's shared libraries are available to
> pa11y:
>
> ```bash
> npx playwright install --with-deps
> ```

## 1. Start the local server

```bash
yarn install
yarn dev
```

Keep the dev server running at `http://localhost:3000` in that terminal.

## 2. Capture a new baseline snapshot

From a second terminal, run the custom pa11y runner and write the results to the
baseline file. The helper will create the directory if it does not exist.

```bash
yarn a11y -- --save-baseline tests/a11y-baseline/latest.json
```

This command exercises every flow defined in `pa11yci.json`, including the
high-contrast scenario, and serialises the issues (code, selector, message) to
`tests/a11y-baseline/latest.json`.

## 3. Review and commit

1. Inspect the JSON diff and confirm that any new violations are expected.
2. Fix regressions where possible instead of accepting them into the baseline.
3. Commit the updated `tests/a11y-baseline/latest.json` alongside the code
   changes that triggered it.

Remember to re-run `yarn a11y` before opening a PR so the CI workflow fails on
unresolved violations.
