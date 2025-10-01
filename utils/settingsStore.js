"use client";

import { get, set, del } from 'idb-keyval';
import {
  BACKUP_STORAGE_KEYS,
  MIGRATION_TARGETS,
  getSchemaVersion,
  restoreBackup,
  runMigrations,
  saveBackupSnapshot,
  setSchemaVersion,
} from './migrations';
import { getTheme, setTheme, THEME_KEY } from './theme';

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

const SETTINGS_STORE = 'settings';
const TARGET_VERSION = MIGRATION_TARGETS[SETTINGS_STORE];
const SETTINGS_BACKUP_KEY = BACKUP_STORAGE_KEYS[SETTINGS_STORE];

let settingsInitPromise = null;

const isBrowser = () => typeof window !== 'undefined';

const readLocalStorage = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    throw new Error(`Failed to read ${key} from localStorage`);
  }
};

const writeLocalStorage = (key, value) => {
  if (value === undefined) return;
  if (value === null) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, value);
  }
};

const writeLocalStorageBoolean = (key, value) => {
  if (value === undefined) return;
  if (value === null) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, value ? 'true' : 'false');
};

const readBoolean = (key) => {
  const value = readLocalStorage(key);
  if (value === null) return null;
  return value === 'true';
};

const readNumber = (key) => {
  const value = readLocalStorage(key);
  if (value === null) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const createDefaultSnapshot = () => ({
  accent: null,
  wallpaper: null,
  useKaliWallpaper: null,
  density: null,
  reducedMotion: null,
  fontScale: null,
  highContrast: null,
  largeHitAreas: null,
  pongSpin: null,
  allowNetwork: null,
  haptics: null,
  theme: null,
});

const SETTINGS_MIGRATIONS = [
  {
    version: 1,
    description: 'Normalize persisted settings and seed backups',
    migrate: async ({ createSnapshot, applySnapshot }) => {
      const snapshot = await createSnapshot();
      await applySnapshot(snapshot);
    },
  },
];

async function collectSettingsSnapshot() {
  const [accent, wallpaper] = await Promise.all([
    get('accent'),
    get('bg-image'),
  ]);

  return {
    accent: accent ?? null,
    wallpaper: wallpaper ?? null,
    useKaliWallpaper: readBoolean('use-kali-wallpaper'),
    density: readLocalStorage('density'),
    reducedMotion: readBoolean('reduced-motion'),
    fontScale: readNumber('font-scale'),
    highContrast: readBoolean('high-contrast'),
    largeHitAreas: readBoolean('large-hit-areas'),
    pongSpin: readBoolean('pong-spin'),
    allowNetwork: readBoolean('allow-network'),
    haptics: readBoolean('haptics'),
    theme: readLocalStorage(THEME_KEY),
  };
}

async function applySettingsSnapshot(snapshot) {
  const applyIndexedDB = async (key, value) => {
    if (value === undefined) return;
    if (value === null) {
      await del(key);
    } else {
      await set(key, value);
    }
  };

  await applyIndexedDB('accent', snapshot.accent);
  await applyIndexedDB('bg-image', snapshot.wallpaper);

  writeLocalStorageBoolean('use-kali-wallpaper', snapshot.useKaliWallpaper);
  writeLocalStorage('density', snapshot.density);
  writeLocalStorageBoolean('reduced-motion', snapshot.reducedMotion);
  if (snapshot.fontScale !== undefined) {
    if (snapshot.fontScale === null) {
      window.localStorage.removeItem('font-scale');
    } else {
      window.localStorage.setItem('font-scale', String(snapshot.fontScale));
    }
  }
  writeLocalStorageBoolean('high-contrast', snapshot.highContrast);
  writeLocalStorageBoolean('large-hit-areas', snapshot.largeHitAreas);
  writeLocalStorageBoolean('pong-spin', snapshot.pongSpin);
  writeLocalStorageBoolean('allow-network', snapshot.allowNetwork);
  writeLocalStorageBoolean('haptics', snapshot.haptics);
  writeLocalStorage(THEME_KEY, snapshot.theme);
}

async function ensureBackupExists() {
  if (!isBrowser()) return;
  if (window.localStorage.getItem(SETTINGS_BACKUP_KEY)) return;
  try {
    const snapshot = await collectSettingsSnapshot();
    let version = TARGET_VERSION;
    try {
      version = getSchemaVersion(SETTINGS_STORE);
    } catch {
      version = TARGET_VERSION;
    }
    await saveBackupSnapshot(SETTINGS_STORE, {
      version,
      createdAt: Date.now(),
      data: snapshot,
    });
  } catch (error) {
    console.warn('Failed to persist settings backup', error);
  }
}

async function recoverSettingsFromBackup(reason) {
  if (!isBrowser()) return;
  console.warn('Attempting to recover settings from backup', reason);
  try {
    const restored = await restoreBackup(SETTINGS_STORE, applySettingsSnapshot);
    if (restored) {
      const restoredVersion = Number.isFinite(restored.version)
        ? restored.version
        : TARGET_VERSION;
      setSchemaVersion(SETTINGS_STORE, restoredVersion);
      if (restoredVersion < TARGET_VERSION) {
        try {
          await runMigrations({
            store: SETTINGS_STORE,
            currentVersion: restoredVersion,
            targetVersion: TARGET_VERSION,
            steps: SETTINGS_MIGRATIONS,
            createSnapshot: collectSettingsSnapshot,
            applySnapshot: applySettingsSnapshot,
          });
        } catch (migrationError) {
          console.error('Failed to migrate restored settings, resetting to defaults', migrationError);
          await applySettingsSnapshot(createDefaultSnapshot());
          setSchemaVersion(SETTINGS_STORE, TARGET_VERSION);
        }
      }
      await ensureBackupExists();
      return;
    }
  } catch (backupError) {
    console.error('Failed to restore settings backup', backupError);
  }

  await applySettingsSnapshot(createDefaultSnapshot());
  setSchemaVersion(SETTINGS_STORE, TARGET_VERSION);
  await ensureBackupExists();
}

async function initializeSettingsStore() {
  if (!isBrowser()) return;
  let currentVersion = 0;
  try {
    currentVersion = getSchemaVersion(SETTINGS_STORE);
  } catch (error) {
    await recoverSettingsFromBackup(error);
    return;
  }

  if (currentVersion < TARGET_VERSION) {
    try {
      await runMigrations({
        store: SETTINGS_STORE,
        currentVersion,
        targetVersion: TARGET_VERSION,
        steps: SETTINGS_MIGRATIONS,
        createSnapshot: collectSettingsSnapshot,
        applySnapshot: applySettingsSnapshot,
      });
    } catch (error) {
      await recoverSettingsFromBackup(error);
      return;
    }
  } else if (currentVersion > TARGET_VERSION) {
    // Preserve forward-compatible data but ensure backups exist.
    setSchemaVersion(SETTINGS_STORE, currentVersion);
  }

  await ensureBackupExists();
}

async function ensureSettingsReady() {
  if (!isBrowser()) return;
  if (!settingsInitPromise) {
    settingsInitPromise = initializeSettingsStore();
  }
  await settingsInitPromise;
}

export async function getAccent() {
  if (!isBrowser()) return DEFAULT_SETTINGS.accent;
  await ensureSettingsReady();
  return (await get('accent')) || DEFAULT_SETTINGS.accent;
}

export async function setAccent(accent) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  await set('accent', accent);
}

export async function getWallpaper() {
  if (!isBrowser()) return DEFAULT_SETTINGS.wallpaper;
  await ensureSettingsReady();
  return (await get('bg-image')) || DEFAULT_SETTINGS.wallpaper;
}

export async function setWallpaper(wallpaper) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  await set('bg-image', wallpaper);
}

export async function getUseKaliWallpaper() {
  if (!isBrowser()) return DEFAULT_SETTINGS.useKaliWallpaper;
  await ensureSettingsReady();
  const stored = window.localStorage.getItem('use-kali-wallpaper');
  return stored === null ? DEFAULT_SETTINGS.useKaliWallpaper : stored === 'true';
}

export async function setUseKaliWallpaper(value) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  window.localStorage.setItem('use-kali-wallpaper', value ? 'true' : 'false');
}

export async function getDensity() {
  if (!isBrowser()) return DEFAULT_SETTINGS.density;
  await ensureSettingsReady();
  return window.localStorage.getItem('density') || DEFAULT_SETTINGS.density;
}

export async function setDensity(density) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  window.localStorage.setItem('density', density);
}

export async function getReducedMotion() {
  if (!isBrowser()) return DEFAULT_SETTINGS.reducedMotion;
  await ensureSettingsReady();
  const stored = window.localStorage.getItem('reduced-motion');
  if (stored !== null) {
    return stored === 'true';
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function setReducedMotion(value) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  window.localStorage.setItem('reduced-motion', value ? 'true' : 'false');
}

export async function getFontScale() {
  if (!isBrowser()) return DEFAULT_SETTINGS.fontScale;
  await ensureSettingsReady();
  const stored = window.localStorage.getItem('font-scale');
  return stored ? parseFloat(stored) : DEFAULT_SETTINGS.fontScale;
}

export async function setFontScale(scale) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  window.localStorage.setItem('font-scale', String(scale));
}

export async function getHighContrast() {
  if (!isBrowser()) return DEFAULT_SETTINGS.highContrast;
  await ensureSettingsReady();
  return window.localStorage.getItem('high-contrast') === 'true';
}

export async function setHighContrast(value) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  window.localStorage.setItem('high-contrast', value ? 'true' : 'false');
}

export async function getLargeHitAreas() {
  if (!isBrowser()) return DEFAULT_SETTINGS.largeHitAreas;
  await ensureSettingsReady();
  return window.localStorage.getItem('large-hit-areas') === 'true';
}

export async function setLargeHitAreas(value) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  window.localStorage.setItem('large-hit-areas', value ? 'true' : 'false');
}

export async function getHaptics() {
  if (!isBrowser()) return DEFAULT_SETTINGS.haptics;
  await ensureSettingsReady();
  const val = window.localStorage.getItem('haptics');
  return val === null ? DEFAULT_SETTINGS.haptics : val === 'true';
}

export async function setHaptics(value) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  window.localStorage.setItem('haptics', value ? 'true' : 'false');
}

export async function getPongSpin() {
  if (!isBrowser()) return DEFAULT_SETTINGS.pongSpin;
  await ensureSettingsReady();
  const val = window.localStorage.getItem('pong-spin');
  return val === null ? DEFAULT_SETTINGS.pongSpin : val === 'true';
}

export async function setPongSpin(value) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  window.localStorage.setItem('pong-spin', value ? 'true' : 'false');
}

export async function getAllowNetwork() {
  if (!isBrowser()) return DEFAULT_SETTINGS.allowNetwork;
  await ensureSettingsReady();
  return window.localStorage.getItem('allow-network') === 'true';
}

export async function setAllowNetwork(value) {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  window.localStorage.setItem('allow-network', value ? 'true' : 'false');
}

export async function resetSettings() {
  if (!isBrowser()) return;
  await ensureSettingsReady();
  await applySettingsSnapshot(createDefaultSnapshot());
  setSchemaVersion(SETTINGS_STORE, TARGET_VERSION);
  await ensureBackupExists();
}

export async function exportSettings() {
  await ensureSettingsReady();
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
  if (!isBrowser()) return;
  await ensureSettingsReady();
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
  await ensureBackupExists();
}

export const defaults = DEFAULT_SETTINGS;
