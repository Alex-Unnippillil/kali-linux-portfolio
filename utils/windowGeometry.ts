export interface Viewport {
  width: number;
  height: number;
}

export interface PersistedGeometry {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface WindowDefaults {
  widthPercent: number;
  heightPercent: number;
  startX: number;
  startY: number;
}

export interface SizePercent {
  widthPercent: number;
  heightPercent: number;
  viewportWidth?: number;
  viewportHeight?: number;
}

export interface SanitizedGeometry {
  position: { x: number; y: number };
  sizePercent: SizePercent;
  sizePx: { width: number; height: number };
  shrinkApplied: boolean;
}

export interface BuildDefaultsOptions {
  widthPercent?: number;
  heightPercent?: number;
  startX?: number;
  startY?: number;
}

export const SHRINK_RATIO = 0.7;
const DESKTOP_MARGIN = 28;
const POSITION_TOLERANCE = 8;

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
};

export const buildWindowDefaults = (
  viewport: Viewport,
  options: BuildDefaultsOptions = {},
): WindowDefaults => {
  const { width, height } = viewport;
  const isPortrait = height > width;

  let widthPercent =
    typeof options.widthPercent === 'number' ? options.widthPercent : undefined;
  let heightPercent =
    typeof options.heightPercent === 'number' ? options.heightPercent : undefined;

  if (widthPercent === undefined || heightPercent === undefined) {
    if (isPortrait) {
      widthPercent = widthPercent ?? 90;
      heightPercent = heightPercent ?? 85;
    } else if (width < 640) {
      widthPercent = widthPercent ?? 85;
      heightPercent = heightPercent ?? 60;
    } else {
      widthPercent = widthPercent ?? 60;
      heightPercent = heightPercent ?? 85;
    }
  }

  const startX =
    typeof options.startX === 'number'
      ? options.startX
      : isPortrait
        ? Math.round(width * 0.05)
        : 60;
  const startY = typeof options.startY === 'number' ? options.startY : 10;

  return {
    widthPercent,
    heightPercent,
    startX,
    startY,
  };
};

export const sanitizeGeometry = (
  persisted: PersistedGeometry | undefined,
  viewport: Viewport,
  defaults: WindowDefaults,
): SanitizedGeometry => {
  const { width, height } = viewport;

  const fallbackWidthPx =
    width > 0 ? (defaults.widthPercent / 100) * width : defaults.widthPercent;
  const fallbackHeightPx =
    height > 0 ? (defaults.heightPercent / 100) * height : defaults.heightPercent;

  const storedWidth =
    typeof persisted?.width === 'number' && persisted.width > 0
      ? persisted.width
      : fallbackWidthPx;
  const storedHeight =
    typeof persisted?.height === 'number' && persisted.height > 0
      ? persisted.height
      : fallbackHeightPx;

  const storedViewportWidth =
    typeof persisted?.viewportWidth === 'number' && persisted.viewportWidth > 0
      ? persisted.viewportWidth
      : width;
  const storedViewportHeight =
    typeof persisted?.viewportHeight === 'number' && persisted.viewportHeight > 0
      ? persisted.viewportHeight
      : height;

  const viewportShrank =
    (width > 0 && storedViewportWidth > width) ||
    (height > 0 && storedViewportHeight > height);

  const availableHeight = Math.max(0, height - DESKTOP_MARGIN);
  let widthPx = storedWidth;
  let heightPx = storedHeight;

  const exceedsWidth = width > 0 && widthPx > width + POSITION_TOLERANCE;
  const exceedsHeight =
    height > 0 && heightPx > availableHeight + POSITION_TOLERANCE;

  const needsShrink = viewportShrank || exceedsWidth || exceedsHeight;

  const fallbackX =
    typeof defaults.startX === 'number' ? defaults.startX : 60;
  const fallbackY =
    typeof defaults.startY === 'number' ? defaults.startY : 10;

  let x =
    typeof persisted?.x === 'number' && Number.isFinite(persisted.x)
      ? persisted.x
      : fallbackX;
  let y =
    typeof persisted?.y === 'number' && Number.isFinite(persisted.y)
      ? persisted.y
      : fallbackY;

  if (needsShrink && width > 0 && height > 0) {
    widthPx = Math.max(0, width * SHRINK_RATIO);
    const shrinkHeight = Math.max(0, height * SHRINK_RATIO);
    if (availableHeight > 0) {
      heightPx = Math.min(shrinkHeight, availableHeight);
    } else {
      heightPx = shrinkHeight;
    }
    const maxX = Math.max(0, width - widthPx);
    const maxY = Math.max(0, height - heightPx - DESKTOP_MARGIN);
    const centerX = (width - widthPx) / 2;
    const centerY = (height - heightPx) / 2;
    x = clamp(centerX, 0, maxX);
    y = clamp(centerY, 0, maxY);
  } else {
    const maxX = Math.max(0, width - widthPx);
    const maxY = Math.max(0, height - heightPx - DESKTOP_MARGIN);
    x = clamp(x, 0, maxX);
    y = clamp(y, 0, maxY);
  }

  const widthPercent =
    width > 0 ? (widthPx / width) * 100 : defaults.widthPercent;
  const heightPercent =
    height > 0 ? (heightPx / height) * 100 : defaults.heightPercent;

  const sanitizedWidth = clamp(widthPercent, 5, 110);
  const sanitizedHeight = clamp(heightPercent, 5, 110);

  return {
    position: { x: Math.round(x), y: Math.round(y) },
    sizePercent: {
      widthPercent: sanitizedWidth,
      heightPercent: sanitizedHeight,
      viewportWidth: width,
      viewportHeight: height,
    },
    sizePx: { width: widthPx, height: heightPx },
    shrinkApplied: needsShrink,
  };
};

