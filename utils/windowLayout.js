const NAVBAR_SELECTOR = '.main-navbar-vp';
const DEFAULT_NAVBAR_HEIGHT = 48;
const WINDOW_TOP_MARGIN = 16;
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

const paneSnapshotStore = new Map();
const pendingPaneRestores = new Map();
let activePaneId = null;

const sanitizeSnapshot = (value) => {
  if (typeof value === 'undefined') {
    return { ok: false };
  }
  try {
    const serialized = JSON.stringify(value);
    const parsed = JSON.parse(serialized);
    return { ok: true, value: parsed };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[paneSnapshot] Failed to serialize snapshot', error);
    }
    return { ok: false };
  }
};

const resolvePaneId = (paneId) => {
  if (typeof paneId === 'string' && paneId.trim().length > 0) {
    return paneId;
  }
  if (typeof activePaneId === 'string' && activePaneId.trim().length > 0) {
    return activePaneId;
  }
  const first = paneSnapshotStore.keys().next();
  if (!first.done && typeof first.value === 'string') {
    return first.value;
  }
  return null;
};

export const markPaneActive = (paneId) => {
  if (typeof paneId === 'string' && paneId.trim().length > 0) {
    activePaneId = paneId;
  } else if (!paneId && activePaneId) {
    activePaneId = null;
  }
};

export const capturePaneSnapshot = (paneId, snapshot) => {
  const key = resolvePaneId(paneId);
  if (!key) return false;
  const result = sanitizeSnapshot(snapshot);
  if (!result.ok) return false;
  paneSnapshotStore.set(key, {
    snapshot: result.value,
    updatedAt: Date.now(),
  });
  activePaneId = key;
  return true;
};

export const getPaneSnapshotDetails = (paneId) => {
  const key = resolvePaneId(paneId);
  if (!key) return null;
  const entry = paneSnapshotStore.get(key);
  if (!entry) return null;
  return { paneId: key, snapshot: entry.snapshot, updatedAt: entry.updatedAt };
};

export const hasPaneSnapshot = (paneId) => {
  if (typeof paneId === 'string' && paneId.trim().length > 0) {
    return paneSnapshotStore.has(paneId);
  }
  if (typeof activePaneId === 'string' && paneSnapshotStore.has(activePaneId)) {
    return true;
  }
  return paneSnapshotStore.size > 0;
};

export const clearPaneSnapshot = (paneId) => {
  const key = resolvePaneId(paneId);
  if (!key) return;
  paneSnapshotStore.delete(key);
  pendingPaneRestores.delete(key);
  if (activePaneId === key) {
    activePaneId = null;
  }
};

export const queuePaneSnapshotRestore = (paneId) => {
  const key = resolvePaneId(paneId);
  if (!key) return null;
  const entry = paneSnapshotStore.get(key);
  if (!entry) return null;
  const result = sanitizeSnapshot(entry.snapshot);
  if (!result.ok) {
    paneSnapshotStore.delete(key);
    pendingPaneRestores.delete(key);
    return null;
  }
  pendingPaneRestores.set(key, result.value);
  return {
    paneId: key,
    snapshot: result.value,
    updatedAt: entry.updatedAt,
  };
};

export const consumePendingPaneRestore = (paneId) => {
  const key = resolvePaneId(paneId);
  if (!key) return null;
  if (!pendingPaneRestores.has(key)) return null;
  const snapshot = pendingPaneRestores.get(key);
  pendingPaneRestores.delete(key);
  paneSnapshotStore.delete(key);
  if (activePaneId === key) {
    activePaneId = null;
  }
  return snapshot;
};

export const getLatestPaneSnapshot = () => {
  if (activePaneId) {
    const entry = getPaneSnapshotDetails(activePaneId);
    if (entry) return entry;
  }
  const first = paneSnapshotStore.entries().next();
  if (!first.done) {
    const [paneId, entry] = first.value;
    if (entry) {
      return { paneId, snapshot: entry.snapshot, updatedAt: entry.updatedAt };
    }
  }
  return null;
};

export const __paneSnapshotInternals = {
  reset() {
    paneSnapshotStore.clear();
    pendingPaneRestores.clear();
    activePaneId = null;
  },
  peekStore() {
    return paneSnapshotStore;
  },
  getActivePaneId() {
    return activePaneId;
  },
  hasPending(paneId) {
    const key = resolvePaneId(paneId);
    if (!key) return false;
    return pendingPaneRestores.has(key);
  },
};
