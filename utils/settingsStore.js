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

const DESKTOP_SESSION_KEY = 'desktop-session';
const SHORTCUT_STORAGE_KEY = 'keymap';
const SNAP_STORAGE_KEY = 'snap-enabled';
const DEFAULT_SNAP_ENABLED = true;

const DEFAULT_SESSION = {
  windows: [],
  wallpaper: DEFAULT_SETTINGS.wallpaper,
  dock: [],
};

const DEFAULT_SHORTCUTS = [
  { description: 'Show keyboard shortcuts', keys: '?' },
  { description: 'Open settings', keys: 'Ctrl+,' },
];

const DEFAULT_SHORTCUT_MAP = DEFAULT_SHORTCUTS.reduce(
  (acc, { description, keys }) => {
    acc[description] = keys;
    return acc;
  },
  {},
);

const REQUIRED_PREFERENCE_FIELDS = ['accent', 'wallpaper', 'theme'];

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const sanitizeWindowPosition = (value) => {
  if (!isPlainObject(value)) return null;
  const { id, x, y } = value;
  if (typeof id !== 'string') return null;
  const safeX = typeof x === 'number' && Number.isFinite(x) ? x : 0;
  const safeY = typeof y === 'number' && Number.isFinite(y) ? y : 0;
  return { id, x: safeX, y: safeY };
};

const isShortcutMap = (value) => {
  if (!isPlainObject(value)) return false;
  return Object.values(value).every((entry) => typeof entry === 'string');
};

const loadFromLocalStorage = (key, validator, fallback) => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return fallback;
    const parsed = JSON.parse(stored);
    if (validator(parsed)) {
      return parsed;
    }
  } catch (error) {
    console.error(`Failed to read ${key}`, error);
  }
  return fallback;
};

const saveToLocalStorage = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to persist ${key}`, error);
  }
};

const mergeShortcuts = (shortcuts) => ({
  ...DEFAULT_SHORTCUT_MAP,
  ...shortcuts,
});

const readSession = () =>
  loadFromLocalStorage(
    DESKTOP_SESSION_KEY,
    (value) => {
      if (!isPlainObject(value)) return false;
      const { windows, wallpaper, dock } = value;
      if (!Array.isArray(windows) || typeof wallpaper !== 'string' || !Array.isArray(dock)) {
        return false;
      }
      return true;
    },
    DEFAULT_SESSION,
  );

const sanitizeSession = (session) => {
  if (!isPlainObject(session)) return DEFAULT_SESSION;
  const { windows, wallpaper, dock } = session;
  const sanitizedWindows = Array.isArray(windows)
    ? windows
        .map(sanitizeWindowPosition)
        .filter((value) => value !== null)
    : [];
  const sanitizedDock = Array.isArray(dock)
    ? dock.filter((appId) => typeof appId === 'string')
    : [];
  return {
    windows: sanitizedWindows,
    wallpaper: typeof wallpaper === 'string' ? wallpaper : DEFAULT_SETTINGS.wallpaper,
    dock: sanitizedDock,
  };
};

const readShortcuts = () =>
  mergeShortcuts(
    loadFromLocalStorage(
      SHORTCUT_STORAGE_KEY,
      isShortcutMap,
      DEFAULT_SHORTCUT_MAP,
    ),
  );

const readSnapEnabled = () =>
  loadFromLocalStorage(
    SNAP_STORAGE_KEY,
    (value) => typeof value === 'boolean',
    DEFAULT_SNAP_ENABLED,
  );

const normalizePreferences = (rawPreferences) => {
  if (!isPlainObject(rawPreferences)) {
    return { error: 'Settings file is missing the "preferences" object.' };
  }

  const missing = REQUIRED_PREFERENCE_FIELDS.filter(
    (field) => typeof rawPreferences[field] !== 'string',
  );
  if (missing.length > 0) {
    return {
      error: `Settings file is missing required fields: ${missing.join(', ')}`,
    };
  }

  const preferences = {
    accent: rawPreferences.accent,
    wallpaper: rawPreferences.wallpaper,
    useKaliWallpaper:
      typeof rawPreferences.useKaliWallpaper === 'boolean'
        ? rawPreferences.useKaliWallpaper
        : DEFAULT_SETTINGS.useKaliWallpaper,
    density:
      typeof rawPreferences.density === 'string'
        ? rawPreferences.density
        : DEFAULT_SETTINGS.density,
    reducedMotion:
      typeof rawPreferences.reducedMotion === 'boolean'
        ? rawPreferences.reducedMotion
        : DEFAULT_SETTINGS.reducedMotion,
    fontScale:
      typeof rawPreferences.fontScale === 'number'
        ? rawPreferences.fontScale
        : DEFAULT_SETTINGS.fontScale,
    highContrast:
      typeof rawPreferences.highContrast === 'boolean'
        ? rawPreferences.highContrast
        : DEFAULT_SETTINGS.highContrast,
    largeHitAreas:
      typeof rawPreferences.largeHitAreas === 'boolean'
        ? rawPreferences.largeHitAreas
        : DEFAULT_SETTINGS.largeHitAreas,
    pongSpin:
      typeof rawPreferences.pongSpin === 'boolean'
        ? rawPreferences.pongSpin
        : DEFAULT_SETTINGS.pongSpin,
    allowNetwork:
      typeof rawPreferences.allowNetwork === 'boolean'
        ? rawPreferences.allowNetwork
        : DEFAULT_SETTINGS.allowNetwork,
    haptics:
      typeof rawPreferences.haptics === 'boolean'
        ? rawPreferences.haptics
        : DEFAULT_SETTINGS.haptics,
    theme: rawPreferences.theme,
    snapEnabled:
      typeof rawPreferences.snapEnabled === 'boolean'
        ? rawPreferences.snapEnabled
        : DEFAULT_SNAP_ENABLED,
  };

  return { value: preferences };
};

const normalizeLayout = (rawLayout) => {
  if (rawLayout === undefined) {
    return { value: DEFAULT_SESSION };
  }
  if (!isPlainObject(rawLayout)) {
    return { error: 'Settings file contains invalid layout data.' };
  }

  const session = sanitizeSession(rawLayout);
  if (!Array.isArray(session.windows) || !Array.isArray(session.dock)) {
    return { error: 'Settings file contains invalid layout data.' };
  }

  return { value: session };
};

const normalizeShortcuts = (rawShortcuts) => {
  if (rawShortcuts === undefined) {
    return { value: DEFAULT_SHORTCUT_MAP };
  }
  if (!isShortcutMap(rawShortcuts)) {
    return { error: 'Settings file contains invalid shortcuts data.' };
  }
  return { value: mergeShortcuts(rawShortcuts) };
};

const normalizeBundle = (raw) => {
  if (!isPlainObject(raw)) {
    return { error: 'Settings file must contain a JSON object.' };
  }

  if ('preferences' in raw || 'layout' in raw || 'shortcuts' in raw) {
    const preferencesResult = normalizePreferences(raw.preferences);
    if (preferencesResult.error) return { error: preferencesResult.error };

    const layoutResult = normalizeLayout(raw.layout);
    if (layoutResult.error) return { error: layoutResult.error };

    const shortcutsResult = normalizeShortcuts(raw.shortcuts);
    if (shortcutsResult.error) return { error: shortcutsResult.error };

    return {
      value: {
        preferences: preferencesResult.value,
        layout: layoutResult.value,
        shortcuts: shortcutsResult.value,
      },
    };
  }

  const preferencesResult = normalizePreferences(raw);
  if (preferencesResult.error) return { error: preferencesResult.error };

  return {
    value: {
      preferences: preferencesResult.value,
      layout: DEFAULT_SESSION,
      shortcuts: DEFAULT_SHORTCUT_MAP,
    },
  };
};

const applyPreferences = async (preferences) => {
  const tasks = [];
  if (typeof preferences.accent === 'string') tasks.push(setAccent(preferences.accent));
  if (typeof preferences.wallpaper === 'string') tasks.push(setWallpaper(preferences.wallpaper));
  if (typeof preferences.useKaliWallpaper === 'boolean') {
    tasks.push(setUseKaliWallpaper(preferences.useKaliWallpaper));
  }
  if (typeof preferences.density === 'string') tasks.push(setDensity(preferences.density));
  if (typeof preferences.reducedMotion === 'boolean') {
    tasks.push(setReducedMotion(preferences.reducedMotion));
  }
  if (typeof preferences.fontScale === 'number') tasks.push(setFontScale(preferences.fontScale));
  if (typeof preferences.highContrast === 'boolean') {
    tasks.push(setHighContrast(preferences.highContrast));
  }
  if (typeof preferences.largeHitAreas === 'boolean') {
    tasks.push(setLargeHitAreas(preferences.largeHitAreas));
  }
  if (typeof preferences.pongSpin === 'boolean') tasks.push(setPongSpin(preferences.pongSpin));
  if (typeof preferences.allowNetwork === 'boolean') {
    tasks.push(setAllowNetwork(preferences.allowNetwork));
  }
  if (typeof preferences.haptics === 'boolean') tasks.push(setHaptics(preferences.haptics));

  await Promise.all(tasks);

  if (typeof preferences.theme === 'string') setTheme(preferences.theme);
  if (typeof preferences.snapEnabled === 'boolean') {
    saveToLocalStorage(SNAP_STORAGE_KEY, preferences.snapEnabled);
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
  window.localStorage.removeItem(DESKTOP_SESSION_KEY);
  window.localStorage.removeItem(SHORTCUT_STORAGE_KEY);
  window.localStorage.removeItem(SNAP_STORAGE_KEY);
  window.localStorage.removeItem('app:theme');
  setTheme('default');
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
  const bundle = {
    version: 1,
    preferences: {
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
      snapEnabled: readSnapEnabled(),
    },
    layout: sanitizeSession(readSession()),
    shortcuts: readShortcuts(),
  };

  return JSON.stringify(bundle, null, 2);
}

export async function importSettings(json) {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Settings can only be imported in the browser.' };
  }

  let parsed;
  try {
    parsed = typeof json === 'string' ? JSON.parse(json) : json;
  } catch (error) {
    console.error('Invalid settings', error);
    return { success: false, error: 'The selected file is not valid JSON.' };
  }

  const normalized = normalizeBundle(parsed);
  if (normalized.error) {
    console.error('Invalid settings bundle', normalized.error);
    return { success: false, error: normalized.error };
  }

  const { preferences, layout, shortcuts } = normalized.value;
  await applyPreferences(preferences);
  saveToLocalStorage(DESKTOP_SESSION_KEY, sanitizeSession(layout));
  saveToLocalStorage(SHORTCUT_STORAGE_KEY, mergeShortcuts(shortcuts));

  return {
    success: true,
    data: {
      preferences,
      layout: sanitizeSession(layout),
      shortcuts: mergeShortcuts(shortcuts),
    },
  };
}

export const defaults = DEFAULT_SETTINGS;
