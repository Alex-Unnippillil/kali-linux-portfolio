# Lighthouse CI debugging guide

This workflow uses [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci) to audit the canary deployment of the Kali Linux Portfolio. The configuration lives in [`.lighthouserc.js`](../.lighthouserc.js) and targets the public preview URL so we can spot regressions before a branch lands.

## When the GitHub Action fails

1. **Check the canary URL**  
   Ensure the `LHCI_CANARY_BASE_URL` repository secret is set to the fully-qualified canary domain (e.g. `https://canary.example.com`). The workflow and configuration will fail early if the value is missing or malformed. You can also export the value locally before running LHCI commands.

2. **Re-run audits locally**  
   ```bash
   # Install dependencies once
   yarn install

   # Run the same autorun pipeline against canary
   LHCI_CANARY_BASE_URL="https://canary.example.com" \
     yarn dlx @lhci/cli@0.13.x autorun --config=.lighthouserc.js
   ```
   The command downloads a Lighthouse worker, runs the audits defined in the config, and prints the scores along with any failing assertions.

3. **Review budget failures**  
   The CI asserts the median Largest Contentful Paint (LCP ≤ 2500 ms), Interaction to Next Paint (INP ≤ 200 ms), and Cumulative Layout Shift (CLS ≤ 0.1). Any run above these thresholds causes the build to fail. Check the console output for the specific route and metric that tripped the budget.

4. **Open the generated reports**  
   Each CI run uploads JSON reports to Lighthouse’s temporary public storage. The Action summary links to these artifacts; open them in your browser to inspect the waterfall, DOM stats, and opportunities.

5. **Compare against previous runs**  
   Fetch the latest canary deployment locally and use Chrome DevTools Lighthouse panel or `lhci collect` on both `main` and your branch. Comparing reports helps confirm whether the regression is reproducible and if the issue is limited to the new changes.

6. **Validate the deployment**  
   Confirm the canary domain resolves and that the routes listed in `.lighthouserc.js` respond with HTTP 200. Network errors or redirects often surface as LHCI failures.

7. **Adjust cautiously**  
   If the regression is expected (e.g., intentional heavy content), update the thresholds in `.lighthouserc.js` in the same PR and document the rationale. Otherwise, fix the underlying performance or layout issue before re-running the workflow.

## Useful standalone commands

- Collect only, without assertions or uploads:
  ```bash
  LHCI_CANARY_BASE_URL="https://canary.example.com" \
    yarn dlx @lhci/cli@0.13.x collect --config=.lighthouserc.js
  ```
- Assert existing Lighthouse JSON artifacts:
  ```bash
  yarn dlx @lhci/cli@0.13.x assert --config=.lighthouserc.js --assertions.assertionResultsFile=./path/to/lhr.json
  ```
- Generate an HTML report from a stored LHR JSON:
  ```bash
  yarn dlx @lhci/cli@0.13.x upload --target=filesystem --outputDir=./lhci-report \
    --inputPath=./path/to/lhr.json
  ```

These commands mirror the CI configuration so issues found locally map directly to the GitHub Action’s expectations.
