# Developer testing sandbox

The `/dev/sandbox` route exposes high-stress UI fixtures for manual performance and resilience testing. It intentionally ships
over-sized payloads, background timers, and expensive synchronous loops so you can recreate slow devices or degraded networks
without changing production code paths.

## Enabling the sandbox

1. Copy `.env.local.example` to `.env.local` if you have not already.
2. Add `NEXT_PUBLIC_ENABLE_DEV_SANDBOX=true` (or `ENABLE_DEV_SANDBOX=true` if you prefer a server-only flag).
3. Start the dev server with `yarn dev`. The sandbox is only available when `NODE_ENV !== 'production'`.
4. Visit [http://localhost:3000/dev/sandbox](http://localhost:3000/dev/sandbox).

> The flag is required even in development to reduce the chance of the sandbox being reachable in preview deployments.

## Available tools

- **Massive table generator** – renders hundreds to thousands of rows using deterministic data so you can profile layout shifts and
table virtualization strategies.
- **Log flood and artifact explorer** – appends synthetic log entries, generates large file listings, and exposes packet-capture
styled previews to push scroll performance and text rendering.
- **System stress controls** – toggles a requestAnimationFrame CPU loop and configurable memory allocations (up to 64&nbsp;MB) to
observe recovery behaviour.
- **Network throttling simulator** – enqueues delayed pseudo-requests to validate loading states and retry logic with custom
latency values.
- **Main-thread blocker** – runs deterministic busy loops for selected durations to simulate long JavaScript tasks.

## Manual QA to keep it out of production

- Ensure `NEXT_PUBLIC_ENABLE_DEV_SANDBOX` (and `ENABLE_DEV_SANDBOX`) are unset or `false` in deployment environments.
- After running `yarn build && yarn start`, confirm visiting `/dev/sandbox` returns a 404.
- Double-check `.env*` files are ignored by Git before committing.

These manual checks, plus the build-time guard in `pages/dev/sandbox.tsx`, prevent the sandbox from leaking into published
builds.
