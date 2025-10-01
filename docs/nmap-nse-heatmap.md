# Nmap NSE Heatmap Configuration

The heatmap surfaces simulated CVSS intensity across discovered hosts and ports. It is rendered via a hybrid WebGL/Canvas pipeline that prefers WebGL for interactive density plots and falls back to 2D drawing with `OffscreenCanvas` acceleration when available.

## Data format

The component expects points in a normalized coordinate space:

```ts
interface HeatmapPoint {
  x: number; // 0-1, horizontal position
  y: number; // 0-1, vertical position
  value: number; // 0-1, intensity used for color scale
  radius?: number; // optional hotspot radius in pixels
  label?: string; // optional text used in selection summaries
}
```

> Host and port data is projected into this space in `components/apps/nmap-nse/index.js`. Modify the projection if you introduce alternate layouts (for example, grouping by script tag instead of host).

## Customising color ramps

* Provide custom `colorStops` when rendering `<Heatmap />`. Stops are normalised between 0 and 1 and interpolated to RGBA.
* The default ramp emphasises low-intensity blues and high-intensity ambers. To align with another palette, pass an ordered array such as:

```jsx
<Heatmap
  data={points}
  colorStops={[
    { value: 0, color: '#1e293b' },
    { value: 0.5, color: '#0ea5e9' },
    { value: 1, color: '#ef4444' },
  ]}
/>
```

## Interaction model

* **Zoom** – Mouse wheel or `+`/`-` keys adjust the scale factor with focus preserved around the cursor.
* **Pan** – Drag without modifiers or use arrow keys; distance adjusts to match the user’s reduced-motion preference.
* **Brush selection** – Hold `Shift` and drag to select an area. Matching points are emitted through `onBrushSelection`.

The helper `computeBrushSelection` is exported for unit tests or higher-level analytics. Selections are accessible via an ARIA live region so screen readers announce summaries.

## Performance considerations

* The render loop batches work inside `requestAnimationFrame` and monitors frame times. If average FPS drops below 50 and the user has not requested reduced motion, the view scale automatically eases back to maintain responsiveness.
* Offscreen rendering is automatically enabled when the browser exposes `OffscreenCanvas`. For environments without it (including the static simulator), the component draws directly to the visible canvas.
* Use the exported `meetsPerformanceBudget` utility when extending the component to keep additional effects within the same 50 fps target.

## Accessibility & reduced motion

* The canvas is keyboard focusable with instructions and FPS telemetry exposed via `aria-describedby`.
* Keyboard equivalents are provided for zooming and panning.
* If the OS reports `prefers-reduced-motion`, zoom animations switch to immediate updates and auto-downscaling is disabled.

## Testing

Unit tests live in `__tests__/nmapHeatmap.test.tsx` and cover color interpolation, pointer interactions, and performance helpers. Add cases alongside these for any future interaction modes you introduce.
