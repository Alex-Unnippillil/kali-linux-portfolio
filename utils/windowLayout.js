import { SNAP_BOTTOM_INSET } from './uiConstants';

const NAVBAR_SELECTOR = '.main-navbar-vp';
const DEFAULT_NAVBAR_HEIGHT = 48;
const WINDOW_TOP_MARGIN = 16;
const MIN_VISIBLE_WINDOW_EDGE = 40;
const SAFE_AREA_PROPERTIES = {
  top: '--safe-area-top',
  right: '--safe-area-right',
  bottom: '--safe-area-bottom',
  left: '--safe-area-left',
};

const clampNumber = (value, min, max) => {
  if (!Number.isFinite(value)) {
    if (Number.isFinite(min)) return min;
    if (Number.isFinite(max)) return max;
    return 0;
  }
  if (Number.isFinite(min) && value < min) return min;
  if (Number.isFinite(max) && value > max) return max;
  return value;
};

const resolveMinVisible = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return MIN_VISIBLE_WINDOW_EDGE;
  return Math.max(value, 0);
};

const resolveViewportSize = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }

  const width = Number.isFinite(window.innerWidth) ? window.innerWidth : 0;
  const height = Number.isFinite(window.innerHeight) ? window.innerHeight : 0;

  return { width, height };
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

export const measureWindowSafeArea = (options = {}) => {
  const minVisible = resolveMinVisible(options.minVisible);
  const insets = getSafeAreaInsets();
  const viewport = resolveViewportSize();
  const topInset = measureWindowTopOffset();

  const top = Math.max(topInset, minVisible);
  const left = Math.max(insets.left || 0, minVisible);
  const right = Math.max(insets.right || 0, minVisible);
  const bottom = Math.max((insets.bottom || 0) + SNAP_BOTTOM_INSET, minVisible);

  return {
    top,
    right,
    bottom,
    left,
    viewportWidth: viewport.width,
    viewportHeight: viewport.height,
  };
};

export const computeWindowDragBounds = (width, height, options = {}) => {
  const safeArea = measureWindowSafeArea(options);
  const windowWidth = Number.isFinite(width) ? width : 0;
  const windowHeight = Number.isFinite(height) ? height : 0;

  const minX = safeArea.left - windowWidth;
  const maxX = safeArea.viewportWidth - safeArea.right;
  const minY = safeArea.top - windowHeight;
  const maxY = safeArea.viewportHeight - safeArea.bottom;

  const resolvedMinX = Number.isFinite(minX) ? minX : 0;
  const resolvedMaxX = Number.isFinite(maxX) ? Math.max(resolvedMinX, maxX || 0) : resolvedMinX;
  const resolvedMinY = Number.isFinite(minY) ? minY : safeArea.top;
  const resolvedMaxY = Number.isFinite(maxY) ? Math.max(resolvedMinY, maxY || resolvedMinY) : resolvedMinY;

  return {
    minX: resolvedMinX,
    maxX: resolvedMaxX,
    minY: resolvedMinY,
    maxY: resolvedMaxY,
    safeArea,
  };
};

export const clampWindowPositionToSafeArea = (x, y, width, height, options = {}) => {
  const bounds = computeWindowDragBounds(width, height, options);
  const clampedX = clampNumber(x, bounds.minX, bounds.maxX);
  const clampedY = clampNumber(y, bounds.minY, bounds.maxY);

  return {
    x: clampedX,
    y: clampedY,
    bounds,
  };
};
