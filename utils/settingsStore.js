"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const DEFAULT_SETTINGS = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  // default wallpaper for individual workspaces
  wallpapers: ['wall-2', 'wall-2', 'wall-2'],
  // whether all workspaces share the same wallpaper
  useSameWallpaper: true,
  density: 'regular',
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
};

export async function getAccent() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  return (await get('accent')) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (typeof window === 'undefined') return;
  await set('accent', accent);
}

// Retrieve wallpapers for all workspaces
export async function getWallpapers() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpapers;
  const stored = await get('bg-images');
  if (stored) return stored;
  const single = await get('bg-image');
  return single ? [single] : DEFAULT_SETTINGS.wallpapers;
}

// Persist wallpapers for all workspaces
export async function setWallpapers(wallpapers) {
  if (typeof window === 'undefined') return;
  await set('bg-images', wallpapers);
  // store first wallpaper for backwards compatibility
  await set('bg-image', wallpapers[0]);
}

// Whether all workspaces share the same wallpaper
export async function getUseSameWallpaper() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.useSameWallpaper;
  const val = window.localStorage.getItem('same-wallpaper');
  return val === null ? DEFAULT_SETTINGS.useSameWallpaper : val === 'true';
}

export async function setUseSameWallpaper(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('same-wallpaper', value ? 'true' : 'false');
}

// Legacy single wallpaper helpers
export async function getWallpaper() {
  const wallpapers = await getWallpapers();
  return wallpapers[0];
}

export async function setWallpaper(wallpaper) {
  await setWallpapers([wallpaper]);
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
    del('bg-images'),
  ]);
  window.localStorage.removeItem('density');
  window.localStorage.removeItem('reduced-motion');
  window.localStorage.removeItem('font-scale');
  window.localStorage.removeItem('high-contrast');
  window.localStorage.removeItem('large-hit-areas');
  window.localStorage.removeItem('pong-spin');
  window.localStorage.removeItem('allow-network');
  window.localStorage.removeItem('haptics');
  window.localStorage.removeItem('same-wallpaper');
}

export async function exportSettings() {
  const [
    accent,
    wallpapers,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    useSameWallpaper,
  ] = await Promise.all([
    getAccent(),
    getWallpapers(),
    getDensity(),
    getReducedMotion(),
    getFontScale(),
    getHighContrast(),
    getLargeHitAreas(),
    getPongSpin(),
    getAllowNetwork(),
    getHaptics(),
    getUseSameWallpaper(),
  ]);
  const theme = getTheme();
  return JSON.stringify({
    accent,
    wallpaper: wallpapers[0],
    wallpapers,
    useSameWallpaper,
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
    wallpapers,
    useSameWallpaper,
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
  if (wallpapers !== undefined) await setWallpapers(wallpapers);
  else if (wallpaper !== undefined) await setWallpaper(wallpaper);
  if (useSameWallpaper !== undefined) await setUseSameWallpaper(useSameWallpaper);
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
