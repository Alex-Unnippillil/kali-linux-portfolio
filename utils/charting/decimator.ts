import type {
  ChartDecimatorOptions,
  ChartPoint,
  ChartPointInput,
  PathProjectPoint,
  PathProjectResult,
} from '../../types/chart-decimator';

export function normalizePoints(points: ReadonlyArray<ChartPointInput>): ChartPoint[] {
  const length = points.length;
  const normalized: ChartPoint[] = new Array(length);

  for (let i = 0; i < length; i += 1) {
    const point = points[i];
    const sourceIndex =
      typeof point.sourceIndex === 'number' && Number.isFinite(point.sourceIndex)
        ? point.sourceIndex
        : i;
    normalized[i] = {
      x: Number(point.x),
      y: Number(point.y),
      sourceIndex,
    };
  }

  return normalized;
}

export function lttbDecimate(points: ReadonlyArray<ChartPoint>, threshold: number): ChartPoint[] {
  const length = points.length;

  if (threshold <= 0 || threshold >= length || length === 0) {
    return points.slice();
  }

  const bucketSize = (length - 2) / (threshold - 2);
  const sampled: ChartPoint[] = new Array(threshold);
  let a = 0;

  sampled[0] = points[0];

  for (let i = 0; i < threshold - 2; i += 1) {
    const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
    let avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
    avgRangeEnd = avgRangeEnd < length ? avgRangeEnd : length;

    let avgX = 0;
    let avgY = 0;
    const avgRangeLength = avgRangeEnd - avgRangeStart;

    if (avgRangeLength > 0) {
      for (let j = avgRangeStart; j < avgRangeEnd; j += 1) {
        const point = points[j];
        avgX += point.x;
        avgY += point.y;
      }
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
    } else {
      const fallbackIndex = Math.min(avgRangeStart, length - 1);
      avgX = points[fallbackIndex].x;
      avgY = points[fallbackIndex].y;
    }

    const rangeOffs = Math.floor(i * bucketSize) + 1;
    let rangeTo = Math.floor((i + 1) * bucketSize) + 1;
    rangeTo = rangeTo < length ? rangeTo : length - 1;

    let maxArea = -1;
    let nextA = rangeOffs;

    for (let j = rangeOffs; j < rangeTo; j += 1) {
      const point = points[j];
      const area = Math.abs(
        (points[a].x - avgX) * (point.y - points[a].y) -
          (points[a].x - point.x) * (avgY - points[a].y)
      );
      if (area > maxArea) {
        maxArea = area;
        nextA = j;
      }
    }

    sampled[i + 1] = points[nextA];
    a = nextA;
  }

  sampled[threshold - 1] = points[length - 1];

  return sampled;
}

export function strideDecimate(points: ReadonlyArray<ChartPoint>, threshold: number): ChartPoint[] {
  const length = points.length;

  if (threshold <= 0 || threshold >= length || length === 0) {
    return points.slice();
  }

  const stride = (length - 1) / (threshold - 1);
  const sampled: ChartPoint[] = new Array(threshold);

  sampled[0] = points[0];
  for (let i = 1; i < threshold - 1; i += 1) {
    const index = Math.round(i * stride);
    sampled[i] = points[index];
  }
  sampled[threshold - 1] = points[length - 1];

  return sampled;
}

export function decimatePoints(
  points: ReadonlyArray<ChartPoint>,
  options: ChartDecimatorOptions
): ChartPoint[] {
  const { threshold, strategy = 'lttb' } = options;

  if (!threshold || threshold <= 0 || points.length <= threshold) {
    return points.slice();
  }

  return strategy === 'stride'
    ? strideDecimate(points, threshold)
    : lttbDecimate(points, threshold);
}

export function buildSvgPath(
  points: ReadonlyArray<ChartPoint>,
  options: { width: number; height: number; xDomain?: [number, number]; yDomain?: [number, number]; clamp?: boolean }
): PathProjectResult {
  const { width, height, xDomain, yDomain, clamp = true } = options;
  const length = points.length;

  if (length === 0) {
    return { d: '', projected: [], xDomain: xDomain ?? [0, 1], yDomain: yDomain ?? [0, 1] };
  }

  let minX = xDomain ? xDomain[0] : points[0].x;
  let maxX = xDomain ? xDomain[1] : points[0].x;
  let minY = yDomain ? yDomain[0] : points[0].y;
  let maxY = yDomain ? yDomain[1] : points[0].y;

  if (!xDomain || !yDomain) {
    for (let i = 0; i < length; i += 1) {
      const point = points[i];
      if (!xDomain) {
        if (point.x < minX) minX = point.x;
        if (point.x > maxX) maxX = point.x;
      }
      if (!yDomain) {
        if (point.y < minY) minY = point.y;
        if (point.y > maxY) maxY = point.y;
      }
    }
  }

  if (maxX === minX) {
    maxX = minX + 1;
  }
  if (maxY === minY) {
    maxY = minY + 1;
  }

  const xSpan = maxX - minX;
  const ySpan = maxY - minY;
  const projected: PathProjectPoint[] = new Array(length);
  const segments: string[] = new Array(length);

  for (let i = 0; i < length; i += 1) {
    const point = points[i];
    const clampedY = clamp ? Math.min(Math.max(point.y, minY), maxY) : point.y;
    const xRatio = (point.x - minX) / xSpan;
    const yRatio = (clampedY - minY) / ySpan;
    const x = Number((xRatio * width).toFixed(2));
    const y = Number(((1 - yRatio) * height).toFixed(2));
    projected[i] = {
      x,
      y,
      sourceIndex: point.sourceIndex,
      original: point,
    };
    segments[i] = `${i === 0 ? 'M' : 'L'}${x} ${y}`;
  }

  return {
    d: segments.join(' '),
    projected,
    xDomain: [minX, maxX],
    yDomain: [minY, maxY],
  };
}
