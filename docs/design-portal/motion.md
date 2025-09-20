# Motion guidelines

The design portal tracks motion heuristics for interactive telemetry panels like the resource monitor.

## Chart animation

- Charts update once per second. Interpolate values in JavaScript rather than CSS transitions to honour the app's reduced-motion setting.
- When `prefers-reduced-motion` is enabled, freeze the trend lines and only update the textual counters. Tooltips still surface the latest values so nothing is lost for screen-reader users.

## Stress-mode overlays

- The floating stress-test windows should never occlude the charts for longer than a single frame. If the effect is enabled, keep their alpha below 30% and pause them when `prefers-reduced-motion` is detected.
- Announce the mode change via the existing FPS label (e.g. "Stress mode on") so screen readers can catch the transition without relying on visuals.

## Tooltip behaviour

- Tooltips fade in/out over 150ms. That duration gives enough affordance while avoiding vestibular issues.
- Each tooltip is tied to a focusable wrapper. Keyboard focus must trigger the same animation as hover.
