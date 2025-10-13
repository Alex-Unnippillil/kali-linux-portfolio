# Visual regression testing

The Playwright suite captures baseline screenshots for the Kali desktop shell, the app catalog, and responsive layouts. Snapshots live under `playwright/__snapshots__` and are separated by project (`desktop-default`, `desktop-neon`, and `mobile-pixel`).

## Running the suite locally

1. Install the required browsers once:
   ```bash
   npx playwright install --with-deps chromium webkit
   ```
2. Run the tests. The configuration will automatically start `yarn dev` unless a `BASE_URL` is provided.
   ```bash
   npx playwright test
   ```
   To target a single viewport or re-use an already running server:
   ```bash
   BASE_URL=http://localhost:3000 npx playwright test --project=mobile-pixel
   ```

The config disables animations, freezes clocks, and stores results in `playwright/test-results` so diffs are consistent across machines.

## Updating baselines

1. Review the diffs (see below) and confirm the UI change is intentional.
2. Regenerate snapshots for the affected projects:
   ```bash
   npx playwright test --update-snapshots --project=desktop-neon
   ```
3. Commit the updated files in `playwright/__snapshots__` alongside the code change.

Avoid bulk updates—only refresh the snapshots tied to the feature you changed.

## Continuous integration workflow

The `visual-regression` job in `.github/workflows/ci.yml` runs on every pull request. It installs Playwright, executes the full suite, and uploads two artifacts when the job finishes:

- **`playwright-report`** – the HTML report (`index.html`) can be downloaded and opened locally to review failures.
- **`playwright-visual-diffs`** – contains the `actual`, `expected`, and `diff` PNGs from `playwright/test-results`.

Any mismatch fails the job. Contributors must inspect the artifacts, decide whether the change is expected, and either fix the regression or update the baseline.

## Handling legitimate visual changes

1. Download the artifacts from the failing CI run and inspect the HTML report and diff images.
2. Validate the new appearance against design intent. If the change is acceptable, re-run the relevant tests with `--update-snapshots` to refresh the baselines.
3. Include a short note in the pull request describing the approved visual delta and reference the updated snapshot files.
4. If the diffs look suspicious, treat the failure as a regression, fix the code, and re-run the suite.

Documenting the decision and limiting snapshot updates to the affected views keeps reviews focused and prevents accidental regressions from landing.
