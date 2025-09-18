"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const DEFAULT_SETTINGS = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  density: 'regular',
  reducedMotion: false,
  fontScale: 1,
  scalePreset: 'balanced',
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
};

const safeLocalStorageGet = (key, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const safeLocalStorageSet = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore storage failures (private mode, SSR, etc.)
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
  return safeLocalStorageGet('density', DEFAULT_SETTINGS.density);
}

export async function setDensity(density) {
  safeLocalStorageSet('density', density);
}

export async function getScalePreset() {
  return safeLocalStorageGet('scale-preset', DEFAULT_SETTINGS.scalePreset);
}

export async function setScalePreset(scale) {
  safeLocalStorageSet('scale-preset', scale);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const stored = safeLocalStorageGet('reduced-motion', null);
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  safeLocalStorageSet('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  const stored = safeLocalStorageGet('font-scale', null);
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  safeLocalStorageSet('font-scale', String(scale));
}

export async function getHighContrast() {
  return safeLocalStorageGet('high-contrast', 'false') === 'true';
}

export async function setHighContrast(value) {
  safeLocalStorageSet('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  return safeLocalStorageGet('large-hit-areas', 'false') === 'true';
}

export async function setLargeHitAreas(value) {
  safeLocalStorageSet('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  const val = safeLocalStorageGet('haptics', null);
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  safeLocalStorageSet('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  const val = safeLocalStorageGet('pong-spin', null);
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  safeLocalStorageSet('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  return safeLocalStorageGet('allow-network', 'false') === 'true';
}

export async function setAllowNetwork(value) {
  safeLocalStorageSet('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  try {
    const { localStorage } = window;
    localStorage.removeItem('density');
    localStorage.removeItem('scale-preset');
    localStorage.removeItem('reduced-motion');
    localStorage.removeItem('font-scale');
    localStorage.removeItem('high-contrast');
    localStorage.removeItem('large-hit-areas');
    localStorage.removeItem('pong-spin');
    localStorage.removeItem('allow-network');
    localStorage.removeItem('haptics');
  } catch {
    // ignore storage failures during reset
  }
}

export async function exportSettings() {
  const [
    accent,
    wallpaper,
    density,
    reducedMotion,
    fontScale,
    scalePreset,
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
    getScalePreset(),
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
    scalePreset,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
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
    scalePreset,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
  } = settings;
  if (accent !== undefined) await setAccent(accent);
  if (wallpaper !== undefined) await setWallpaper(wallpaper);
  if (density !== undefined) await setDensity(density);
  if (reducedMotion !== undefined) await setReducedMotion(reducedMotion);
  if (fontScale !== undefined) await setFontScale(fontScale);
  if (scalePreset !== undefined) await setScalePreset(scalePreset);
  if (highContrast !== undefined) await setHighContrast(highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(allowNetwork);
  if (haptics !== undefined) await setHaptics(haptics);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
