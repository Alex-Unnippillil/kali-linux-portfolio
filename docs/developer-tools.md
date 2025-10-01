# Developer tools panel

The Developer Tools utility adds a color-vision simulator overlay for auditing contrast and iconography.

## Access
- Launch **Developer Tools** from the Utilities folder on the desktop.
- Toggle **Color simulator overlay** to enable/disable filters. The toggle uses `role="switch"` so it is operable with keyboard and assistive tech.
- Select one of the three modes (Deutan, Protan, Tritan) with the arrow keys, Home/End, Enter or Space.

## Implementation notes
- Filters are implemented with SVG color matrices injected into a hidden `<svg>` under `components/dev/ColorSimulator.tsx`.
- The provider (`ColorSimulatorProvider`) applies the filter to `document.documentElement` inside a `requestAnimationFrame` callback, capping DOM writes to one per frame and keeping overhead under ~5 ms.
- State persists via `usePersistentState` under the `devtools:color-sim:*` keys so preferred mode survives reloads.
- Disabling the overlay restores the previous filter on `<html>` to avoid interfering with other effects.
- The overlay never captures pixels or sends data over the network; it is a local developer aid only.

## Constraints
- Designed for development builds. The overlay defaults to off and is non-destructive when exported statically.
- Performance budget assumes a single filter; stacking other `filter` styles on `<html>` can increase cost. Reset or combine filters in the provider if new global filters are introduced.
- SVG filters have partial support in some legacy browsers. The toggle is defensive: if the filter fails to apply, the UI simply remains unchanged.
