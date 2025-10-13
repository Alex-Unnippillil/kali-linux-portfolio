import {
  NAVBAR_HEIGHT,
  NAVBAR_VERTICAL_PADDING,
  SNAP_BOTTOM_INSET,
  WINDOW_TOP_INSET,
  WINDOW_TOP_MARGIN,
} from './uiConstants';

export const WINDOW_STATE_PARAM = 'windowState';
export const SHARED_WINDOW_STATE_STORAGE_KEY = '__DESKTOP_WINDOW_STATE__';
export const SHARED_WINDOW_STATE_TOKEN_KEY = '__DESKTOP_WINDOW_STATE_TOKENS__';

const MAX_POSITION = 32000;
const MIN_SIZE_PERCENT = 10;
const MAX_SIZE_PERCENT = 100;
const MAX_CONTEXT_STRING_LENGTH = 2048;
const MAX_CONTEXT_DEPTH = 4;
const MAX_CONTEXT_ARRAY_LENGTH = 64;

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

const clamp = (value, min, max) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  if (typeof min === 'number' && value < min) return min;
  if (typeof max === 'number' && value > max) return max;
  return value;
};

const isPlainObject = (value) => {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

const sanitizeNumber = (value, min, max) => {
  if (typeof value !== 'number') {
    value = Number(value);
  }
  if (!Number.isFinite(value)) return null;
  return clamp(value, min, max);
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

const sanitizeContextValue = (value, depth) => {
  if (depth > MAX_CONTEXT_DEPTH) return undefined;
  if (
    typeof value === 'string'
  ) {
    return value.slice(0, MAX_CONTEXT_STRING_LENGTH);
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'boolean' || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    const next = [];
    for (let index = 0; index < value.length && index < MAX_CONTEXT_ARRAY_LENGTH; index += 1) {
      const item = sanitizeContextValue(value[index], depth + 1);
      if (item !== undefined) {
        next.push(item);
      }
    }
    return next;
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value);
    const next = {};
    entries.forEach(([key, val]) => {
      if (typeof key !== 'string') return;
      const sanitized = sanitizeContextValue(val, depth + 1);
      if (sanitized !== undefined) {
        next[key] = sanitized;
      }
    });
    return next;
  }
  return undefined;
};

const sanitizeContext = (value) => {
  if (!isPlainObject(value)) return undefined;
  const sanitized = sanitizeContextValue(value, 0);
  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return undefined;
  }
  return sanitized;
};

export const sanitizeWindowSnapshot = (value) => {
  if (!value || typeof value !== 'object') return null;
  const id = typeof value.id === 'string' ? value.id.trim() : '';
  if (!id || !/^[\w.-]+$/.test(id)) {
    return null;
  }

  const snapshot = { id };

  if (value.position && typeof value.position === 'object') {
    const x = sanitizeNumber(value.position.x, 0, MAX_POSITION);
    const y = sanitizeNumber(value.position.y, 0, MAX_POSITION);
    if (x !== null && y !== null) {
      snapshot.position = { x, y };
    }
  }

  if (value.size && typeof value.size === 'object') {
    const width = sanitizeNumber(value.size.width, MIN_SIZE_PERCENT, MAX_SIZE_PERCENT);
    const height = sanitizeNumber(value.size.height, MIN_SIZE_PERCENT, MAX_SIZE_PERCENT);
    if (width !== null && height !== null) {
      snapshot.size = { width, height };
    }
  }

  if (value.context) {
    const context = sanitizeContext(value.context);
    if (context) {
      snapshot.context = context;
    }
  }

  return snapshot;
};

const toBase64Url = (value) => {
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(value, 'utf8').toString('base64url');
    }
  } catch (error) {
    // ignore buffer errors and fall back
  }
  if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
    return window
      .btoa(value)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/u, '');
  }
  return null;
};

const fromBase64Url = (value) => {
  if (typeof value !== 'string') return null;
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(value, 'base64url').toString('utf8');
    }
  } catch (error) {
    // ignore buffer decode errors
  }
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    try {
      const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
      return window.atob(normalized);
    } catch (error) {
      return null;
    }
  }
  return null;
};

export const encodeWindowSnapshot = (snapshot) => {
  const sanitized = sanitizeWindowSnapshot(snapshot);
  if (!sanitized) return null;
  try {
    const json = JSON.stringify(sanitized);
    return toBase64Url(json);
  } catch (error) {
    return null;
  }
};

export const decodeWindowSnapshot = (encoded) => {
  if (typeof encoded !== 'string' || !encoded) return null;
  const json = fromBase64Url(encoded);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    return sanitizeWindowSnapshot(parsed);
  } catch (error) {
    return null;
  }
};

const resolveBaseUrl = (base) => {
  if (base) {
    return base;
  }
  if (typeof window !== 'undefined' && window.location) {
    return window.location.href;
  }
  return null;
};

export const buildWindowSnapshotUrl = (snapshot, baseUrl) => {
  const encoded = encodeWindowSnapshot(snapshot);
  if (!encoded) return null;
  const base = resolveBaseUrl(baseUrl);
  if (!base) return null;
  try {
    const url = new URL(base, typeof window !== 'undefined' ? window.location?.origin : 'http://localhost');
    url.searchParams.set(WINDOW_STATE_PARAM, encoded);
    return url.toString();
  } catch (error) {
    return null;
  }
};

export const parseWindowSnapshotFromUrl = (url) => {
  const base = resolveBaseUrl(url);
  if (!base) return null;
  try {
    const parsedUrl = new URL(base, typeof window !== 'undefined' ? window.location?.origin : 'http://localhost');
    const token = parsedUrl.searchParams.get(WINDOW_STATE_PARAM);
    if (!token) return null;
    return decodeWindowSnapshot(token);
  } catch (error) {
    return null;
  }
};

export const readWindowNodePosition = (node) => {
  if (!node || !node.style) {
    return null;
  }

  const style = node.style;

  if (typeof style.getPropertyValue === 'function') {
    const x = style.getPropertyValue('--window-transform-x');
    const y = style.getPropertyValue('--window-transform-y');
    const parsedX = typeof x === 'string' ? parseFloat(x) : null;
    const parsedY = typeof y === 'string' ? parseFloat(y) : null;
    if (Number.isFinite(parsedX) && Number.isFinite(parsedY)) {
      return { x: parsedX, y: parsedY };
    }
  }

  if (typeof style.transform === 'string' && style.transform.length) {
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(style.transform);
    if (match) {
      const parsedX = parseFloat(match[1]);
      const parsedY = parseFloat(match[2]);
      if (Number.isFinite(parsedX) && Number.isFinite(parsedY)) {
        return { x: parsedX, y: parsedY };
      }
    }
  }

  return null;
};

const getWindowStateStore = () => {
  if (typeof window === 'undefined') return null;
  const store = window[SHARED_WINDOW_STATE_STORAGE_KEY];
  if (store && typeof store === 'object') {
    return store;
  }
  window[SHARED_WINDOW_STATE_STORAGE_KEY] = {};
  return window[SHARED_WINDOW_STATE_STORAGE_KEY];
};

export const storeSharedWindowState = (snapshot) => {
  const sanitized = sanitizeWindowSnapshot(snapshot);
  if (!sanitized) return false;
  const store = getWindowStateStore();
  if (!store) return false;
  store[sanitized.id] = sanitized;
  return true;
};

export const consumeSharedWindowState = (id) => {
  if (typeof id !== 'string' || !id) return null;
  const store = getWindowStateStore();
  if (!store) return null;
  const snapshot = store[id];
  if (snapshot) {
    delete store[id];
    return snapshot;
  }
  return null;
};

const getTokenStore = () => {
  if (typeof window === 'undefined') return null;
  const store = window[SHARED_WINDOW_STATE_TOKEN_KEY];
  if (store && typeof store === 'object') {
    return store;
  }
  window[SHARED_WINDOW_STATE_TOKEN_KEY] = {};
  return window[SHARED_WINDOW_STATE_TOKEN_KEY];
};

export const hasProcessedWindowStateToken = (token) => {
  if (!token || typeof token !== 'string') return false;
  const store = getTokenStore();
  if (!store) return false;
  return Boolean(store[token]);
};

export const markWindowStateTokenProcessed = (token) => {
  if (!token || typeof token !== 'string') return false;
  const store = getTokenStore();
  if (!store) return false;
  store[token] = true;
  return true;
};
