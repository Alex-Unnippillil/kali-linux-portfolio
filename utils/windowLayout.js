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

const layoutCache = {
  safeAreaInsets: null,
  windowTopOffset: null,
  snapBottomInset: null,
  viewport: null,
};

const layoutSubscribers = new Set();

let resizeObserver = null;
let windowResizeListenerAttached = false;
let visualViewportListenersAttached = false;
let orientationListenerAttached = false;

const notifyLayoutSubscribers = () => {
  layoutSubscribers.forEach((callback) => {
    try {
      callback();
    } catch (error) {
      if (typeof console !== 'undefined' && process.env.NODE_ENV !== 'production') {
        console.error('windowLayout subscriber failed', error);
      }
    }
  });
};

const invalidateLayoutCache = () => {
  layoutCache.safeAreaInsets = null;
  layoutCache.windowTopOffset = null;
  layoutCache.snapBottomInset = null;
  layoutCache.viewport = null;
  notifyLayoutSubscribers();
};

const attachResizeObserver = () => {
  if (resizeObserver || typeof ResizeObserver !== 'function') {
    return;
  }
  if (typeof document === 'undefined') {
    return;
  }
  const target = document.documentElement || document.body;
  if (!target) {
    return;
  }
  resizeObserver = new ResizeObserver(() => {
    invalidateLayoutCache();
  });
  resizeObserver.observe(target);
};

const attachWindowListeners = () => {
  if (typeof window === 'undefined') {
    return;
  }

  if (!windowResizeListenerAttached) {
    window.addEventListener('resize', invalidateLayoutCache, { passive: true });
    windowResizeListenerAttached = true;
  }

  if (!orientationListenerAttached) {
    window.addEventListener('orientationchange', invalidateLayoutCache, {
      passive: true,
    });
    orientationListenerAttached = true;
  }

  if (!visualViewportListenersAttached && window.visualViewport) {
    const viewport = window.visualViewport;
    viewport.addEventListener('resize', invalidateLayoutCache);
    viewport.addEventListener('scroll', invalidateLayoutCache);
    visualViewportListenersAttached = true;
  }
};

const ensureLayoutObservers = () => {
  attachResizeObserver();
  attachWindowListeners();
};

export const subscribeToLayoutChanges = (callback) => {
  if (typeof callback !== 'function') {
    return () => {};
  }
  ensureLayoutObservers();
  layoutSubscribers.add(callback);
  return () => {
    layoutSubscribers.delete(callback);
  };
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

  ensureLayoutObservers();

  if (!layoutCache.safeAreaInsets) {
    const computed = window.getComputedStyle(document.documentElement);
    layoutCache.safeAreaInsets = {
      top: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.top),
      right: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.right),
      bottom: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.bottom),
      left: readSafeAreaInset(computed, SAFE_AREA_PROPERTIES.left),
    };
  }

  return { ...layoutCache.safeAreaInsets };
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

  ensureLayoutObservers();

  if (typeof layoutCache.windowTopOffset === 'number') {
    return layoutCache.windowTopOffset;
  }

  const navbar = document.querySelector(NAVBAR_SELECTOR);
  if (!navbar) {
    layoutCache.windowTopOffset = DEFAULT_WINDOW_TOP_OFFSET;
    return layoutCache.windowTopOffset;
  }

  const { height } = navbar.getBoundingClientRect();
  const measured = Number.isFinite(height) ? Math.ceil(height) : DEFAULT_NAVBAR_HEIGHT;
  layoutCache.windowTopOffset = Math.max(
    measured + WINDOW_TOP_MARGIN + WINDOW_TOP_INSET,
    DEFAULT_WINDOW_TOP_OFFSET,
  );
  return layoutCache.windowTopOffset;
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
  ensureLayoutObservers();

  if (typeof layoutCache.snapBottomInset === 'number') {
    return layoutCache.snapBottomInset;
  }

  const measured = measureTaskbarHeight();
  if (typeof measured === 'number' && Number.isFinite(measured)) {
    layoutCache.snapBottomInset = Math.max(measured, DEFAULT_SNAP_BOTTOM_INSET);
    return layoutCache.snapBottomInset;
  }
  layoutCache.snapBottomInset = DEFAULT_SNAP_BOTTOM_INSET;
  return layoutCache.snapBottomInset;
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

const computeViewportRect = () => {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  const visualViewport = window.visualViewport || null;
  const width = typeof visualViewport?.width === 'number'
    ? visualViewport.width
    : (typeof window.innerWidth === 'number' ? window.innerWidth : 0);
  const height = typeof visualViewport?.height === 'number'
    ? visualViewport.height
    : (typeof window.innerHeight === 'number' ? window.innerHeight : 0);
  return {
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
  };
};

const getMemoizedViewportRect = () => {
  ensureLayoutObservers();
  if (!layoutCache.viewport) {
    layoutCache.viewport = computeViewportRect();
  }
  return layoutCache.viewport;
};

export const getViewportSize = () => ({ ...getMemoizedViewportRect() });

const resolveViewportDimension = (explicit, key) => {
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }
  const viewport = getMemoizedViewportRect();
  return viewport[key];
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

  const viewportWidth = resolveViewportDimension(options.viewportWidth, 'width');
  const viewportHeight = resolveViewportDimension(options.viewportHeight, 'height');
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

export const __testing__ = {
  invalidateLayoutCache,
  getLayoutCache: () => ({ ...layoutCache }),
};
