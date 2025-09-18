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
  dndEnabled: false,
  dndSchedules: [],
  dndOverrides: {},
  urgentAllowList: [],
};

const DND_ENABLED_KEY = 'dnd-enabled';
const DND_SCHEDULES_KEY = 'dnd-schedules';
const DND_OVERRIDES_KEY = 'dnd-overrides';
const DND_URGENT_ALLOW_KEY = 'dnd-urgent-allow';

const getSafeLocalStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (err) {
    return null;
  }
};

const cloneSchedule = schedule => ({
  ...schedule,
  days: Array.isArray(schedule.days) ? [...schedule.days] : [],
});

const parseSchedules = raw => {
  if (!Array.isArray(raw)) return DEFAULT_SETTINGS.dndSchedules.slice();
  return raw
    .map(schedule => {
      if (!schedule || typeof schedule !== 'object') return null;
      const { id, label, start, end, days, enabled } = schedule;
      if (typeof id !== 'string' || typeof start !== 'string' || typeof end !== 'string') {
        return null;
      }
      const normalizedDays = Array.isArray(days)
        ? days.filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
        : [];
      return {
        id,
        label: typeof label === 'string' && label.trim() ? label : undefined,
        start,
        end,
        days: normalizedDays,
        enabled: typeof enabled === 'boolean' ? enabled : true,
      };
    })
    .filter(Boolean)
    .map(cloneSchedule);
};

const parseOverrides = raw => {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SETTINGS.dndOverrides };
  return Object.entries(raw).reduce((acc, [key, value]) => {
    if (typeof key !== 'string') return acc;
    if (value === 'allow' || value === 'block') {
      acc[key] = value;
    }
    return acc;
  }, {});
};

const parseUrgentAllowList = raw => {
  if (!Array.isArray(raw)) return DEFAULT_SETTINGS.urgentAllowList.slice();
  return raw.filter(entry => typeof entry === 'string' && entry.trim().length > 0);
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

export async function getDndEnabled() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.dndEnabled;
  const stored = storage.getItem(DND_ENABLED_KEY);
  if (stored === null) return DEFAULT_SETTINGS.dndEnabled;
  return stored === 'true';
}

export async function setDndEnabled(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  storage.setItem(DND_ENABLED_KEY, value ? 'true' : 'false');
}

export async function getDndSchedules() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.dndSchedules.slice();
  try {
    const raw = storage.getItem(DND_SCHEDULES_KEY);
    if (!raw) return DEFAULT_SETTINGS.dndSchedules.slice();
    const parsed = JSON.parse(raw);
    return parseSchedules(parsed);
  } catch (err) {
    console.warn('Failed to parse stored DND schedules', err);
    return DEFAULT_SETTINGS.dndSchedules.slice();
  }
}

export async function setDndSchedules(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  const payload = Array.isArray(value) ? value.map(cloneSchedule) : [];
  storage.setItem(DND_SCHEDULES_KEY, JSON.stringify(payload));
}

export async function getDndOverrides() {
  const storage = getSafeLocalStorage();
  if (!storage) return { ...DEFAULT_SETTINGS.dndOverrides };
  try {
    const raw = storage.getItem(DND_OVERRIDES_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS.dndOverrides };
    const parsed = JSON.parse(raw);
    return parseOverrides(parsed);
  } catch (err) {
    console.warn('Failed to parse stored DND overrides', err);
    return { ...DEFAULT_SETTINGS.dndOverrides };
  }
}

export async function setDndOverrides(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  const normalized = value && typeof value === 'object' ? value : {};
  storage.setItem(DND_OVERRIDES_KEY, JSON.stringify(normalized));
}

export async function getUrgentAllowList() {
  const storage = getSafeLocalStorage();
  if (!storage) return DEFAULT_SETTINGS.urgentAllowList.slice();
  try {
    const raw = storage.getItem(DND_URGENT_ALLOW_KEY);
    if (!raw) return DEFAULT_SETTINGS.urgentAllowList.slice();
    const parsed = JSON.parse(raw);
    return parseUrgentAllowList(parsed);
  } catch (err) {
    console.warn('Failed to parse stored urgent allow list', err);
    return DEFAULT_SETTINGS.urgentAllowList.slice();
  }
}

export async function setUrgentAllowList(value) {
  const storage = getSafeLocalStorage();
  if (!storage) return;
  const normalized = Array.isArray(value) ? value.filter(entry => typeof entry === 'string') : [];
  storage.setItem(DND_URGENT_ALLOW_KEY, JSON.stringify(normalized));
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
  window.localStorage.removeItem(DND_ENABLED_KEY);
  window.localStorage.removeItem(DND_SCHEDULES_KEY);
  window.localStorage.removeItem(DND_OVERRIDES_KEY);
  window.localStorage.removeItem(DND_URGENT_ALLOW_KEY);
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
    dndEnabled,
    dndSchedules,
    dndOverrides,
    urgentAllowList,
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
    getDndEnabled(),
    getDndSchedules(),
    getDndOverrides(),
    getUrgentAllowList(),
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
    dndEnabled,
    dndSchedules,
    dndOverrides,
    urgentAllowList,
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
    dndEnabled,
    dndSchedules,
    dndOverrides,
    urgentAllowList,
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
  if (dndEnabled !== undefined) await setDndEnabled(dndEnabled);
  if (dndSchedules !== undefined) await setDndSchedules(parseSchedules(dndSchedules));
  if (dndOverrides !== undefined) await setDndOverrides(parseOverrides(dndOverrides));
  if (urgentAllowList !== undefined) await setUrgentAllowList(parseUrgentAllowList(urgentAllowList));
}

export const defaults = DEFAULT_SETTINGS;
