"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const DEFAULT_SETTINGS = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  density: 'regular',
  reducedMotion: false,
  uiScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
};

function getSafeLocalStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
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

export async function getDensity() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.density;
  return storage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  storage.setItem('density', density);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const storage = getSafeLocalStorage();
  const stored = storage?.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  storage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getUiScale() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.uiScale;
  const stored = storage.getItem('ui-scale');
  if (stored) {
    const parsed = parseFloat(stored);
    if (!Number.isNaN(parsed)) {
      return Math.min(Math.max(parsed, 1), 2);
    }
  }
  const legacy = storage.getItem('font-scale');
  if (legacy) {
    const parsed = parseFloat(legacy);
    if (!Number.isNaN(parsed)) {
      const clamped = Math.min(Math.max(parsed, 1), 2);
      storage.setItem('ui-scale', String(clamped));
      storage.removeItem('font-scale');
      return clamped;
    }
  }
  return DEFAULT_SETTINGS.uiScale;
}

export async function setUiScale(scale) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  const clamped = Math.min(Math.max(scale, 1), 2);
  storage.setItem('ui-scale', String(clamped));
}

export async function getHighContrast() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.highContrast;
  return storage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  storage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.largeHitAreas;
  return storage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  storage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.haptics;
  const val = storage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  storage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.pongSpin;
  const val = storage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  storage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.allowNetwork;
  return storage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  storage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  const storage = getSafeLocalStorage();
  if (!storage) return;
  storage.removeItem('density');
  storage.removeItem('reduced-motion');
  storage.removeItem('font-scale');
  storage.removeItem('ui-scale');
  storage.removeItem('high-contrast');
  storage.removeItem('large-hit-areas');
  storage.removeItem('pong-spin');
  storage.removeItem('allow-network');
  storage.removeItem('haptics');
}

export async function exportSettings() {
  const [
    accent,
    wallpaper,
    density,
    reducedMotion,
    uiScale,
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
    getUiScale(),
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
    uiScale,
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
    uiScale,
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
  if (uiScale !== undefined) await setUiScale(uiScale);
  else if (settings.fontScale !== undefined) {
    await setUiScale(settings.fontScale);
  }
  if (highContrast !== undefined) await setHighContrast(highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(allowNetwork);
  if (haptics !== undefined) await setHaptics(haptics);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
