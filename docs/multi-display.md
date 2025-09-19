# Multi-display Support

The desktop UI now exposes a virtual multi-display model so windows can target a
specific monitor and stay on-screen when geometry changes. Browsers cannot
enumerate real monitors, so the implementation simulates a *primary* and
*secondary* display with widths derived from the current viewport and device
pixel ratio.

## Display manager

`modules/displayManager.ts` provides a singleton that tracks the available
monitors, the active display, and helper methods for positioning windows.

- Each `DisplayInfo` entry exposes bounds, a label, `isPrimary`, and the scale
  factor.
- `clampPosition` and `clampWindowMap` coerce window coordinates back inside the
  active display using a 48 px safety margin to avoid clipping window chrome.
- `getCascadePosition` produces staggered offsets so new windows fan out instead
  of stacking.
- Consumers can subscribe to display updates (resize, active-display changes, or
  virtual layouts set during tests) to recalculate positions.

## Desktop behaviour

`components/screen/desktop.js` now receives the active display id from the
settings context. Whenever the active monitor or viewport changes, the desktop:

1. Clamps stored window coordinates with `displayManager.clampPosition`.
2. Applies cascaded defaults for newly opened apps on the selected display.
3. Persists the realigned coordinates so sessions never reopen off-screen.

Tests in `__tests__/desktopDisplayBounds.test.ts` verify that shrinking the
active display or switching to another monitor always keeps window origins
within the display bounds.

## Settings UI

The Settings app includes a **Display** tab that lists the simulated monitors.
Users can pick the active display, view its resolution and scale factor, and
read a brief note explaining the clamping behaviour. The selection is stored in
localStorage (`active-display`) and restored on boot.

## Assumptions and limitations

- The browser sandbox only exposes the current viewport, so secondary displays
  are virtual (scaled versions of the primary display).
- Coordinates are relative to the viewport origin; switching to a secondary
  display does not move the DOM outside the current tab.
- The safety margin trades a small inset for the guarantee that window title
  bars remain accessible even on very small displays.

This model is meant for the portfolio simulation and does not interact with real
multi-monitor hardware.
