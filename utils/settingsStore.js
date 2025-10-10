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
  bootAnimationPreference: 'default',
};

export const BOOT_ANIMATION_OPTIONS = ['skip', 'short', 'default', 'long'];

export const BOOT_ANIMATION_DURATIONS = {
  skip: 0,
  short: 1000,
  default: 2000,
  long: 4000,
};

const BOOT_ANIMATION_KEY = 'boot-animation-preference';

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

function isValidBootAnimation(value) {
  return BOOT_ANIMATION_OPTIONS.includes(value);
}

export function getBootAnimationPreferenceSync() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.bootAnimationPreference;
  const stored = storage.getItem(BOOT_ANIMATION_KEY);
  if (!stored) return DEFAULT_SETTINGS.bootAnimationPreference;
  return isValidBootAnimation(stored)
    ? stored
    : DEFAULT_SETTINGS.bootAnimationPreference;
}

export async function getBootAnimationPreference() {
  return getBootAnimationPreferenceSync();
}

export async function setBootAnimationPreference(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  const preference = isValidBootAnimation(value)
    ? value
    : DEFAULT_SETTINGS.bootAnimationPreference;
  storage.setItem(BOOT_ANIMATION_KEY, preference);
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
  storage.removeItem('density');
  storage.removeItem('reduced-motion');
  storage.removeItem('font-scale');
  storage.removeItem('high-contrast');
  storage.removeItem('large-hit-areas');
  storage.removeItem('pong-spin');
  storage.removeItem('allow-network');
  storage.removeItem('haptics');
  storage.removeItem('use-kali-wallpaper');
  storage.removeItem(BOOT_ANIMATION_KEY);
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
    bootAnimationPreference,
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
    getBootAnimationPreference(),
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
    bootAnimationPreference,
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
    bootAnimationPreference,
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
  if (bootAnimationPreference !== undefined) {
    await setBootAnimationPreference(bootAnimationPreference);
  }
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
