import { RECENT_STORAGE_KEY } from './recentStorage';
import { safeLocalStorage } from './safeStorage';
import { exportSettings, importSettings } from './settingsStore';

export const BUNDLE_VERSION = 1;

type StorageEncoding = 'json' | 'string';

interface StorageKeyDefinition {
  key: string;
  encoding: StorageEncoding;
}

const STORAGE_SCHEMA = {
  launcher: [
    { key: 'launcherFavorites', encoding: 'json' },
    { key: RECENT_STORAGE_KEY, encoding: 'json' },
    { key: 'recentApps', encoding: 'json' },
    { key: 'whisker-menu-category', encoding: 'string' },
  ],
  preferences: [
    { key: 'snap-enabled', encoding: 'json' },
    { key: 'app:theme', encoding: 'string' },
  ],
  templates: [
    { key: 'reconng-report-template', encoding: 'string' },
    { key: 'project-gallery-filters', encoding: 'json' },
    { key: 'sokoban_packs', encoding: 'json' },
  ],
  workspace: [
    { key: 'portfolio-tasks', encoding: 'json' },
    { key: 'todoist-column-order', encoding: 'json' },
    { key: 'installedPlugins', encoding: 'json' },
    { key: 'lastPluginRun', encoding: 'json' },
  ],
  schedules: [
    { key: 'scanSchedules', encoding: 'json' },
  ],
  hydra: [
    { key: 'hydraUserLists', encoding: 'json' },
    { key: 'hydraPassLists', encoding: 'json' },
    { key: 'hydra/session', encoding: 'json' },
    { key: 'hydra/config', encoding: 'json' },
  ],
  qr: [
    { key: 'qrScans', encoding: 'json' },
    { key: 'qrLastScan', encoding: 'string' },
    { key: 'qrLastGeneration', encoding: 'string' },
  ],
} as const satisfies Record<string, readonly StorageKeyDefinition[]>;

type StorageCategory = keyof typeof STORAGE_SCHEMA;

type StorageData = Partial<Record<StorageCategory, Record<string, unknown>>>;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readLocalStorageValue = (
  storage: Storage,
  definition: StorageKeyDefinition,
): unknown | undefined => {
  const raw = storage.getItem(definition.key);
  if (raw === null) return undefined;
  if (definition.encoding === 'string') {
    return raw;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
};

const writeLocalStorageValue = (
  storage: Storage,
  definition: StorageKeyDefinition,
  value: unknown,
): void => {
  if (value === undefined) return;
  if (value === null) {
    try {
      storage.removeItem(definition.key);
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    if (definition.encoding === 'string') {
      storage.setItem(definition.key, String(value));
    } else {
      storage.setItem(definition.key, JSON.stringify(value));
    }
  } catch {
    /* ignore quota or serialization errors */
  }
};

export interface DataBundle {
  version: typeof BUNDLE_VERSION;
  createdAt: string;
  settings: Record<string, unknown>;
  storage: StorageData;
}

export const serializeDataBundle = (bundle: DataBundle): string =>
  JSON.stringify(bundle, null, 2);

export const estimateBundleSize = (serialized: string): number => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(serialized).length;
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.byteLength(serialized, 'utf-8');
  }
  return serialized.length;
};

export const createDataBundle = async (): Promise<DataBundle> => {
  let settings: Record<string, unknown> = {};
  try {
    const exported = await exportSettings();
    settings = JSON.parse(exported);
  } catch {
    settings = {};
  }

  const storage = safeLocalStorage;
  const storageData: StorageData = {};
  if (storage) {
    (Object.keys(STORAGE_SCHEMA) as StorageCategory[]).forEach(category => {
      const entries: Record<string, unknown> = {};
      STORAGE_SCHEMA[category].forEach(definition => {
        const value = readLocalStorageValue(storage, definition);
        if (value !== undefined) {
          entries[definition.key] = value;
        }
      });
      if (Object.keys(entries).length > 0) {
        storageData[category] = entries;
      }
    });
  }

  return {
    version: BUNDLE_VERSION,
    createdAt: new Date().toISOString(),
    settings,
    storage: storageData,
  };
};

export const parseDataBundle = (json: string): DataBundle => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid bundle: unreadable JSON');
  }

  if (!isPlainObject(parsed)) {
    throw new Error('Invalid bundle: expected object');
  }

  const { version, createdAt, settings, storage } = parsed;
  if (version !== BUNDLE_VERSION) {
    throw new Error('Unsupported bundle version');
  }
  if (typeof createdAt !== 'string') {
    throw new Error('Invalid bundle: missing timestamp');
  }
  if (!isPlainObject(settings)) {
    throw new Error('Invalid bundle: settings section missing');
  }

  const sanitizedStorage: StorageData = {};
  if (isPlainObject(storage)) {
    Object.entries(storage).forEach(([categoryKey, value]) => {
      if (!Object.prototype.hasOwnProperty.call(STORAGE_SCHEMA, categoryKey)) {
        return;
      }
      if (!isPlainObject(value)) {
        return;
      }
      const allowedDefinitions = STORAGE_SCHEMA[categoryKey as StorageCategory];
      const allowedKeys = new Set(allowedDefinitions.map(def => def.key));
      const cleaned: Record<string, unknown> = {};
      Object.entries(value).forEach(([key, entryValue]) => {
        if (allowedKeys.has(key)) {
          cleaned[key] = entryValue;
        }
      });
      if (Object.keys(cleaned).length > 0) {
        sanitizedStorage[categoryKey as StorageCategory] = cleaned;
      }
    });
  }

  return {
    version: BUNDLE_VERSION,
    createdAt,
    settings,
    storage: sanitizedStorage,
  };
};

export const applyDataBundle = async (bundle: DataBundle): Promise<void> => {
  await importSettings(bundle.settings);
  const storage = safeLocalStorage;
  if (!storage || !bundle.storage) return;

  (Object.keys(bundle.storage) as StorageCategory[]).forEach(category => {
    const data = bundle.storage?.[category];
    if (!data) return;
    const definitions = STORAGE_SCHEMA[category];
    definitions.forEach(definition => {
      if (Object.prototype.hasOwnProperty.call(data, definition.key)) {
        writeLocalStorageValue(storage, definition, data[definition.key]);
      }
    });
  });
};

export const formatBundleSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '0 B';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export type { StorageCategory };
