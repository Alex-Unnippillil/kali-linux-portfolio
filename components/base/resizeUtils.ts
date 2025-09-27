export type ResizeHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export interface ResizeHitSlopConfig {
  /**
   * Maximum distance (px) from any edge that should trigger resizing.
   * The same tolerance applies inside and just outside the window frame.
   */
  edge: number;
  /**
   * Maximum distance (px) from a corner before snapping to the diagonal
   * resize cursor. Should generally be greater than or equal to `edge`.
   */
  corner: number;
}

export interface PointLike {
  x: number;
  y: number;
}

const clamp = (value: number, min: number, max: number) => {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
};

const isWithinBand = (value: number, min: number, max: number, tolerance: number) => {
  return value >= min - tolerance && value <= max + tolerance;
};

/**
 * Returns the resize handle that should activate for a pointer located near the window frame.
 */
export const getResizeHandle = (
  rect: DOMRect,
  point: PointLike,
  config: ResizeHitSlopConfig
): ResizeHandle | null => {
  const edgeTolerance = Math.max(0, config.edge);
  const cornerTolerance = Math.max(edgeTolerance, config.corner);

  const { left, right, top, bottom } = rect;

  if (!isWithinBand(point.x, left, right, edgeTolerance) || !isWithinBand(point.y, top, bottom, edgeTolerance)) {
    return null;
  }

  const distanceLeft = Math.abs(point.x - left);
  const distanceRight = Math.abs(right - point.x);
  const distanceTop = Math.abs(point.y - top);
  const distanceBottom = Math.abs(bottom - point.y);

  const isWest = distanceLeft <= edgeTolerance;
  const isEast = distanceRight <= edgeTolerance;
  const isNorth = distanceTop <= edgeTolerance;
  const isSouth = distanceBottom <= edgeTolerance;

  if (isNorth && isWest && distanceLeft <= cornerTolerance && distanceTop <= cornerTolerance) {
    return 'nw';
  }
  if (isNorth && isEast && distanceRight <= cornerTolerance && distanceTop <= cornerTolerance) {
    return 'ne';
  }
  if (isSouth && isWest && distanceLeft <= cornerTolerance && distanceBottom <= cornerTolerance) {
    return 'sw';
  }
  if (isSouth && isEast && distanceRight <= cornerTolerance && distanceBottom <= cornerTolerance) {
    return 'se';
  }

  if (isNorth) {
    return 'n';
  }
  if (isSouth) {
    return 's';
  }
  if (isWest) {
    return 'w';
  }
  if (isEast) {
    return 'e';
  }

  return null;
};

export const cursorForHandle = (handle: ResizeHandle | null): string | null => {
  switch (handle) {
    case 'n':
    case 's':
      return 'ns-resize';
    case 'e':
    case 'w':
      return 'ew-resize';
    case 'ne':
    case 'sw':
      return 'nesw-resize';
    case 'nw':
    case 'se':
      return 'nwse-resize';
    default:
      return null;
  }
};

export const clampToViewport = (
  value: number,
  min: number,
  max: number
) => clamp(value, min, max);
