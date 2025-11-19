# App Grid Rendering Benchmark

To understand the impact of virtualizing the desktop app catalog we compared a simple static grid render with the new `react-window` implementation using the synthetic benchmark script in `scripts/benchmark-app-grid.cjs`.

## Methodology
- Dataset: 512 synthetic app entries that mirror the metadata shape used by the real launcher.
- Static baseline: renders every icon in a CSS grid with padding similar to the legacy implementation.
- Virtualized candidate: uses the `Grid` component from `react-window` with fixed column and row sizes that match the responsive desktop layout.
- Metric: server-side `renderToString` timings (`20` samples per run) collected with Node's `performance.now()`.

Run locally with:

```bash
node scripts/benchmark-app-grid.cjs
```

## Results

| Scenario | Avg (ms) | Min (ms) | Max (ms) |
| --- | ---: | ---: | ---: |
| Static map | 28.801 | 12.659 | 52.407 |
| Virtual grid | 0.599 | 0.133 | 4.355 |

The virtualized grid avoids instantiating hundreds of nodes on each update, dropping the average render time by roughly **48×** in this synthetic test. This aligns with the smoother typing and keyboard navigation observed in the desktop launcher after virtualization.
