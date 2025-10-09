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
};

let hasLoggedStorageWarning = false;
let hasLoggedIdbWarning = false;

function logIdbWarning(error) {
  if (process.env.NODE_ENV === 'production' || hasLoggedIdbWarning) return;
  console.warn('IndexedDB is not available; falling back to localStorage.', error);
  hasLoggedIdbWarning = true;
}

async function safeIdbGet(key) {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    if (typeof window !== 'undefined' && typeof indexedDB === 'undefined') {
      logIdbWarning('indexedDB undefined');
    }
    return undefined;
  }
  try {
    return await get(key);
  } catch (error) {
    logIdbWarning(error);
    return undefined;
  }
}

async function safeIdbSet(key, value) {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    if (typeof window !== 'undefined' && typeof indexedDB === 'undefined') {
      logIdbWarning('indexedDB undefined');
    }
    return false;
  }
  try {
    await set(key, value);
    return true;
  } catch (error) {
    logIdbWarning(error);
    return false;
  }
}

async function safeIdbDel(key) {
  if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
    if (typeof window !== 'undefined' && typeof indexedDB === 'undefined') {
      logIdbWarning('indexedDB undefined');
    }
    return false;
  }
  try {
    await del(key);
    return true;
  } catch (error) {
    logIdbWarning(error);
    return false;
  }
}

async function setWithFallback(idbKey, localKey, value, serializeLocal) {
  if (typeof window === 'undefined') return;
  await safeIdbSet(idbKey, value);
  const storage = getLocalStorage();
  if (!storage) return;
  try {
    storage.setItem(localKey, serializeLocal(value));
  } catch (error) {
    if (process.env.NODE_ENV !== 'production' && !hasLoggedStorageWarning) {
      console.warn('Failed to persist to localStorage fallback.', error);
      hasLoggedStorageWarning = true;
    }
  }
}

async function loadSetting({
  idbKey,
  localKey = idbKey,
  defaultValue,
  isValid,
  parseLocal,
  serializeLocal,
}) {
  if (typeof window === 'undefined') return defaultValue;
  const idbValue = await safeIdbGet(idbKey);
  if (isValid(idbValue)) return idbValue;

  const storage = getLocalStorage();
  if (storage) {
    try {
      const raw = storage.getItem(localKey);
      if (raw !== null) {
        const parsed = parseLocal(raw);
        if (isValid(parsed)) {
          await setWithFallback(idbKey, localKey, parsed, serializeLocal);
          return parsed;
        }
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production' && !hasLoggedStorageWarning) {
        console.warn('Failed to read from localStorage fallback.', error);
        hasLoggedStorageWarning = true;
      }
    }
  }

  return defaultValue;
}

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
  return loadSetting({
    idbKey: 'use-kali-wallpaper',
    defaultValue: DEFAULT_SETTINGS.useKaliWallpaper,
    isValid: (value) => typeof value === 'boolean',
    parseLocal: (raw) => raw === 'true',
    serializeLocal: (value) => (value ? 'true' : 'false'),
  });
}

export async function setUseKaliWallpaper(value) {
  await setWithFallback(
    'use-kali-wallpaper',
    'use-kali-wallpaper',
    value,
    (val) => (val ? 'true' : 'false')
  );
}

export async function getDensity() {
  return loadSetting({
    idbKey: 'density',
    defaultValue: DEFAULT_SETTINGS.density,
    isValid: (value) => value === 'regular' || value === 'compact',
    parseLocal: (raw) => raw,
    serializeLocal: (value) => value,
  });
}

export async function setDensity(density) {
  await setWithFallback('density', 'density', density, (value) => value);
}

export async function getReducedMotion() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.reducedMotion;
  const stored = await loadSetting({
    idbKey: 'reduced-motion',
    defaultValue: undefined,
    isValid: (value) => typeof value === 'boolean',
    parseLocal: (raw) => raw === 'true',
    serializeLocal: (value) => (value ? 'true' : 'false'),
  });
  if (typeof stored === 'boolean') return stored;
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  return DEFAULT_SETTINGS.reducedMotion;
}

export async function setReducedMotion(value) {
  await setWithFallback(
    'reduced-motion',
    'reduced-motion',
    value,
    (val) => (val ? 'true' : 'false')
  );
}

export async function getFontScale() {
  return loadSetting({
    idbKey: 'font-scale',
    defaultValue: DEFAULT_SETTINGS.fontScale,
    isValid: (value) => typeof value === 'number' && !Number.isNaN(value),
    parseLocal: (raw) => {
      const parsed = parseFloat(raw);
      return Number.isNaN(parsed) ? undefined : parsed;
    },
    serializeLocal: (value) => String(value),
  });
}

export async function setFontScale(scale) {
  await setWithFallback('font-scale', 'font-scale', scale, (value) => String(value));
}

export async function getHighContrast() {
  return loadSetting({
    idbKey: 'high-contrast',
    defaultValue: DEFAULT_SETTINGS.highContrast,
    isValid: (value) => typeof value === 'boolean',
    parseLocal: (raw) => raw === 'true',
    serializeLocal: (value) => (value ? 'true' : 'false'),
  });
}

export async function setHighContrast(value) {
  await setWithFallback(
    'high-contrast',
    'high-contrast',
    value,
    (val) => (val ? 'true' : 'false')
  );
}

export async function getLargeHitAreas() {
  return loadSetting({
    idbKey: 'large-hit-areas',
    defaultValue: DEFAULT_SETTINGS.largeHitAreas,
    isValid: (value) => typeof value === 'boolean',
    parseLocal: (raw) => raw === 'true',
    serializeLocal: (value) => (value ? 'true' : 'false'),
  });
}

export async function setLargeHitAreas(value) {
  await setWithFallback(
    'large-hit-areas',
    'large-hit-areas',
    value,
    (val) => (val ? 'true' : 'false')
  );
}

export async function getHaptics() {
  return loadSetting({
    idbKey: 'haptics',
    defaultValue: DEFAULT_SETTINGS.haptics,
    isValid: (value) => typeof value === 'boolean',
    parseLocal: (raw) => raw === 'true',
    serializeLocal: (value) => (value ? 'true' : 'false'),
  });
}

export async function setHaptics(value) {
  await setWithFallback('haptics', 'haptics', value, (val) => (val ? 'true' : 'false'));
}

export async function getPongSpin() {
  return loadSetting({
    idbKey: 'pong-spin',
    defaultValue: DEFAULT_SETTINGS.pongSpin,
    isValid: (value) => typeof value === 'boolean',
    parseLocal: (raw) => raw === 'true',
    serializeLocal: (value) => (value ? 'true' : 'false'),
  });
}

export async function setPongSpin(value) {
  await setWithFallback('pong-spin', 'pong-spin', value, (val) => (val ? 'true' : 'false'));
}

export async function getAllowNetwork() {
  return loadSetting({
    idbKey: 'allow-network',
    defaultValue: DEFAULT_SETTINGS.allowNetwork,
    isValid: (value) => typeof value === 'boolean',
    parseLocal: (raw) => raw === 'true',
    serializeLocal: (value) => (value ? 'true' : 'false'),
  });
}

export async function setAllowNetwork(value) {
  await setWithFallback(
    'allow-network',
    'allow-network',
    value,
    (val) => (val ? 'true' : 'false')
  );
}

export async function resetSettings() {
  if (typeof window === 'undefined') return;
  const storage = getLocalStorage();
  await Promise.all([
    safeIdbDel('accent'),
    safeIdbDel('bg-image'),
    safeIdbDel('use-kali-wallpaper'),
    safeIdbDel('density'),
    safeIdbDel('reduced-motion'),
    safeIdbDel('font-scale'),
    safeIdbDel('high-contrast'),
    safeIdbDel('large-hit-areas'),
    safeIdbDel('pong-spin'),
    safeIdbDel('allow-network'),
    safeIdbDel('haptics'),
  ]);
  if (!storage) return;
  storage.removeItem('density');
  storage.removeItem('reduced-motion');
  storage.removeItem('font-scale');
  storage.removeItem('high-contrast');
  storage.removeItem('large-hit-areas');
  storage.removeItem('pong-spin');
  storage.removeItem('allow-network');
  storage.removeItem('haptics');
  storage.removeItem('use-kali-wallpaper');
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
}

export const defaults = DEFAULT_SETTINGS;
