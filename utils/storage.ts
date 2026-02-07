import { safeLocalStorage } from './safeStorage';

const STORAGE_VERSION = 'v2';

export const buildStorageKey = (key: string) => `${STORAGE_VERSION}:${key}`;

export const SHELL_STORAGE_KEYS = Object.freeze({
  bgImage: buildStorageKey('shell:bg-image'),
  lock: buildStorageKey('shell:lock'),
  bootSeen: buildStorageKey('shell:bootSeen'),
  shutdown: buildStorageKey('shell:shutdown'),
  theme: buildStorageKey('shell:theme'),
  snap: buildStorageKey('shell:snap'),
  iconDensity: buildStorageKey('shell:iconDensity'),
  pinnedApps: buildStorageKey('shell:pinnedApps'),
  workspaceId: buildStorageKey('shell:workspaceId'),
  focusedWindowId: buildStorageKey('shell:focusedWindowId'),
  activeOverlay: buildStorageKey('shell:activeOverlay'),
  activeContextMenu: buildStorageKey('shell:activeContextMenu'),
  migrated: buildStorageKey('shell:migrated'),
});

export const getBool = (key: string, defaultValue = false): boolean => {
  if (!safeLocalStorage) return defaultValue;
  const stored = safeLocalStorage.getItem(key);
  if (stored === null || stored === undefined) return defaultValue;
  if (stored === 'true') return true;
  if (stored === 'false') return false;
  return defaultValue;
};

export const setBool = (key: string, value: boolean) => {
  if (!safeLocalStorage) return;
  safeLocalStorage.setItem(key, value ? 'true' : 'false');
};

export const getJson = <T>(key: string, defaultValue: T): T => {
  if (!safeLocalStorage) return defaultValue;
  try {
    const stored = safeLocalStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch (error) {
    return defaultValue;
  }
};

export const setJson = (key: string, value: unknown) => {
  if (!safeLocalStorage) return;
  safeLocalStorage.setItem(key, JSON.stringify(value));
};

export const migrateShellStorage = () => {
  if (!safeLocalStorage) return;
  if (getBool(SHELL_STORAGE_KEYS.migrated, false)) return;

  const migratedKeys: string[] = [];

  const oldBgImage = safeLocalStorage.getItem('bg-image');
  if (oldBgImage && safeLocalStorage.getItem(SHELL_STORAGE_KEYS.bgImage) === null) {
    setJson(SHELL_STORAGE_KEYS.bgImage, oldBgImage);
    migratedKeys.push('bg-image');
  }

  const oldScreenLocked = safeLocalStorage.getItem('screen-locked');
  if (oldScreenLocked !== null && safeLocalStorage.getItem(SHELL_STORAGE_KEYS.lock) === null) {
    setBool(SHELL_STORAGE_KEYS.lock, oldScreenLocked === 'true');
    migratedKeys.push('screen-locked');
  }

  const oldBootingScreen = safeLocalStorage.getItem('booting_screen');
  if (oldBootingScreen !== null && safeLocalStorage.getItem(SHELL_STORAGE_KEYS.bootSeen) === null) {
    setBool(SHELL_STORAGE_KEYS.bootSeen, true);
    migratedKeys.push('booting_screen');
  }

  const oldShutdown = safeLocalStorage.getItem('shut-down');
  if (oldShutdown !== null && safeLocalStorage.getItem(SHELL_STORAGE_KEYS.shutdown) === null) {
    setBool(SHELL_STORAGE_KEYS.shutdown, oldShutdown === 'true');
    migratedKeys.push('shut-down');
  }

  migratedKeys.forEach((key) => {
    safeLocalStorage.removeItem(key);
  });

  setBool(SHELL_STORAGE_KEYS.migrated, true);
};
