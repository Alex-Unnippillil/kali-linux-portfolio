# Preview performance report

This repository automatically posts a performance snapshot on pull requests. The comment combines Lighthouse metrics from a
production-like build with a bundle size diff so reviewers can catch regressions early.

## How to read the comment

The report contains two tables and a short list of the heaviest assets:

1. **Lighthouse metrics** – averaged across three runs for `/` and `/apps` using the desktop preset. The budgets are:
   - **LCP:** ≤ 3.5 s
   - **INP:** ≤ 200 ms
   - **CLS:** ≤ 0.10
2. **Bundle size totals** – brotli-compressed JavaScript and CSS output measured from `next build`. Totals are compared
   against the base branch and checked against these caps:
   - **Total JS:** ≤ 2,800 kB
   - **Total CSS:** ≤ 150 kB
3. **Top bundled assets** – the largest brotli-compressed files from the current build so you know where to focus when tuning.

A ✅ means the metric is within budget. A ❌ indicates a breach and should be addressed before merging. If a preview deployment
fails or a build directory is missing, the tables fall back to placeholders so you can rerun the workflow after fixing the root cause.

## Reproducing the checks locally

```bash
yarn install
NEXT_TELEMETRY_DISABLED=1 yarn build
npx lhci autorun --config=lighthouserc.json
node scripts/bundle-report.mjs --output local-bundle-report.json
node scripts/compose-preview-comment.mjs --bundle-report local-bundle-report.json --output local-preview.md
```

The generated `local-preview.md` mirrors the comment body so you can inspect it before pushing. Feel free to add extra URLs to
`lighthouserc.json` temporarily when debugging. Just revert those edits before committing.

## When metrics regress

- **Lighthouse:** Check the “Diagnostics” section in the `.lighthouseci` JSON output for the slow route. Prioritize lazy loading,
  image optimization, and reducing render-blocking work. Avoid bundling large libraries into the critical path.
- **Bundle size:** The `Top bundled assets` section lists the largest files. Reach for code-splitting (`next/dynamic`), tree shaking,
  and shared component refactors before increasing the budgets. If a new feature genuinely needs more headroom, discuss the trade-off
  in the PR.
- **Flaky values:** If numbers fluctuate across reruns, note the variance in your PR description and include what mitigations you tried
  (e.g., raising `numberOfRuns`, disabling background tasks).

The goal is to keep the desktop experience fast while leaving room for future features. Use the budgets as guardrails and capture any
exceptions in the changelog so we can revisit them later.
