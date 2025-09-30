# Visual regression testing

This project uses Playwright to capture baseline screenshots for key desktop routes and compare them during CI. Follow the steps below to work with the suite.

## Running locally

1. Install dependencies and Playwright browsers if you have not already:
   ```bash
   yarn install
   npx playwright install chromium
   ```
2. Start the development server in a new terminal:
   ```bash
   yarn dev
   ```
3. In another terminal, execute the visual regression suite:
   ```bash
   npx playwright test tests/visual-baseline.spec.ts
   ```

## Updating baselines

If a legitimate UI change modifies a captured route, update the stored baselines:

```bash
npx playwright test tests/visual-baseline.spec.ts --update-snapshots
```

Review the updated images under `tests/__screenshots__`. Commit only the images relevant to your change.

## Reviewing diffs

When a comparison fails locally or in CI, Playwright writes the expected, actual, and diff images to `test-results/`. Launch the interactive report for additional context:

```bash
npx playwright show-report
```

In CI, the `visual-tests` job uploads both the Playwright HTML report and the generated diff assets as workflow artifacts whenever the job fails. Download these artifacts from the failed run to inspect the regression without rerunning the suite locally.

## Adding coverage

To extend coverage, edit `tests/visual-baseline.spec.ts` and append a new entry to the routes array. Choose stable views without heavy animation to keep the suite reliable.
