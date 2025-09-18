"use client";

import { get, set, del } from 'idb-keyval';
import { getTheme, setTheme } from './theme';

const SETTINGS_STORE_KEY = 'settings-store';
const LEGACY_IDB_KEYS = ['accent', 'bg-image'];

const clone = (value) =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : value === undefined
      ? value
      : JSON.parse(JSON.stringify(value));

const SCHEMAS = new Map([
  [
    1,
    {
      version: 1,
      defaults: {
        accent: '#1793d1',
        wallpaper: 'wall-2',
        density: 'regular',
        reducedMotion: false,
        fontScale: 1,
        highContrast: false,
        largeHitAreas: false,
        pongSpin: true,
        allowNetwork: false,
      },
    },
  ],
  [
    2,
    {
      version: 2,
      defaults: {
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
      },
    },
  ],
]);

const LATEST_VERSION = Math.max(...SCHEMAS.keys());

const MIGRATIONS = {
  up: new Map([
    [
      1,
      (data) => ({
        ...data,
        haptics: data.haptics ?? true,
      }),
    ],
  ]),
  down: new Map([
    [
      2,
      (data) => {
        const { haptics, ...rest } = data;
        return rest;
      },
    ],
  ]),
};

const DEFAULTS = Object.freeze({ ...SCHEMAS.get(LATEST_VERSION).defaults });

const isBrowser = () => typeof window !== 'undefined';

const getSafeLocalStorage = () => {
  if (!isBrowser()) return undefined;
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

const getSchema = (version) => {
  const schema = SCHEMAS.get(version);
  if (!schema) {
    throw new Error(`Unknown settings schema version: ${version}`);
  }
  return schema;
};

const normalizeForVersion = (data, version) => {
  const schema = getSchema(version);
  const normalized = {};
  for (const [key, value] of Object.entries(schema.defaults)) {
    normalized[key] = data && data[key] !== undefined ? data[key] : value;
  }
  return normalized;
};

const createRecord = (data, version, previousVersion = null, meta = {}) => ({
  version,
  data: normalizeForVersion(data, version),
  meta: {
    version,
    previousVersion,
    ...meta,
  },
});

const isRecord = (value) =>
  value &&
  typeof value === 'object' &&
  (typeof value.version === 'number' ||
    (value.meta && typeof value.meta.version === 'number')) &&
  value.data &&
  typeof value.data === 'object';

const migrateRecord = (record, targetVersion) => {
  const sourceVersion = record.version ?? record.meta?.version ?? targetVersion;
  const initialRecord = createRecord(record.data ?? {}, sourceVersion, null, record.meta);
  if (sourceVersion === targetVersion) {
    return { record: initialRecord, migrated: false };
  }

  const direction = targetVersion > sourceVersion ? 1 : -1;
  let currentVersion = sourceVersion;
  let currentData = clone(initialRecord.data);

  try {
    while (currentVersion !== targetVersion) {
      if (direction > 0) {
        const migrateUp = MIGRATIONS.up.get(currentVersion);
        if (!migrateUp) {
          throw new Error(`Missing upgrade path from v${currentVersion} to v${currentVersion + 1}`);
        }
        currentData = normalizeForVersion(migrateUp(clone(currentData)), currentVersion + 1);
        currentVersion += 1;
      } else {
        const migrateDown = MIGRATIONS.down.get(currentVersion);
        if (!migrateDown) {
          throw new Error(`Missing downgrade path from v${currentVersion} to v${currentVersion - 1}`);
        }
        currentData = normalizeForVersion(migrateDown(clone(currentData)), currentVersion - 1);
        currentVersion -= 1;
      }
    }
    return {
      record: createRecord(currentData, targetVersion, sourceVersion),
      migrated: true,
    };
  } catch (error) {
    return {
      record: initialRecord,
      migrated: false,
      error,
    };
  }
};

const syncLegacySideEffects = (partial) => {
  if (!isBrowser()) return;
  const storage = getSafeLocalStorage();
  if (!storage) return;

  if (partial.wallpaper !== undefined) {
    storage.setItem('bg-image', String(partial.wallpaper));
  }
  if (partial.density !== undefined) {
    storage.setItem('density', String(partial.density));
  }
  if (partial.reducedMotion !== undefined) {
    storage.setItem('reduced-motion', partial.reducedMotion ? 'true' : 'false');
  }
  if (partial.fontScale !== undefined) {
    storage.setItem('font-scale', String(partial.fontScale));
  }
  if (partial.highContrast !== undefined) {
    storage.setItem('high-contrast', partial.highContrast ? 'true' : 'false');
  }
  if (partial.largeHitAreas !== undefined) {
    storage.setItem('large-hit-areas', partial.largeHitAreas ? 'true' : 'false');
  }
  if (partial.pongSpin !== undefined) {
    storage.setItem('pong-spin', partial.pongSpin ? 'true' : 'false');
  }
  if (partial.allowNetwork !== undefined) {
    storage.setItem('allow-network', partial.allowNetwork ? 'true' : 'false');
  }
  if (partial.haptics !== undefined) {
    storage.setItem('haptics', partial.haptics ? 'true' : 'false');
  }
};

const cleanupLegacyStorage = async () => {
  await Promise.all(LEGACY_IDB_KEYS.map((key) => del(key).catch(() => undefined)));
};

const loadLegacyRecord = async () => {
  if (!isBrowser()) return null;
  const storage = getSafeLocalStorage();
  const defaults = clone(DEFAULTS);
  const [accent, idbWallpaper] = await Promise.all([
    get('accent').catch(() => undefined),
    get('bg-image').catch(() => undefined),
  ]);

  const data = { ...defaults };
  if (typeof accent === 'string') {
    data.accent = accent;
  }

  const wallpaper =
    (typeof idbWallpaper === 'string' && idbWallpaper) || storage?.getItem('bg-image');
  if (wallpaper) {
    data.wallpaper = wallpaper;
  }

  if (storage) {
    const density = storage.getItem('density');
    if (density) data.density = density;
    const reducedMotion = storage.getItem('reduced-motion');
    if (reducedMotion !== null) data.reducedMotion = reducedMotion === 'true';
    const fontScale = storage.getItem('font-scale');
    if (fontScale) {
      const parsed = parseFloat(fontScale);
      if (!Number.isNaN(parsed)) data.fontScale = parsed;
    }
    const highContrast = storage.getItem('high-contrast');
    if (highContrast !== null) data.highContrast = highContrast === 'true';
    const largeHitAreas = storage.getItem('large-hit-areas');
    if (largeHitAreas !== null) data.largeHitAreas = largeHitAreas === 'true';
    const pongSpin = storage.getItem('pong-spin');
    if (pongSpin !== null) data.pongSpin = pongSpin === 'true';
    const allowNetwork = storage.getItem('allow-network');
    if (allowNetwork !== null) data.allowNetwork = allowNetwork === 'true';
    const haptics = storage.getItem('haptics');
    if (haptics !== null) data.haptics = haptics === 'true';
  }

  return createRecord(data, LATEST_VERSION);
};

const readStoredRecord = async () => {
  if (!isBrowser()) {
    return { record: createRecord({}, LATEST_VERSION), fromLegacy: false };
  }

  const stored = await get(SETTINGS_STORE_KEY).catch(() => undefined);
  if (isRecord(stored)) {
    const version =
      typeof stored.version === 'number'
        ? stored.version
        : typeof stored.meta?.version === 'number'
          ? stored.meta.version
          : LATEST_VERSION;
    const meta = stored.meta ? { ...stored.meta, version } : { version };
    return {
      record: createRecord(stored.data ?? {}, version, meta.previousVersion ?? null, meta),
      fromLegacy: false,
    };
  }

  const legacy = await loadLegacyRecord();
  if (legacy) {
    return { record: legacy, fromLegacy: true };
  }

  return { record: createRecord({}, LATEST_VERSION), fromLegacy: false };
};

const writeRecord = async (record) => {
  if (!isBrowser()) return;
  await set(SETTINGS_STORE_KEY, record);
};

const ensureLatestRecord = async () => {
  const { record, fromLegacy } = await readStoredRecord();
  const { record: migrated, migrated: didMigrate, error } = migrateRecord(record, LATEST_VERSION);

  if (error) {
    console.error('Failed to migrate settings store', error);
    return record;
  }

  if (fromLegacy || didMigrate) {
    await writeRecord(migrated);
    syncLegacySideEffects(migrated.data);
    await cleanupLegacyStorage();
    return migrated;
  }

  return migrated;
};

export const defaults = DEFAULTS;

export const schemas = SCHEMAS;
export const migrations = MIGRATIONS;
export const SETTINGS_KEY = SETTINGS_STORE_KEY;

export async function loadSettings() {
  if (!isBrowser()) {
    return clone(DEFAULTS);
  }
  const record = await ensureLatestRecord();
  return clone(record.data);
}

export async function setSetting(key, value) {
  if (!isBrowser()) return value;
  const record = await ensureLatestRecord();
  const nextData = { ...record.data, [key]: value };
  const nextRecord = createRecord(nextData, LATEST_VERSION, record.version);
  await writeRecord(nextRecord);
  syncLegacySideEffects({ [key]: nextRecord.data[key] });
  return nextRecord.data[key];
}

export async function setSettings(partial) {
  if (!isBrowser()) return clone(DEFAULTS);
  const record = await ensureLatestRecord();
  const nextData = { ...record.data, ...partial };
  const nextRecord = createRecord(nextData, LATEST_VERSION, record.version);
  await writeRecord(nextRecord);
  syncLegacySideEffects(partial);
  return clone(nextRecord.data);
}

export async function resetSettings() {
  if (!isBrowser()) return;
  const record = createRecord({}, LATEST_VERSION);
  await writeRecord(record);
  syncLegacySideEffects(record.data);
  await cleanupLegacyStorage();
}

export async function exportSettings() {
  const data = await loadSettings();
  const theme = getTheme();
  const meta = {
    version: LATEST_VERSION,
  };
  return JSON.stringify({
    version: LATEST_VERSION,
    meta,
    data,
    theme,
    ...data,
  });
}

export async function importSettings(json) {
  if (!isBrowser()) return;
  let payload = json;
  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch (error) {
      console.error('Invalid settings', error);
      return;
    }
  }

  if (!payload || typeof payload !== 'object') {
    console.error('Invalid settings payload', payload);
    return;
  }

  const incomingVersion =
    typeof payload.version === 'number'
      ? payload.version
      : typeof payload.meta?.version === 'number'
        ? payload.meta.version
        : LATEST_VERSION;
  const incomingData =
    payload.data && typeof payload.data === 'object'
      ? payload.data
      : payload;

  const { record: migrated, error } = migrateRecord(
    createRecord(incomingData, incomingVersion),
    LATEST_VERSION,
  );

  if (error) {
    console.error('Failed to migrate imported settings', error);
    return;
  }

  const merged = await setSettings(migrated.data);
  if (payload.theme !== undefined) {
    setTheme(payload.theme);
  } else if (payload.data && payload.data.theme !== undefined) {
    setTheme(payload.data.theme);
  }
  return merged;
}

export async function getSettingsRecord() {
  return ensureLatestRecord();
}

export { migrateRecord };
