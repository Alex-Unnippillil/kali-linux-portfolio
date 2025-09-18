# Power dashboard and saver integration

This portfolio now ships a lightweight power dashboard stack that keeps the UI in sync
with the simulated battery telemetry and saver controls.

## Mock power manager

`utils/powerManager.ts` centralises mock telemetry for the desktop.

- `getBatterySnapshot()` returns the cycle count, health percentage, remaining charge and
  nominal capacity figures derived from a simulated pack.
- `estimateLifeGainMinutes()` provides a rough runtime gain when power saver mode is active.
- `setPowerSaverEnabled()`, `isPowerSaverEnabled()` and `onPowerSaverChange()` expose a
  minimal pub/sub layer so background tasks can adjust their workload.
- `getResourceSamplingConfig()` maps the current saver state to sampling intervals used by
  the resource monitor and other background jobs.

## Health panel

`components/apps/power-dashboard/HealthPanel.tsx` renders the mock telemetry. The panel
surfaces:

- Cycle count with live updates every minute.
- Health percentage visualised with a progress bar.
- Design versus full charge capacity along with derived wear metrics and remaining charge.

Drop the component into any window body to embed the dashboard section.

## Quick Settings saver toggle

Quick Settings (`components/ui/QuickSettings.tsx`) now includes a **Power saver** toggle that:

- Persists the state locally and emits analytics events (`logPowerSaverChange`) whenever the
  mode changes.
- Dims the desktop by adjusting the new `--power-saver-brightness` CSS variable which is read
  by the global `body` rule.
- Notifies `powerManager` so background utilities can react.

The helper text shows the estimated runtime gain reported by `estimateLifeGainMinutes()`.

## Resource monitor throttling

`components/apps/resource_monitor.js` subscribes to the power manager and swaps sampling
intervals when saver mode is active. Charts and network worker updates now slow down to
halve the workload while the saver toggle is on.

## Analytics

`utils/analytics.ts` tracks saver usage with:

- `logPowerSaverChange()` – dispatches GA events and tallies activations plus estimated life
  gained.
- `getPowerSaverMetrics()` – exposes the counters for dashboards or tests.

A private `__resetPowerSaverMetrics()` helper keeps the Jest suite deterministic.

## Styling hook

`styles/globals.css` defines `--power-saver-brightness` (default `1`). `styles/index.css`
consumes the variable and animates brightness transitions, so other components can rely on
the shared variable without duplicating filters.

## Tests

`__tests__/components/ui/QuickSettings.saver.test.tsx` verifies the new toggle, DOM updates,
and analytics hooks. Existing analytics tests now cover the saver metrics as well.
