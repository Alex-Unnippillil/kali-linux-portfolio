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
  auditLogEnabled: false,
};

const getLocalStorageSafe = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
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

export async function getUseKaliWallpaper() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.useKaliWallpaper;
  const stored = storage.getItem('use-kali-wallpaper');
  return stored === null ? DEFAULT_SETTINGS.useKaliWallpaper : stored === 'true';
}

export async function setUseKaliWallpaper(value) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('use-kali-wallpaper', value ? 'true' : 'false');
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
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.reducedMotion;
  const stored = storage.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

export async function getAuditLogOptIn() {
  const storage = getLocalStorageSafe();
  if (!storage) return DEFAULT_SETTINGS.auditLogEnabled;
  return storage.getItem('audit-log-enabled') === 'true';
}

export async function setAuditLogOptIn(value) {
  const storage = getLocalStorageSafe();
  if (!storage) return;
  storage.setItem('audit-log-enabled', value ? 'true' : 'false');
}

export async function resetSettings() {
  const storage = getLocalStorageSafe();
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
  storage.removeItem('audit-log-enabled');
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
    auditLogEnabled,
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
    getAuditLogOptIn(),
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
    auditLogEnabled,
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
    auditLogEnabled,
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
  if (auditLogEnabled !== undefined) await setAuditLogOptIn(auditLogEnabled);
}

export const defaults = DEFAULT_SETTINGS;
