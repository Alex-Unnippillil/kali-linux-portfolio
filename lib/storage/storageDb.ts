import type { DBSchema } from 'idb';
import { del as keyvalDel, get as keyvalGet } from 'idb-keyval';
import type { Keybinds, ProgressData, Replay } from '@/types/storage';
import { createDatabase, type Migration, type MigrationContext, type TypedDatabase } from './indexeddb';

export const STORAGE_DB_NAME = 'kali-storage';
export const STORE_PROGRESS = 'progress';
export const STORE_KEYBINDS = 'keybinds';
export const STORE_REPLAYS = 'replays';
export const REPLAY_INDEX_CREATED_AT = 'byCreatedAt';
export const PROGRESS_PRIMARY_KEY = 'global';
export const KEYBINDS_PRIMARY_KEY = 'default';

export const LEGACY_PROGRESS_KEY = 'progress';
export const LEGACY_KEYBINDS_KEY = 'keybinds';
export const LEGACY_REPLAYS_KEY = 'replays';

export interface StorageSchema extends DBSchema {
  progress: {
    key: typeof PROGRESS_PRIMARY_KEY;
    value: ProgressData;
  };
  keybinds: {
    key: typeof KEYBINDS_PRIMARY_KEY;
    value: Keybinds;
  };
  replays: {
    key: string;
    value: Replay;
    indexes: {
      [REPLAY_INDEX_CREATED_AT]: number;
    };
  };
}

const migrations: Migration<StorageSchema>[] = [
  {
    version: 1,
    migrate: (db) => {
      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        db.createObjectStore(STORE_PROGRESS);
      }
      if (!db.objectStoreNames.contains(STORE_KEYBINDS)) {
        db.createObjectStore(STORE_KEYBINDS);
      }
      if (!db.objectStoreNames.contains(STORE_REPLAYS)) {
        const store = db.createObjectStore(STORE_REPLAYS, { keyPath: 'id' });
        store.createIndex(REPLAY_INDEX_CREATED_AT, 'createdAt');
      }
    },
  },
  {
    version: 2,
    migrate: async (db, context) => {
      await ensureReplayIndex(context);
      await migrateLegacyKeyval(db, context);
    },
  },
];

function createReplayTimestampGenerator() {
  let ts = Date.now();
  return () => ts++;
}

async function migrateLegacyKeyval(
  _db: Parameters<Migration<StorageSchema>['migrate']>[0],
  context: MigrationContext<StorageSchema>,
): Promise<void> {
  try {
    const [legacyProgress, legacyKeybinds, legacyReplays] = await Promise.all([
      keyvalGet<ProgressData | undefined>(LEGACY_PROGRESS_KEY).catch(() => undefined),
      keyvalGet<Keybinds | undefined>(LEGACY_KEYBINDS_KEY).catch(() => undefined),
      keyvalGet<Replay[] | undefined>(LEGACY_REPLAYS_KEY).catch(() => undefined),
    ]);

    const progressStore = context.transaction.objectStore(STORE_PROGRESS);
    if (legacyProgress && !(await progressStore.get(PROGRESS_PRIMARY_KEY))) {
      await progressStore.put(legacyProgress, PROGRESS_PRIMARY_KEY);
    }

    const keybindsStore = context.transaction.objectStore(STORE_KEYBINDS);
    if (legacyKeybinds && !(await keybindsStore.get(KEYBINDS_PRIMARY_KEY))) {
      await keybindsStore.put(legacyKeybinds, KEYBINDS_PRIMARY_KEY);
    }

    const replaysStore = context.transaction.objectStore(STORE_REPLAYS);
    const hasExistingReplays = (await replaysStore.count()) > 0;
    if (Array.isArray(legacyReplays) && !hasExistingReplays) {
      const nextTimestamp = createReplayTimestampGenerator();
      for (const replay of legacyReplays as Replay[]) {
        if (!replay || typeof replay.id !== 'string') continue;
        const entry: Replay = {
          ...replay,
          createdAt: replay.createdAt ?? nextTimestamp(),
        };
        await replaysStore.put(entry);
      }
    }

    await Promise.all([
      keyvalDel(LEGACY_PROGRESS_KEY).catch(() => undefined),
      keyvalDel(LEGACY_KEYBINDS_KEY).catch(() => undefined),
      keyvalDel(LEGACY_REPLAYS_KEY).catch(() => undefined),
    ]);
  } catch {
    // Ignore migration failures and keep existing data intact
  }
}

async function ensureReplayIndex(context: MigrationContext<StorageSchema>): Promise<void> {
  const store = context.transaction.objectStore(STORE_REPLAYS);
  if (!store.indexNames.contains(REPLAY_INDEX_CREATED_AT)) {
    store.createIndex(REPLAY_INDEX_CREATED_AT, 'createdAt');
  }
}

export const createStorageDatabase = (version?: number): TypedDatabase<StorageSchema> =>
  createDatabase<StorageSchema>({
    name: STORAGE_DB_NAME,
    migrations,
    version,
  });

export const storageDb = createStorageDatabase();
export { migrations as storageMigrations };
