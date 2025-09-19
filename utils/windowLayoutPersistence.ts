import { safeLocalStorage } from './safeStorage';

export type SnapPosition = 'left' | 'right' | 'top';

export interface WindowLayout {
  x: number;
  y: number;
  widthPct: number;
  heightPct: number;
  snapped: SnapPosition | null;
  maximized: boolean;
  lastWidthPct?: number;
  lastHeightPct?: number;
}

export interface Viewport {
  width: number;
  height: number;
}

interface PersistedState {
  version: number;
  displays: Record<string, Record<string, WindowLayout>>;
}

interface PersistenceOptions {
  storage?: Storage;
  viewport?: Viewport;
}

export const STORAGE_KEY = 'desktop-window-layouts';
const LEGACY_KEYS = ['desktop-window-positions', 'window_positions'];
const LEGACY_SESSION_KEY = 'desktop-session';
const CURRENT_VERSION = 2;
export const DEFAULT_DISPLAY_ID = 'display-default';
const VALID_SNAPS: ReadonlySet<string> = new Set(['left', 'right', 'top']);
const MIN_PERCENT = 5;
const MAX_PERCENT = 120;

const DEFAULT_LAYOUT: WindowLayout = {
  x: 60,
  y: 10,
  widthPct: 60,
  heightPct: 85,
  snapped: null,
  maximized: false,
};

function toFiniteNumber(value: unknown, fallback: number): number {
  const num =
    typeof value === 'string' && value.trim() === '' ? Number.NaN : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (min > max) return min;
  return Math.min(Math.max(value, min), max);
}

function normalizeSnap(value: unknown): SnapPosition | null {
  if (typeof value !== 'string') return null;
  return VALID_SNAPS.has(value) ? (value as SnapPosition) : null;
}

function coerceLayout(value: Partial<WindowLayout> | undefined): WindowLayout {
  if (!value || typeof value !== 'object') {
    value = {};
  }
  const base = { ...DEFAULT_LAYOUT, ...value } as Record<string, unknown>;
  const widthPct = toFiniteNumber(
    base.widthPct ?? base.width,
    DEFAULT_LAYOUT.widthPct,
  );
  const heightPct = toFiniteNumber(
    base.heightPct ?? base.height,
    DEFAULT_LAYOUT.heightPct,
  );
  const x = toFiniteNumber(base.x, DEFAULT_LAYOUT.x);
  const y = toFiniteNumber(base.y, DEFAULT_LAYOUT.y);
  const snapped = normalizeSnap(base.snapped ?? base.snap ?? base.snapPosition);
  const maximized = Boolean(base.maximized);
  const lastWidth = toFiniteNumber(
    base.lastWidthPct ?? base.lastWidth ?? (base.lastSize as any)?.width,
    Number.NaN,
  );
  const lastHeight = toFiniteNumber(
    base.lastHeightPct ?? base.lastHeight ?? (base.lastSize as any)?.height,
    Number.NaN,
  );

  const layout: WindowLayout = { x, y, widthPct, heightPct, snapped, maximized };
  if (Number.isFinite(lastWidth) && Number.isFinite(lastHeight)) {
    layout.lastWidthPct = lastWidth;
    layout.lastHeightPct = lastHeight;
  }
  return layout;
}

function clampLayout(layout: WindowLayout, viewport: Viewport): WindowLayout {
  const widthPct = clampNumber(layout.widthPct, MIN_PERCENT, MAX_PERCENT);
  const heightPct = clampNumber(layout.heightPct, MIN_PERCENT, MAX_PERCENT);
  const widthPx = viewport.width > 0 ? (viewport.width * widthPct) / 100 : widthPct;
  const heightPx =
    viewport.height > 0 ? (viewport.height * heightPct) / 100 : heightPct;
  const maxX = viewport.width > 0 ? Math.max(0, viewport.width - widthPx) : layout.x;
  const maxY =
    viewport.height > 0 ? Math.max(0, viewport.height - heightPx) : layout.y;
  const x = clampNumber(layout.x, 0, maxX);
  const y = clampNumber(layout.y, 0, maxY);

  const sanitized: WindowLayout = {
    x,
    y,
    widthPct,
    heightPct,
    snapped: layout.snapped ?? null,
    maximized: Boolean(layout.maximized),
  };
  if (
    layout.lastWidthPct !== undefined &&
    layout.lastHeightPct !== undefined &&
    Number.isFinite(layout.lastWidthPct) &&
    Number.isFinite(layout.lastHeightPct)
  ) {
    sanitized.lastWidthPct = layout.lastWidthPct;
    sanitized.lastHeightPct = layout.lastHeightPct;
  }
  return sanitized;
}

function parseJSON<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function convertArray(value: unknown): Record<string, WindowLayout> {
  if (!Array.isArray(value)) return {};
  const result: Record<string, WindowLayout> = {};
  for (const entry of value) {
    if (entry && typeof entry === 'object' && typeof (entry as any).id === 'string') {
      result[(entry as any).id] = coerceLayout(entry as any);
    }
  }
  return result;
}

function convertMap(value: unknown): Record<string, WindowLayout> {
  if (!value || typeof value !== 'object') return {};
  const result: Record<string, WindowLayout> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      result[key] = coerceLayout(entry as any);
    }
  }
  return result;
}

function ensurePersistedState(value: unknown): {
  data: PersistedState;
  migrated: boolean;
} {
  const empty: PersistedState = { version: CURRENT_VERSION, displays: {} };
  if (!value) {
    return { data: empty, migrated: false };
  }
  if (Array.isArray(value)) {
    return {
      data: { version: CURRENT_VERSION, displays: { [DEFAULT_DISPLAY_ID]: convertArray(value) } },
      migrated: true,
    };
  }
  if (typeof value !== 'object') {
    return { data: empty, migrated: true };
  }
  const record = value as Record<string, unknown>;
  if (Array.isArray(record.windows)) {
    return {
      data: { version: CURRENT_VERSION, displays: { [DEFAULT_DISPLAY_ID]: convertArray(record.windows) } },
      migrated: true,
    };
  }
  if (record.displays && typeof record.displays === 'object') {
    const displays: Record<string, Record<string, WindowLayout>> = {};
    for (const [displayId, layouts] of Object.entries(
      record.displays as Record<string, unknown>,
    )) {
      displays[displayId] = convertMap(layouts);
    }
    const version = typeof record.version === 'number' ? record.version : CURRENT_VERSION;
    return {
      data: { version: CURRENT_VERSION, displays },
      migrated: version !== CURRENT_VERSION,
    };
  }
  return {
    data: { version: CURRENT_VERSION, displays: { [DEFAULT_DISPLAY_ID]: convertMap(record) } },
    migrated: true,
  };
}

function readPersistedState(storage?: Storage): {
  data: PersistedState;
  migrated: boolean;
} {
  const fallback: PersistedState = { version: CURRENT_VERSION, displays: {} };
  if (!storage) return { data: fallback, migrated: false };
  const parsed = parseJSON(storage.getItem(STORAGE_KEY));
  if (!parsed) {
    return { data: fallback, migrated: Boolean(storage.getItem(STORAGE_KEY)) };
  }
  return ensurePersistedState(parsed);
}

function readLegacyLayouts(storage: Storage): Record<string, WindowLayout> | null {
  for (const key of LEGACY_KEYS) {
    const parsed = parseJSON(storage.getItem(key));
    if (parsed) {
      const converted = Array.isArray(parsed) ? convertArray(parsed) : convertMap(parsed);
      if (Object.keys(converted).length) {
        return converted;
      }
    }
  }
  const session = parseJSON<{ windows?: unknown }>(storage.getItem(LEGACY_SESSION_KEY));
  if (session && Array.isArray(session.windows)) {
    const converted = convertArray(session.windows);
    if (Object.keys(converted).length) {
      return converted;
    }
  }
  return null;
}

export function getViewport(options?: PersistenceOptions): Viewport {
  if (options?.viewport) return options.viewport;
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 };
  }
  return {
    width: Math.max(window.innerWidth || 0, 0),
    height: Math.max(window.innerHeight || 0, 0),
  };
}

export function getDisplayId(): string {
  if (typeof window === 'undefined' || typeof window.screen === 'undefined') {
    return DEFAULT_DISPLAY_ID;
  }
  const screen = window.screen as any;
  const width = toFiniteNumber(screen.width, Math.max(window.innerWidth || 0, 0));
  const height = toFiniteNumber(screen.height, Math.max(window.innerHeight || 0, 0));
  const left =
    typeof window.screenLeft === 'number'
      ? window.screenLeft
      : toFiniteNumber(screen.availLeft, 0);
  const top =
    typeof window.screenTop === 'number'
      ? window.screenTop
      : toFiniteNumber(screen.availTop, 0);
  return `${width}x${height}@${left},${top}`;
}

function writeState(storage: Storage, data: PersistedState) {
  storage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: CURRENT_VERSION }));
}

export function loadWindowLayouts(
  displayId: string,
  options: PersistenceOptions = {},
): Record<string, WindowLayout> {
  const storage = options.storage ?? safeLocalStorage;
  if (!storage) return {};
  const viewport = getViewport(options);
  const { data, migrated } = readPersistedState(storage);
  let changed = migrated;

  if (!data.displays[displayId]) {
    const legacy = readLegacyLayouts(storage);
    if (legacy) {
      data.displays[DEFAULT_DISPLAY_ID] = {
        ...(data.displays[DEFAULT_DISPLAY_ID] || {}),
        ...legacy,
      };
      changed = true;
    }
  }

  const sourceLayouts =
    data.displays[displayId] ??
    (displayId === DEFAULT_DISPLAY_ID ? undefined : data.displays[DEFAULT_DISPLAY_ID]) ??
    {};

  const sanitizedEntries: Record<string, WindowLayout> = {};
  for (const [id, layout] of Object.entries(sourceLayouts)) {
    const coerced = coerceLayout(layout);
    const sanitized = clampLayout(coerced, viewport);
    sanitizedEntries[id] = sanitized;
    if (JSON.stringify(layout) !== JSON.stringify(sanitized)) {
      changed = true;
    }
  }

  if (!data.displays[displayId] && displayId !== DEFAULT_DISPLAY_ID && Object.keys(sanitizedEntries).length) {
    data.displays[displayId] = sanitizedEntries;
    changed = true;
  }

  if (changed) {
    data.displays = {
      ...data.displays,
      [displayId]: sanitizedEntries,
    };
    writeState(storage, data);
  }

  return sanitizedEntries;
}

export function mergeLayout(
  base: WindowLayout | undefined,
  update: Partial<WindowLayout> | undefined,
  options: PersistenceOptions = {},
): WindowLayout {
  const viewport = getViewport(options);
  const combined = { ...DEFAULT_LAYOUT, ...base, ...update } as Partial<WindowLayout>;
  const coerced = coerceLayout(combined);
  return clampLayout(coerced, viewport);
}

export function saveWindowLayouts(
  displayId: string,
  layouts: Record<string, WindowLayout>,
  options: PersistenceOptions = {},
) {
  const storage = options.storage ?? safeLocalStorage;
  if (!storage) return;
  const viewport = getViewport(options);
  const { data } = readPersistedState(storage);
  const sanitizedEntries: Record<string, WindowLayout> = {};
  for (const [id, layout] of Object.entries(layouts)) {
    const coerced = coerceLayout(layout);
    sanitizedEntries[id] = clampLayout(coerced, viewport);
  }
  data.displays = {
    ...data.displays,
    [displayId]: sanitizedEntries,
  };
  writeState(storage, data);
}

export function clearWindowLayouts(displayId: string, options: PersistenceOptions = {}) {
  const storage = options.storage ?? safeLocalStorage;
  if (!storage) return;
  const { data } = readPersistedState(storage);
  if (!data.displays[displayId]) return;
  const { [displayId]: _removed, ...rest } = data.displays;
  data.displays = rest;
  writeState(storage, data);
}

export function layoutsEqual(a?: WindowLayout, b?: WindowLayout): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.widthPct === b.widthPct &&
    a.heightPct === b.heightPct &&
    a.snapped === b.snapped &&
    a.maximized === b.maximized &&
    (a.lastWidthPct ?? null) === (b.lastWidthPct ?? null) &&
    (a.lastHeightPct ?? null) === (b.lastHeightPct ?? null)
  );
}

export { STORAGE_KEY as WINDOW_LAYOUT_STORAGE_KEY };

