import {
  NAVBAR_HEIGHT,
  NAVBAR_VERTICAL_PADDING,
  SNAP_BOTTOM_INSET,
  WINDOW_TOP_INSET,
  WINDOW_TOP_MARGIN,
} from './uiConstants';
import { safeLocalStorage } from './safeStorage';

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

export const WORKSPACE_LAYOUT_VERSION = 1;

export const WORKSPACE_LAYOUT_EVENTS = Object.freeze({
  request: 'workspace-layout-request',
  response: 'workspace-layout-response',
  apply: 'workspace-layout-apply',
  applied: 'workspace-layout-applied',
});

const WORKSPACE_LAYOUT_STORAGE_KEY = 'desktop_workspace_layouts';
const WORKSPACE_LAYOUT_STORAGE_VERSION = 1;

const VIEWPORT_WIDTH_BUCKETS = Object.freeze([
  { id: 'xs', min: 0, max: 639 },
  { id: 'sm', min: 640, max: 767 },
  { id: 'md', min: 768, max: 1023 },
  { id: 'lg', min: 1024, max: 1439 },
  { id: 'xl', min: 1440, max: 1919 },
  { id: 'xxl', min: 1920, max: Infinity },
]);

const FALLBACK_WIDTH_BUCKET = 'base';

const isFiniteNumber = (value) => typeof value === 'number' && Number.isFinite(value);

const sanitizeNumeric = (value, fallback = NaN) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
};

const sanitizeCoordinateValue = (value) => {
  const numeric = sanitizeNumeric(value, 0);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric);
};

const sanitizeDimensionValue = (value) => {
  const numeric = sanitizeNumeric(value, 0);
  if (!Number.isFinite(numeric)) return 0;
  const rounded = Math.round(numeric);
  return rounded > 0 ? rounded : 0;
};

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

const clonePlainObject = (value) => (isPlainObject(value) ? { ...value } : {});

export const getViewportWidthBucket = (width) => {
  const numeric = sanitizeNumeric(width, NaN);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return FALLBACK_WIDTH_BUCKET;
  }
  for (const bucket of VIEWPORT_WIDTH_BUCKETS) {
    if (numeric >= bucket.min && numeric <= bucket.max) {
      return bucket.id;
    }
  }
  return VIEWPORT_WIDTH_BUCKETS[VIEWPORT_WIDTH_BUCKETS.length - 1].id;
};

export const serializeWorkspaceSnapshot = ({
  workspaceId = 0,
  closedWindows = {},
  windowPositions = {},
  windowSizes = {},
  stack = [],
  viewportWidth,
  bucket,
  capturedAt,
} = {}) => {
  const widthBucket = typeof bucket === 'string' && bucket ? bucket : getViewportWidthBucket(viewportWidth);
  const safeWorkspaceId = isFiniteNumber(workspaceId) ? workspaceId : 0;
  const timestamp = isFiniteNumber(capturedAt) ? capturedAt : Date.now();

  const closed = clonePlainObject(closedWindows);
  const positions = clonePlainObject(windowPositions);
  const sizes = clonePlainObject(windowSizes);
  const stackList = Array.isArray(stack)
    ? stack.filter((id) => typeof id === 'string' && id)
    : [];

  let openIds = Object.keys(closed).filter((id) => closed[id] === false);
  if (openIds.length === 0 && stackList.length) {
    openIds = [...stackList];
  }
  if (openIds.length === 0) {
    openIds = Object.keys(positions);
  }
  if (openIds.length === 0) {
    openIds = Object.keys(sizes);
  }
  const uniqueOpenIds = Array.from(new Set(openIds.filter((id) => typeof id === 'string' && id)));

  const stackFiltered = stackList.filter((id) => uniqueOpenIds.includes(id));
  const fallbackOrdered = uniqueOpenIds.filter((id) => !stackFiltered.includes(id));
  const orderedIds = [...stackFiltered, ...fallbackOrdered];

  const windows = orderedIds.map((id, index) => {
    const entry = { id, zIndex: orderedIds.length - index - 1 };
    const position = positions[id];
    if (isPlainObject(position)) {
      entry.position = {
        x: sanitizeCoordinateValue(position.x),
        y: sanitizeCoordinateValue(position.y),
      };
    }
    const size = sizes[id];
    if (isPlainObject(size)) {
      const width = sanitizeDimensionValue(size.width);
      const height = sanitizeDimensionValue(size.height);
      if (width > 0 && height > 0) {
        entry.size = { width, height };
      }
    }
    return entry;
  });

  return {
    version: WORKSPACE_LAYOUT_VERSION,
    workspaceId: safeWorkspaceId,
    activeWorkspace: safeWorkspaceId,
    bucket: widthBucket,
    viewportWidth: Number.isFinite(viewportWidth) ? viewportWidth : undefined,
    capturedAt: timestamp,
    windows,
  };
};

export const deserializeWorkspaceSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }
  const { windows } = snapshot;
  if (!Array.isArray(windows)) {
    return null;
  }

  const sanitized = windows
    .filter((win) => win && typeof win.id === 'string' && win.id)
    .map((win) => {
      const entry = {
        id: win.id,
        zIndex: isFiniteNumber(win.zIndex) ? win.zIndex : 0,
      };
      if (isPlainObject(win.position)) {
        entry.position = {
          x: sanitizeCoordinateValue(win.position.x),
          y: sanitizeCoordinateValue(win.position.y),
        };
      }
      if (isPlainObject(win.size)) {
        const width = sanitizeDimensionValue(win.size.width);
        const height = sanitizeDimensionValue(win.size.height);
        if (width > 0 && height > 0) {
          entry.size = { width, height };
        }
      }
      return entry;
    });

  const positions = {};
  const sizes = {};
  sanitized.forEach((win) => {
    if (win.position) {
      positions[win.id] = { ...win.position };
    }
    if (win.size) {
      sizes[win.id] = { ...win.size };
    }
  });

  const stack = sanitized
    .slice()
    .sort((a, b) => b.zIndex - a.zIndex)
    .map((win) => win.id);

  return {
    version: WORKSPACE_LAYOUT_VERSION,
    workspaceId: isFiniteNumber(snapshot.workspaceId)
      ? snapshot.workspaceId
      : isFiniteNumber(snapshot.activeWorkspace)
      ? snapshot.activeWorkspace
      : 0,
    bucket: typeof snapshot.bucket === 'string' ? snapshot.bucket : null,
    openWindows: stack.slice(),
    positions,
    sizes,
    stack,
    windows: sanitized.map((win) => ({
      id: win.id,
      position: win.position ? { ...win.position } : undefined,
      size: win.size ? { ...win.size } : undefined,
      zIndex: win.zIndex,
    })),
    capturedAt: isFiniteNumber(snapshot.capturedAt) ? snapshot.capturedAt : null,
  };
};

const createEmptyWorkspaceStorage = () => ({
  version: WORKSPACE_LAYOUT_STORAGE_VERSION,
  workspaces: {},
});

const normalizeWorkspaceLayoutRecord = (record) => {
  if (!record || typeof record !== 'object') {
    return null;
  }
  const layout = isPlainObject(record.layout) ? record.layout : record;
  if (!layout || typeof layout !== 'object') {
    return null;
  }
  if (!Array.isArray(layout.windows)) {
    return null;
  }
  if (layout.version !== undefined && layout.version !== WORKSPACE_LAYOUT_VERSION) {
    return null;
  }
  const normalizedBucket = typeof layout.bucket === 'string' && layout.bucket
    ? layout.bucket
    : typeof record.bucket === 'string' && record.bucket
    ? record.bucket
    : getViewportWidthBucket(layout.viewportWidth);

  return {
    bucket: normalizedBucket,
    capturedAt: isFiniteNumber(record.capturedAt)
      ? record.capturedAt
      : isFiniteNumber(layout.capturedAt)
      ? layout.capturedAt
      : Date.now(),
    layout: {
      ...layout,
      version: WORKSPACE_LAYOUT_VERSION,
      bucket: normalizedBucket,
    },
  };
};

const normalizeWorkspaceStorageEntry = (name, entry) => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const entryName = typeof entry.name === 'string' && entry.name.trim()
    ? entry.name.trim()
    : name;
  const createdAt = isFiniteNumber(entry.createdAt) ? entry.createdAt : Date.now();
  const normalizedLayouts = {};
  if (entry.layouts && typeof entry.layouts === 'object') {
    Object.entries(entry.layouts).forEach(([bucketKey, value]) => {
      const record = normalizeWorkspaceLayoutRecord(value);
      if (record) {
        normalizedLayouts[record.bucket || bucketKey] = record;
      }
    });
  }
  if (Object.keys(normalizedLayouts).length === 0) {
    return null;
  }
  const latestCapturedAt = Object.values(normalizedLayouts).reduce(
    (latest, value) => {
      const candidate = isFiniteNumber(value.capturedAt) ? value.capturedAt : 0;
      return candidate > latest ? candidate : latest;
    },
    createdAt,
  );

  const updatedAt = isFiniteNumber(entry.updatedAt) ? entry.updatedAt : latestCapturedAt;

  return {
    name: entryName,
    createdAt,
    updatedAt,
    layouts: normalizedLayouts,
  };
};

const readWorkspaceStorage = () => {
  if (!safeLocalStorage) {
    return createEmptyWorkspaceStorage();
  }
  try {
    const raw = safeLocalStorage.getItem(WORKSPACE_LAYOUT_STORAGE_KEY);
    if (!raw) {
      return createEmptyWorkspaceStorage();
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return createEmptyWorkspaceStorage();
    }
    if (parsed.version !== WORKSPACE_LAYOUT_STORAGE_VERSION) {
      return createEmptyWorkspaceStorage();
    }
    const workspaces = {};
    if (parsed.workspaces && typeof parsed.workspaces === 'object') {
      Object.entries(parsed.workspaces).forEach(([name, value]) => {
        const entry = normalizeWorkspaceStorageEntry(name, value);
        if (entry) {
          workspaces[entry.name] = entry;
        }
      });
    }
    return {
      version: WORKSPACE_LAYOUT_STORAGE_VERSION,
      workspaces,
    };
  } catch (error) {
    return createEmptyWorkspaceStorage();
  }
};

const writeWorkspaceStorage = (storage) => {
  if (!safeLocalStorage) {
    return false;
  }
  try {
    const payload = {
      version: WORKSPACE_LAYOUT_STORAGE_VERSION,
      workspaces: storage.workspaces || {},
    };
    safeLocalStorage.setItem(WORKSPACE_LAYOUT_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (error) {
    return false;
  }
};

export const listStoredWorkspaceLayouts = () => {
  const storage = readWorkspaceStorage();
  return Object.values(storage.workspaces)
    .map((entry) => ({
      name: entry.name,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      buckets: Object.keys(entry.layouts).sort(),
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
};

export const saveWorkspaceLayout = (name, layout) => {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    throw new Error('Workspace name must be a non-empty string');
  }
  if (!layout || typeof layout !== 'object' || !Array.isArray(layout.windows)) {
    throw new Error('Invalid workspace layout payload');
  }

  const storage = readWorkspaceStorage();
  const existing = storage.workspaces[trimmedName];
  const normalizedBucket = typeof layout.bucket === 'string' && layout.bucket
    ? layout.bucket
    : getViewportWidthBucket(layout.viewportWidth);
  const capturedAt = isFiniteNumber(layout.capturedAt) ? layout.capturedAt : Date.now();

  const record = {
    bucket: normalizedBucket,
    capturedAt,
    layout: {
      ...layout,
      version: WORKSPACE_LAYOUT_VERSION,
      bucket: normalizedBucket,
      capturedAt,
    },
  };

  const nextEntry = existing
    ? {
        name: existing.name,
        createdAt: existing.createdAt,
        updatedAt: capturedAt,
        layouts: {
          ...existing.layouts,
          [normalizedBucket]: record,
        },
      }
    : {
        name: trimmedName,
        createdAt: capturedAt,
        updatedAt: capturedAt,
        layouts: {
          [normalizedBucket]: record,
        },
      };

  const nextStorage = {
    version: WORKSPACE_LAYOUT_STORAGE_VERSION,
    workspaces: {
      ...storage.workspaces,
      [trimmedName]: nextEntry,
    },
  };

  writeWorkspaceStorage(nextStorage);
  return nextEntry;
};

export const deleteWorkspaceLayout = (name) => {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    return false;
  }
  const storage = readWorkspaceStorage();
  if (!storage.workspaces[trimmedName]) {
    return false;
  }
  const nextWorkspaces = { ...storage.workspaces };
  delete nextWorkspaces[trimmedName];
  const nextStorage = {
    version: WORKSPACE_LAYOUT_STORAGE_VERSION,
    workspaces: nextWorkspaces,
  };
  writeWorkspaceStorage(nextStorage);
  return true;
};

export const clearStoredWorkspaceLayouts = () => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(WORKSPACE_LAYOUT_STORAGE_KEY);
  } catch (error) {
    // ignore storage errors
  }
};

export const getStoredWorkspaceLayout = (name, width) => {
  const trimmedName = typeof name === 'string' ? name.trim() : '';
  if (!trimmedName) {
    return null;
  }
  const storage = readWorkspaceStorage();
  const entry = storage.workspaces[trimmedName];
  if (!entry) {
    return null;
  }
  const layouts = entry.layouts || {};
  const targetBucket = getViewportWidthBucket(width);
  if (layouts[targetBucket]) {
    const record = layouts[targetBucket];
    return {
      name: entry.name,
      bucket: record.bucket,
      layout: { ...record.layout },
    };
  }
  const available = Object.values(layouts);
  if (available.length === 0) {
    return null;
  }
  const numericWidth = sanitizeNumeric(width, NaN);
  let bestRecord = available[0];
  if (Number.isFinite(numericWidth)) {
    let bestScore = Number.isFinite(bestRecord.layout?.viewportWidth)
      ? Math.abs(bestRecord.layout.viewportWidth - numericWidth)
      : Infinity;
    for (const candidate of available) {
      const candidateWidth = sanitizeNumeric(candidate.layout?.viewportWidth, NaN);
      if (!Number.isFinite(candidateWidth)) {
        continue;
      }
      const delta = Math.abs(candidateWidth - numericWidth);
      if (delta < bestScore) {
        bestRecord = candidate;
        bestScore = delta;
      }
    }
  }
  return {
    name: entry.name,
    bucket: bestRecord.bucket,
    layout: { ...bestRecord.layout },
  };
};
