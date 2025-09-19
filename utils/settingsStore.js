"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

let localStorageWarningIssued = false;

const memoryStorage = (() => {
  const store = new Map();
  return {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => {
      store.set(key, String(value));
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
})();

const getLocalStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    if (!localStorageWarningIssued && process.env.NODE_ENV !== 'test') {
      console.warn('localStorage unavailable; using in-memory fallback', error);
      localStorageWarningIssued = true;
    }
    return memoryStorage;
  }
};

const DEFAULT_DND_SCHEDULES = [
  {
    id: 'work-hours',
    label: 'Work hours',
    description: 'Weekdays 09:00 – 17:00',
    start: '09:00',
    end: '17:00',
    days: [1, 2, 3, 4, 5],
    enabled: false,
  },
  {
    id: 'quiet-nights',
    label: 'Quiet nights',
    description: 'Every day 22:00 – 07:00',
    start: '22:00',
    end: '07:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    enabled: false,
  },
];

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
  dnd: getDefaultDndSettings(),
};

function cloneSchedule(schedule) {
  return {
    ...schedule,
    days: Array.isArray(schedule.days) ? [...schedule.days] : [],
  };
}

export function getDefaultDndSchedules() {
  return DEFAULT_DND_SCHEDULES.map((schedule) => cloneSchedule(schedule));
}

export function getDefaultDndSettings() {
  return {
    override: null,
    schedules: getDefaultDndSchedules(),
  };
}

function sanitizeTime(value, fallback) {
  if (typeof value !== 'string') return fallback;
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) return fallback;
  return `${match[1]}:${match[2]}`;
}

function sanitizeDays(days, fallback) {
  if (!Array.isArray(days)) return [...fallback];
  const normalized = days
    .map((day) => (typeof day === 'number' ? day : parseInt(day, 10)))
    .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  if (!normalized.length) return [...fallback];
  return Array.from(new Set(normalized)).sort((a, b) => a - b);
}

export async function getDndSettings() {
  const storage = getLocalStorage();
  if (!storage) return getDefaultDndSettings();
  let raw = null;
  try {
    raw = storage.getItem('dnd-settings');
  } catch (error) {
    if (!localStorageWarningIssued && process.env.NODE_ENV !== 'test') {
      console.warn('localStorage unavailable; falling back to defaults', error);
      localStorageWarningIssued = true;
    }
    return getDefaultDndSettings();
  }
  if (!raw) return getDefaultDndSettings();
  try {
    const parsed = JSON.parse(raw);
    const defaults = getDefaultDndSettings();
    const schedules = defaults.schedules.map((defaultSchedule) => {
      if (!parsed?.schedules) return cloneSchedule(defaultSchedule);
      const stored = parsed.schedules.find((item) => item.id === defaultSchedule.id);
      if (!stored) return cloneSchedule(defaultSchedule);
      return {
        ...defaultSchedule,
        start: sanitizeTime(stored.start, defaultSchedule.start),
        end: sanitizeTime(stored.end, defaultSchedule.end),
        days: sanitizeDays(stored.days, defaultSchedule.days),
        enabled: Boolean(stored.enabled),
      };
    });
    const override = parsed.override === 'on' || parsed.override === 'off' ? parsed.override : null;
    return {
      override,
      schedules,
    };
  } catch (error) {
    console.warn('Invalid DND settings detected, using defaults', error);
    return getDefaultDndSettings();
  }
}

export async function setDndSettings(value) {
  const storage = getLocalStorage();
  if (!storage) return;
  const defaults = getDefaultDndSettings();
  const byId = new Map(defaults.schedules.map((schedule) => [schedule.id, schedule]));
  const schedules = (value?.schedules || defaults.schedules).map((schedule) => {
    const fallback = byId.get(schedule.id) || defaults.schedules[0];
    return {
      ...fallback,
      start: sanitizeTime(schedule.start, fallback.start),
      end: sanitizeTime(schedule.end, fallback.end),
      days: sanitizeDays(schedule.days, fallback.days),
      enabled: Boolean(schedule.enabled),
    };
  });
  const override = value?.override === 'on' || value?.override === 'off' ? value.override : null;
  const payload = {
    override,
    schedules,
  };
  try {
    storage.setItem('dnd-settings', JSON.stringify(payload));
  } catch (error) {
    if (!localStorageWarningIssued && process.env.NODE_ENV !== 'test') {
      console.warn('localStorage unavailable; falling back to defaults', error);
      localStorageWarningIssued = true;
    }
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
  const storage = getLocalStorage();
  if (storage) {
    const stored = storage.getItem('reduced-motion');
    if (stored !== null) {
      return stored === 'true';
    }
  }
  if (typeof window !== 'undefined' && window.matchMedia) {
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
  if (typeof window === 'undefined') return;
  await Promise.all([
    del('accent'),
    del('bg-image'),
  ]);
  const storage = getLocalStorage();
  if (!storage) return;
  storage.removeItem('density');
  storage.removeItem('reduced-motion');
  storage.removeItem('font-scale');
  storage.removeItem('high-contrast');
  storage.removeItem('large-hit-areas');
  storage.removeItem('pong-spin');
  storage.removeItem('allow-network');
  storage.removeItem('haptics');
  storage.removeItem('dnd-settings');
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
    dnd,
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
    getDndSettings(),
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
    dnd,
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
    dnd,
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
  if (dnd !== undefined) await setDndSettings(dnd);
}

export const defaults = DEFAULT_SETTINGS;
