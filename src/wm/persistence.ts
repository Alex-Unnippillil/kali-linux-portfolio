import { safeLocalStorage } from '../../utils/safeStorage';

export interface WindowGeometry {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

type GeometryStore = Record<string, WindowGeometry>;

const STORAGE_KEY = 'wm:geometry';
const FALLBACK_GEOMETRY: WindowGeometry = { x: 60, y: 10 };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const readStore = (): GeometryStore => {
  if (!safeLocalStorage) return {};

  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return {};

    return Object.entries(parsed).reduce<GeometryStore>((acc, [id, value]) => {
      if (!value || typeof value !== 'object') return acc;
      const geometry = value as Partial<WindowGeometry> & Record<string, unknown>;
      const { x, y, width, height } = geometry;

      if (!isFiniteNumber(x) || !isFiniteNumber(y)) return acc;

      const stored: WindowGeometry = { x, y };
      if (isFiniteNumber(width)) stored.width = width;
      if (isFiniteNumber(height)) stored.height = height;

      acc[id] = stored;
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const writeStore = (store: GeometryStore) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage errors (quota, private mode, etc.)
  }
};

const computeDefaultGeometry = (): WindowGeometry => {
  if (typeof window === 'undefined') {
    return { ...FALLBACK_GEOMETRY };
  }

  const isPortrait = window.innerHeight > window.innerWidth;
  const x = isPortrait ? Math.round(window.innerWidth * 0.05) : FALLBACK_GEOMETRY.x;
  return { x, y: FALLBACK_GEOMETRY.y };
};

const sanitizeGeometry = (geometry: WindowGeometry): WindowGeometry | null => {
  const { x, y, width, height } = geometry;
  if (!isFiniteNumber(x) || !isFiniteNumber(y)) return null;

  const result: WindowGeometry = { x, y };
  if (isFiniteNumber(width)) result.width = width;
  if (isFiniteNumber(height)) result.height = height;
  return result;
};

export const loadWindowGeometry = (
  appId: string,
  fallback?: WindowGeometry,
): WindowGeometry => {
  const store = readStore();
  const stored = store[appId];
  if (stored) return { ...stored };

  if (fallback) return { ...fallback };
  return computeDefaultGeometry();
};

export const saveWindowGeometry = (appId: string, geometry: WindowGeometry) => {
  const sanitized = sanitizeGeometry(geometry);
  if (!sanitized) return;

  const store = readStore();
  store[appId] = sanitized;
  writeStore(store);
};

export const clearWindowGeometry = (appId?: string) => {
  if (!safeLocalStorage) return;

  if (!appId) {
    try {
      safeLocalStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return;
  }

  const store = readStore();
  if (store[appId]) {
    delete store[appId];
    writeStore(store);
  }
};
