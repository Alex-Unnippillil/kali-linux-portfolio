import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from '../theme';

export type Density = 'regular' | 'compact';

export interface SettingsSnapshot {
  accent: string;
  wallpaper: string;
  density: Density;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
  theme: string;
}

export const DEFAULT_SETTINGS: SettingsSnapshot = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  density: 'regular',
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
  theme: 'default',
};

export const defaults: Readonly<SettingsSnapshot> = Object.freeze({
  ...DEFAULT_SETTINGS,
});

const resolveWindow = (): Window | undefined => {
  if (typeof globalThis === 'undefined') return undefined;
  const candidate = Reflect.get(globalThis, 'window') as Window | undefined;
  return typeof candidate === 'object' ? candidate : undefined;
};

const hasWindow = (): boolean => typeof resolveWindow() !== 'undefined';

const DENSITY_KEY = 'density';
const REDUCED_MOTION_KEY = 'reduced-motion';
const FONT_SCALE_KEY = 'font-scale';
const HIGH_CONTRAST_KEY = 'high-contrast';
const LARGE_HIT_AREAS_KEY = 'large-hit-areas';
const PONG_SPIN_KEY = 'pong-spin';
const ALLOW_NETWORK_KEY = 'allow-network';
const HAPTICS_KEY = 'haptics';

const BASELINE_STORAGE_KEY = 'settings:baseline';
const IDB_FALLBACK_PREFIX = 'settings:idb:';

const safeLocalStorage = {
  get(key: string): string | null {
    const win = resolveWindow();
    if (!win) return null;
    try {
      return win.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    const win = resolveWindow();
    if (!win) return;
    try {
      win.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
  remove(key: string): void {
    const win = resolveWindow();
    if (!win) return;
    try {
      win.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },
};

const readFallback = <T>(key: string): T | undefined => {
  const raw = safeLocalStorage.get(`${IDB_FALLBACK_PREFIX}${key}`);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
};

const writeFallback = <T>(key: string, value: T): void => {
  try {
    safeLocalStorage.set(
      `${IDB_FALLBACK_PREFIX}${key}`,
      JSON.stringify(value),
    );
  } catch {
    /* ignore */
  }
};

const deleteFallback = (key: string): void => {
  safeLocalStorage.remove(`${IDB_FALLBACK_PREFIX}${key}`);
};

async function readIdbValue<T>(key: string): Promise<T | undefined> {
  if (!hasWindow()) return undefined;
  try {
    const value = await get<T>(key as any);
    if (value !== undefined && value !== null) {
      return value as T;
    }
  } catch {
    /* ignore */
  }
  return readFallback<T>(key);
}

async function writeIdbValue<T>(key: string, value: T): Promise<void> {
  if (!hasWindow()) return;
  try {
    await set(key as any, value);
  } catch {
    /* ignore */
  }
  writeFallback(key, value);
}

async function deleteIdbValue(key: string): Promise<void> {
  if (!hasWindow()) return;
  try {
    await del(key as any);
  } catch {
    /* ignore */
  }
  deleteFallback(key);
}

const ensureBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

const ensureNumber = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number') return fallback;
  if (Number.isNaN(value)) return fallback;
  return value;
};

const ensureDensity = (value: unknown, fallback: Density): Density =>
  value === 'compact' || value === 'regular'
    ? (value as Density)
    : fallback;

export async function getAccent(): Promise<string> {
  if (!hasWindow()) return DEFAULT_SETTINGS.accent;
  const stored = await readIdbValue<string>('accent');
  return stored ?? DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent: string): Promise<void> {
  if (!hasWindow()) return;
  await writeIdbValue('accent', accent);
}

export async function getWallpaper(): Promise<string> {
  if (!hasWindow()) return DEFAULT_SETTINGS.wallpaper;
  const stored = await readIdbValue<string>('bg-image');
  return stored ?? DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper: string): Promise<void> {
  if (!hasWindow()) return;
  await writeIdbValue('bg-image', wallpaper);
}

export async function getDensity(): Promise<Density> {
  if (!hasWindow()) return DEFAULT_SETTINGS.density;
  const stored = safeLocalStorage.get(DENSITY_KEY);
  return ensureDensity(stored, DEFAULT_SETTINGS.density);
}

export async function setDensity(density: Density): Promise<void> {
  if (!hasWindow()) return;
  safeLocalStorage.set(DENSITY_KEY, density);
}

export async function getReducedMotion(): Promise<boolean> {
  if (!hasWindow()) return DEFAULT_SETTINGS.reducedMotion;
  const stored = safeLocalStorage.get(REDUCED_MOTION_KEY);
  if (stored !== null) {
    return stored === 'true';
  }
  try {
    const win = resolveWindow();
    return win?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return DEFAULT_SETTINGS.reducedMotion;
  }
}

export async function setReducedMotion(value: boolean): Promise<void> {
  if (!hasWindow()) return;
  safeLocalStorage.set(REDUCED_MOTION_KEY, value ? 'true' : 'false');
}

export async function getFontScale(): Promise<number> {
  if (!hasWindow()) return DEFAULT_SETTINGS.fontScale;
  const stored = safeLocalStorage.get(FONT_SCALE_KEY);
  return ensureNumber(stored ? parseFloat(stored) : undefined, DEFAULT_SETTINGS.fontScale);
}

export async function setFontScale(scale: number): Promise<void> {
  if (!hasWindow()) return;
  safeLocalStorage.set(FONT_SCALE_KEY, String(scale));
}

export async function getHighContrast(): Promise<boolean> {
  if (!hasWindow()) return DEFAULT_SETTINGS.highContrast;
  const stored = safeLocalStorage.get(HIGH_CONTRAST_KEY);
  return stored === 'true';
}

export async function setHighContrast(value: boolean): Promise<void> {
  if (!hasWindow()) return;
  safeLocalStorage.set(HIGH_CONTRAST_KEY, value ? 'true' : 'false');
}

export async function getLargeHitAreas(): Promise<boolean> {
  if (!hasWindow()) return DEFAULT_SETTINGS.largeHitAreas;
  const stored = safeLocalStorage.get(LARGE_HIT_AREAS_KEY);
  return stored === 'true';
}

export async function setLargeHitAreas(value: boolean): Promise<void> {
  if (!hasWindow()) return;
  safeLocalStorage.set(LARGE_HIT_AREAS_KEY, value ? 'true' : 'false');
}

export async function getHaptics(): Promise<boolean> {
  if (!hasWindow()) return DEFAULT_SETTINGS.haptics;
  const stored = safeLocalStorage.get(HAPTICS_KEY);
  return stored === null ? DEFAULT_SETTINGS.haptics : stored === 'true';
}

export async function setHaptics(value: boolean): Promise<void> {
  if (!hasWindow()) return;
  safeLocalStorage.set(HAPTICS_KEY, value ? 'true' : 'false');
}

export async function getPongSpin(): Promise<boolean> {
  if (!hasWindow()) return DEFAULT_SETTINGS.pongSpin;
  const stored = safeLocalStorage.get(PONG_SPIN_KEY);
  return stored === null ? DEFAULT_SETTINGS.pongSpin : stored === 'true';
}

export async function setPongSpin(value: boolean): Promise<void> {
  if (!hasWindow()) return;
  safeLocalStorage.set(PONG_SPIN_KEY, value ? 'true' : 'false');
}

export async function getAllowNetwork(): Promise<boolean> {
  if (!hasWindow()) return DEFAULT_SETTINGS.allowNetwork;
  const stored = safeLocalStorage.get(ALLOW_NETWORK_KEY);
  return stored === 'true';
}

export async function setAllowNetwork(value: boolean): Promise<void> {
  if (!hasWindow()) return;
  safeLocalStorage.set(ALLOW_NETWORK_KEY, value ? 'true' : 'false');
}

export async function resetSettings(): Promise<void> {
  if (!hasWindow()) return;
  await Promise.all([
    deleteIdbValue('accent'),
    deleteIdbValue('bg-image'),
  ]);
  [
    DENSITY_KEY,
    REDUCED_MOTION_KEY,
    FONT_SCALE_KEY,
    HIGH_CONTRAST_KEY,
    LARGE_HIT_AREAS_KEY,
    PONG_SPIN_KEY,
    ALLOW_NETWORK_KEY,
    HAPTICS_KEY,
  ].forEach((key) => safeLocalStorage.remove(key));
  clearBaselineSnapshot();
}

export const getThemeSetting = getTheme;
export const setThemeSetting = setTheme;

export function normalizeSettingsSnapshot(
  snapshot: Partial<SettingsSnapshot>,
): SettingsSnapshot {
  return {
    accent:
      typeof snapshot.accent === 'string'
        ? snapshot.accent
        : DEFAULT_SETTINGS.accent,
    wallpaper:
      typeof snapshot.wallpaper === 'string'
        ? snapshot.wallpaper
        : DEFAULT_SETTINGS.wallpaper,
    density: ensureDensity(snapshot.density, DEFAULT_SETTINGS.density),
    reducedMotion: ensureBoolean(
      snapshot.reducedMotion,
      DEFAULT_SETTINGS.reducedMotion,
    ),
    fontScale: ensureNumber(snapshot.fontScale, DEFAULT_SETTINGS.fontScale),
    highContrast: ensureBoolean(
      snapshot.highContrast,
      DEFAULT_SETTINGS.highContrast,
    ),
    largeHitAreas: ensureBoolean(
      snapshot.largeHitAreas,
      DEFAULT_SETTINGS.largeHitAreas,
    ),
    pongSpin: ensureBoolean(snapshot.pongSpin, DEFAULT_SETTINGS.pongSpin),
    allowNetwork: ensureBoolean(
      snapshot.allowNetwork,
      DEFAULT_SETTINGS.allowNetwork,
    ),
    haptics: ensureBoolean(snapshot.haptics, DEFAULT_SETTINGS.haptics),
    theme:
      typeof snapshot.theme === 'string'
        ? snapshot.theme
        : DEFAULT_SETTINGS.theme,
  };
}

export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  if (!hasWindow()) return { ...DEFAULT_SETTINGS };
  const [
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
  ] = await Promise.all([
    getAccent(),
    getWallpaper(),
    getDensity(),
    getReducedMotion(),
    getFontScale(),
    getHighContrast(),
    getLargeHitAreas(),
    getPongSpin(),
    getAllowNetwork(),
    getHaptics(),
  ]);
  const theme = getTheme();
  return {
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
  };
}

export interface BaselineSnapshot {
  capturedAt: string;
  settings: SettingsSnapshot;
}

const serializeBaseline = (record: BaselineSnapshot): string =>
  JSON.stringify(record);

const deserializeBaseline = (
  raw: string,
): BaselineSnapshot | null => {
  try {
    const parsed = JSON.parse(raw) as BaselineSnapshot;
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.settings) return null;
    return {
      capturedAt:
        typeof parsed.capturedAt === 'string'
          ? parsed.capturedAt
          : new Date().toISOString(),
      settings: normalizeSettingsSnapshot(parsed.settings),
    };
  } catch {
    return null;
  }
};

export function getBaselineSnapshot(): BaselineSnapshot | null {
  const raw = safeLocalStorage.get(BASELINE_STORAGE_KEY);
  if (!raw) return null;
  return deserializeBaseline(raw);
}

export function setBaselineSnapshot(record: BaselineSnapshot): void {
  safeLocalStorage.set(BASELINE_STORAGE_KEY, serializeBaseline(record));
}

export function clearBaselineSnapshot(): void {
  safeLocalStorage.remove(BASELINE_STORAGE_KEY);
}

export async function captureBaselineSnapshot(options?: {
  force?: boolean;
}): Promise<BaselineSnapshot> {
  if (!hasWindow()) {
    return {
      capturedAt: new Date().toISOString(),
      settings: { ...DEFAULT_SETTINGS },
    };
  }
  const existing = getBaselineSnapshot();
  if (existing && !options?.force) {
    return existing;
  }
  const snapshot = await getSettingsSnapshot();
  const record: BaselineSnapshot = {
    capturedAt: new Date().toISOString(),
    settings: snapshot,
  };
  setBaselineSnapshot(record);
  return record;
}

export async function ensureBaselineSnapshot(): Promise<BaselineSnapshot> {
  return captureBaselineSnapshot({ force: false });
}

export interface SettingsDifference<
  K extends keyof SettingsSnapshot = keyof SettingsSnapshot,
> {
  key: K;
  before: SettingsSnapshot[K];
  after: SettingsSnapshot[K];
}

export function diffSettings(
  before: SettingsSnapshot,
  after: Partial<SettingsSnapshot>,
): SettingsDifference[] {
  const diffs: SettingsDifference[] = [];
  (Object.keys(after) as (keyof SettingsSnapshot)[]).forEach((key) => {
    const nextValue = after[key];
    if (typeof nextValue === 'undefined') return;
    if (before[key] !== nextValue) {
      diffs.push({ key, before: before[key], after: nextValue });
    }
  });
  return diffs;
}

export async function applySettingsSnapshot(
  snapshot: Partial<SettingsSnapshot>,
): Promise<void> {
  const tasks: Promise<void>[] = [];
  if (snapshot.accent !== undefined) {
    tasks.push(setAccent(snapshot.accent));
  }
  if (snapshot.wallpaper !== undefined) {
    tasks.push(setWallpaper(snapshot.wallpaper));
  }
  if (snapshot.density !== undefined) {
    tasks.push(setDensity(snapshot.density));
  }
  if (snapshot.reducedMotion !== undefined) {
    tasks.push(setReducedMotion(snapshot.reducedMotion));
  }
  if (snapshot.fontScale !== undefined) {
    tasks.push(setFontScale(snapshot.fontScale));
  }
  if (snapshot.highContrast !== undefined) {
    tasks.push(setHighContrast(snapshot.highContrast));
  }
  if (snapshot.largeHitAreas !== undefined) {
    tasks.push(setLargeHitAreas(snapshot.largeHitAreas));
  }
  if (snapshot.pongSpin !== undefined) {
    tasks.push(setPongSpin(snapshot.pongSpin));
  }
  if (snapshot.allowNetwork !== undefined) {
    tasks.push(setAllowNetwork(snapshot.allowNetwork));
  }
  if (snapshot.haptics !== undefined) {
    tasks.push(setHaptics(snapshot.haptics));
  }
  await Promise.all(tasks);
  if (snapshot.theme !== undefined) {
    setTheme(snapshot.theme);
  }
}
