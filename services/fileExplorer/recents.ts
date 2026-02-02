import { getDb } from '../../utils/safeIDB';
import { PermissionMode } from './permissions';

export interface RecentDirectoryEntry {
  name: string;
  handle: FileSystemDirectoryHandle;
  timestamp: number;
  key?: string;
  permission?: PermissionState;
}

const DB_NAME = 'file-explorer';
const STORE_NAME = 'recent';
const MAX_RECENTS = 10;

type DbPromise = ReturnType<typeof getDb>;
let dbPromise: DbPromise | null = null;

const deriveHandleKey = (handle: FileSystemDirectoryHandle, name?: string) =>
  `${handle.kind || 'directory'}:${name || handle.name || '/'}`;

const queryHandlePermission = async (
  handle: FileSystemDirectoryHandle,
  mode: PermissionMode = 'read',
): Promise<PermissionState> => {
  if (!handle?.queryPermission) return 'granted';
  try {
    return await handle.queryPermission({ mode });
  } catch {
    return 'denied';
  }
};

const handlesMatch = async (
  primary: FileSystemDirectoryHandle,
  secondary: FileSystemDirectoryHandle,
  primaryKey?: string,
  secondaryKey?: string,
): Promise<boolean> => {
  if (primary?.isSameEntry) {
    try {
      return await primary.isSameEntry(secondary);
    } catch {
      return false;
    }
  }
  if (secondary?.isSameEntry) {
    try {
      return await secondary.isSameEntry(primary);
    } catch {
      return false;
    }
  }
  return (
    (primaryKey ?? deriveHandleKey(primary)) ===
    (secondaryKey ?? deriveHandleKey(secondary))
  );
};

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
    const keys = (await db.getAllKeys(STORE_NAME)) as IDBValidKey[];
    const toDelete: IDBValidKey[] = [];
    const unique: RecentDirectoryEntry[] = [];

    for (const [index, entry] of entries.entries()) {
      if (!entry?.handle) {
        toDelete.push(keys[index]);
        continue;
      }
      const permission = await queryHandlePermission(entry.handle);
      if (permission === 'denied' && !entry.handle.requestPermission) {
        toDelete.push(keys[index]);
        continue;
      }
      const entryKey = entry.key || deriveHandleKey(entry.handle, entry.name);
      entry.permission = permission;
      entry.key = entryKey;

      let duplicateIndex = -1;
      for (let i = 0; i < unique.length; i += 1) {
        const existing = unique[i];
        const existingKey = existing.key || deriveHandleKey(existing.handle, existing.name);
        if (await handlesMatch(entry.handle, existing.handle, entryKey, existingKey)) {
          duplicateIndex = i;
          break;
        }
      }

      if (duplicateIndex !== -1) {
        const existing = unique[duplicateIndex];
        if ((entry.timestamp ?? 0) > (existing.timestamp ?? 0)) {
          unique[duplicateIndex] = entry;
          toDelete.push(keys[entries.indexOf(existing)]);
        } else {
          toDelete.push(keys[index]);
        }
      } else {
        unique.push(entry);
      }
    }

    await Promise.all(toDelete.map((key) => db.delete(STORE_NAME, key)));

    const sorted = unique.sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
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
    const entries = ((await db.getAll(STORE_NAME)) as RecentDirectoryEntry[] | undefined) ?? [];
    const keys = (await db.getAllKeys(STORE_NAME)) as IDBValidKey[];
    const entryKey = deriveHandleKey(handle, name);
    const toDelete: IDBValidKey[] = [];
    for (const [index, existing] of entries.entries()) {
      if (!existing?.handle) {
        toDelete.push(keys[index]);
        continue;
      }
      const existingKey = existing.key || deriveHandleKey(existing.handle, existing.name);
      if (await handlesMatch(handle, existing.handle, entryKey, existingKey)) {
        toDelete.push(keys[index]);
      }
    }
    await Promise.all(toDelete.map((key) => db.delete(STORE_NAME, key)));
    const entry: RecentDirectoryEntry = {
      name: name || handle.name || '/',
      handle,
      timestamp: Date.now(),
      key: entryKey,
    };
    await db.put(STORE_NAME, entry);
  } catch {
    // Swallow errors to keep the explorer responsive even if IDB fails.
  }
}

export function resetRecentsDbForTests() {
  dbPromise = null;
}
