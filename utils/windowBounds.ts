const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const getViewportSize = (
  key: 'innerWidth' | 'innerHeight',
  explicit?: number,
): number | undefined => {
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }
  if (typeof window !== 'undefined') {
    const value = window[key];
    if (typeof value === 'number') {
      return value;
    }
  }
  return undefined;
};

const sanitizeLength = (value?: number) =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : 0;

export interface WindowPositionLike {
  x?: number | null;
  y?: number | null;
}

export interface ClampWindowOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  windowWidth?: number;
  windowHeight?: number;
}

export interface ClampWindowResult {
  x: number;
  y: number;
  recentered: boolean;
}

/**
 * Clamp window coordinates to the current viewport. Defaults invalid positions to the
 * viewport center so windows remain visible after layout changes.
 */
export const clampWindowPosition = (
  position: WindowPositionLike,
  options: ClampWindowOptions = {},
): ClampWindowResult => {
  const viewportWidth = getViewportSize('innerWidth', options.viewportWidth);
  const viewportHeight = getViewportSize('innerHeight', options.viewportHeight);
  const windowWidth = sanitizeLength(options.windowWidth);
  const windowHeight = sanitizeLength(options.windowHeight);

  const hasViewport =
    typeof viewportWidth === 'number' && typeof viewportHeight === 'number';

  const maxX = hasViewport ? Math.max(viewportWidth - windowWidth, 0) : undefined;
  const maxY = hasViewport ? Math.max(viewportHeight - windowHeight, 0) : undefined;

  const centerX = hasViewport
    ? Math.round(Math.max((viewportWidth - windowWidth) / 2, 0))
    : 0;
  const centerY = hasViewport
    ? Math.round(Math.max((viewportHeight - windowHeight) / 2, 0))
    : 0;

  const xValid =
    isFiniteNumber(position.x) &&
    (typeof maxX !== 'number' || (position.x >= 0 && position.x <= maxX));
  const yValid =
    isFiniteNumber(position.y) &&
    (typeof maxY !== 'number' || (position.y >= 0 && position.y <= maxY));

  if (xValid && yValid) {
    return { x: position.x!, y: position.y!, recentered: false };
  }

  if (hasViewport) {
    return { x: centerX, y: centerY, recentered: true };
  }

  const fallbackX = xValid ? position.x! : 0;
  const fallbackY = yValid ? position.y! : 0;
  const recentered = fallbackX !== position.x || fallbackY !== position.y;

  return { x: fallbackX, y: fallbackY, recentered };
};
