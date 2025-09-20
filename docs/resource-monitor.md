# Resource Monitor Notes

The desktop Resource Monitor surfaces runtime metrics and a simulated process table. Recent updates focus on performance,
readability, and user interaction safety.

## Charts
- Each metric (CPU, memory, FPS, network) uses a high-contrast palette and renders against a subtle grid for easier reading.
- Legends are shown above every canvas with the latest value and a colour key that passes contrast checks on the dark theme.
- Chart draws are profiled and the update interval is automatically throttled to keep canvas work below ~5% CPU.

## Sampling loop
- The sampling loop still uses `requestAnimationFrame` deltas, but draws are now debounced with an adaptive throttle that reacts
  to worker timings.
- Network speed updates from `speedtest.worker.js` feed into the same budget, so spikes in worker time raise the throttle
  before new frames are painted.

## Process table
- Processes are sorted with a stable comparator that falls back to launch order when values tie.
- Right-click (or Shift+F10) any row to open a context menu with **Kill**, **Renice**, and **Open File Location** actions. The
  same operations are available via inline buttons for accessibility.
- Actions dispatch simulated state updates only; they never attempt to reach the host OS.
- Each action logs a `resource-monitor` analytics event so we can track usage.

## CPU budget targets
- Draw durations and worker response times are measured via `performance.now()`. When the rolling average exceeds the budget,
  the throttle backs off and status text shows the new interval.
- Stress-test windows still exist, but they now honour the pause toggle so the synthetic load does not skew sampling numbers.
