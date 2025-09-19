"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const DEFAULT_SETTINGS = {
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
  keyboardMode: false,
};

let localStorageWarningLogged = false;
let reducedMotionFallbackLogged = false;
const shouldLogWarning = () =>
  typeof process === 'undefined' || process.env.NODE_ENV !== 'test';

const getLocalStorageSafe = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    if (!localStorageWarningLogged && shouldLogWarning()) {
      console.warn('LocalStorage unavailable, falling back to defaults');
      localStorageWarningLogged = true;
    }
    return null;
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

export async function getDensity() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.density;
  return storage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('density', density);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const storage = getLocalStorageSafe();
  if (storage) {
    const stored = storage.getItem('reduced-motion');
    if (stored !== null) {
      return stored === 'true';
    }
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (error) {
    if (!reducedMotionFallbackLogged && shouldLogWarning()) {
      console.warn('matchMedia unavailable, using default reduced-motion value');
      reducedMotionFallbackLogged = true;
    }
    return DEFAULT_SETTINGS.reducedMotion;
  }
}

export async function setReducedMotion(value) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.fontScale;
  const stored = storage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.highContrast;
  return storage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.largeHitAreas;
  return storage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.haptics;
  const val = storage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('haptics', value ? 'true' : 'false');
}

export async function getKeyboardMode() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.keyboardMode;
  const val = storage.getItem('keyboard-mode');
  return val === null ? DEFAULT_SETTINGS.keyboardMode : val === 'true';
}

export async function setKeyboardMode(value) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('keyboard-mode', value ? 'true' : 'false');
}

export async function getPongSpin() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.pongSpin;
  const val = storage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.allowNetwork;
  return storage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.removeItem('density');
  storage.removeItem('reduced-motion');
  storage.removeItem('font-scale');
  storage.removeItem('high-contrast');
  storage.removeItem('large-hit-areas');
  storage.removeItem('pong-spin');
  storage.removeItem('allow-network');
  storage.removeItem('haptics');
  storage.removeItem('keyboard-mode');
}

export async function exportSettings() {
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
    keyboardMode,
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
    getKeyboardMode(),
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
    keyboardMode,
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
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    keyboardMode,
    theme,
  } = settings;
  if (accent !== undefined) await setAccent(accent);
  if (wallpaper !== undefined) await setWallpaper(wallpaper);
  if (density !== undefined) await setDensity(density);
  if (reducedMotion !== undefined) await setReducedMotion(reducedMotion);
  if (fontScale !== undefined) await setFontScale(fontScale);
  if (highContrast !== undefined) await setHighContrast(highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(allowNetwork);
  if (haptics !== undefined) await setHaptics(haptics);
  if (keyboardMode !== undefined) await setKeyboardMode(keyboardMode);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
