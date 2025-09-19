# Lighthouse performance gate

The repository now enforces a performance workflow on every pull request. The `performance`
job in [`ci.yml`](../.github/workflows/ci.yml) builds the application, launches the
production server, and runs Lighthouse against `http://127.0.0.1:3000/` with the budgets
defined in [`lighthouse-budgets.json`](../lighthouse-budgets.json). The run captures the
Lighthouse HTML report, JSON payload, Chrome trace, and a human-readable summary that is
posted back to the pull request.

## What the workflow enforces

- **Resource budgets** – scripts must stay under 350 KB and the total transfer under 2 MB.
  Third-party requests and script counts are also capped to keep the desktop responsive.
- **Timing budgets** – Largest Contentful Paint must stay under 4 s and Time to Interactive
  under 5 s for the desktop profile.
- **Runtime checks** – any Lighthouse runtime error or missing audit is treated as a build
  failure so the gate never silently skips a run.

When budgets are exceeded the `performance` job fails and the pull request receives an
updated comment summarising the metrics, budget overages, and a link to the `lighthouse-
reports` artifact.

## Reproducing locally

1. Install dependencies and build the production bundle.

   ```bash
   yarn install
   yarn build
   ```

2. Launch the production server and keep it running.

   ```bash
   PORT=3000 yarn start --hostname 0.0.0.0 --port 3000
   ```

3. In another terminal run Lighthouse with the same settings used in CI.

   ```bash
   npx --yes lighthouse@12.8.2 http://127.0.0.1:3000/ \
     --preset=desktop \
     --output=json \
     --output=html \
     --output-path=.lighthouse/report \
     --save-assets \
     --budgets-path=./lighthouse-budgets.json \
     --chrome-flags="--headless=new --no-sandbox --disable-gpu"
   node scripts/perf/generate-lighthouse-summary.mjs \
     .lighthouse/report.report.json \
     .lighthouse/summary.md \
     .lighthouse/summary.json
   ```

4. Inspect `.lighthouse/summary.md` for the same markdown used in the PR comment. The
   `.lighthouse/report.report.assets/` directory contains the Chrome trace
   (`lighthouse-0.trace.json`) that can be loaded into Chrome DevTools Performance panel.

## Remediation checklist

When the gate fails:

- **Script or total size over budget** – split heavy apps with `next/dynamic`, lazy-load
  third-party libraries, remove unused dependencies, or compress large JSON/assets.
- **Third-party request count over budget** – audit analytics and embeds; defer or disable
  integrations that run on the desktop shell by default.
- **Timing budgets breached** – open the generated trace in Chrome DevTools and inspect the
  long tasks around LCP/TTI. Optimise render-blocking resources, preconnect critical
  origins, and move heavy work behind user interaction or web workers.
- **Runtime error** – rerun the command locally to reproduce. Common causes are the server
  failing to start or the page returning an HTTP error. Fix the underlying issue before
  re-running Lighthouse.

Clear the regression and push a new commit; the workflow comment will update automatically
and the job will pass once budgets are respected again.
