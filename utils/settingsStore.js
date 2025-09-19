"use client";

import { get, set, del } from 'idb-keyval';
import { getProfileScopedKey } from './profileKeys';
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
};

export async function getAccent(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  try {
    const key = getProfileScopedKey(profileId, 'accent');
    return (await get(key)) || DEFAULT_SETTINGS.accent;
  } catch {
    return DEFAULT_SETTINGS.accent;
  }
}

export async function setAccent(accent, profileId) {
  if (typeof window === 'undefined') return;
  try {
    await set(getProfileScopedKey(profileId, 'accent'), accent);
  } catch {
    // ignore
  }
}

export async function getWallpaper(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  try {
    const key = getProfileScopedKey(profileId, 'bg-image');
    return (await get(key)) || DEFAULT_SETTINGS.wallpaper;
  } catch {
    return DEFAULT_SETTINGS.wallpaper;
  }
}

export async function setWallpaper(wallpaper, profileId) {
  if (typeof window === 'undefined') return;
  try {
    await set(getProfileScopedKey(profileId, 'bg-image'), wallpaper);
  } catch {
    // ignore
  }
}

export async function getDensity(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  const key = getProfileScopedKey(profileId, 'density');
  return window.localStorage.getItem(key) || DEFAULT_SETTINGS.density;
}

export async function setDensity(density, profileId) {
  if (typeof window === 'undefined') return;
  const key = getProfileScopedKey(profileId, 'density');
  window.localStorage.setItem(key, density);
}

export async function getReducedMotion(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const key = getProfileScopedKey(profileId, 'reduced-motion');
  const stored = window.localStorage.getItem(key);
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value, profileId) {
  if (typeof window === 'undefined') return;
  const key = getProfileScopedKey(profileId, 'reduced-motion');
  window.localStorage.setItem(key, value ? 'true' : 'false');
}

export async function getFontScale(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  const key = getProfileScopedKey(profileId, 'font-scale');
  const stored = window.localStorage.getItem(key);
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale, profileId) {
  if (typeof window === 'undefined') return;
  const key = getProfileScopedKey(profileId, 'font-scale');
  window.localStorage.setItem(key, String(scale));
}

export async function getHighContrast(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  const key = getProfileScopedKey(profileId, 'high-contrast');
  return window.localStorage.getItem(key) === 'true';
}

export async function setHighContrast(value, profileId) {
  if (typeof window === 'undefined') return;
  const key = getProfileScopedKey(profileId, 'high-contrast');
  window.localStorage.setItem(key, value ? 'true' : 'false');
}

export async function getLargeHitAreas(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  const key = getProfileScopedKey(profileId, 'large-hit-areas');
  return window.localStorage.getItem(key) === 'true';
}

export async function setLargeHitAreas(value, profileId) {
  if (typeof window === 'undefined') return;
  const key = getProfileScopedKey(profileId, 'large-hit-areas');
  window.localStorage.setItem(key, value ? 'true' : 'false');
}

export async function getHaptics(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  const key = getProfileScopedKey(profileId, 'haptics');
  const val = window.localStorage.getItem(key);
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value, profileId) {
  if (typeof window === 'undefined') return;
  const key = getProfileScopedKey(profileId, 'haptics');
  window.localStorage.setItem(key, value ? 'true' : 'false');
}

export async function getPongSpin(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  const key = getProfileScopedKey(profileId, 'pong-spin');
  const val = window.localStorage.getItem(key);
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value, profileId) {
  if (typeof window === 'undefined') return;
  const key = getProfileScopedKey(profileId, 'pong-spin');
  window.localStorage.setItem(key, value ? 'true' : 'false');
}

export async function getAllowNetwork(profileId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  const key = getProfileScopedKey(profileId, 'allow-network');
  return window.localStorage.getItem(key) === 'true';
}

export async function setAllowNetwork(value, profileId) {
  if (typeof window === 'undefined') return;
  const key = getProfileScopedKey(profileId, 'allow-network');
  window.localStorage.setItem(key, value ? 'true' : 'false');
}

export async function resetSettings(profileId) {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del(getProfileScopedKey(profileId, 'accent')),
    del(getProfileScopedKey(profileId, 'bg-image')),
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
  ];
  keys.forEach((name) => {
    const scoped = getProfileScopedKey(profileId, name);
    window.localStorage.removeItem(scoped);
  });
}

export async function exportSettings(profileId) {
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
  ] = await Promise.all([
    getAccent(profileId),
    getWallpaper(profileId),
    getDensity(profileId),
    getReducedMotion(profileId),
    getFontScale(profileId),
    getHighContrast(profileId),
    getLargeHitAreas(profileId),
    getPongSpin(profileId),
    getAllowNetwork(profileId),
    getHaptics(profileId),
  ]);
  const theme = getTheme(profileId);
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
    theme,
  });
}

export async function importSettings(json, profileId) {
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
    theme,
  } = settings;
  if (accent !== undefined) await setAccent(accent, profileId);
  if (wallpaper !== undefined) await setWallpaper(wallpaper, profileId);
  if (density !== undefined) await setDensity(density, profileId);
  if (reducedMotion !== undefined) await setReducedMotion(reducedMotion, profileId);
  if (fontScale !== undefined) await setFontScale(fontScale, profileId);
  if (highContrast !== undefined) await setHighContrast(highContrast, profileId);
  if (largeHitAreas !== undefined) await setLargeHitAreas(largeHitAreas, profileId);
  if (pongSpin !== undefined) await setPongSpin(pongSpin, profileId);
  if (allowNetwork !== undefined) await setAllowNetwork(allowNetwork, profileId);
  if (haptics !== undefined) await setHaptics(haptics, profileId);
  if (theme !== undefined) setTheme(theme, profileId);
}

export const defaults = DEFAULT_SETTINGS;
