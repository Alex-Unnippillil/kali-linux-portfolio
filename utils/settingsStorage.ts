"use client";

import { get, set, del } from 'idb-keyval';
import { z } from 'zod';

import { createLogger } from '../lib/logger';
import { getTheme, setTheme } from './theme';

const settingsLogger = createLogger('settings-storage');

export const DEFAULT_SETTINGS = {
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
} as const;

export const defaults = DEFAULT_SETTINGS;

type Density = (typeof DEFAULT_SETTINGS)['density'];

const booleanStringSchema = z.enum(['true', 'false']);
const densitySchema = z.enum(['regular', 'compact']);
const fontScaleSchema = z.coerce.number().finite().min(0.5).max(3);
const accentSchema = z.string().min(1);
const wallpaperSchema = z.string().min(1);

const settingsImportSchema = z.object({
  accent: accentSchema.optional(),
  wallpaper: wallpaperSchema.optional(),
  useKaliWallpaper: z.boolean().optional(),
  density: densitySchema.optional(),
  reducedMotion: z.boolean().optional(),
  fontScale: z.number().min(0.5).max(3).optional(),
  highContrast: z.boolean().optional(),
  largeHitAreas: z.boolean().optional(),
  pongSpin: z.boolean().optional(),
  allowNetwork: z.boolean().optional(),
  haptics: z.boolean().optional(),
  theme: z.string().min(1).optional(),
});

let hasLoggedStorageWarning = false;

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

function getLocalStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    if (!hasLoggedStorageWarning) {
      settingsLogger.warn('Local storage unavailable; using defaults', {
        reason: toErrorMessage(error),
      });
      hasLoggedStorageWarning = true;
    }
    return null;
  }
}

const readBooleanSetting = async (key: string, defaultValue: boolean): Promise<boolean> => {
  const storage = getLocalStorage();
  if (!storage) return defaultValue;
  const raw = storage.getItem(key);
  if (raw === null) return defaultValue;
  const parsed = booleanStringSchema.safeParse(raw);
  if (!parsed.success) {
    settingsLogger.warn('Reset invalid boolean setting', { key, raw });
    storage.removeItem(key);
    return defaultValue;
  }
  return parsed.data === 'true';
};

const writeBooleanSetting = async (key: string, value: boolean): Promise<void> => {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem(key, value ? 'true' : 'false');
};

const readDensitySetting = async (): Promise<Density> => {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.density;
  const raw = storage.getItem('density');
  if (raw === null) return DEFAULT_SETTINGS.density;
  const parsed = densitySchema.safeParse(raw);
  if (!parsed.success) {
    settingsLogger.warn('Reset invalid density', { raw });
    storage.removeItem('density');
    return DEFAULT_SETTINGS.density;
  }
  return parsed.data;
};

const readFontScaleSetting = async (): Promise<number> => {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.fontScale;
  const raw = storage.getItem('font-scale');
  if (raw === null) return DEFAULT_SETTINGS.fontScale;
  const parsed = fontScaleSchema.safeParse(raw);
  if (!parsed.success) {
    settingsLogger.warn('Reset invalid font scale', { raw });
    storage.removeItem('font-scale');
    return DEFAULT_SETTINGS.fontScale;
  }
  return parsed.data;
};

export async function getAccent(): Promise<string> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  const raw = await get('accent');
  if (raw === undefined || raw === null) return DEFAULT_SETTINGS.accent;
  const parsed = accentSchema.safeParse(raw);
  if (!parsed.success) {
    settingsLogger.warn('Reset invalid accent value', { raw });
    await del('accent');
    return DEFAULT_SETTINGS.accent;
  }
  return parsed.data;
}

export async function setAccent(accent: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const parsed = accentSchema.safeParse(accent);
  if (!parsed.success) {
    settingsLogger.warn('Rejected invalid accent update', { accent });
    return;
  }
  await set('accent', parsed.data);
}

export async function getWallpaper(): Promise<string> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  const raw = await get('bg-image');
  if (raw === undefined || raw === null) return DEFAULT_SETTINGS.wallpaper;
  const parsed = wallpaperSchema.safeParse(raw);
  if (!parsed.success) {
    settingsLogger.warn('Reset invalid wallpaper value', { raw });
    await del('bg-image');
    return DEFAULT_SETTINGS.wallpaper;
  }
  return parsed.data;
}

export async function setWallpaper(wallpaper: string): Promise<void> {
  if (typeof window === 'undefined') return;
  const parsed = wallpaperSchema.safeParse(wallpaper);
  if (!parsed.success) {
    settingsLogger.warn('Rejected invalid wallpaper update', { wallpaper });
    return;
  }
  await set('bg-image', parsed.data);
}

export async function getUseKaliWallpaper(): Promise<boolean> {
  return readBooleanSetting('use-kali-wallpaper', DEFAULT_SETTINGS.useKaliWallpaper);
}

export async function setUseKaliWallpaper(value: boolean): Promise<void> {
  await writeBooleanSetting('use-kali-wallpaper', value);
}

export async function getDensity(): Promise<Density> {
  return readDensitySetting();
}

export async function setDensity(density: Density): Promise<void> {
  const storage = getLocalStorage();
  if (!storage) return;
  const parsed = densitySchema.safeParse(density);
  if (!parsed.success) {
    settingsLogger.warn('Rejected invalid density update', { density });
    return;
  }
  storage.setItem('density', parsed.data);
}

export async function getReducedMotion(): Promise<boolean> {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const storage = getLocalStorage();
  if (storage) {
    const raw = storage.getItem('reduced-motion');
    if (raw !== null) {
      const parsed = booleanStringSchema.safeParse(raw);
      if (parsed.success) {
        return parsed.data === 'true';
      }
      settingsLogger.warn('Reset invalid reduced-motion value', { raw });
      storage.removeItem('reduced-motion');
    }
  }
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return DEFAULT_SETTINGS.reducedMotion;
}

export async function setReducedMotion(value: boolean): Promise<void> {
  await writeBooleanSetting('reduced-motion', value);
}

export async function getFontScale(): Promise<number> {
  return readFontScaleSetting();
}

export async function setFontScale(scale: number): Promise<void> {
  const storage = getLocalStorage();
  if (!storage) return;
  const parsed = fontScaleSchema.safeParse(scale);
  if (!parsed.success) {
    settingsLogger.warn('Rejected invalid font scale update', { scale });
    return;
  }
  storage.setItem('font-scale', String(parsed.data));
}

export async function getHighContrast(): Promise<boolean> {
  return readBooleanSetting('high-contrast', DEFAULT_SETTINGS.highContrast);
}

export async function setHighContrast(value: boolean): Promise<void> {
  await writeBooleanSetting('high-contrast', value);
}

export async function getLargeHitAreas(): Promise<boolean> {
  return readBooleanSetting('large-hit-areas', DEFAULT_SETTINGS.largeHitAreas);
}

export async function setLargeHitAreas(value: boolean): Promise<void> {
  await writeBooleanSetting('large-hit-areas', value);
}

export async function getHaptics(): Promise<boolean> {
  return readBooleanSetting('haptics', DEFAULT_SETTINGS.haptics);
}

export async function setHaptics(value: boolean): Promise<void> {
  await writeBooleanSetting('haptics', value);
}

export async function getPongSpin(): Promise<boolean> {
  return readBooleanSetting('pong-spin', DEFAULT_SETTINGS.pongSpin);
}

export async function setPongSpin(value: boolean): Promise<void> {
  await writeBooleanSetting('pong-spin', value);
}

export async function getAllowNetwork(): Promise<boolean> {
  return readBooleanSetting('allow-network', DEFAULT_SETTINGS.allowNetwork);
}

export async function setAllowNetwork(value: boolean): Promise<void> {
  await writeBooleanSetting('allow-network', value);
}

export async function resetSettings(): Promise<void> {
  const storage = getLocalStorage();
  if (!storage) return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  const keys = [
    'density',
    'reduced-motion',
    'font-scale',
    'high-contrast',
    'large-hit-areas',
    'pong-spin',
    'allow-network',
    'haptics',
    'use-kali-wallpaper',
  ];
  keys.forEach((key) => storage.removeItem(key));
}

export async function exportSettings(): Promise<string> {
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
  return JSON.stringify({
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
    useKaliWallpaper,
    theme,
  });
}

export async function importSettings(json: unknown): Promise<void> {
  if (typeof window === 'undefined') return;
  let payload: unknown = json;
  if (typeof json === 'string') {
    try {
      payload = JSON.parse(json);
    } catch (error) {
      settingsLogger.error('Invalid settings payload', { reason: toErrorMessage(error) });
      return;
    }
  }
  const parsed = settingsImportSchema.safeParse(payload);
  if (!parsed.success) {
    settingsLogger.error('Invalid settings payload', { issues: parsed.error.issues });
    return;
  }
  const settings = parsed.data;
  if (settings.accent !== undefined) await setAccent(settings.accent);
  if (settings.wallpaper !== undefined) await setWallpaper(settings.wallpaper);
  if (settings.useKaliWallpaper !== undefined) await setUseKaliWallpaper(settings.useKaliWallpaper);
  if (settings.density !== undefined) await setDensity(settings.density);
  if (settings.reducedMotion !== undefined) await setReducedMotion(settings.reducedMotion);
  if (settings.fontScale !== undefined) await setFontScale(settings.fontScale);
  if (settings.highContrast !== undefined) await setHighContrast(settings.highContrast);
  if (settings.largeHitAreas !== undefined) await setLargeHitAreas(settings.largeHitAreas);
  if (settings.pongSpin !== undefined) await setPongSpin(settings.pongSpin);
  if (settings.allowNetwork !== undefined) await setAllowNetwork(settings.allowNetwork);
  if (settings.haptics !== undefined) await setHaptics(settings.haptics);
  if (settings.theme !== undefined) setTheme(settings.theme);
}
