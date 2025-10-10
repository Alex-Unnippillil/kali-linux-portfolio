import { NAVBAR_HEIGHT, SNAP_BOTTOM_INSET } from './uiConstants';

const NAVBAR_SELECTOR = '.main-navbar-vp';
const NAVBAR_VERTICAL_PADDING = 16; // 0.5rem top + 0.5rem bottom
const DEFAULT_NAVBAR_HEIGHT = NAVBAR_HEIGHT + NAVBAR_VERTICAL_PADDING;
const WINDOW_TOP_MARGIN = 8;
const SAFE_AREA_PROPERTIES = {
  top: '--safe-area-top',
  right: '--safe-area-right',
  bottom: '--safe-area-bottom',
  left: '--safe-area-left',
};

const parseSafeAreaValue = (value) => {
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = parseFloat(trimmed);
  return Number.isFinite(parsed) ? parsed : 0;
};

const readSafeAreaInset = (computed, property) => {
  if (!computed || typeof computed.getPropertyValue !== 'function') return 0;
  return parseSafeAreaValue(computed.getPropertyValue(property));
};

export const getSafeAreaInsets = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const computed = window.getComputedStyle(document.documentElement);
  return {
    top: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.top),
    right: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.right),
    bottom: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.bottom),
    left: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.left),
  };
};

export const measureSafeAreaInset = (side) => {
  const insets = getSafeAreaInsets();
  if (!insets || typeof insets !== 'object') return 0;
  const value = insets[side];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

export const DEFAULT_WINDOW_TOP_OFFSET = DEFAULT_NAVBAR_HEIGHT + WINDOW_TOP_MARGIN;

export const measureWindowTopOffset = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_WINDOW_TOP_OFFSET;
  }

  const navbar = document.querySelector(NAVBAR_SELECTOR);
  if (!navbar) {
    return DEFAULT_WINDOW_TOP_OFFSET;
  }

  const { height } = navbar.getBoundingClientRect();
  const measured = Number.isFinite(height) ? Math.ceil(height) : DEFAULT_NAVBAR_HEIGHT;
  return Math.max(measured + WINDOW_TOP_MARGIN, DEFAULT_WINDOW_TOP_OFFSET);
};

export const clampWindowTopPosition = (value, topOffset) => {
  const safeOffset = typeof topOffset === 'number' ? topOffset : measureWindowTopOffset();
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return safeOffset;
  }
  return Math.max(value, safeOffset);
};

const clampNumber = (value, min, max) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const coerceNonNegative = (value, fallback = 0) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return fallback;
  return value < 0 ? 0 : value;
};

export const computeTiledLayout = (count, options = {}) => {
  const total = typeof count === 'number' && Number.isFinite(count) ? Math.floor(count) : 0;
  if (total <= 0) return [];

  const viewportWidth = getViewportDimension(options.viewportWidth, 'innerWidth');
  const viewportHeight = getViewportDimension(options.viewportHeight, 'innerHeight');
  if (!viewportWidth || !viewportHeight) return [];

  const topOffset = typeof options.topOffset === 'number'
    ? options.topOffset
    : measureWindowTopOffset();
  const bottomInset = typeof options.bottomInset === 'number'
    ? coerceNonNegative(options.bottomInset)
    : Math.max(0, measureSafeAreaInset('bottom'));
  const horizontalGap = typeof options.horizontalGap === 'number'
    ? coerceNonNegative(options.horizontalGap, 0)
    : 24;
  const verticalGap = typeof options.verticalGap === 'number'
    ? coerceNonNegative(options.verticalGap, 0)
    : 24;

  const columns = Math.max(1, Math.ceil(Math.sqrt(total)));
  const rows = Math.max(1, Math.ceil(total / columns));

  const gapColumns = Math.max(columns + 1, 2);
  const gapRows = Math.max(rows + 1, 2);

  const availableWidth = viewportWidth - horizontalGap * gapColumns;
  const fallbackColumnWidth = viewportWidth / columns;
  const baseColumnWidth = availableWidth / columns;
  const columnWidth = Number.isFinite(baseColumnWidth) && baseColumnWidth > 0
    ? baseColumnWidth
    : fallbackColumnWidth;

  const availableHeight = viewportHeight - topOffset - bottomInset - verticalGap * gapRows;
  const fallbackRowHeight = (viewportHeight - topOffset - bottomInset) / rows;
  const baseRowHeight = availableHeight / rows;
  const rowHeight = Number.isFinite(baseRowHeight) && baseRowHeight > 0
    ? baseRowHeight
    : fallbackRowHeight;

  const widthPercent = viewportWidth > 0
    ? clampNumber((columnWidth / viewportWidth) * 100, 10, 100)
    : 100 / columns;
  const heightPercent = viewportHeight > 0
    ? clampNumber((rowHeight / viewportHeight) * 100, 10, 100)
    : 100 / rows;

  const layouts = [];
  for (let index = 0; index < total; index += 1) {
    const row = Math.floor(index / columns);
    const column = index % columns;
    const rawX = horizontalGap + column * (columnWidth + horizontalGap);
    const maxX = Math.max(0, viewportWidth - columnWidth);
    const x = Math.round(Math.min(Math.max(rawX, 0), maxX));

    const rawY = topOffset + verticalGap + row * (rowHeight + verticalGap);
    const maxY = Math.max(topOffset, viewportHeight - rowHeight - bottomInset);
    const y = clampWindowTopPosition(Math.round(Math.min(rawY, maxY)), topOffset);

    layouts.push({
      x,
      y,
      widthPercent,
      heightPercent,
      row,
      column,
    });
  }

  return layouts;
};

const parseDimension = (value) => {
  if (typeof value !== 'number') return 0;
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
};

const getViewportDimension = (dimension, fallback) => {
  if (typeof dimension === 'number' && Number.isFinite(dimension)) {
    return dimension;
  }
  if (typeof window !== 'undefined' && typeof window[fallback] === 'number') {
    return window[fallback];
  }
  return 0;
};

const parsePositionCoordinate = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return fallback;
};

export const clampWindowPositionWithinViewport = (
  position,
  dimensions,
  options = {},
) => {
  if (!position || typeof position !== 'object') {
    return null;
  }

  const viewportWidth = getViewportDimension(options.viewportWidth, 'innerWidth');
  const viewportHeight = getViewportDimension(options.viewportHeight, 'innerHeight');
  const topOffset = typeof options.topOffset === 'number'
    ? options.topOffset
    : measureWindowTopOffset();
  const bottomInset = typeof options.bottomInset === 'number'
    ? Math.max(options.bottomInset, 0)
    : Math.max(0, measureSafeAreaInset('bottom'));

  if (!viewportWidth || !viewportHeight) {
    return {
      x: parsePositionCoordinate(position.x, 0),
      y: clampWindowTopPosition(position.y, topOffset),
      bounds: {
        minX: 0,
        maxX: 0,
        minY: topOffset,
        maxY: topOffset,
      },
    };
  }

  const width = dimensions && typeof dimensions === 'object'
    ? parseDimension(dimensions.width)
    : 0;
  const height = dimensions && typeof dimensions === 'object'
    ? parseDimension(dimensions.height)
    : 0;

  const horizontalSpace = Math.max(viewportWidth - width, 0);
  const availableVertical = Math.max(viewportHeight - topOffset - SNAP_BOTTOM_INSET - bottomInset, 0);
  const verticalSpace = Math.max(availableVertical - height, 0);

  const minX = 0;
  const maxX = horizontalSpace;
  const minY = topOffset;
  const maxY = topOffset + verticalSpace;

  const nextX = Math.min(Math.max(parsePositionCoordinate(position.x, 0), minX), maxX);
  const nextY = Math.min(
    Math.max(clampWindowTopPosition(position.y, topOffset), minY),
    maxY,
  );

  return {
    x: nextX,
    y: nextY,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
    },
  };
};
