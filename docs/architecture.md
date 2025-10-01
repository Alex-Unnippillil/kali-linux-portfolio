# Architecture

The project is a desktop-style portfolio built with Next.js.

- **pages/** wraps applications using Next.js routing and dynamic imports.
- **components/apps/** contains the individual app implementations.
- **pages/api/** exposes serverless functions for backend features.

For setup instructions, see the [Getting Started](./getting-started.md) guide.

## Offscreen rendering paths

- The status bar performance graph and media thumbnail utilities opt into `OffscreenCanvas`
  when supported. Both routes dispatch draw commands to dedicated workers for smoother
  painting and reduced main thread contention.
- The shared helper `utils/canvas/offscreen.ts` negotiates feature detection and exposes a
  single interface for posting messages regardless of whether a worker is active.
- When `OffscreenCanvas` or workers are unavailable (for example in older browsers or JSDOM),
  the same utilities fall back to on-thread 2D contexts. The rendering API stays identical, so
  the graph and thumbnail fidelity remain consistent even in the fallback mode.
- Telemetry from the workers is surfaced through `utils/performanceTelemetry.ts` to compare
  P95 frame timings. The analytics hooks verify that worker rendering yields at least a 30%
  jank reduction over the main-thread fallback on heavy views.
