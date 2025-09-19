"use client";

import { get, set, del } from 'idb-keyval';
import { profileSelector } from './stateProfiler';
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

export async function getAccent() {
  return profileSelector(
    'settingsStore.getAccent',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.accent;
      return (await get('accent')) || DEFAULT_SETTINGS.accent;
    },
    { metadata: { store: 'idb', key: 'accent' } },
  );
}

export async function setAccent(accent) {
  if (typeof window === 'undefined') return;
  await set('accent', accent);
}

export async function getWallpaper() {
  return profileSelector(
    'settingsStore.getWallpaper',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.wallpaper;
      return (await get('bg-image')) || DEFAULT_SETTINGS.wallpaper;
    },
    { metadata: { store: 'idb', key: 'bg-image' } },
  );
}

export async function setWallpaper(wallpaper) {
  if (typeof window === 'undefined') return;
  await set('bg-image', wallpaper);
}

export async function getDensity() {
  return profileSelector(
    'settingsStore.getDensity',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
      try {
        return window.localStorage.getItem('density') || DEFAULT_SETTINGS.density;
      } catch {
        return DEFAULT_SETTINGS.density;
      }
    },
    { metadata: { store: 'localStorage', key: 'density' } },
  );
}

export async function setDensity(density) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('density', density);
}

export async function getReducedMotion() {
  return profileSelector(
    'settingsStore.getReducedMotion',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
      try {
        const stored = window.localStorage.getItem('reduced-motion');
        if (stored !== null) {
          return stored === 'true';
        }
      } catch {
        return DEFAULT_SETTINGS.reducedMotion;
      }
      return (
        window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
        DEFAULT_SETTINGS.reducedMotion
      );
    },
    { metadata: { store: 'localStorage', key: 'reduced-motion' } },
  );
}

export async function setReducedMotion(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  return profileSelector(
    'settingsStore.getFontScale',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
      try {
        const stored = window.localStorage.getItem('font-scale');
        return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
      } catch {
        return DEFAULT_SETTINGS.fontScale;
      }
    },
    { metadata: { store: 'localStorage', key: 'font-scale' } },
  );
}

export async function setFontScale(scale) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  return profileSelector(
    'settingsStore.getHighContrast',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
      try {
        return window.localStorage.getItem('high-contrast') === 'true';
      } catch {
        return DEFAULT_SETTINGS.highContrast;
      }
    },
    { metadata: { store: 'localStorage', key: 'high-contrast' } },
  );
}

export async function setHighContrast(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  return profileSelector(
    'settingsStore.getLargeHitAreas',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
      try {
        return window.localStorage.getItem('large-hit-areas') === 'true';
      } catch {
        return DEFAULT_SETTINGS.largeHitAreas;
      }
    },
    { metadata: { store: 'localStorage', key: 'large-hit-areas' } },
  );
}

export async function setLargeHitAreas(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  return profileSelector(
    'settingsStore.getHaptics',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
      try {
        const val = window.localStorage.getItem('haptics');
        return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
      } catch {
        return DEFAULT_SETTINGS.haptics;
      }
    },
    { metadata: { store: 'localStorage', key: 'haptics' } },
  );
}

export async function setHaptics(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  return profileSelector(
    'settingsStore.getPongSpin',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
      try {
        const val = window.localStorage.getItem('pong-spin');
        return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
      } catch {
        return DEFAULT_SETTINGS.pongSpin;
      }
    },
    { metadata: { store: 'localStorage', key: 'pong-spin' } },
  );
}

export async function setPongSpin(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  return profileSelector(
    'settingsStore.getAllowNetwork',
    async () => {
      if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
      try {
        return window.localStorage.getItem('allow-network') === 'true';
      } catch {
        return DEFAULT_SETTINGS.allowNetwork;
      }
    },
    { metadata: { store: 'localStorage', key: 'allow-network' } },
  );
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
  ]);
  window.localStorage.removeItem('density');
  window.localStorage.removeItem('reduced-motion');
  window.localStorage.removeItem('font-scale');
  window.localStorage.removeItem('high-contrast');
  window.localStorage.removeItem('large-hit-areas');
  window.localStorage.removeItem('pong-spin');
  window.localStorage.removeItem('allow-network');
  window.localStorage.removeItem('haptics');
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
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
