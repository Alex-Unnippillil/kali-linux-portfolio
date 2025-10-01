# Architecture

The project is a desktop-style portfolio built with Next.js.

- **pages/** wraps applications using Next.js routing and dynamic imports.
- **components/apps/** contains the individual app implementations.
- **pages/api/** exposes serverless functions for backend features.

For setup instructions, see the [Getting Started](./getting-started.md) guide.

## Window open telemetry

Desktop window launches now record light-weight metrics on the client so we can identify slow apps quickly:

- `windowPerformance.pending` — `Map<appId, { start, title, workspace }>` that stores the `performance.now()` timestamp when `openApp` begins spawning a window. Entries are cleared when the window mounts or closes.
- `windowPerformance.samples` — `Array<{ id, title, duration, startedAt, completedAt, workspace, context }>` containing completed launch measurements. `duration` reflects the milliseconds between the open request and the window mount/hydration callback.

In non-production builds, every new sample prints an aggregated summary (`console.groupCollapsed('🖥️ Window open performance')`) with per-app counts plus min/avg/max/last durations. Engineers can watch the console while opening windows to immediately spot regressions or unusually slow screens.
