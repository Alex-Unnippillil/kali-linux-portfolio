import { downsampleLTTB, LTTBPoint } from './lttb';

const DEFAULT_MAX_POINTS_PER_PIXEL = 2;
const DEFAULT_MIN_POINTS = 400;

export interface DownsampleDensityOptions {
  /** Maximum number of points allowed per horizontal pixel before downsampling triggers. */
  maxPointsPerPixel: number;
  /** Minimum dataset size required before downsampling occurs. */
  minPoints: number;
  /** Optional override for the target point count post-downsampling. */
  targetPoints?: number;
}

const withDefaults = (
  options?: Partial<DownsampleDensityOptions>,
): DownsampleDensityOptions => ({
  maxPointsPerPixel: options?.maxPointsPerPixel ?? DEFAULT_MAX_POINTS_PER_PIXEL,
  minPoints: options?.minPoints ?? DEFAULT_MIN_POINTS,
  targetPoints: options?.targetPoints,
});

const shouldDownsample = (
  totalPoints: number,
  widthPx: number,
  options: DownsampleDensityOptions,
): boolean => {
  if (widthPx <= 0 || totalPoints < options.minPoints) {
    return false;
  }

  return totalPoints / widthPx > options.maxPointsPerPixel;
};

const resolveTarget = (
  totalPoints: number,
  widthPx: number,
  options: DownsampleDensityOptions,
): number => {
  if (options.targetPoints && options.targetPoints >= 3) {
    return Math.min(options.targetPoints, totalPoints);
  }

  const calculated = Math.max(
    Math.round(widthPx * options.maxPointsPerPixel),
    options.minPoints,
  );

  return Math.min(Math.max(calculated, 3), totalPoints);
};

/**
 * Shared entry point for LTTB downsampling across chart adapters.
 */
export const maybeDownsampleSeries = <T extends LTTBPoint>(
  points: readonly T[],
  widthPx: number,
  options?: Partial<DownsampleDensityOptions>,
): T[] => {
  const config = withDefaults(options);

  if (!shouldDownsample(points.length, widthPx, config)) {
    return points.slice();
  }

  const target = resolveTarget(points.length, widthPx, config);
  return downsampleLTTB(points, target);
};

export type ChartJsPoint<T extends LTTBPoint = LTTBPoint> = T;

/**
 * Prepare data for Chart.js datasets. Returns the same structure when no downsampling is required.
 */
export const formatForChartJs = <T extends ChartJsPoint>(
  points: readonly T[],
  widthPx: number,
  options?: Partial<DownsampleDensityOptions>,
): T[] => maybeDownsampleSeries(points, widthPx, options);

export interface RechartsPoint extends LTTBPoint {
  /** Optional key used by composed charts (e.g. for tooltips). */
  name?: string;
}

/**
 * Prepare data for Recharts by applying LTTB sampling when density exceeds the defined threshold.
 */
export const formatForRecharts = <T extends RechartsPoint>(
  points: readonly T[],
  widthPx: number,
  options?: Partial<DownsampleDensityOptions>,
): T[] => maybeDownsampleSeries(points, widthPx, options);

export type EChartsTuple<T extends LTTBPoint = LTTBPoint> = [T['x'], T['y']];

/**
 * Convert point objects into ECharts-compatible tuples, applying downsampling first when necessary.
 */
export const formatForECharts = <T extends LTTBPoint>(
  points: readonly T[],
  widthPx: number,
  options?: Partial<DownsampleDensityOptions>,
): EChartsTuple<T>[] =>
  maybeDownsampleSeries(points, widthPx, options).map((point) => [point.x as T['x'], point.y as T['y']]);
