"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const DENSITY_STORAGE_KEY = 'density-map';
const LEGACY_DENSITY_KEY = 'density';

const DEFAULT_DENSITY = 'regular';

const DEFAULT_DENSITY_PREFERENCES = Object.freeze({
  small: DEFAULT_DENSITY,
  medium: DEFAULT_DENSITY,
  large: DEFAULT_DENSITY,
});

const DEFAULT_SETTINGS = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  useKaliWallpaper: false,
  density: DEFAULT_DENSITY,
  densityPreferences: DEFAULT_DENSITY_PREFERENCES,
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
};

let hasLoggedStorageWarning = false;

function getLocalStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !hasLoggedStorageWarning) {
      console.warn(
        'Local storage is not available; falling back to default settings.',
        error
      );
      hasLoggedStorageWarning = true;
    }
    return null;
  }
}

function isDensity(value) {
  return value === 'regular' || value === 'compact';
}

function normalizeDensityPreferences(preferences = {}) {
  const entries = Object.entries(DEFAULT_DENSITY_PREFERENCES).map(([key, fallback]) => {
    const value = preferences[key];
    return [key, isDensity(value) ? value : fallback];
  });
  return Object.fromEntries(entries);
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

export async function getDensityPreferences() {
  const storage = getLocalStorage();
  if (!storage) return normalizeDensityPreferences();
  const stored = storage.getItem(DENSITY_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return normalizeDensityPreferences(parsed);
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Invalid density preferences; falling back to defaults.', error);
      }
    }
  }
  const legacy = storage.getItem(LEGACY_DENSITY_KEY);
  if (legacy && isDensity(legacy)) {
    return normalizeDensityPreferences({
      small: legacy,
      medium: legacy,
      large: legacy,
    });
  }
  return normalizeDensityPreferences();
}

export async function setDensityPreferences(preferences) {
  const storage = getLocalStorage();
  if (!storage) return;
  const normalized = normalizeDensityPreferences(preferences);
  try {
    storage.setItem(DENSITY_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Failed to persist density preferences', error);
    }
  }
}

export async function getDensity() {
  const preferences = await getDensityPreferences();
  return preferences.large;
}

export async function setDensity(density) {
  const next = normalizeDensityPreferences({
    small: density,
    medium: density,
    large: density,
  });
  await setDensityPreferences(next);
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
  return storage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  storage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  const storage = getLocalStorage();
  if (!storage) return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  storage.removeItem(DENSITY_STORAGE_KEY);
  storage.removeItem('density');
  storage.removeItem('reduced-motion');
  storage.removeItem('font-scale');
  storage.removeItem('high-contrast');
  storage.removeItem('large-hit-areas');
  storage.removeItem('pong-spin');
  storage.removeItem('allow-network');
  storage.removeItem('haptics');
  storage.removeItem('use-kali-wallpaper');
}

export async function exportSettings() {
  const [
    accent,
    wallpaper,
    useKaliWallpaper,
    densityPreferences,
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
    getDensityPreferences(),
    getReducedMotion(),
    getFontScale(),
    getHighContrast(),
    getLargeHitAreas(),
    getPongSpin(),
    getAllowNetwork(),
    getHaptics(),
  ]);
  const theme = getTheme();
  const density = densityPreferences.large;
  return JSON.stringify({
    accent,
    wallpaper,
    density,
    densityPreferences,
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

export async function importSettings(json) {
  if (typeof window === 'undefined') return;
  let settings;
  try {
    settings = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (e) {
    console.error('Invalid settings', e);
    return;
  }
  const {
    accent,
    wallpaper,
    useKaliWallpaper,
    density,
    densityPreferences,
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
  if (useKaliWallpaper !== undefined) await setUseKaliWallpaper(useKaliWallpaper);
  if (densityPreferences !== undefined) await setDensityPreferences(densityPreferences);
  else if (density !== undefined) await setDensity(density);
  if (reducedMotion !== undefined) await setReducedMotion(reducedMotion);
  if (fontScale !== undefined) await setFontScale(fontScale);
  if (highContrast !== undefined) await setHighContrast(highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(allowNetwork);
  if (haptics !== undefined) await setHaptics(haptics);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
