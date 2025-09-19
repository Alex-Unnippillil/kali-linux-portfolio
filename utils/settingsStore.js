"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme, clearTheme } from './theme';

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

const idbKey = (profileId, key) => `${profileId}:${key}`;
const localKey = (profileId, key) => `profile:${profileId}:${key}`;

export async function getAccent(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
  return (await get(idbKey(profileId, 'accent'))) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(profileId = 'default', accent) {
  if (typeof window === 'undefined') return;
  await set(idbKey(profileId, 'accent'), accent);
}

export async function getWallpaper(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
  return (await get(idbKey(profileId, 'bg-image'))) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(profileId = 'default', wallpaper) {
  if (typeof window === 'undefined') return;
  await set(idbKey(profileId, 'bg-image'), wallpaper);
}

export async function getDensity(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  return window.localStorage.getItem(localKey(profileId, 'density')) || DEFAULT_SETTINGS.density;
}

export async function setDensity(profileId = 'default', density) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(profileId, 'density'), density);
}

export async function getReducedMotion(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const stored = window.localStorage.getItem(localKey(profileId, 'reduced-motion'));
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(profileId = 'default', value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(profileId, 'reduced-motion'), value ? 'true' : 'false');
}

export async function getFontScale(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  const stored = window.localStorage.getItem(localKey(profileId, 'font-scale'));
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(profileId = 'default', scale) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(profileId, 'font-scale'), String(scale));
}

export async function getHighContrast(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  return window.localStorage.getItem(localKey(profileId, 'high-contrast')) === 'true';
}

export async function setHighContrast(profileId = 'default', value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(profileId, 'high-contrast'), value ? 'true' : 'false');
}

export async function getLargeHitAreas(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  return window.localStorage.getItem(localKey(profileId, 'large-hit-areas')) === 'true';
}

export async function setLargeHitAreas(profileId = 'default', value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(profileId, 'large-hit-areas'), value ? 'true' : 'false');
}

export async function getHaptics(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  const val = window.localStorage.getItem(localKey(profileId, 'haptics'));
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(profileId = 'default', value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(profileId, 'haptics'), value ? 'true' : 'false');
}

export async function getPongSpin(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  const val = window.localStorage.getItem(localKey(profileId, 'pong-spin'));
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(profileId = 'default', value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(profileId, 'pong-spin'), value ? 'true' : 'false');
}

export async function getAllowNetwork(profileId = 'default') {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  return window.localStorage.getItem(localKey(profileId, 'allow-network')) === 'true';
}

export async function setAllowNetwork(profileId = 'default', value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(localKey(profileId, 'allow-network'), value ? 'true' : 'false');
}

export async function resetSettings(profileId = 'default') {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del(idbKey(profileId, 'accent')),
    del(idbKey(profileId, 'bg-image')),
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
    try {
      window.localStorage.removeItem(localKey(profileId, name));
    } catch {
      /* ignore */
    }
  });
  clearTheme(profileId);
}

export async function exportSettings(profileId = 'default') {
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

export async function importSettings(json, profileId = 'default') {
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
  if (accent !== undefined) await setAccent(profileId, accent);
  if (wallpaper !== undefined) await setWallpaper(profileId, wallpaper);
  if (density !== undefined) await setDensity(profileId, density);
  if (reducedMotion !== undefined) await setReducedMotion(profileId, reducedMotion);
  if (fontScale !== undefined) await setFontScale(profileId, fontScale);
  if (highContrast !== undefined) await setHighContrast(profileId, highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(profileId, largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(profileId, pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(profileId, allowNetwork);
  if (haptics !== undefined) await setHaptics(profileId, haptics);
  if (theme !== undefined) setTheme(profileId, theme);
}

export const defaults = DEFAULT_SETTINGS;
