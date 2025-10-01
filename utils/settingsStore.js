"use client";

import { get, set, del } from 'idb-keyval';
import { safeLocalStorage } from './safeStorage';
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
};

const getLocalItem = (key) => {
  if (!safeLocalStorage) return null;
  try {
    return safeLocalStorage.getItem(key);
  } catch (error) {
    console.warn('Failed to read setting from storage', { key, error });
    return null;
  }
};

const setLocalItem = (key, value) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(key, value);
  } catch (error) {
    console.warn('Failed to persist setting to storage', { key, error });
  }
};

const removeLocalItem = (key) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(key);
  } catch (error) {
    console.warn('Failed to remove setting from storage', { key, error });
  }
};

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
  const stored = getLocalItem('use-kali-wallpaper');
  return stored === null ? DEFAULT_SETTINGS.useKaliWallpaper : stored === 'true';
}

export async function setUseKaliWallpaper(value) {
  if (typeof window === 'undefined') return;
  setLocalItem('use-kali-wallpaper', value ? 'true' : 'false');
}

export async function getDensity() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  return getLocalItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (typeof window === 'undefined') return;
  setLocalItem('density', density);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const stored = getLocalItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  if (typeof window === 'undefined') return;
  setLocalItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  const stored = getLocalItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (typeof window === 'undefined') return;
  setLocalItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  return getLocalItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (typeof window === 'undefined') return;
  setLocalItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  return getLocalItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (typeof window === 'undefined') return;
  setLocalItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  const val = getLocalItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  if (typeof window === 'undefined') return;
  setLocalItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  const val = getLocalItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (typeof window === 'undefined') return;
  setLocalItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  return getLocalItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (typeof window === 'undefined') return;
  setLocalItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  removeLocalItem('density');
  removeLocalItem('reduced-motion');
  removeLocalItem('font-scale');
  removeLocalItem('high-contrast');
  removeLocalItem('large-hit-areas');
  removeLocalItem('pong-spin');
  removeLocalItem('allow-network');
  removeLocalItem('haptics');
  removeLocalItem('use-kali-wallpaper');
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
  if (density !== undefined) await setDensity(density);
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
