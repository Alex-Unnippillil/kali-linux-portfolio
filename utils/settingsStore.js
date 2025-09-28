"use client";

import { get, set, del } from 'idb-keyval';
import { z } from 'zod';
import { getTheme, setTheme } from './theme';
import { safeLocalStorage } from './safeStorage';

const FAVORITES_KEY = 'launcherFavorites';
const PINNED_KEY = 'pinnedApps';
const EXPORT_VERSION = 2;

const sanitizeAppIds = (value) => {
  if (!Array.isArray(value)) return [];
  const unique = [];
  const seen = new Set();
  value.forEach((id) => {
    if (typeof id !== 'string') return;
    if (seen.has(id)) return;
    seen.add(id);
    unique.push(id);
  });
  return unique;
};

const readStoredIds = (key) => {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeAppIds(parsed);
  } catch {
    return [];
  }
};

const writeStoredIds = (key, ids) => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(key, JSON.stringify(sanitizeAppIds(ids)));
  } catch {
    /* ignore storage failures */
  }
};

const settingsSchema = z.object({
  accent: z.string().optional(),
  wallpaper: z.string().optional(),
  useKaliWallpaper: z.boolean().optional(),
  density: z.enum(['regular', 'compact']).optional(),
  reducedMotion: z.boolean().optional(),
  fontScale: z
    .union([z.number(), z.string().transform((val) => Number.parseFloat(val))])
    .optional()
    .refine((value) => value === undefined || Number.isFinite(value), {
      message: 'fontScale must be a number',
    }),
  highContrast: z.boolean().optional(),
  largeHitAreas: z.boolean().optional(),
  pongSpin: z.boolean().optional(),
  allowNetwork: z.boolean().optional(),
  haptics: z.boolean().optional(),
  theme: z.string().optional(),
  favorites: z.array(z.string()).optional(),
  pinned: z.array(z.string()).optional(),
  ordering: z.array(z.string()).optional(),
  launcher: z
    .object({
      favorites: z.array(z.string()).optional(),
      ordering: z.array(z.string()).optional(),
    })
    .optional(),
  dock: z
    .object({
      pinned: z.array(z.string()).optional(),
      ordering: z.array(z.string()).optional(),
    })
    .optional(),
  version: z.number().optional(),
});

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
  if (typeof window === 'undefined') return DEFAULT_SETTINGS.useKaliWallpaper;
  const stored = window.localStorage.getItem('use-kali-wallpaper');
  return stored === null ? DEFAULT_SETTINGS.useKaliWallpaper : stored === 'true';
}

export async function setUseKaliWallpaper(value) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem('use-kali-wallpaper', value ? 'true' : 'false');
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
  ]);
  window.localStorage.removeItem('density');
  window.localStorage.removeItem('reduced-motion');
  window.localStorage.removeItem('font-scale');
  window.localStorage.removeItem('high-contrast');
  window.localStorage.removeItem('large-hit-areas');
  window.localStorage.removeItem('pong-spin');
  window.localStorage.removeItem('allow-network');
  window.localStorage.removeItem('haptics');
  window.localStorage.removeItem('use-kali-wallpaper');
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
  const favorites = readStoredIds(FAVORITES_KEY);
  const dockOrdering = readStoredIds(PINNED_KEY);
  return JSON.stringify({
    version: EXPORT_VERSION,
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
    favorites,
    pinned: dockOrdering,
    ordering: dockOrdering,
    launcher: {
      favorites,
      ordering: favorites,
    },
    dock: {
      pinned: dockOrdering,
      ordering: dockOrdering,
    },
  });
}

export async function importSettings(json) {
  if (typeof window === 'undefined') return;
  let raw;
  try {
    raw = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (e) {
    throw new Error('Invalid settings JSON');
  }

  const parsed = settingsSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error('Settings file does not match expected schema');
  }

  const settings = parsed.data;

  const applied = {};
  if (settings.accent !== undefined) {
    await setAccent(settings.accent);
    applied.accent = settings.accent;
  }
  if (settings.wallpaper !== undefined) {
    await setWallpaper(settings.wallpaper);
    applied.wallpaper = settings.wallpaper;
  }
  if (settings.useKaliWallpaper !== undefined) {
    await setUseKaliWallpaper(settings.useKaliWallpaper);
    applied.useKaliWallpaper = settings.useKaliWallpaper;
  }
  if (settings.density !== undefined) {
    await setDensity(settings.density);
    applied.density = settings.density;
  }
  if (settings.reducedMotion !== undefined) {
    await setReducedMotion(settings.reducedMotion);
    applied.reducedMotion = settings.reducedMotion;
  }
  if (settings.fontScale !== undefined) {
    await setFontScale(Number(settings.fontScale));
    applied.fontScale = Number(settings.fontScale);
  }
  if (settings.highContrast !== undefined) {
    await setHighContrast(settings.highContrast);
    applied.highContrast = settings.highContrast;
  }
  if (settings.largeHitAreas !== undefined) {
    await setLargeHitAreas(settings.largeHitAreas);
    applied.largeHitAreas = settings.largeHitAreas;
  }
  if (settings.pongSpin !== undefined) {
    await setPongSpin(settings.pongSpin);
    applied.pongSpin = settings.pongSpin;
  }
  if (settings.allowNetwork !== undefined) {
    await setAllowNetwork(settings.allowNetwork);
    applied.allowNetwork = settings.allowNetwork;
  }
  if (settings.haptics !== undefined) {
    await setHaptics(settings.haptics);
    applied.haptics = settings.haptics;
  }
  if (settings.theme !== undefined) {
    setTheme(settings.theme);
    applied.theme = settings.theme;
  }

  const favoriteIds = sanitizeAppIds(
    settings.launcher?.ordering ??
      settings.launcher?.favorites ??
      settings.favorites ??
      []
  );
  const orderingIds = sanitizeAppIds(
    settings.launcher?.ordering ?? settings.ordering ?? favoriteIds
  );
  const dockOrderingIds = sanitizeAppIds(
    settings.dock?.ordering ??
      settings.dock?.pinned ??
      settings.ordering ??
      settings.pinned ??
      []
  );
  const dockPinnedIds = dockOrderingIds;

  if (favoriteIds.length || settings.launcher?.favorites || settings.favorites) {
    writeStoredIds(FAVORITES_KEY, favoriteIds);
    window.dispatchEvent(
      new CustomEvent('launcher:favorites-updated', { detail: favoriteIds })
    );
  }

  if (dockPinnedIds.length || settings.dock?.pinned || settings.pinned || settings.dock?.ordering || settings.ordering) {
    writeStoredIds(PINNED_KEY, dockOrderingIds);
    window.dispatchEvent(
      new CustomEvent('desktop:pins-updated', { detail: dockOrderingIds })
    );
  }

  return {
    settings: applied,
    favorites: favoriteIds,
    ordering: orderingIds,
    dock: dockOrderingIds,
  };
}

export const defaults = DEFAULT_SETTINGS;
