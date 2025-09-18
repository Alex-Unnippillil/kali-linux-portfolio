# Resource monitor manual design tests

These checks validate that the resource monitor charts remain distinguishable when colour is removed.

## 1. Pattern contrast in monochrome

1. Open the Resource Monitor app and let the charts gather at least 30 seconds of samples.
2. Open the browser print dialog (or use a built-in "Save to PDF" option).
3. Switch the preview to black-and-white / grayscale mode.
4. Confirm each series has a unique texture:
   - CPU: forward diagonal stripes.
   - Memory: dotted grid.
   - Disk: cross-hatch pattern.
   - Network: horizontal bands.
5. Ensure the textures stay visible when the preview zoom is set to 80% and 200%.

## 2. Tooltip legibility

1. Return to the live view and focus each chart card (use <kbd>Tab</kbd> or hover).
2. Confirm the tooltip lists the latest, min, max, and average values along with the texture description.
3. With a screen reader running, focus each chart and verify the description announces the texture and most recent value.

## 3. Stress mode regression check

1. Enable the stress test and confirm the animated windows do not obscure the tooltip or charts.
2. Toggle stress mode off and verify the charts continue to update with textured fills.
