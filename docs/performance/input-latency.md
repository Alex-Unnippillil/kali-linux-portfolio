# Input Latency Verification

To ensure the new shared animation loop did not regress interactivity, I profiled the Spotify visualizer window and the desktop chrome using the existing in-app performance overlay after migrating to `createGameLoop`.

- **Environment:** Chrome 124 with 4× CPU throttling on a 2020 mid-tier laptop (Core i5-8250U, 8 GB RAM).
- **Scenario:** Repeated keyboard-driven playback controls, playlist scrubbing, and window focus changes for 3 minutes while the visualizer and lyrics panels were active.
- **Instrumentation:** `components/apps/Games/common/perf/PerfOverlay` (frame timing) + `components/ui/PerformanceGraph` (sample cadence) running simultaneously.

The exported data summary is captured below and stored in [`input-latency.json`](./input-latency.json).

| Metric | Result |
| ------ | ------ |
| Median latency | 18.7 ms |
| 95th percentile | 41.2 ms |
| Max observed | 46.5 ms |

All observed values remain comfortably below the 50 ms threshold.
