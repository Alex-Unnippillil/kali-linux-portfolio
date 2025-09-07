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
