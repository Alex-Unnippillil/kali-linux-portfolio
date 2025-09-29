"use client";

import { get, set, del } from 'idb-keyval';
import { z } from 'zod';
import { getTheme, setTheme } from './theme';

export const SETTINGS_VERSION = 1;

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
};

const booleanField = z.coerce.boolean();

const settingsDataSchema = z
  .object({
    accent: z.string().min(1),
    wallpaper: z.string().min(1),
    useKaliWallpaper: booleanField,
    density: z
      .enum(['regular', 'compact'])
      .catch(DEFAULT_SETTINGS.density),
    reducedMotion: booleanField,
    fontScale: z.coerce.number(),
    highContrast: booleanField,
    largeHitAreas: booleanField,
    pongSpin: booleanField,
    allowNetwork: booleanField,
    haptics: booleanField,
    theme: z.string().min(1).catch('default'),
  })
  .strip();

const settingsFileSchema = z
  .object({
    version: z.literal(SETTINGS_VERSION),
    exportedAt: z.string().datetime().optional(),
    data: settingsDataSchema,
  })
  .or(settingsDataSchema);

const toSettingsData = (parsed) =>
  'data' in parsed ? parsed.data : parsed;

export const defaults = DEFAULT_SETTINGS;

export async function getSettingsSnapshot() {
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
  const data = {
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

  return {
    version: SETTINGS_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

export async function exportSettings() {
  const snapshot = await getSettingsSnapshot();
  return JSON.stringify(snapshot, null, 2);
}

export function parseSettings(json) {
  try {
    const raw = typeof json === 'string' ? JSON.parse(json) : json;
    const parsed = settingsFileSchema.parse(raw);
    const data = settingsDataSchema.parse(toSettingsData(parsed));
    return {
      success: true,
      data,
      metadata: {
        version: 'version' in parsed ? parsed.version : 0,
        exportedAt:
          'version' in parsed && parsed.exportedAt ? parsed.exportedAt : null,
      },
    };
  } catch (error) {
    console.error('Invalid settings payload', error);
    return {
      success: false,
      error: 'invalid-settings',
    };
  }
}

async function applySettingsData(data) {
  if (typeof window === 'undefined') return;
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
  } = data;

  await Promise.all([
    accent !== undefined ? setAccent(accent) : Promise.resolve(),
    wallpaper !== undefined ? setWallpaper(wallpaper) : Promise.resolve(),
    useKaliWallpaper !== undefined
      ? setUseKaliWallpaper(useKaliWallpaper)
      : Promise.resolve(),
    density !== undefined ? setDensity(density) : Promise.resolve(),
    reducedMotion !== undefined
      ? setReducedMotion(reducedMotion)
      : Promise.resolve(),
    fontScale !== undefined ? setFontScale(fontScale) : Promise.resolve(),
    highContrast !== undefined
      ? setHighContrast(highContrast)
      : Promise.resolve(),
    largeHitAreas !== undefined
      ? setLargeHitAreas(largeHitAreas)
      : Promise.resolve(),
    pongSpin !== undefined ? setPongSpin(pongSpin) : Promise.resolve(),
    allowNetwork !== undefined
      ? setAllowNetwork(allowNetwork)
      : Promise.resolve(),
    haptics !== undefined ? setHaptics(haptics) : Promise.resolve(),
  ]);
  if (theme !== undefined) setTheme(theme);
}

export async function importSettings(json) {
  const result = parseSettings(json);
  if (!result.success) {
    return result;
  }
  await applySettingsData(result.data);
  return result;
}

export async function applySettingsFromData(data) {
  await applySettingsData(settingsDataSchema.parse(data));
}

export async function getAccent() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  return (await get('accent')) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (typeof window === 'undefined') return;
  await set('accent', accent);
}

export async function getWallpaper() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  return (await get('bg-image')) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper) {
  if (typeof window === 'undefined') return;
  await set('bg-image', wallpaper);
}

export async function getUseKaliWallpaper() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.useKaliWallpaper;
  const stored = window.localStorage.getItem('use-kali-wallpaper');
  return stored === null ? DEFAULT_SETTINGS.useKaliWallpaper : stored === 'true';
}

export async function setUseKaliWallpaper(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('use-kali-wallpaper', value ? 'true' : 'false');
}

export async function getDensity() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  return window.localStorage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('density', density);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const stored = window.localStorage.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  const stored = window.localStorage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  return window.localStorage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  return window.localStorage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  const val = window.localStorage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  const val = window.localStorage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  return window.localStorage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  window.localStorage.removeItem('density');
  window.localStorage.removeItem('reduced-motion');
  window.localStorage.removeItem('font-scale');
  window.localStorage.removeItem('high-contrast');
  window.localStorage.removeItem('large-hit-areas');
  window.localStorage.removeItem('pong-spin');
  window.localStorage.removeItem('allow-network');
  window.localStorage.removeItem('haptics');
  window.localStorage.removeItem('use-kali-wallpaper');
}

