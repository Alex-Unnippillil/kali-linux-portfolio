# Experimentation workflow

This project now exposes a light-weight experimentation framework that keeps all experiment metadata next to the code powering assignment and analytics.

## Registry

* Definitions live in [`lib/experiments.ts`](../lib/experiments.ts). Each experiment captures:
  * **Variants** with descriptive names and rollout weights.
  * **Metrics** documenting the signals we monitor when reviewing results.
  * **Audience and status** notes so contributors understand who should be enrolled.
* `assignExperimentVariant()` deterministically buckets a `unitId` (for example a session or visitor id) according to the declared weights. The first variant acts as the control fallback when no identifier is available.

## Logging exposures

Use `logExperimentExposure(experimentId, variantId)` from [`utils/analytics.ts`](../utils/analytics.ts) immediately after rendering an experience behind the experiment gate. The helper:

1. Deduplicates exposure events per session via `sessionStorage` (with an in-memory fallback for environments without web storage).
2. Emits a GA4 event with category `experiment:<id>`, action `exposure`, label `<variant>` and `nonInteraction` to avoid inflating engagement metrics.

Unit tests in [`__tests__/analytics.test.ts`](../__tests__/analytics.test.ts) ensure the deduplication layer and payload stay correct.

## Offline analysis

`scripts/analyze-experiments.ts` reads a CSV containing aggregated outcomes and reports posterior means plus a z-test against the control variant. Columns must be: `experiment,variant,metric,conversions,total` where `conversions` represents success counts and `total` the population size for the metric.

Run it with:

```bash
yarn ts-node scripts/analyze-experiments.ts path/to/metrics.csv
```

The script references the registry to validate experiment and variant identifiers, then prints per-metric summaries and two-sided p-values for each challenger against the control variant. This makes it easy to paste analytics exports into a CSV and obtain directional significance estimates without needing spreadsheet formulas.

## Testing

* [`__tests__/experiments.registry.test.ts`](../__tests__/experiments.registry.test.ts) verifies deterministic assignment and weight balancing.
* [`__tests__/analytics.test.ts`](../__tests__/analytics.test.ts) covers exposure logging.

When you add a new experiment, extend the registry and update or add tests to keep coverage aligned.
