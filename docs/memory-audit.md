# Memory leak audit — WebUSB listener cleanup

## Snapshot workflow

1. Start the desktop shell locally with `yarn dev` so the simulated window system is available.
2. Open Chrome DevTools, switch to the **Memory** tab, and capture a baseline heap snapshot immediately after loading `/apps/webusb`.
3. Interact with the WebUSB window (connect, disconnect, close) and capture a second snapshot. Focus the retained objects view on `components/apps/webusb.tsx` and other entries under `components/*`.
4. Compare the snapshots while filtering by `EventListener` and `Timer` retainers. Any listeners that stay alive after the component unmounts point to cleanup gaps.

Automated safety net: the new Jest coverage in `__tests__/memory.spec.ts` mounts the WebUSB component, simulates a connection, unmounts, and asserts that `removeEventListener('disconnect', …)` is called. This runs in CI so future regressions surface quickly.

## Findings

- **WebUSB disconnect listener leak.** The component registered a `disconnect` handler on every real device but never removed it. In Chrome’s heap viewer the handler remained retained even after closing the window, which would accumulate if the user connected multiple devices in one session.

## Fix summary

- Track the registered handler in a ref and remove it inside a `useEffect` cleanup when the component unmounts or the active device changes.
- Reset device state when toggling mock mode to ensure the cleanup path runs.
- Guard future regressions with the dedicated memory test described above.

## Follow-up checklist

- Re-run the snapshot workflow whenever the WebUSB app or other device-integrated utilities change.
- Extend the Jest coverage to other components if you add long-lived observers, timers, or manual DOM listeners.
