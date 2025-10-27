export type SnapType =
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface SnapRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  type: SnapType;
  rect: SnapRect;
}

export function computeSnapZone(
  point: { x: number; y: number },
  viewportWidth: number,
  viewportHeight: number,
  threshold = 32,
): SnapResult | null {
  if (viewportWidth <= 0 || viewportHeight <= 0) {
    return null;
  }

  const nearLeft = point.x <= threshold;
  const nearRight = point.x >= viewportWidth - threshold;
  const nearTop = point.y <= threshold;
  const nearBottom = point.y >= viewportHeight - threshold;

  const halfWidth = viewportWidth / 2;
  const halfHeight = viewportHeight / 2;

  if (nearTop && !nearLeft && !nearRight) {
    return {
      type: 'top',
      rect: { x: 0, y: 0, width: viewportWidth, height: viewportHeight },
    };
  }

  if (nearLeft && nearTop) {
    return {
      type: 'top-left',
      rect: { x: 0, y: 0, width: halfWidth, height: halfHeight },
    };
  }

  if (nearRight && nearTop) {
    return {
      type: 'top-right',
      rect: { x: halfWidth, y: 0, width: halfWidth, height: halfHeight },
    };
  }

  if (nearLeft && nearBottom) {
    return {
      type: 'bottom-left',
      rect: { x: 0, y: halfHeight, width: halfWidth, height: halfHeight },
    };
  }

  if (nearRight && nearBottom) {
    return {
      type: 'bottom-right',
      rect: { x: halfWidth, y: halfHeight, width: halfWidth, height: halfHeight },
    };
  }

  if (nearLeft) {
    return {
      type: 'left',
      rect: { x: 0, y: 0, width: halfWidth, height: viewportHeight },
    };
  }

  if (nearRight) {
    return {
      type: 'right',
      rect: { x: halfWidth, y: 0, width: halfWidth, height: viewportHeight },
    };
  }

  if (nearBottom) {
    return {
      type: 'bottom',
      rect: { x: 0, y: halfHeight, width: viewportWidth, height: halfHeight },
    };
  }

  return null;
}

export function isFullViewportRect(rect: SnapRect, viewportWidth: number, viewportHeight: number) {
  return (
    Math.round(rect.width) >= Math.round(viewportWidth) &&
    Math.round(rect.height) >= Math.round(viewportHeight) &&
    rect.x === 0 &&
    rect.y === 0
  );
}
