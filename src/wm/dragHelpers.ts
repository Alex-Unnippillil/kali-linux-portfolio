export const EDGE_RESISTANCE_THRESHOLD = 12;
const DEFAULT_MIN_RESISTANCE_FACTOR = 0.35;
const MAX_DENSITY = 4;
const DENSITY_BOOST_STEP = 0.08;
const MAX_DENSITY_BOOST = 0.2;
const MAX_MIN_FACTOR = 0.85;

export interface DragResistanceOptions {
  threshold?: number;
  minFactor?: number;
  devicePixelRatio?: number;
  bypass?: boolean;
}

export interface DragBounds {
  minX?: number;
  maxX: number;
  minY?: number;
  maxY: number;
}

export interface DragPosition {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const isFiniteNumber = (value: number | undefined | null): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const resolveDensity = (devicePixelRatio?: number) => {
  if (isFiniteNumber(devicePixelRatio) && devicePixelRatio > 0) {
    return clamp(devicePixelRatio, 1, MAX_DENSITY);
  }
  if (typeof window !== 'undefined') {
    const dpr = window.devicePixelRatio;
    if (isFiniteNumber(dpr) && dpr > 0) {
      return clamp(dpr, 1, MAX_DENSITY);
    }
  }
  return 1;
};

const computeMinFactor = (base: number, density: number) => {
  const safeBase = clamp(base, 0, 1);
  const boost = Math.min((density - 1) * DENSITY_BOOST_STEP, MAX_DENSITY_BOOST);
  return Math.min(safeBase + boost, MAX_MIN_FACTOR);
};

const computeResistance = (distance: number, threshold: number, minFactor: number) => {
  if (threshold <= 0) return 1;
  const progress = clamp(distance / threshold, 0, 1);
  return minFactor + (1 - minFactor) * progress;
};

export const applyAxisResistance = (
  position: number,
  min: number,
  max: number,
  options: DragResistanceOptions = {}
): number => {
  if (max <= min) {
    return min;
  }

  const clamped = clamp(position, min, max);

  if (options.bypass) {
    return clamped;
  }

  const threshold = Math.max(options.threshold ?? EDGE_RESISTANCE_THRESHOLD, 0);
  if (threshold === 0) {
    return clamped;
  }

  const density = resolveDensity(options.devicePixelRatio);
  const minFactor = computeMinFactor(options.minFactor ?? DEFAULT_MIN_RESISTANCE_FACTOR, density);

  const distanceToMin = clamped - min;
  const distanceToMax = max - clamped;
  const withinMin = distanceToMin <= threshold;
  const withinMax = distanceToMax <= threshold;

  if (withinMin && (!withinMax || distanceToMin <= distanceToMax)) {
    const factor = computeResistance(distanceToMin, threshold, minFactor);
    return min + distanceToMin * factor;
  }

  if (withinMax) {
    const factor = computeResistance(distanceToMax, threshold, minFactor);
    return max - distanceToMax * factor;
  }

  return clamped;
};

export const applyDragResistance = (
  position: DragPosition,
  bounds: DragBounds,
  options: DragResistanceOptions = {}
): DragPosition => {
  const minX = isFiniteNumber(bounds.minX) ? bounds.minX : 0;
  const minY = isFiniteNumber(bounds.minY) ? bounds.minY : 0;
  const maxX = isFiniteNumber(bounds.maxX) ? bounds.maxX : minX;
  const maxY = isFiniteNumber(bounds.maxY) ? bounds.maxY : minY;

  return {
    x: applyAxisResistance(position.x, minX, maxX, options),
    y: applyAxisResistance(position.y, minY, maxY, options),
  };
};
