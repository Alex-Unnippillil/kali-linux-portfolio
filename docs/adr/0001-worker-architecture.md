# ADR-0001: Worker architecture

- **Status:** Accepted
- **Date:** 2025-02-14
- **Deciders:** Core maintainers
- **Consulted:** Game and simulator maintainers
- **Tags:** performance, reliability

## Context

Desktop interactions, security-tool simulations, and games often require CPU-heavy parsing, hashing, or rendering loops. Running these tasks on the main thread introduces input latency, window jank, and stutters in audio/animation. The project already contains a large number of workers under [`workers/`](../../workers) and instantiates them from apps via the `new Worker(new URL(..., import.meta.url))` pattern. We need clear guidance to keep worker usage consistent, avoid bundler regressions, and maintain a predictable message contract across the portfolio.

## Decision

- Use **dedicated Web Workers** for long-running, CPU-intensive, or high-frequency tasks (parsers, simulators, AI opponents, timers). Keep workers colocated in `workers/` or in the owning app directory when they are app-specific.
- Always instantiate workers with `new Worker(new URL('./worker-file', import.meta.url))` (and pass `{ type: 'module' }` when the worker source uses ESM) so Next.js can statically analyse the dependency graph during build.
- Workers must expose a **structured message contract**: JSON-serialisable payloads with `type` fields and explicit schemas. Avoid transferring React components, DOM nodes, or class instances.
- Share code with the main thread through **pure utility modules** imported by both parties. Avoid dynamic `importScripts` to keep the build deterministic.
- Workers must remain **offline-safe**: no direct network access or privileged APIs. External communication routes through the main thread where existing feature flags and rate limiting live.
- Keep worker bundles **TypeScript-first** when possible. Type declarations live next to the worker and describe message payloads so consuming components can use discriminated unions.

## Consequences

- Main thread rendering stays responsive while compute-heavy features (hashing, simulators, AI) run in parallel.
- Enforcing a strict message contract reduces regressions when workers evolve, but it requires additional typing and testing effort.
- Reusing pure utilities encourages deterministic logic that can be unit tested outside the worker runtime.
- Module workers are only available in modern browsers; legacy browsers that lack module support fall back to feature detection and will disable the corresponding app window.

## Implementation Notes

- Store reusable worker helpers (e.g., message enums) under `workers/` and import them from the UI using relative paths.
- Add integration tests in `__tests__/` or targeted Playwright flows whenever a worker becomes critical to user workflows.
- When a worker needs binary data, prefer `ArrayBuffer` transfers over cloning large objects to reduce GC churn.

## Related ADRs

- [ADR-0005](./0005-graph-rendering-strategy.md) – charts that need aggregation should use workers for expensive calculations before rendering.
