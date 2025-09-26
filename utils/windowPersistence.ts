import { safeLocalStorage } from './safeStorage';

const STORAGE_PREFIX = 'wm:';

export type WindowSnapshot = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  maximized?: boolean;
};

type SanitizedSnapshot = WindowSnapshot;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
};

const toBoolean = (value: unknown): boolean | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
};

const normaliseLegacyShape = (value: unknown): Record<string, unknown> | null => {
  if (!value) return null;
  if (Array.isArray(value)) {
    const [x, y, width, height, maximized] = value;
    return { x, y, width, height, maximized };
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (record.position && typeof record.position === 'object') {
      const pos = record.position as Record<string, unknown>;
      record.x = record.x ?? pos.x ?? pos.left;
      record.y = record.y ?? pos.y ?? pos.top;
    }
    if (record.size && typeof record.size === 'object') {
      const size = record.size as Record<string, unknown>;
      record.width = record.width ?? size.width ?? size.w;
      record.height = record.height ?? size.height ?? size.h;
    }
    return record;
  }
  return null;
};

const sanitiseSnapshot = (value: unknown): SanitizedSnapshot | null => {
  const normalised = normaliseLegacyShape(value);
  if (!normalised || typeof normalised !== 'object') {
    return null;
  }

  const snapshot: SanitizedSnapshot = {};

  if ('x' in normalised) {
    const x = toNumber(normalised.x);
    if (x === undefined) return null;
    snapshot.x = clamp(x, -10000, 10000);
  }

  if ('y' in normalised) {
    const y = toNumber(normalised.y);
    if (y === undefined) return null;
    snapshot.y = clamp(y, -10000, 10000);
  }

  if ('width' in normalised) {
    const width = toNumber(normalised.width);
    if (width === undefined) return null;
    snapshot.width = clamp(width, 10, 200);
  }

  if ('height' in normalised) {
    const height = toNumber(normalised.height);
    if (height === undefined) return null;
    snapshot.height = clamp(height, 10, 200);
  }

  if ('maximized' in normalised) {
    const maximized = toBoolean(normalised.maximized);
    if (maximized === undefined) return null;
    snapshot.maximized = maximized;
  }

  return snapshot;
};

const getKey = (id: string) => `${STORAGE_PREFIX}${id}`;

const readRawSnapshot = (id: string): SanitizedSnapshot | null => {
  const raw = safeLocalStorage?.getItem(getKey(id));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const sanitised = sanitiseSnapshot(parsed);
    if (!sanitised) {
      safeLocalStorage?.removeItem(getKey(id));
      return null;
    }
    return sanitised;
  } catch {
    safeLocalStorage?.removeItem(getKey(id));
    return null;
  }
};

export const readWindowState = (id: string): Required<WindowSnapshot> | null => {
  const snapshot = readRawSnapshot(id);
  if (!snapshot) return null;
  return {
    x: snapshot.x ?? 0,
    y: snapshot.y ?? 0,
    width: snapshot.width ?? 60,
    height: snapshot.height ?? 85,
    maximized: snapshot.maximized ?? false,
  };
};

export const readAllWindowStates = (): Record<string, Required<WindowSnapshot>> => {
  const result: Record<string, Required<WindowSnapshot>> = {};
  if (!safeLocalStorage) return result;
  for (let i = 0; i < safeLocalStorage.length; i += 1) {
    const key = safeLocalStorage.key(i);
    if (!key || !key.startsWith(STORAGE_PREFIX)) continue;
    const id = key.slice(STORAGE_PREFIX.length);
    const snapshot = readWindowState(id);
    if (snapshot) {
      result[id] = snapshot;
    }
  }
  return result;
};

export const writeWindowState = (id: string, patch: WindowSnapshot) => {
  if (!safeLocalStorage) return;
  const sanitisedPatch = sanitiseSnapshot(patch);
  if (!sanitisedPatch || Object.keys(sanitisedPatch).length === 0) {
    return;
  }
  const current = readRawSnapshot(id) ?? {};
  const next: SanitizedSnapshot = { ...current, ...sanitisedPatch };
  safeLocalStorage.setItem(getKey(id), JSON.stringify(next));
};

export const clearWindowState = (id: string) => {
  safeLocalStorage?.removeItem(getKey(id));
};
