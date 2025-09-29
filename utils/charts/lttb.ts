export type NumericLike = number | string | Date;

export interface LTTBPoint {
  /** X-axis value. Accepts Date, string, or numeric. */
  x: NumericLike;
  /** Y-axis value used for area calculations. */
  y: number;
  /** Allow downstream chart libs to preserve metadata. */
  [key: string]: unknown;
}

const DEFAULT_THRESHOLD = 3;

const toNumeric = (value: NumericLike, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

/**
 * Downsample a sequence of points using the Largest Triangle Three Buckets algorithm.
 *
 * The first and last points are always preserved. Intermediate points are chosen by
 * maximising the area of triangles formed with the averaged bucket centre, ensuring
 * major spikes are retained even under aggressive sampling.
 */
export function downsampleLTTB<T extends LTTBPoint>(
  points: readonly T[],
  targetPoints: number,
): T[] {
  const total = points.length;

  if (targetPoints <= 0) {
    return [];
  }

  if (total <= targetPoints || total <= DEFAULT_THRESHOLD || targetPoints < DEFAULT_THRESHOLD) {
    return points.slice();
  }

  const lastIndex = total - 1;
  const sampled: T[] = [];
  sampled.push(points[0]);

  const every = (total - 2) / (targetPoints - 2);

  const numericX = new Array<number>(total);
  for (let i = 0; i < total; i += 1) {
    numericX[i] = toNumeric(points[i].x, i);
  }

  let previousIndex = 0;

  for (let bucket = 0; bucket < targetPoints - 2; bucket += 1) {
    const avgRangeStartRaw = Math.floor((bucket + 1) * every) + 1;
    const avgRangeEndRaw = Math.floor((bucket + 2) * every) + 1;

    const avgRangeStart = Math.min(Math.max(avgRangeStartRaw, 1), lastIndex);
    let avgRangeEnd = Math.min(Math.max(avgRangeEndRaw, avgRangeStart + 1), total);

    let avgX = 0;
    let avgY = 0;
    const avgCount = avgRangeEnd - avgRangeStart;

    if (avgCount <= 0) {
      avgX = numericX[Math.min(avgRangeStart, lastIndex)];
      avgY = points[Math.min(avgRangeStart, lastIndex)].y;
    } else {
      for (let idx = avgRangeStart; idx < avgRangeEnd; idx += 1) {
        avgX += numericX[idx];
        avgY += points[idx].y;
      }
      avgX /= avgCount;
      avgY /= avgCount;
    }

    const rangeStartRaw = Math.floor(bucket * every) + 1;
    const rangeEndRaw = Math.floor((bucket + 1) * every) + 1;

    const rangeStart = Math.min(Math.max(rangeStartRaw, 1), lastIndex);
    const rangeEnd = Math.min(Math.max(rangeEndRaw, rangeStart + 1), total);

    let maxArea = -1;
    let nextIndex = rangeStart;

    for (let idx = rangeStart; idx < rangeEnd; idx += 1) {
      const area = Math.abs(
        (numericX[previousIndex] - avgX) * (points[idx].y - points[previousIndex].y) -
          (numericX[previousIndex] - numericX[idx]) * (avgY - points[previousIndex].y),
      );

      if (area > maxArea) {
        maxArea = area;
        nextIndex = idx;
      }
    }

    sampled.push(points[nextIndex]);
    previousIndex = nextIndex;
  }

  sampled.push(points[lastIndex]);

  return sampled;
}
