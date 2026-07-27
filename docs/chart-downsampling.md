# Chart downsampling utilities

The chart-heavy windows in the desktop UI now expose a shared LTTB (Largest Triangle Three Buckets) helper for aggressive datasets.
Use the functions under `utils/charts` to keep render times predictable and payloads light.

## When to downsample

* The adapters default to a **2 points-per-pixel ceiling**. Once the dataset exceeds that density at the rendered width, we trim the
  payload before it reaches the charting library.
* The implementation keeps the first and last samples, and chooses intermediate points that preserve large swings in the original
  signal. The max deviation stays under ~2 px at desktop breakpoints when paired with the default width heuristics.
* Downsampling is skipped for small payloads (`< 400` points by default) or when the consumer supplies an explicit `targetPoints`.

## How to use in components

```ts
import { formatForChartJs, formatForRecharts, formatForECharts } from '@/utils/charts/format';

const points = measurements.map((sample) => ({
  x: sample.timestamp,
  y: sample.value,
  meta: sample.meta,
}));

const width = containerRef.current?.offsetWidth ?? 0;

const chartJsData = formatForChartJs(points, width);
const rechartsSeries = formatForRecharts(points, width, { maxPointsPerPixel: 1.5 });
const echartsDataset = formatForECharts(points, width);
```

* **Chart.js** and **Recharts** accept the original object shape back. You can safely include metadata for tooltips—generics ensure it
  survives the sampling call.
* **ECharts** expects `[x, y]` tuples. `formatForECharts` handles the conversion and keeps the types aligned with the input `x`/`y`
  fields.

## Type expectations

`utils/charts/lttb.ts` defines `LTTBPoint` as any object with an `x` (number, date, or numeric string) and `y` (number). Additional
keys are preserved and can include tooltip payloads or series IDs.

If you maintain custom point types, narrow them by extending `LTTBPoint`:

```ts
interface CpuSample extends LTTBPoint {
  process: string;
  color: string;
}

const reduced = maybeDownsampleSeries<CpuSample>(samples, widthPx);
```

This ensures the adapters respect your typing while still using the shared downsampling core.
