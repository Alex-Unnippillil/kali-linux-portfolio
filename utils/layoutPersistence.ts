import { safeLocalStorage } from './safeStorage';

export const LAYOUT_STORAGE_KEY = 'desktop-session';
export const LAYOUT_SCHEMA_VERSION = 2;

export interface ShellWindowBounds {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface ShellWindowDescriptor {
  id: string;
  workspace: number;
  z: number;
  bounds: ShellWindowBounds;
}

export interface ShellLayoutState {
  windows: ShellWindowDescriptor[];
  wallpaper?: string;
  dock?: string[];
}

interface StoredShellLayout extends ShellLayoutState {
  version: typeof LAYOUT_SCHEMA_VERSION;
}

interface LegacyWindowDescriptor {
  id: string;
  x: number;
  y: number;
}

interface LegacyLayoutState {
  windows?: LegacyWindowDescriptor[];
  wallpaper?: string;
  dock?: string[];
}

type ParseResult = { layout: ShellLayoutState; needsResave: boolean };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const sanitizeDock = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const sanitized = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return sanitized;
};

const sanitizeDescriptor = (value: unknown): ShellWindowDescriptor | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<ShellWindowDescriptor & { bounds: Partial<ShellWindowBounds> }>;
  if (!record.id || typeof record.id !== 'string') {
    return null;
  }

  const workspaceRaw = isFiniteNumber(record.workspace) ? record.workspace : 0;
  const workspace = Math.max(0, Math.floor(workspaceRaw));

  const zRaw = isFiniteNumber(record.z) ? record.z : 0;
  const z = Math.max(0, Math.floor(zRaw));

  const boundsValue = record.bounds || {};
  const x = isFiniteNumber(boundsValue.x) ? boundsValue.x : 0;
  const y = isFiniteNumber(boundsValue.y) ? boundsValue.y : 0;
  const bounds: ShellWindowBounds = { x, y };

  if (isFiniteNumber(boundsValue.width)) {
    bounds.width = Math.max(0, Math.round(boundsValue.width));
  }

  if (isFiniteNumber(boundsValue.height)) {
    bounds.height = Math.max(0, Math.round(boundsValue.height));
  }

  return {
    id: record.id,
    workspace,
    z,
    bounds,
  };
};

const sanitizeLegacyDescriptor = (
  entry: LegacyWindowDescriptor,
  index: number,
): ShellWindowDescriptor | null => {
  if (!entry || typeof entry !== 'object') return null;
  if (typeof entry.id !== 'string' || entry.id.length === 0) return null;
  if (!isFiniteNumber(entry.x) || !isFiniteNumber(entry.y)) return null;

  return {
    id: entry.id,
    workspace: 0,
    z: Math.max(0, index),
    bounds: {
      x: entry.x,
      y: entry.y,
    },
  };
};

export const sanitizeShellLayout = (value: ShellLayoutState | null | undefined): ShellLayoutState => {
  const windowsInput = Array.isArray(value?.windows) ? value!.windows : [];
  const seen = new Set<string>();
  const windows: ShellWindowDescriptor[] = [];

  windowsInput.forEach((entry) => {
    const sanitized = sanitizeDescriptor(entry);
    if (!sanitized) return;
    if (seen.has(sanitized.id)) return;
    seen.add(sanitized.id);
    windows.push(sanitized);
  });

  windows.sort((a, b) => {
    if (a.workspace !== b.workspace) return a.workspace - b.workspace;
    if (a.z !== b.z) return a.z - b.z;
    return a.id.localeCompare(b.id);
  });

  const wallpaper = typeof value?.wallpaper === 'string' ? value.wallpaper : undefined;
  const dock = sanitizeDock(value?.dock);

  return {
    windows,
    wallpaper,
    dock,
  };
};

const migrateLegacyLayout = (value: LegacyLayoutState): ShellLayoutState => {
  const entries = Array.isArray(value.windows) ? value.windows : [];
  const windows = entries
    .map((entry, index) => sanitizeLegacyDescriptor(entry, index))
    .filter((entry): entry is ShellWindowDescriptor => Boolean(entry));

  return sanitizeShellLayout({
    windows,
    wallpaper: typeof value.wallpaper === 'string' ? value.wallpaper : undefined,
    dock: value.dock,
  });
};

const normalizeStoredLayout = (value: StoredShellLayout): ShellLayoutState =>
  sanitizeShellLayout({
    windows: value.windows,
    wallpaper: value.wallpaper,
    dock: value.dock,
  });

const interpretStoredValue = (value: unknown): ParseResult | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<StoredShellLayout & { version?: number }>;

  if (typeof record.version === 'number') {
    if (record.version !== LAYOUT_SCHEMA_VERSION) {
      return null;
    }
    return { layout: normalizeStoredLayout(record as StoredShellLayout), needsResave: false };
  }

  if (typeof record.version === 'undefined') {
    return { layout: migrateLegacyLayout(record as LegacyLayoutState), needsResave: true };
  }

  return null;
};

export const loadShellLayout = (
  storage: Storage | undefined = safeLocalStorage,
): ShellLayoutState | null => {
  if (!storage) return null;
  let raw: string | null = null;
  try {
    raw = storage.getItem(LAYOUT_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    const result = interpretStoredValue(parsed);
    if (!result) {
      storage.removeItem(LAYOUT_STORAGE_KEY);
      return null;
    }

    if (result.needsResave) {
      persistShellLayout(result.layout, storage);
    }

    return result.layout;
  } catch {
    storage.removeItem(LAYOUT_STORAGE_KEY);
    return null;
  }
};

export const persistShellLayout = (
  layout: ShellLayoutState,
  storage: Storage | undefined = safeLocalStorage,
): void => {
  if (!storage) return;
  const sanitized = sanitizeShellLayout(layout);
  const payload: StoredShellLayout = {
    version: LAYOUT_SCHEMA_VERSION,
    windows: sanitized.windows,
  };

  if (sanitized.wallpaper) {
    payload.wallpaper = sanitized.wallpaper;
  }

  if (sanitized.dock && sanitized.dock.length > 0) {
    payload.dock = sanitized.dock;
  }

  try {
    storage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore write errors
  }
};

export const clearShellLayout = (
  storage: Storage | undefined = safeLocalStorage,
): void => {
  if (!storage) return;
  try {
    storage.removeItem(LAYOUT_STORAGE_KEY);
  } catch {
    // ignore clear errors
  }
};
