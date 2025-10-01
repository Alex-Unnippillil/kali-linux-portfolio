# Developer Metrics Guide

The developer metrics pipeline surfaces real-time performance samples in a local-only panel so you can diagnose regressions without shipping telemetry. Collection is opt-in and respects the existing privacy guardrails.

## Enabling collection

1. Set `NEXT_PUBLIC_ENABLE_ANALYTICS="true"` in your `.env.local`.
2. In the desktop Settings app, enable the **Allow network activity** toggle. The toggle gates all outbound requests and also unlocks metrics storage. When either the env flag or toggle are disabled, the buffer is purged to avoid retaining data by accident.
3. Load any page to start sampling. The metrics module attaches `web-vitals` observers for **LCP**, **INP**, and **CLS** and batches samples in `localStorage` (see `utils/metrics.ts`).

The panel shows a banner whenever analytics are disabled or the privacy toggle blocks collection, so you always know why charts are empty.

## Recording custom metrics

Use the helpers in `utils/metrics.ts` to emit domain-specific measurements:

- `recordRowsRendered(count, detail?)` – track how many list rows or table entries were painted.
- `recordWorkerTime(durationMs, detail?)` – record worker execution time for CPU-heavy flows.
- `recordWebVitalMetric(name, value, detail?)` – push manual web-vital samples (the Next.js `reportWebVitals` hook already uses this).

All helpers honor consent. If you need to log a new metric type, add it to the `MetricName` union, expose a recorder, and update the `METRICS` array in `components/dev/MetricsPanel.tsx` so the panel can render it.

### Working with the API

- `updateMetricsConsent({ allowNetwork, analyticsEnabled })` synchronises the collector with UI toggles or env switches.
- `getMetricSummary(name, windowMs)` returns rolling P75/P95 statistics and sample counts.
- `getRollingSeries(name, windowMs, buckets)` returns a time-series suitable for plotting. The panel uses a 5-minute window split into 12 buckets.
- `subscribeToMetrics(listener)` registers a callback whenever new batches land; the callback receives the entire snapshot.

## Interpreting the panel

The `MetricsPanel` card for each metric shows:

- Current **P75** and **P95** values over the last five minutes.
- A line chart plotting both percentiles so you can spot spikes.
- A sample counter to highlight sparse datasets.

Keep these baselines in mind when reviewing metrics:

| Metric | Target | Notes |
| --- | --- | --- |
| LCP | < 2500 ms | Above the threshold, the panel flags slow content paint. |
| INP | < 200 ms | Sustained spikes usually mean JS main-thread work needs deferral. |
| CLS | < 0.1 | Higher values indicate layout instability. |
| Rows rendered | Contextual | Watch for sudden jumps that suggest virtualization leaks. |
| Worker time | Contextual | Spikes flag background work starving the main thread. |

Because data never leaves the browser, you can experiment freely while iterating. Clear the buffers by flipping the Allow network toggle off or calling the `__testing.reset()` helper in unit tests.

