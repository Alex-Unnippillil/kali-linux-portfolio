# Bundle Budgets

To prevent client bundles from growing unexpectedly, size budgets are maintained in [`bundle-budgets.json`](../bundle-budgets.json).
These budgets are enforced in CI after every build.

## Current thresholds

| Chunk pattern | Limit (bytes) |
| ------------- | ------------- |
| `^chunks/framework` | 300000 |
| `^chunks/main-app` | 350000 |

## Local verification

Generate bundle statistics and check them against the budgets:

```bash
ANALYZE=true yarn build
yarn check-budgets
```

The build produces `.next/analyze/client.json` via `@next/bundle-analyzer` and the check script exits with a non-zero code if any asset exceeds its limit.

## Addressing regressions

When a pull request fails the budget check, the failing chunk names and sizes
are printed in the CI log. To resolve the regression:

1. Reproduce locally by running the verification commands above.
2. Inspect `.next/analyze/client.json` (or the accompanying HTML report if
   generated) to identify which modules contribute to the oversized chunk.
3. Reduce the bundle size by code-splitting, removing unnecessary dependencies,
   or optimising imports. If the increase is expected, update
   `bundle-budgets.json` with an explanatory commit.
4. Rebuild and re-run `yarn check-budgets` until it passes.
