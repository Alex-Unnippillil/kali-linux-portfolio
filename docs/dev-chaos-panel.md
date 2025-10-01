# Dev Chaos Panel

The dev chaos panel exposes a lightweight chaos engineering harness that only loads in local and preview builds. It lets maintainers
simulate common failure modes without modifying fixtures or workers directly.

## Enabling the panel

The panel is automatically available when `NODE_ENV` is not `production`. It renders as a floating controller in the bottom-right corner
of the desktop shell. Production builds do not bundle the UI or the fault injection logic—`chaosState.isDev` is `false` and every setter
turns into a no-op to avoid leaking switches to end users.

## Supported fault toggles

Each app toggle exposes three synthetic faults:

- **Worker timeouts** – prevents workers or schedulers from delivering results. The UI falls back to cached copy or status messaging.
- **Partial data** – truncates payloads so that components exercise their degraded data paths.
- **Corrupted chunks** – simulates invalid frames, triggering error overlays instead of raw stack traces.

Current targets include the terminal worker, the Nessus parser worker, and the scan scheduler helper. The list can be extended inside
`components/dev/ChaosPanel.tsx` when additional apps add chaos-aware handlers.

## Usage notes

1. Toggle the target dropdown to pick an app.
2. Flip one or more fault switches. The affected UI immediately reflects the state (e.g. the terminal prints chaos banners).
3. Use **Clear flags** to reset the selected app or refresh the page to drop all flags.

The panel writes nothing to persistent storage; every reload resets the store. Because the implementation is gated by `NODE_ENV`, exported
static builds and production deployments remain untouched.
