import { getDb } from '../../utils/safeIDB';

export interface RecentDirectoryEntry {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  timestamp: number;
}

const DB_NAME = 'file-explorer';
const STORE_NAME = 'recent-v2';
const LEGACY_STORE_NAME = 'recent';
const DB_VERSION = 2;
const MAX_RECENTS = 10;

type DbPromise = ReturnType<typeof getDb>;
let dbPromise: DbPromise | null = null;

function openRecentsDb() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, DB_VERSION, {
      upgrade: async (db, oldVersion, _newVersion, transaction) => {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (oldVersion < 2 && db.objectStoreNames.contains(LEGACY_STORE_NAME)) {
          const legacyStore = transaction?.objectStore(LEGACY_STORE_NAME);
          const newStore = transaction?.objectStore(STORE_NAME);
          if (legacyStore && newStore) {
            const legacyEntries =
              ((await legacyStore.getAll()) as RecentDirectoryEntry[] | undefined) ?? [];
            for (const entry of legacyEntries) {
              const migrated: RecentDirectoryEntry = {
                id: entry.id || `legacy-${entry.timestamp}-${entry.name}`,
                name: entry.name,
                handle: entry.handle,
                timestamp: entry.timestamp ?? Date.now(),
              };
              await newStore.put(migrated);
            }
          }
        }
      },
    });
  }
  return dbPromise;
}

function createRecentId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `recent-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function isSameDirectory(
  left: RecentDirectoryEntry,
  right: RecentDirectoryEntry,
) {
  try {
    if (left.handle?.isSameEntry) {
      return await left.handle.isSameEntry(right.handle);
    }
  } catch {
    // ignore
  }
  return left.name === right.name && left.handle?.name === right.handle?.name;
}

async function trimRecents(entries: RecentDirectoryEntry[]) {
  if (entries.length <= MAX_RECENTS) return [];
  const sorted = [...entries].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  return sorted.slice(MAX_RECENTS);
}

export async function fetchRecentDirectories(limit = MAX_RECENTS): Promise<RecentDirectoryEntry[]> {
  try {
    const dbp = openRecentsDb();
    if (!dbp) return [];
    const db = await dbp;
    const entries = ((await db.getAll(STORE_NAME)) as RecentDirectoryEntry[] | undefined) ?? [];
    const sorted = entries.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    const trimmed = sorted.slice(0, limit);
    if (sorted.length > limit) {
      const overflow = sorted.slice(limit);
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      await Promise.all(overflow.map((entry) => store.delete(entry.id)));
      await tx.done;
    }
    return trimmed;
  } catch {
    return [];
  }
}

export async function persistRecentDirectory(
  handle: FileSystemDirectoryHandle,
  name?: string,
): Promise<void> {
  try {
    const dbp = openRecentsDb();
    if (!dbp) return;
    const db = await dbp;
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const entries =
      ((await store.getAll()) as RecentDirectoryEntry[] | undefined) ?? [];
    const entry: RecentDirectoryEntry = {
      id: createRecentId(),
      name: name || handle.name || '/',
      handle,
      timestamp: Date.now(),
    };
    for (const existing of entries) {
      if (await isSameDirectory(existing, entry)) {
        await store.delete(existing.id);
      }
    }
    await store.put(entry);
    const overflow = await trimRecents([...entries.filter((e) => e.id !== entry.id), entry]);
    await Promise.all(overflow.map((recent) => store.delete(recent.id)));
    await tx.done;
  } catch {
    // Swallow errors to keep the explorer responsive even if IDB fails.
  }
}

export async function resetRecentsDbForTests() {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // ignore
    }
  }
  dbPromise = null;
}
