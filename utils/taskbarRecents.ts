import { getDb } from './safeIDB';

export interface TaskbarRecentEntry<T = unknown> {
  /** Unique identifier for rendering */
  id: string;
  /** Label shown to the user */
  label: string;
  /** Optional secondary description */
  description?: string;
  /** Raw payload returned by the provider */
  payload?: T;
}

type TaskbarRecentsProvider<T = unknown> = {
  load: () => Promise<TaskbarRecentEntry<T>[]>;
  clear: () => Promise<void>;
};

const providers: Record<string, TaskbarRecentsProvider<any>> = {};

const FILE_EXPLORER_DB = 'file-explorer';
const FILE_EXPLORER_STORE = 'recent';

interface FileExplorerRecentEntry {
  name: string;
  handle?: FileSystemDirectoryHandle;
}

async function openFileExplorerDb() {
  try {
    const dbp = getDb(FILE_EXPLORER_DB, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(FILE_EXPLORER_STORE)) {
          db.createObjectStore(FILE_EXPLORER_STORE, { autoIncrement: true });
        }
      },
    });
    if (!dbp) return null;
    return await dbp;
  } catch {
    return null;
  }
}

registerTaskbarRecentsProvider('file-explorer', {
  async load() {
    try {
      const db = await openFileExplorerDb();
      if (!db) return [];
      const entries = (await db.getAll(FILE_EXPLORER_STORE)) as FileExplorerRecentEntry[];
      if (!Array.isArray(entries)) return [];
      return entries
        .map((entry, index) => ({
          id: `${entry?.name || 'recent'}-${index}`,
          label: entry?.name || 'Recent folder',
          payload: entry,
        }))
        .reverse();
    } catch {
      return [];
    }
  },
  async clear() {
    try {
      const db = await openFileExplorerDb();
      if (!db) return;
      await db.clear(FILE_EXPLORER_STORE);
    } catch {
      // ignore failures
    }
  },
});

export function registerTaskbarRecentsProvider<T = unknown>(
  appId: string,
  provider: TaskbarRecentsProvider<T>,
) {
  providers[appId] = provider;
}

export function unregisterTaskbarRecentsProvider(appId: string) {
  delete providers[appId];
}

export function supportsTaskbarRecents(appId: string | null | undefined) {
  if (!appId) return false;
  return Boolean(providers[appId]);
}

export async function getTaskbarRecentEntries<T = unknown>(
  appId: string | null | undefined,
): Promise<TaskbarRecentEntry<T>[]> {
  if (!appId) return [];
  const provider = providers[appId];
  if (!provider) return [];
  try {
    const entries = await provider.load();
    return Array.isArray(entries) ? entries : [];
  } catch {
    return [];
  }
}

export async function clearTaskbarRecentEntries(appId: string | null | undefined): Promise<void> {
  if (!appId) return;
  const provider = providers[appId];
  if (!provider) return;
  try {
    await provider.clear();
  } catch {
    // ignore failures
  }
}
