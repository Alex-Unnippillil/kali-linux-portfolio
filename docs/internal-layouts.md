# Internal Layouts

This project provides Tailwind utilities that mimic Bootstrap's 12-column grid. Use them to create internal layouts without relying on Bootstrap itself.

## Usage

Wrap columns in a flex container and apply the `col-*` classes to control widths.

```html
<div class="flex flex-wrap">
  <div class="col-6">Left</div>
  <div class="col-6">Right</div>
</div>
```

Offsets are also available through `offset-*` classes.

```html
<div class="flex flex-wrap">
  <div class="col-4 offset-4">Centered</div>
</div>
```

## Diagnostics snapshot schema

Diagnostics snapshots exported from the Resource Monitor toolbox use the following JSON structure. The schema is designed so the Log Viewer app (`apps/log-viewer`) can parse historical state without touching the DOM.

- `version` (number): Schema revision. Current value: `1`.
- `capturedAt` (ISO 8601 string): Timestamp of when the snapshot was generated.
- `metrics` (object): Overall resource values sampled from the worker.
  - `cpu` (number or `null`): Page CPU utilisation percentage at the time of capture.
  - `memory` (number or `null`): JS heap utilisation percentage at the time of capture.
- `windows` (array): One entry per open desktop window.
  - `id` (string): DOM identifier used by the window manager.
  - `title` (string): Window title resolved from the aria label.
  - `className` (string): Class list snapshot useful for debugging focus styles.
  - `state` (object): Flags describing the window state (`minimized`, `maximized`, `focused`).
  - `zIndex` (number): Computed stacking order.
  - `bounds` (object): Position and size in CSS pixels (`x`, `y`, `width`, `height`).
  - `area` (number): Calculated window area in pixels, used for proportional resource allocation.
  - `dataset` (object): Copy of `data-*` attributes present on the window root.
  - `metrics` (object): CPU and memory allocations distributed to the window (numbers or `null`).
- `timers` (array): Captures timer and stopwatch state exposed by the timer app.
  - `id` and `label` (strings): Identifiers used by the viewer UI.
  - `mode` (`'timer' | 'stopwatch'`): Timer mode.
  - `running` (boolean): Indicates whether the timer is active.
  - `startedAt`, `expectedEnd`, `lastUpdated` (number or `null`): Millisecond timestamps.
  - `remainingSeconds`, `elapsedSeconds` (number or `null`): Duration counters.
  - `laps` (array of numbers): Recorded lap times for the stopwatch mode.
- `network` (object, optional): Fetch proxy data included when available.
  - `active` (array): Active requests with `id`, `url`, `method`, `startTime`, and size metadata.
  - `history` (array): Completed requests. Mirrors the active shape and includes optional `status`, `duration`, and serialised `error` information.

All properties are serialised with `JSON.stringify`. Circular references are replaced with the string `"[Circular]"` to avoid serialization failures.
