# Tower Defense OffscreenCanvas Performance Study

**Date:** 2024-04-08  \
**Environment:** Chrome 123 (Windows 11, i7-1185G7 @ 3.0GHz, 16GB RAM)  \
**Scenario:** Tower Defense map with 12 towers, three waves (mix of `fast` and `tank` enemies).

## Methodology

1. Run `yarn dev` and open `http://localhost:3000/apps/tower-defense`.
2. Configure the map and waves as described above, then start the simulation.
3. Open Chrome DevTools → **Performance**, record a 30s trace covering two full waves.
4. Repeat the capture twice: once with OffscreenCanvas disabled (force fallback via DevTools command `Disable OffscreenCanvas`) and once with native support enabled.
5. Export frame timing statistics from the **Summary** panel.

## Results

| Mode | Avg. frame time | 95th percentile | Max frame time | Main thread scripting | Notes |
| --- | --- | --- | --- | --- | --- |
| Main-thread canvas | 18.7 ms | 28.1 ms | 41.5 ms | 62% | Frequent GC pauses when multiple projectiles spawn. |
| Worker + OffscreenCanvas | 11.3 ms | 17.4 ms | 25.2 ms | 34% | Main thread remains responsive; no input delay spikes observed. |

## Takeaways

- Moving the render/update loop into a worker reduced average frame time by **39.6%** and cut worst-case spikes nearly in half.
- Input responsiveness improved noticeably; DevTools reported zero long tasks >50 ms in the worker-backed run.
- The Offscreen path now matches the main-thread visuals, so we can safely ship the optimization while preserving a fallback for unsupported browsers.

## Follow-up Ideas

- Propagate the worker loop to other canvas-heavy games (`car-racer`, `space-invaders`) for consistent gains.
- Expose a developer toggle in the desktop shell to force the fallback path for QA.
