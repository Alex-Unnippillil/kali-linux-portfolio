"use client";

import { del, get, set } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

type BooleanSettingKey =
  | 'use-kali-wallpaper'
  | 'reduced-motion'
  | 'high-contrast'
  | 'large-hit-areas'
  | 'pong-spin'
  | 'allow-network'
  | 'haptics';

type NumericSettingKey = 'font-scale';
type StringSettingKey = 'density';

const isClient = (): boolean => typeof window !== 'undefined';

export type DensitySetting = 'regular' | 'compact';

export interface SettingsValues {
  accent: string;
  wallpaper: string;
  useKaliWallpaper: boolean;
  density: DensitySetting;
  reducedMotion: boolean;
  fontScale: number;
  highContrast: boolean;
  largeHitAreas: boolean;
  pongSpin: boolean;
  allowNetwork: boolean;
  haptics: boolean;
}

export type SettingsSnapshot = SettingsValues & { theme: string };
export type SettingsImportPayload = Partial<SettingsSnapshot>;

const DEFAULT_SETTINGS = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  useKaliWallpaper: false,
  density: 'regular',
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
} as const satisfies SettingsValues;

let hasLoggedStorageWarning = false;

const warnStorageIssue = (error: unknown) => {
  if (process.env.NODE_ENV !== 'production' && !hasLoggedStorageWarning) {
    console.warn(
      'Local storage is not available; falling back to default settings.',
      error,
    );
    hasLoggedStorageWarning = true;
  }
};

const getLocalStorage = (): Storage | null => {
  if (!isClient()) return null;
  try {
    return window.localStorage;
  } catch (error) {
    warnStorageIssue(error);
    return null;
  }
};

const readBoolean = (
  storage: Storage | null,
  key: BooleanSettingKey,
  fallback: boolean,
): boolean => {
  if (!storage) return fallback;
  const stored = storage.getItem(key);
  return stored === null ? fallback : stored === 'true';
};

const writeBoolean = (
  storage: Storage | null,
  key: BooleanSettingKey,
  value: boolean,
): void => {
  storage?.setItem(key, value ? 'true' : 'false');
};

const readNumber = (
  storage: Storage | null,
  key: NumericSettingKey,
  fallback: number,
): number => {
  if (!storage) return fallback;
  const stored = storage.getItem(key);
  return stored ? Number.parseFloat(stored) : fallback;
};

const readString = (
  storage: Storage | null,
  key: StringSettingKey,
  fallback: DensitySetting,
): DensitySetting => {
  if (!storage) return fallback;
  const stored = storage.getItem(key);
  return stored === 'compact' || stored === 'regular' ? stored : fallback;
};

const readFromIdb = async <T>(key: string, fallback: T): Promise<T> => {
  if (!isClient()) return fallback;
  try {
    const value = await get<T>(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const writeToIdb = async <T>(key: string, value: T): Promise<void> => {
  if (!isClient()) return;
  try {
    await set<T>(key, value);
  } catch {
    /* ignore storage errors */
  }
};

const deleteFromIdb = async (key: string): Promise<void> => {
  if (!isClient()) return;
  try {
    await del(key);
  } catch {
    /* ignore storage errors */
  }
};

export const getAccent = async (): Promise<string> =>
  readFromIdb<string>('accent', DEFAULT_SETTINGS.accent);

export const setAccent = async (accent: string): Promise<void> => {
  await writeToIdb('accent', accent);
};

export const getWallpaper = async (): Promise<string> =>
  readFromIdb<string>('bg-image', DEFAULT_SETTINGS.wallpaper);

export const setWallpaper = async (wallpaper: string): Promise<void> => {
  await writeToIdb('bg-image', wallpaper);
};

export const getUseKaliWallpaper = async (): Promise<boolean> =>
  readBoolean(getLocalStorage(), 'use-kali-wallpaper', DEFAULT_SETTINGS.useKaliWallpaper);

export const setUseKaliWallpaper = async (value: boolean): Promise<void> => {
  writeBoolean(getLocalStorage(), 'use-kali-wallpaper', value);
};

export const getDensity = async (): Promise<DensitySetting> =>
  readString(getLocalStorage(), 'density', DEFAULT_SETTINGS.density);

export const setDensity = async (density: DensitySetting): Promise<void> => {
  const storage = getLocalStorage();
  if (storage) {
    storage.setItem('density', density);
  }
};

export const getReducedMotion = async (): Promise<boolean> => {
  if (!isClient()) return DEFAULT_SETTINGS.reducedMotion;
  const storage = getLocalStorage();
  if (storage) {
    const stored = storage.getItem('reduced-motion');
    if (stored !== null) {
      return stored === 'true';
    }
  }
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? DEFAULT_SETTINGS.reducedMotion;
};

export const setReducedMotion = async (value: boolean): Promise<void> => {
  writeBoolean(getLocalStorage(), 'reduced-motion', value);
};

export const getFontScale = async (): Promise<number> =>
  readNumber(getLocalStorage(), 'font-scale', DEFAULT_SETTINGS.fontScale);

export const setFontScale = async (scale: number): Promise<void> => {
  const storage = getLocalStorage();
  if (storage) {
    storage.setItem('font-scale', String(scale));
  }
};

export const getHighContrast = async (): Promise<boolean> =>
  readBoolean(getLocalStorage(), 'high-contrast', DEFAULT_SETTINGS.highContrast);

export const setHighContrast = async (value: boolean): Promise<void> => {
  writeBoolean(getLocalStorage(), 'high-contrast', value);
};

export const getLargeHitAreas = async (): Promise<boolean> =>
  readBoolean(getLocalStorage(), 'large-hit-areas', DEFAULT_SETTINGS.largeHitAreas);

export const setLargeHitAreas = async (value: boolean): Promise<void> => {
  writeBoolean(getLocalStorage(), 'large-hit-areas', value);
};

export const getHaptics = async (): Promise<boolean> =>
  readBoolean(getLocalStorage(), 'haptics', DEFAULT_SETTINGS.haptics);

export const setHaptics = async (value: boolean): Promise<void> => {
  writeBoolean(getLocalStorage(), 'haptics', value);
};

export const getPongSpin = async (): Promise<boolean> =>
  readBoolean(getLocalStorage(), 'pong-spin', DEFAULT_SETTINGS.pongSpin);

export const setPongSpin = async (value: boolean): Promise<void> => {
  writeBoolean(getLocalStorage(), 'pong-spin', value);
};

export const getAllowNetwork = async (): Promise<boolean> =>
  readBoolean(getLocalStorage(), 'allow-network', DEFAULT_SETTINGS.allowNetwork);

export const setAllowNetwork = async (value: boolean): Promise<void> => {
  writeBoolean(getLocalStorage(), 'allow-network', value);
};

export const resetSettings = async (): Promise<void> => {
  const storage = getLocalStorage();
  if (!storage) return;
  await Promise.all([
    deleteFromIdb('accent'),
    deleteFromIdb('bg-image'),
  ]);
  storage.removeItem('density');
  storage.removeItem('reduced-motion');
  storage.removeItem('font-scale');
  storage.removeItem('high-contrast');
  storage.removeItem('large-hit-areas');
  storage.removeItem('pong-spin');
  storage.removeItem('allow-network');
  storage.removeItem('haptics');
  storage.removeItem('use-kali-wallpaper');
};

export const exportSettings = async (): Promise<string> => {
  const [
    accent,
    wallpaper,
    useKaliWallpaper,
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
    getUseKaliWallpaper(),
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
  const snapshot: SettingsSnapshot = {
    accent,
    wallpaper,
    useKaliWallpaper,
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
  return JSON.stringify(snapshot);
};

export const importSettings = async (
  json: string | SettingsImportPayload,
): Promise<void> => {
  if (!isClient()) return;
  let settings: SettingsImportPayload;
  try {
    settings = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (error) {
    console.error('Invalid settings', error);
    return;
  }

  const {
    accent,
    wallpaper,
    useKaliWallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
  } = settings;

  if (accent !== undefined) await setAccent(accent);
  if (wallpaper !== undefined) await setWallpaper(wallpaper);
  if (useKaliWallpaper !== undefined) await setUseKaliWallpaper(!!useKaliWallpaper);
  if (density !== undefined) await setDensity(density);
  if (reducedMotion !== undefined) await setReducedMotion(!!reducedMotion);
  if (fontScale !== undefined) await setFontScale(Number(fontScale));
  if (highContrast !== undefined) await setHighContrast(!!highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(!!largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(!!pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(!!allowNetwork);
  if (haptics !== undefined) await setHaptics(!!haptics);
  if (theme !== undefined) setTheme(theme);
};

export const defaults = DEFAULT_SETTINGS;
