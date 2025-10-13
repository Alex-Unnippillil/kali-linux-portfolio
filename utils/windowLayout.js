import {
  NAVBAR_HEIGHT,
  NAVBAR_VERTICAL_PADDING,
  SNAP_BOTTOM_INSET,
  WINDOW_TOP_INSET,
  WINDOW_TOP_MARGIN,
} from './uiConstants';

const NAVBAR_SELECTOR = '.main-navbar-vp';
const DEFAULT_NAVBAR_HEIGHT = NAVBAR_HEIGHT + NAVBAR_VERTICAL_PADDING;
const SAFE_AREA_PROPERTIES = {
  top: '--safe-area-top',
  right: '--safe-area-right',
  bottom: '--safe-area-bottom',
  left: '--safe-area-left',
};

const TASKBAR_HEIGHT_PROPERTY = '--shell-taskbar-height';
const DEFAULT_FONT_SIZE = 16;

export const DEFAULT_SNAP_BOTTOM_INSET = SNAP_BOTTOM_INSET;

const getVisualViewport = () => {
  if (typeof window === 'undefined') return null;
  const { visualViewport } = window;
  if (!visualViewport || typeof visualViewport !== 'object') {
    return null;
  }
  return visualViewport;
};

const parseFontSize = (value) => {
  if (typeof value !== 'string') return DEFAULT_FONT_SIZE;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : DEFAULT_FONT_SIZE;
};

const parseCssLengthValue = (value, computed) => {
  if (typeof value !== 'string') return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const numeric = parseFloat(trimmed);
  if (!Number.isFinite(numeric)) return 0;

  if (trimmed.endsWith('rem') || trimmed.endsWith('em')) {
    const baseFontSize = parseFontSize(computed?.fontSize);
    return numeric * baseFontSize;
  }

  if (
    trimmed.endsWith('vh') ||
    trimmed.endsWith('svh') ||
    trimmed.endsWith('lvh') ||
    trimmed.endsWith('dvh')
  ) {
    const viewport = getVisualViewport();
    const viewportHeight = viewport && typeof viewport.height === 'number'
      ? viewport.height
      : typeof window !== 'undefined' && typeof window.innerHeight === 'number'
        ? window.innerHeight
        : 0;
    return viewportHeight ? (numeric / 100) * viewportHeight : 0;
  }

  if (
    trimmed.endsWith('vw') ||
    trimmed.endsWith('svw') ||
    trimmed.endsWith('lvw') ||
    trimmed.endsWith('dvw')
  ) {
    const viewport = getVisualViewport();
    const viewportWidth = viewport && typeof viewport.width === 'number'
      ? viewport.width
      : typeof window !== 'undefined' && typeof window.innerWidth === 'number'
        ? window.innerWidth
        : 0;
    return viewportWidth ? (numeric / 100) * viewportWidth : 0;
  }

  return numeric;
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

export const DEFAULT_WINDOW_TOP_OFFSET =
  DEFAULT_NAVBAR_HEIGHT + WINDOW_TOP_MARGIN + WINDOW_TOP_INSET;

export const measureWindowTopOffset = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_WINDOW_TOP_OFFSET;
  }

  const navbar = document.querySelector(NAVBAR_SELECTOR);
  if (!navbar) {
    const safeAreaTop = Math.max(0, measureSafeAreaInset('top'));
    return Math.max(DEFAULT_WINDOW_TOP_OFFSET, DEFAULT_WINDOW_TOP_OFFSET + safeAreaTop);
  }

  const { height } = navbar.getBoundingClientRect();
  const measured = Number.isFinite(height) ? Math.ceil(height) : DEFAULT_NAVBAR_HEIGHT;
  const base = Math.max(
    measured + WINDOW_TOP_MARGIN + WINDOW_TOP_INSET,
    DEFAULT_WINDOW_TOP_OFFSET,
  );
  const safeAreaTop = Math.max(0, measureSafeAreaInset('top'));
  return Math.max(base, DEFAULT_WINDOW_TOP_OFFSET + safeAreaTop);
};

const readTaskbarHeightFromElement = (element) => {
  if (!element || typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return 0;
  }

  const computed = window.getComputedStyle(element);
  if (!computed) {
    return 0;
  }

  const raw = computed.getPropertyValue(TASKBAR_HEIGHT_PROPERTY);
  return parseCssLengthValue(raw, computed);
};

export const measureTaskbarHeight = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return DEFAULT_SNAP_BOTTOM_INSET;
  }

  const shell = document.querySelector('.desktop-shell');
  const measuredFromShell = readTaskbarHeightFromElement(shell);
  if (measuredFromShell > 0) {
    return measuredFromShell;
  }

  const root = document.documentElement || document.body;
  const measuredFromRoot = readTaskbarHeightFromElement(root);
  if (measuredFromRoot > 0) {
    return measuredFromRoot;
  }

  return DEFAULT_SNAP_BOTTOM_INSET;
};

export const measureSnapBottomInset = () => {
  const measured = measureTaskbarHeight();
  if (typeof measured === 'number' && Number.isFinite(measured)) {
    return Math.max(measured, DEFAULT_SNAP_BOTTOM_INSET);
  }
  return DEFAULT_SNAP_BOTTOM_INSET;
};

export const clampWindowTopPosition = (value, topOffset) => {
  const safeOffset = typeof topOffset === 'number' ? topOffset : measureWindowTopOffset();
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return safeOffset;
  }
  return Math.max(value, safeOffset);
};

const parseDimension = (value) => {
  if (typeof value !== 'number') return 0;
  return Number.isFinite(value) ? Math.max(value, 0) : 0;
};

const getViewportDimension = (dimension, viewport, visualKey, windowKey) => {
  if (typeof dimension === 'number' && Number.isFinite(dimension)) {
    return dimension;
  }
  if (viewport && typeof viewport[visualKey] === 'number') {
    return viewport[visualKey];
  }
  if (typeof window !== 'undefined' && typeof window[windowKey] === 'number') {
    return window[windowKey];
  }
  return 0;
};

const getViewportOffset = (offset, viewport, key) => {
  if (typeof offset === 'number' && Number.isFinite(offset)) {
    return offset;
  }
  if (viewport && typeof viewport[key] === 'number') {
    return viewport[key];
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

  const viewport = getVisualViewport();
  const viewportWidth = getViewportDimension(
    options.viewportWidth,
    viewport,
    'width',
    'innerWidth',
  );
  const viewportHeight = getViewportDimension(
    options.viewportHeight,
    viewport,
    'height',
    'innerHeight',
  );
  const viewportOffsetLeft = getViewportOffset(
    options.viewportOffsetLeft,
    viewport,
    'offsetLeft',
  );
  const viewportOffsetTop = getViewportOffset(
    options.viewportOffsetTop,
    viewport,
    'offsetTop',
  );
  const topOffset = typeof options.topOffset === 'number'
    ? options.topOffset
    : measureWindowTopOffset();
  const topSafeInset = typeof options.topInset === 'number'
    ? Math.max(options.topInset, 0)
    : Math.max(0, measureSafeAreaInset('top'));
  const effectiveTopOffset = Math.max(topOffset, topSafeInset);
  const leftInset = typeof options.leftInset === 'number'
    ? Math.max(options.leftInset, 0)
    : Math.max(0, measureSafeAreaInset('left'));
  const rightInset = typeof options.rightInset === 'number'
    ? Math.max(options.rightInset, 0)
    : Math.max(0, measureSafeAreaInset('right'));
  const bottomInset = typeof options.bottomInset === 'number'
    ? Math.max(options.bottomInset, 0)
    : Math.max(0, measureSafeAreaInset('bottom'));
  const snapBottomInset = typeof options.snapBottomInset === 'number'
    ? Math.max(options.snapBottomInset, 0)
    : measureSnapBottomInset();

  const minX = viewportOffsetLeft + leftInset;
  const minY = viewportOffsetTop + effectiveTopOffset;

  if (!viewportWidth || !viewportHeight) {
    return {
      x: parsePositionCoordinate(position.x, minX),
      y: clampWindowTopPosition(position.y, minY),
      bounds: {
        minX,
        maxX: minX,
        minY,
        maxY: minY,
      },
    };
  }

  const width = dimensions && typeof dimensions === 'object'
    ? parseDimension(dimensions.width)
    : 0;
  const height = dimensions && typeof dimensions === 'object'
    ? parseDimension(dimensions.height)
    : 0;

  const usableHorizontal = Math.max(viewportWidth - leftInset - rightInset, 0);
  const horizontalSpace = Math.max(usableHorizontal - width, 0);
  const availableVertical = Math.max(
    viewportHeight - effectiveTopOffset - snapBottomInset - bottomInset,
    0,
  );
  const verticalSpace = Math.max(availableVertical - height, 0);

  const maxX = minX + horizontalSpace;
  const maxY = minY + verticalSpace;

  const nextX = Math.min(
    Math.max(parsePositionCoordinate(position.x, minX), minX),
    maxX,
  );
  const nextY = Math.min(
    Math.max(clampWindowTopPosition(position.y, minY), minY),
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
