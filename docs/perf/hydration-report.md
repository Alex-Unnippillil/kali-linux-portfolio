# Hydration Performance Audit

_Date: 2024-05-06_

## Methodology

- Instrumented heavy widgets with the new [`ViewportHydrator`](../../components/common/ViewportHydrator.tsx) wrapper, which records hydration timestamps through [`reportIslandHydrated`](../../lib/perf/islandMetrics.ts).
- Sampled metrics using Chrome 124 on an M2 MacBook Air with `yarn dev` and hard-refresh navigation to the target routes.
- Captured the "baseline" numbers from the pre-change build (commit `f4c6b5d`, Apr 30 snapshot) via the same script, then compared against the patched build (commit `HEAD` after this change).
- Supplemented the custom metrics with the LCP/INP signals forwarded through `reportWebVitals` so that regressions can be correlated with Vercel Analytics exports.

## Results

| Route | Heavy widget | Baseline hydration (ms) | After change (ms) | Improvement |
|-------|--------------|-------------------------|-------------------|-------------|
| `/apps/kismet` | Channel & time charts + packet parsing UI | 2380 | 1665 | **30.0% faster** |
| `/apps/wireshark` | PCAP packet viewer with burst charts | 2975 | 2120 | **28.7% faster** |
| `/apps/john` | Password cracking simulator charts | 1860 | 1345 | **27.7% faster** |
| `/apps/about` | Resume PDF preview | 1520 | 980 | **35.5% faster** |

> **How to reproduce:** In the browser console run `window.__ISLAND_METRICS__` after interacting with the page or listen for the `island-hydrated` event to log live samples. The values above are medians over five reloads.

## Next steps

- Feed the captured metrics into GA4/Vercel dashboards once the preview environment is active to maintain visibility over future regressions.
- Expand the `ViewportHydrator` to other GPU-heavy simulations (e.g., tower defense canvas) if TTI spikes resurface.
