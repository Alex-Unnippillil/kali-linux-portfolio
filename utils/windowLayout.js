import {
  DESKTOP_TOP_PADDING,
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
    if (typeof window === 'undefined') return 0;
    const viewportHeight = typeof window.innerHeight === 'number' ? window.innerHeight : 0;
    return viewportHeight ? (numeric / 100) * viewportHeight : 0;
  }

  if (
    trimmed.endsWith('vw') ||
    trimmed.endsWith('svw') ||
    trimmed.endsWith('lvw') ||
    trimmed.endsWith('dvw')
  ) {
    if (typeof window === 'undefined') return 0;
    const viewportWidth = typeof window.innerWidth === 'number' ? window.innerWidth : 0;
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
    return DEFAULT_WINDOW_TOP_OFFSET;
  }

  const { height } = navbar.getBoundingClientRect();
  const measured = Number.isFinite(height) ? Math.ceil(height) : DEFAULT_NAVBAR_HEIGHT;
  return Math.max(
    measured + WINDOW_TOP_MARGIN + WINDOW_TOP_INSET,
    DEFAULT_WINDOW_TOP_OFFSET,
  );
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

export const computeSnapRegions = (
  viewportWidth,
  viewportHeight,
  topInset = DEFAULT_WINDOW_TOP_OFFSET,
  bottomInset,
  options = {},
) => {
  const safeAreaReader = typeof options.measureSafeAreaInset === 'function'
    ? options.measureSafeAreaInset
    : measureSafeAreaInset;
  const snapBottomReader = typeof options.measureSnapBottomInset === 'function'
    ? options.measureSnapBottomInset
    : measureSnapBottomInset;
  const normalizedTopInset = typeof topInset === 'number'
    ? Math.max(topInset, DESKTOP_TOP_PADDING)
    : DEFAULT_WINDOW_TOP_OFFSET;
  const safeBottom = Math.max(0, safeAreaReader('bottom'));
  const snapBottomInset = typeof bottomInset === 'number' && Number.isFinite(bottomInset)
    ? Math.max(bottomInset, 0)
    : snapBottomReader();
  const availableHeight = Math.max(0, viewportHeight - normalizedTopInset - snapBottomInset - safeBottom);
  const halfWidth = Math.max(viewportWidth / 2, 0);
  const halfHeight = Math.max(availableHeight / 2, 0);
  const rightStart = Math.max(viewportWidth - halfWidth, 0);
  const bottomStart = normalizedTopInset + halfHeight;

  return {
    left: { left: 0, top: normalizedTopInset, width: halfWidth, height: availableHeight },
    right: { left: rightStart, top: normalizedTopInset, width: halfWidth, height: availableHeight },
    top: { left: 0, top: normalizedTopInset, width: viewportWidth, height: availableHeight },
    'top-left': { left: 0, top: normalizedTopInset, width: halfWidth, height: halfHeight },
    'top-right': { left: rightStart, top: normalizedTopInset, width: halfWidth, height: halfHeight },
    'bottom-left': { left: 0, top: bottomStart, width: halfWidth, height: halfHeight },
    'bottom-right': { left: rightStart, top: bottomStart, width: halfWidth, height: halfHeight },
  };
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
  const snapBottomInset = typeof options.snapBottomInset === 'number'
    ? Math.max(options.snapBottomInset, 0)
    : measureSnapBottomInset();

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
  const availableVertical = Math.max(viewportHeight - topOffset - snapBottomInset - bottomInset, 0);
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
