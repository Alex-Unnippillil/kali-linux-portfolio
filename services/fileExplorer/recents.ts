import { getDb } from '../../utils/safeIDB';

export interface RecentDirectoryEntry {
  name: string;
  handle: FileSystemDirectoryHandle;
  timestamp: number;
}

const DB_NAME = 'file-explorer';
const STORE_NAME = 'recent';
const MAX_RECENTS = 10;

type DbPromise = ReturnType<typeof getDb>;
let dbPromise: DbPromise | null = null;

function openRecentsDb() {
  if (!dbPromise) {
    dbPromise = getDb(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export async function fetchRecentDirectories(limit = MAX_RECENTS): Promise<RecentDirectoryEntry[]> {
  try {
    const dbp = openRecentsDb();
    if (!dbp) return [];
    const db = await dbp;
    const entries = ((await db.getAll(STORE_NAME)) as RecentDirectoryEntry[] | undefined) ?? [];
    const sorted = entries.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
    return sorted.slice(0, limit);
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
    const entry: RecentDirectoryEntry = {
      name: name || handle.name || '/',
      handle,
      timestamp: Date.now(),
    };
    await db.put(STORE_NAME, entry);
  } catch {
    // Swallow errors to keep the explorer responsive even if IDB fails.
  }
}

export function resetRecentsDbForTests() {
  dbPromise = null;
}
