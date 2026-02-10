"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

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
  volume: 100,
};

const FONT_SCALE_RANGE = { min: 0.75, max: 1.5 };
const VOLUME_RANGE = { min: 0, max: 100 };
const DENSITY_OPTIONS = new Set(['regular', 'compact']);

const clampNumber = (value, { min, max }) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined;
  return Math.min(max, Math.max(min, value));
};

const normalizeBoolean = (value) => (typeof value === 'boolean' ? value : undefined);

const normalizeString = (value) => (typeof value === 'string' ? value : undefined);

export function normalizeSettingsPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const normalized = {};

  const accent = normalizeString(payload.accent);
  if (accent !== undefined) normalized.accent = accent;

  const wallpaper = normalizeString(payload.wallpaper);
  if (wallpaper !== undefined) normalized.wallpaper = wallpaper;

  const useKaliWallpaper = normalizeBoolean(payload.useKaliWallpaper);
  if (useKaliWallpaper !== undefined) normalized.useKaliWallpaper = useKaliWallpaper;

  const density = normalizeString(payload.density);
  if (density !== undefined && DENSITY_OPTIONS.has(density)) {
    normalized.density = density;
  }

  const reducedMotion = normalizeBoolean(payload.reducedMotion);
  if (reducedMotion !== undefined) normalized.reducedMotion = reducedMotion;

  const fontScale = clampNumber(payload.fontScale, FONT_SCALE_RANGE);
  if (fontScale !== undefined) normalized.fontScale = fontScale;

  const highContrast = normalizeBoolean(payload.highContrast);
  if (highContrast !== undefined) normalized.highContrast = highContrast;

  const largeHitAreas = normalizeBoolean(payload.largeHitAreas);
  if (largeHitAreas !== undefined) normalized.largeHitAreas = largeHitAreas;

  const pongSpin = normalizeBoolean(payload.pongSpin);
  if (pongSpin !== undefined) normalized.pongSpin = pongSpin;

  const allowNetwork = normalizeBoolean(payload.allowNetwork);
  if (allowNetwork !== undefined) normalized.allowNetwork = allowNetwork;

  const haptics = normalizeBoolean(payload.haptics);
  if (haptics !== undefined) normalized.haptics = haptics;

  const volume = clampNumber(payload.volume, VOLUME_RANGE);
  if (volume !== undefined) normalized.volume = volume;

  const theme = normalizeString(payload.theme);
  if (theme !== undefined) normalized.theme = theme;

  return normalized;
}

let hasLoggedStorageWarning = false;

function getLocalStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    if (process.env.NODE_ENV === 'development' && !hasLoggedStorageWarning) {
      console.warn(
        'Local storage is not available; falling back to default settings.',
        error
      );
      hasLoggedStorageWarning = true;
    }
    return null;
  }
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
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.useKaliWallpaper;
  const stored = storage.getItem('use-kali-wallpaper');
  return stored === null ? DEFAULT_SETTINGS.useKaliWallpaper : stored === 'true';
}

export async function setUseKaliWallpaper(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('use-kali-wallpaper', value ? 'true' : 'false');
}

export async function getDensity() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.density;
  return storage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('density', density);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const storage = getLocalStorage();
  if (storage) {
    const stored = storage.getItem('reduced-motion');
    if (stored !== null) {
      return stored === 'true';
    }
  }
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return DEFAULT_SETTINGS.reducedMotion;
}

export async function setReducedMotion(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.fontScale;
  const stored = storage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.highContrast;
  return storage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.largeHitAreas;
  return storage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.haptics;
  const val = storage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.pongSpin;
  const val = storage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.allowNetwork;
  const stored = storage.getItem('allow-network');
  if (stored === null) {
    // Default to blocking network requests and persist for future runs.
    storage.setItem('allow-network', 'false');
    return false;
  }
  return stored === 'true';
}

export async function setAllowNetwork(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('allow-network', value ? 'true' : 'false');
}

export async function getVolume() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.volume;
  const stored = storage.getItem('volume');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.volume;
}

export async function setVolume(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('volume', String(value));
}

export async function resetSettings() {
  const storage = getLocalStorage();
  if (!storage) return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
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
  storage.removeItem('volume');
}

export async function exportSettings() {
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
    volume,
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
    getVolume(),
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
    volume,
    useKaliWallpaper,
    theme,
  });
}

export async function importSettings(json) {
  if (typeof window === 'undefined') return;
  let settings;
  try {
    settings = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (e) {
    console.error('Invalid settings', e);
    return;
  }
  const normalized = normalizeSettingsPayload(settings);
  if (!normalized) return null;
  if (Object.prototype.hasOwnProperty.call(normalized, 'accent')) {
    await setAccent(normalized.accent);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'wallpaper')) {
    await setWallpaper(normalized.wallpaper);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'useKaliWallpaper')) {
    await setUseKaliWallpaper(normalized.useKaliWallpaper);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'density')) {
    await setDensity(normalized.density);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'reducedMotion')) {
    await setReducedMotion(normalized.reducedMotion);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'fontScale')) {
    await setFontScale(normalized.fontScale);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'highContrast')) {
    await setHighContrast(normalized.highContrast);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'largeHitAreas')) {
    await setLargeHitAreas(normalized.largeHitAreas);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'pongSpin')) {
    await setPongSpin(normalized.pongSpin);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'allowNetwork')) {
    await setAllowNetwork(normalized.allowNetwork);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'haptics')) {
    await setHaptics(normalized.haptics);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'volume')) {
    await setVolume(normalized.volume);
  }
  if (Object.prototype.hasOwnProperty.call(normalized, 'theme')) {
    setTheme(normalized.theme);
  }
  return normalized;
}

export const defaults = DEFAULT_SETTINGS;
