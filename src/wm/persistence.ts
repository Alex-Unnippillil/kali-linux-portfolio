import { safeLocalStorage } from '@/utils/safeStorage';

const STORAGE_KEY = 'wm:geometry';
const MIN_WINDOW_PERCENT = 20;
const MAX_WINDOW_PERCENT = 100;
const DEFAULT_WIDTH = 60;
const DEFAULT_HEIGHT = 85;

type StoredGeometryMap = Record<string, StoredGeometry>;

interface StoredGeometry {
  widthPct: number;
  heightPct: number;
  xRatio: number;
  yRatio: number;
}

export interface WindowGeometry {
  x: number;
  y: number;
  widthPct: number;
  heightPct: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface GeometrySnapshot {
  x?: number;
  y?: number;
  widthPct?: number;
  heightPct?: number;
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const sanitizePercent = (value: unknown, fallback: number) => {
  const base = isFiniteNumber(value) ? value : fallback;
  return clamp(base, MIN_WINDOW_PERCENT, MAX_WINDOW_PERCENT);
};

const sanitizeRatio = (value: unknown) =>
  clamp(isFiniteNumber(value) ? value : 0, 0, 1);

const inferViewport = (): ViewportSize | undefined => {
  if (typeof window === 'undefined') return undefined;
  if (!window.innerWidth || !window.innerHeight) return undefined;
  return { width: window.innerWidth, height: window.innerHeight };
};

const readStore = (): StoredGeometryMap => {
  if (!safeLocalStorage) return {};
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return {};

    const result: StoredGeometryMap = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const entry = value as Partial<StoredGeometry>;
      if (
        isFiniteNumber(entry.widthPct) &&
        isFiniteNumber(entry.heightPct) &&
        isFiniteNumber(entry.xRatio) &&
        isFiniteNumber(entry.yRatio)
      ) {
        result[key] = {
          widthPct: entry.widthPct,
          heightPct: entry.heightPct,
          xRatio: entry.xRatio,
          yRatio: entry.yRatio,
        };
      }
    }
    return result;
  } catch {
    return {};
  }
};

const writeStore = (data: StoredGeometryMap) => {
  if (!safeLocalStorage) return;
  try {
    const keys = Object.keys(data);
    if (!keys.length) {
      safeLocalStorage.removeItem(STORAGE_KEY);
      return;
    }
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore write errors
  }
};

const measureBounds = (viewport: ViewportSize, geometry: GeometrySnapshot) => {
  const widthPct = sanitizePercent(
    geometry.widthPct,
    geometry.widthPct ?? DEFAULT_WIDTH,
  );
  const heightPct = sanitizePercent(
    geometry.heightPct,
    geometry.heightPct ?? DEFAULT_HEIGHT,
  );
  const widthPx = (widthPct / 100) * viewport.width;
  const heightPx = (heightPct / 100) * viewport.height;
  const maxX = Math.max(viewport.width - widthPx, 0);
  const maxY = Math.max(viewport.height - heightPx, 0);
  return { widthPct, heightPct, widthPx, heightPx, maxX, maxY };
};

export const restoreWindowGeometry = (
  appId: string,
  viewport?: ViewportSize,
  defaults: GeometrySnapshot = {},
): GeometrySnapshot => {
  const store = readStore();
  const stored = store[appId];
  const result: GeometrySnapshot = { ...defaults };

  if (!stored) {
    return result;
  }

  const baseViewport = viewport ?? inferViewport();
  const widthPct = sanitizePercent(
    stored.widthPct,
    defaults.widthPct ?? DEFAULT_WIDTH,
  );
  const heightPct = sanitizePercent(
    stored.heightPct,
    defaults.heightPct ?? DEFAULT_HEIGHT,
  );

  result.widthPct = widthPct;
  result.heightPct = heightPct;

  if (!baseViewport || baseViewport.width <= 0 || baseViewport.height <= 0) {
    return result;
  }

  const { maxX, maxY } = measureBounds(baseViewport, {
    widthPct,
    heightPct,
  });
  const ratioX = sanitizeRatio(stored.xRatio);
  const ratioY = sanitizeRatio(stored.yRatio);
  const x = clamp(ratioX * maxX, 0, maxX);
  const y = clamp(ratioY * maxY, 0, maxY);

  result.x = x;
  result.y = y;
  return result;
};

export const saveWindowGeometry = (
  appId: string,
  geometry: WindowGeometry,
  viewport?: ViewportSize,
): void => {
  if (!appId || !safeLocalStorage) return;
  if (
    !isFiniteNumber(geometry.x) ||
    !isFiniteNumber(geometry.y) ||
    !isFiniteNumber(geometry.widthPct) ||
    !isFiniteNumber(geometry.heightPct)
  ) {
    return;
  }

  const baseViewport = viewport ?? inferViewport();
  const store = readStore();
  const widthPct = sanitizePercent(geometry.widthPct, DEFAULT_WIDTH);
  const heightPct = sanitizePercent(geometry.heightPct, DEFAULT_HEIGHT);

  if (!baseViewport || baseViewport.width <= 0 || baseViewport.height <= 0) {
    store[appId] = {
      widthPct,
      heightPct,
      xRatio: 0,
      yRatio: 0,
    };
    writeStore(store);
    return;
  }

  const { maxX, maxY } = measureBounds(baseViewport, { widthPct, heightPct });
  const clampedX = clamp(geometry.x, 0, maxX);
  const clampedY = clamp(geometry.y, 0, maxY);
  const xRatio = maxX === 0 ? 0 : clampedX / maxX;
  const yRatio = maxY === 0 ? 0 : clampedY / maxY;

  store[appId] = {
    widthPct,
    heightPct,
    xRatio,
    yRatio,
  };
  writeStore(store);
};

export const removeWindowGeometry = (appId: string) => {
  if (!appId) return;
  const store = readStore();
  if (!(appId in store)) return;
  delete store[appId];
  writeStore(store);
};

export const clearAllWindowGeometry = () => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore remove errors
  }
};
