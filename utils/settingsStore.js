"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const WALLPAPER_MODE_KEY = 'wallpaper-mode';
const WALLPAPER_OFFSETS_KEY = 'wallpaper-fit-offsets';

const VALID_WALLPAPER_MODES = new Set(['cover', 'contain', 'fill', 'fit']);

const DEFAULT_SETTINGS = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  wallpaperMode: 'cover',
  wallpaperOffsets: {},
  useKaliWallpaper: false,
  density: 'regular',
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
};

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

const sanitizeWallpaperMode = (value) =>
  VALID_WALLPAPER_MODES.has(value)
    ? value
    : DEFAULT_SETTINGS.wallpaperMode;

const sanitizeOffsetsMap = (value) => {
  if (!value || typeof value !== 'object') return {};
  const normalized = {};
  Object.entries(value).forEach(([key, offset]) => {
    if (!key || typeof key !== 'string') return;
    if (!offset || typeof offset !== 'object') return;
    const x = Number(offset.x);
    const y = Number(offset.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const clampedX = Math.min(Math.max(x, -0.5), 0.5);
    const clampedY = Math.min(Math.max(y, -0.5), 0.5);
    if (Math.abs(clampedX) < 1e-6 && Math.abs(clampedY) < 1e-6) {
      return;
    }
    normalized[key] = { x: clampedX, y: clampedY };
  });
  return normalized;
};

export async function getWallpaperMode() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.wallpaperMode;
  const stored = storage.getItem(WALLPAPER_MODE_KEY);
  if (!stored) return DEFAULT_SETTINGS.wallpaperMode;
  return sanitizeWallpaperMode(stored);
}

export async function setWallpaperMode(mode) {
  const storage = getLocalStorage();
  if (!storage) return;
  const normalized = sanitizeWallpaperMode(mode);
  if (normalized === DEFAULT_SETTINGS.wallpaperMode) {
    storage.removeItem(WALLPAPER_MODE_KEY);
    return;
  }
  storage.setItem(WALLPAPER_MODE_KEY, normalized);
}

export async function getWallpaperOffsets() {
  const storage = getLocalStorage();
  if (!storage) return {};
  const raw = storage.getItem(WALLPAPER_OFFSETS_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return sanitizeOffsetsMap(parsed);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !hasLoggedStorageWarning) {
      console.warn('Failed to parse wallpaper offsets from storage.', error);
      hasLoggedStorageWarning = true;
    }
    return {};
  }
}

export async function setWallpaperOffsets(offsets) {
  const storage = getLocalStorage();
  if (!storage) return;
  const normalized = sanitizeOffsetsMap(offsets);
  if (!Object.keys(normalized).length) {
    storage.removeItem(WALLPAPER_OFFSETS_KEY);
    return;
  }
  storage.setItem(WALLPAPER_OFFSETS_KEY, JSON.stringify(normalized));
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
  storage.removeItem(WALLPAPER_MODE_KEY);
  storage.removeItem(WALLPAPER_OFFSETS_KEY);
}

export async function exportSettings() {
  const [
    accent,
    wallpaper,
    wallpaperMode,
    useKaliWallpaper,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    wallpaperOffsets,
  ] = await Promise.all([
    getAccent(),
    getWallpaper(),
    getWallpaperMode(),
    getUseKaliWallpaper(),
    getDensity(),
    getReducedMotion(),
    getFontScale(),
    getHighContrast(),
    getLargeHitAreas(),
    getPongSpin(),
    getAllowNetwork(),
    getHaptics(),
    getWallpaperOffsets(),
  ]);
  const theme = getTheme();
  return JSON.stringify({
    accent,
    wallpaper,
    wallpaperMode,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    useKaliWallpaper,
    theme,
    wallpaperOffsets,
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
    wallpaperMode,
    density,
    reducedMotion,
    fontScale,
    highContrast,
    largeHitAreas,
    pongSpin,
    allowNetwork,
    haptics,
    theme,
    wallpaperOffsets,
  } = settings;
  if (accent !== undefined) await setAccent(accent);
  if (wallpaper !== undefined) await setWallpaper(wallpaper);
  if (useKaliWallpaper !== undefined) await setUseKaliWallpaper(useKaliWallpaper);
  if (wallpaperMode !== undefined) await setWallpaperMode(wallpaperMode);
  if (density !== undefined) await setDensity(density);
  if (reducedMotion !== undefined) await setReducedMotion(reducedMotion);
  if (fontScale !== undefined) await setFontScale(fontScale);
  if (highContrast !== undefined) await setHighContrast(highContrast);
  if (largeHitAreas !== undefined) await setLargeHitAreas(largeHitAreas);
  if (pongSpin !== undefined) await setPongSpin(pongSpin);
  if (allowNetwork !== undefined) await setAllowNetwork(allowNetwork);
  if (haptics !== undefined) await setHaptics(haptics);
  if (theme !== undefined) setTheme(theme);
  if (wallpaperOffsets !== undefined) await setWallpaperOffsets(wallpaperOffsets);
}

export const defaults = DEFAULT_SETTINGS;
