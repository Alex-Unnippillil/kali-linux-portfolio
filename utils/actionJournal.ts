import type { IDBPDatabase } from 'idb';
import { getDb } from './safeIDB';

const DB_NAME = 'action-journal';
const DB_VERSION = 1;
const STORE_NAME = 'entries';
const PROFILE_INDEX = 'by-profile';
const PROFILE_TIME_INDEX = 'by-profile-time';
const SERIALIZATION_VERSION = 1;

export const ACTION_TYPES = {
  desktop: {
    open: 'desktop/window-open',
    close: 'desktop/window-close',
    focus: 'desktop/window-focus',
    minimize: 'desktop/window-minimize',
    restore: 'desktop/window-restore',
  },
  files: {
    openDirectory: 'files/open-directory',
    openFile: 'files/open-file',
    saveFile: 'files/save-file',
  },
  settings: {
    update: 'settings/update',
    reset: 'settings/reset',
    import: 'settings/import',
  },
} as const;

type DesktopActionType = (typeof ACTION_TYPES.desktop)[keyof typeof ACTION_TYPES.desktop];
type FileActionType = (typeof ACTION_TYPES.files)[keyof typeof ACTION_TYPES.files];
type SettingsActionType = (typeof ACTION_TYPES.settings)[keyof typeof ACTION_TYPES.settings];

export type KnownActionType =
  | DesktopActionType
  | FileActionType
  | SettingsActionType;

export type ActionType = KnownActionType | (string & {});

export interface ActionEntry<T = unknown> {
  type: ActionType;
  payload: T;
  timestamp?: number;
  meta?: Record<string, unknown>;
}

interface SerializedAction<T = unknown> {
  v: number;
  type: ActionType;
  payload: T;
  timestamp: number;
  meta?: Record<string, unknown>;
}

interface StoredActionRecord {
  id: string;
  profileId: string;
  timestamp: number;
  data: string;
}

export interface ActionJournalRecord<T = unknown> {
  id: string;
  profileId: string;
  timestamp: number;
  entry: ActionEntry<T>;
}

export interface RecordActionOptions {
  profileId?: string;
  timestamp?: number;
  id?: string;
}

export interface ReplayOptions {
  profileId?: string;
  limit?: number;
  direction?: 'asc' | 'desc';
}

export interface RevertOptions {
  profileId?: string;
  count?: number;
}

type ActionDB = IDBPDatabase<unknown>;

let activeProfileId = 'default';
let dbPromise: Promise<ActionDB> | null | undefined;
const settingsCache = new Map<string, string>();

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getJournalDb(): Promise<ActionDB> | null {
  if (dbPromise === undefined) {
    const result = getDb(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex(PROFILE_INDEX, 'profileId', { unique: false });
          store.createIndex(PROFILE_TIME_INDEX, ['profileId', 'timestamp'], { unique: false });
        }
      },
    });
    dbPromise = result ?? null;
  }
  return dbPromise ?? null;
}

export function setActiveProfile(profileId: string): void {
  activeProfileId = profileId || 'default';
}

export function getActiveProfile(): string {
  return activeProfileId;
}

export function serializeActionEntry<T>(entry: ActionEntry<T>): string {
  const serialized: SerializedAction<T> = {
    v: SERIALIZATION_VERSION,
    type: entry.type,
    payload: entry.payload,
    timestamp: entry.timestamp ?? Date.now(),
    ...(entry.meta ? { meta: entry.meta } : {}),
  };
  return JSON.stringify(serialized);
}

export function deserializeActionEntry<T>(value: string): ActionEntry<T> {
  const parsed = JSON.parse(value) as Partial<SerializedAction<T>>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid action entry');
  }
  if (typeof parsed.type !== 'string') {
    throw new Error('Serialized action missing type');
  }
  const timestamp = typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now();
  return {
    type: parsed.type,
    payload: parsed.payload as T,
    timestamp,
    meta: parsed.meta,
  };
}

export async function recordAction<T>(
  entry: ActionEntry<T>,
  options: RecordActionOptions = {},
): Promise<string | null> {
  try {
    const dbp = getJournalDb();
    if (!dbp) return null;
    const db = await dbp;
    const profileId = options.profileId ?? activeProfileId;
    const timestamp = options.timestamp ?? entry.timestamp ?? Date.now();
    const id = options.id ?? generateId();
    const serialized = serializeActionEntry({ ...entry, timestamp });
    const record: StoredActionRecord = {
      id,
      profileId,
      timestamp,
      data: serialized,
    };
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.store.put(record);
    await tx.done;
    return id;
  } catch (error) {
    console.warn('Failed to record action', error);
    return null;
  }
}

function mapRecord<T>(value: StoredActionRecord): ActionJournalRecord<T> | null {
  try {
    const entry = deserializeActionEntry<T>(value.data);
    return {
      id: value.id,
      profileId: value.profileId,
      timestamp: value.timestamp,
      entry,
    };
  } catch {
    return null;
  }
}

export async function getActions<T>(
  profileId: string,
  options: { limit?: number; direction?: 'asc' | 'desc' } = {},
): Promise<ActionJournalRecord<T>[]> {
  try {
    const dbp = getJournalDb();
    if (!dbp) return [];
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readonly');
    const direction = options.direction === 'desc' ? 'prev' : 'next';
    const index = tx.store.index(PROFILE_TIME_INDEX);
    const range = IDBKeyRange.bound(
      [profileId, Number.MIN_SAFE_INTEGER],
      [profileId, Number.MAX_SAFE_INTEGER],
    );
    let cursor = await index.openCursor(range, direction);
    const results: ActionJournalRecord<T>[] = [];
    while (cursor) {
      const mapped = mapRecord<T>(cursor.value as StoredActionRecord);
      if (mapped) {
        results.push(mapped);
        if (options.limit && results.length >= options.limit) {
          break;
        }
      }
      cursor = await cursor.continue();
    }
    await tx.done;
    return results;
  } catch {
    return [];
  }
}

export async function replayActions<T>(
  handler: (record: ActionJournalRecord<T>) => Promise<void> | void,
  options: ReplayOptions = {},
): Promise<number> {
  const profileId = options.profileId ?? activeProfileId;
  const actions = await getActions<T>(profileId, {
    limit: options.limit,
    direction: options.direction,
  });
  for (const action of actions) {
    await handler(action);
  }
  return actions.length;
}

export async function revertActions<T>(
  handler?: (record: ActionJournalRecord<T>) => Promise<void> | void,
  options: RevertOptions = {},
): Promise<number> {
  const profileId = options.profileId ?? activeProfileId;
  const count = options.count ?? 1;
  if (count <= 0) return 0;
  try {
    const dbp = getJournalDb();
    if (!dbp) return 0;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const index = tx.store.index(PROFILE_TIME_INDEX);
    const range = IDBKeyRange.bound(
      [profileId, Number.MIN_SAFE_INTEGER],
      [profileId, Number.MAX_SAFE_INTEGER],
    );
    let cursor = await index.openCursor(range, 'prev');
    let processed = 0;
    while (cursor && processed < count) {
      const value = cursor.value as StoredActionRecord;
      const mapped = mapRecord<T>(value);
      await cursor.delete();
      if (mapped && handler) {
        try {
          await handler(mapped);
        } catch {
          // Swallow handler errors to ensure journal cleanup continues
        }
      }
      processed += 1;
      cursor = await cursor.continue();
    }
    await tx.done;
    return processed;
  } catch {
    return 0;
  }
}

export async function clearJournal(profileId?: string): Promise<void> {
  try {
    const dbp = getJournalDb();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    if (!profileId) {
      await tx.store.clear();
    } else {
      const index = tx.store.index(PROFILE_INDEX);
      let cursor = await index.openCursor(profileId);
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    }
    await tx.done;
  } catch {
    // ignore clear errors
  }
}

function stringifySettingValue(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function recordSettingsChange(
  key: string,
  value: unknown,
  options: { profileId?: string } = {},
): Promise<string | null> {
  const normalized = stringifySettingValue(value);
  if (settingsCache.get(key) === normalized) {
    return Promise.resolve(null);
  }
  settingsCache.set(key, normalized);
  return recordAction(
    {
      type: ACTION_TYPES.settings.update,
      payload: { key, value },
    },
    options,
  );
}

export function resetJournalState(): void {
  settingsCache.clear();
  activeProfileId = 'default';
}
