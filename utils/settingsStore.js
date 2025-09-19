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
  desktopGrid: {
    preset: 'comfortable',
    spacing: 32,
  },
};

let cachedStorage;
let storageWarningIssued = false;

const getSafeStorage = () => {
  if (cachedStorage !== undefined) return cachedStorage;
  if (typeof window === 'undefined') {
    cachedStorage = null;
    return cachedStorage;
  }
  try {
    const storage = window.localStorage;
    const testKey = '__settings-test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    cachedStorage = storage;
  } catch (error) {
    cachedStorage = null;
    if (!storageWarningIssued) {
      console.warn('Local storage is unavailable; falling back to default settings', error);
      storageWarningIssued = true;
    }
  }
  return cachedStorage;
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
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.density;
  const storage = getSafeStorage();
  if (!storage) return DEFAULT_SETTINGS.density;
  return storage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (typeof window === 'undefined') return;
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem('density', density);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const storage = getSafeStorage();
  if (storage) {
    const stored = storage.getItem('reduced-motion');
    if (stored !== null) {
      return stored === 'true';
    }
  }
  if (typeof window.matchMedia === 'function') {
    try {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (error) {
      // ignore matchMedia failures and fall back to default
    }
  }
  return DEFAULT_SETTINGS.reducedMotion;
}

export async function setReducedMotion(value) {
  if (typeof window === 'undefined') return;
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.fontScale;
  const storage = getSafeStorage();
  if (!storage) return DEFAULT_SETTINGS.fontScale;
  const stored = storage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (typeof window === 'undefined') return;
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.highContrast;
  const storage = getSafeStorage();
  if (!storage) return DEFAULT_SETTINGS.highContrast;
  return storage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (typeof window === 'undefined') return;
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.largeHitAreas;
  const storage = getSafeStorage();
  if (!storage) return DEFAULT_SETTINGS.largeHitAreas;
  return storage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (typeof window === 'undefined') return;
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.haptics;
  const storage = getSafeStorage();
  if (!storage) return DEFAULT_SETTINGS.haptics;
  const val = storage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  if (typeof window === 'undefined') return;
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem('haptics', value ? 'true' : 'false');
}

const sanitizeDesktopGrid = (grid) => {
  const defaults = DEFAULT_SETTINGS.desktopGrid;
  if (!grid || typeof grid !== 'object') return { ...defaults };
  const validPresets = new Set(['spacious', 'comfortable', 'cozy', 'compact', 'custom']);
  const preset = validPresets.has(grid.preset) ? grid.preset : defaults.preset;
  const spacing = Number.isFinite(grid.spacing) ? grid.spacing : defaults.spacing;
  return { preset, spacing };
};

export async function getDesktopGrid() {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS.desktopGrid };
  try {
    const storage = getSafeStorage();
    if (!storage) return { ...DEFAULT_SETTINGS.desktopGrid };
    const stored = storage.getItem('desktop-grid');
    if (!stored) return { ...DEFAULT_SETTINGS.desktopGrid };
    const parsed = JSON.parse(stored);
    return sanitizeDesktopGrid(parsed);
  } catch (e) {
    console.warn('Failed to load desktop grid settings', e);
    return { ...DEFAULT_SETTINGS.desktopGrid };
  }
}

export async function setDesktopGrid(grid) {
  if (typeof window === 'undefined') return;
  try {
    const value = sanitizeDesktopGrid(grid);
    const storage = getSafeStorage();
    if (!storage) return;
    storage.setItem('desktop-grid', JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save desktop grid settings', e);
  }
}

export async function getPongSpin() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.pongSpin;
  const storage = getSafeStorage();
  if (!storage) return DEFAULT_SETTINGS.pongSpin;
  const val = storage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (typeof window === 'undefined') return;
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.allowNetwork;
  const storage = getSafeStorage();
  if (!storage) return DEFAULT_SETTINGS.allowNetwork;
  return storage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (typeof window === 'undefined') return;
  const storage = getSafeStorage();
  if (!storage) return;
  storage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (typeof window === 'undefined') return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  const storage = getSafeStorage();
  if (!storage) return;
  storage.removeItem('density');
  storage.removeItem('reduced-motion');
  storage.removeItem('font-scale');
  storage.removeItem('high-contrast');
  storage.removeItem('large-hit-areas');
  storage.removeItem('pong-spin');
  storage.removeItem('allow-network');
  storage.removeItem('haptics');
  storage.removeItem('desktop-grid');
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
    desktopGrid,
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
    getDesktopGrid(),
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
    desktopGrid,
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
    desktopGrid,
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
  if (desktopGrid !== undefined) await setDesktopGrid(desktopGrid);
  if (theme !== undefined) setTheme(theme);
}

export const defaults = DEFAULT_SETTINGS;
