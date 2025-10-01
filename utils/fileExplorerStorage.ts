import type { IDBPDatabase } from 'idb';
import { getDb } from './safeIDB';

export interface TagRecord {
  id: string;
  label: string;
  color: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagAssignmentRecord {
  id: string;
  path: string;
  tagId: string;
  appliedAt: string;
}

export interface SavedQueryFilters {
  tags?: string[];
  directory?: string;
}

export interface SavedQueryRecord {
  id: string;
  name: string;
  query: string;
  filters: SavedQueryFilters;
  createdAt: string;
  updatedAt: string;
}

export interface ExplorerExportPayload {
  version: number;
  tags: TagRecord[];
  tagAssignments: TagAssignmentRecord[];
  savedQueries: SavedQueryRecord[];
}

export interface TagInput {
  label: string;
  color: string;
  description?: string;
}

export interface SavedQueryInput {
  name: string;
  query: string;
  filters?: SavedQueryFilters;
}

export interface RecentDirectoryEntry {
  id?: number;
  name: string;
  handle: FileSystemDirectoryHandle;
  lastOpenedAt: string;
}

const DB_NAME = 'file-explorer';
const DB_VERSION = 2;

const STORES = {
  RECENT: 'recent',
  TAGS: 'tags',
  TAG_ASSIGNMENTS: 'tagAssignments',
  SAVED_QUERIES: 'savedQueries',
} as const;

type StoreKey = typeof STORES[keyof typeof STORES];

type ExplorerDb = IDBPDatabase<Record<StoreKey, any>>;

const createId = (prefix: string): string => {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${uuid}`;
};

const openExplorerDb = () =>
  getDb(DB_NAME, DB_VERSION, {
    upgrade(db, _oldVersion, _newVersion, transaction) {
      if (!db.objectStoreNames.contains(STORES.RECENT)) {
        db.createObjectStore(STORES.RECENT, { autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORES.TAGS)) {
        db.createObjectStore(STORES.TAGS, { keyPath: 'id' });
      }

      const upgradeTx = transaction!;
      let assignmentStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.TAG_ASSIGNMENTS)) {
        assignmentStore = db.createObjectStore(STORES.TAG_ASSIGNMENTS, {
          keyPath: 'id',
        });
      } else {
        assignmentStore = upgradeTx.objectStore(STORES.TAG_ASSIGNMENTS);
      }
      if (!assignmentStore.indexNames.contains('byPath')) {
        assignmentStore.createIndex('byPath', 'path', { unique: false });
      }
      if (!assignmentStore.indexNames.contains('byTag')) {
        assignmentStore.createIndex('byTag', 'tagId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SAVED_QUERIES)) {
        db.createObjectStore(STORES.SAVED_QUERIES, { keyPath: 'id' });
      }
    },
  });

const withDb = async <T>(
  stores: StoreKey | StoreKey[],
  mode: IDBTransactionMode,
  handler: (tx: any, db: ExplorerDb) => Promise<T>,
): Promise<T | null> => {
  const dbPromise = openExplorerDb();
  if (!dbPromise) return null;
  const db = (await dbPromise) as ExplorerDb;
  const storeNames = Array.isArray(stores) ? stores : [stores];
  const tx = db.transaction(storeNames, mode);
  try {
    const result = await handler(tx, db);
    if (tx && typeof tx.done?.then === 'function') {
      await tx.done;
    }
    return result;
  } catch (err) {
    try {
      tx.abort();
    } catch {}
    throw err;
  }
};

export const getRecentDirectories = async (): Promise<RecentDirectoryEntry[]> => {
  const dbPromise = openExplorerDb();
  if (!dbPromise) return [];
  const db = (await dbPromise) as ExplorerDb;
  try {
    const entries = ((await db.getAll(STORES.RECENT)) || []) as RecentDirectoryEntry[];
    return entries.map((entry, index) => ({ ...entry, id: entry.id ?? index }));
  } catch {
    return [];
  }
};

export const addRecentDirectory = async (
  handle: FileSystemDirectoryHandle,
): Promise<void> => {
  const dbPromise = openExplorerDb();
  if (!dbPromise) return;
  const db = (await dbPromise) as ExplorerDb;
  const entry: RecentDirectoryEntry = {
    name: handle.name || 'Directory',
    handle,
    lastOpenedAt: new Date().toISOString(),
  };
  try {
    await db.put(STORES.RECENT, entry);
  } catch {}
};

const normalizeTag = (tag: TagRecord): TagRecord => ({
  ...tag,
  description: tag.description ?? '',
});

export const listTags = async (): Promise<TagRecord[]> => {
  const dbPromise = openExplorerDb();
  if (!dbPromise) return [];
  const db = (await dbPromise) as ExplorerDb;
  const records = ((await db.getAll(STORES.TAGS)) || []) as TagRecord[];
  return records.map(normalizeTag).sort((a, b) => a.label.localeCompare(b.label));
};

export const createTag = async (input: TagInput): Promise<TagRecord | null> =>
  withDb(STORES.TAGS, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.TAGS);
    const now = new Date().toISOString();
    const label = input.label.trim() || 'Untitled Tag';
    const record: TagRecord = {
      id: createId('tag'),
      label,
      color: input.color,
      description: input.description?.trim() || '',
      createdAt: now,
      updatedAt: now,
    };
    await store.put(record);
    return record;
  });

export const updateTag = async (
  id: string,
  updates: Partial<TagInput>,
): Promise<TagRecord | null> =>
  withDb(STORES.TAGS, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.TAGS);
    const existing = ((await store.get(id)) as TagRecord | undefined) || null;
    if (!existing) return null;
    const updatedLabel =
      updates.label !== undefined ? updates.label.trim() || 'Untitled Tag' : existing.label;
    const updated: TagRecord = {
      ...existing,
      label: updatedLabel,
      color: updates.color ?? existing.color,
      description:
        updates.description !== undefined
          ? updates.description.trim()
          : existing.description,
      updatedAt: new Date().toISOString(),
    };
    await store.put(updated);
    return updated;
  });

export const deleteTag = async (id: string): Promise<void> => {
  await withDb([STORES.TAGS, STORES.TAG_ASSIGNMENTS], 'readwrite', async (tx) => {
    await tx.objectStore(STORES.TAGS).delete(id);
    const assignments = tx.objectStore(STORES.TAG_ASSIGNMENTS);
    const byTag = assignments.index('byTag');
    let cursor = await byTag.openCursor(id);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
  });
};

const upsertAssignment = async (
  store: IDBObjectStore,
  path: string,
  tagId: string,
) => {
  const id = `${path}::${tagId}`;
  const existing = (await store.get(id)) as TagAssignmentRecord | undefined;
  if (existing) return;
  const record: TagAssignmentRecord = {
    id,
    path,
    tagId,
    appliedAt: new Date().toISOString(),
  };
  await store.put(record);
};

export const applyTagToPaths = async (
  tagId: string,
  paths: string[],
): Promise<void> => {
  if (!paths.length) return;
  await withDb(STORES.TAG_ASSIGNMENTS, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.TAG_ASSIGNMENTS);
    for (const path of paths) {
      await upsertAssignment(store, path, tagId);
    }
  });
};

export const removeTagFromPaths = async (
  tagId: string,
  paths: string[],
): Promise<void> => {
  if (!paths.length) return;
  await withDb(STORES.TAG_ASSIGNMENTS, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.TAG_ASSIGNMENTS);
    for (const path of paths) {
      const id = `${path}::${tagId}`;
      await store.delete(id);
    }
  });
};

export const getTagAssignmentsForPaths = async (
  paths: string[],
): Promise<Record<string, string[]>> => {
  if (!paths.length) return {};
  const dbPromise = openExplorerDb();
  if (!dbPromise) return {};
  const db = (await dbPromise) as ExplorerDb;
  const tx = db.transaction(STORES.TAG_ASSIGNMENTS, 'readonly');
  const store = tx.objectStore(STORES.TAG_ASSIGNMENTS);
  const byPath = store.index('byPath');
  const result: Record<string, string[]> = {};
  for (const path of paths) {
    try {
      const matches = ((await byPath.getAll(path)) || []) as TagAssignmentRecord[];
      result[path] = matches.map((assignment) => assignment.tagId);
    } catch {
      result[path] = [];
    }
  }
  await tx.done;
  return result;
};

export const listSavedQueries = async (): Promise<SavedQueryRecord[]> => {
  const dbPromise = openExplorerDb();
  if (!dbPromise) return [];
  const db = (await dbPromise) as ExplorerDb;
  const tx = db.transaction(STORES.SAVED_QUERIES, 'readonly');
  const store = tx.objectStore(STORES.SAVED_QUERIES);
  const records = ((await store.getAll()) || []) as SavedQueryRecord[];
  await tx.done;
  return records
    .map((record) => ({
      ...record,
      filters: {
        tags: record.filters?.tags || [],
        directory: record.filters?.directory || '',
      },
    }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

export const createSavedQuery = async (
  input: SavedQueryInput,
): Promise<SavedQueryRecord | null> =>
  withDb(STORES.SAVED_QUERIES, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.SAVED_QUERIES);
    const now = new Date().toISOString();
    const record: SavedQueryRecord = {
      id: createId('query'),
      name: input.name.trim() || input.query.trim(),
      query: input.query.trim(),
      filters: {
        tags: input.filters?.tags?.slice() || [],
        directory: input.filters?.directory || '',
      },
      createdAt: now,
      updatedAt: now,
    };
    await store.put(record);
    return record;
  });

export const updateSavedQuery = async (
  id: string,
  updates: Partial<SavedQueryInput>,
): Promise<SavedQueryRecord | null> =>
  withDb(STORES.SAVED_QUERIES, 'readwrite', async (tx) => {
    const store = tx.objectStore(STORES.SAVED_QUERIES);
    const existing = ((await store.get(id)) as SavedQueryRecord | undefined) || null;
    if (!existing) return null;
    const existingFilters = existing.filters || { tags: [], directory: '' };
    const nextFilters = updates.filters || {};
    const updated: SavedQueryRecord = {
      ...existing,
      name: updates.name !== undefined ? updates.name.trim() || existing.name : existing.name,
      query: updates.query !== undefined ? updates.query.trim() || existing.query : existing.query,
      filters: {
        tags:
          nextFilters.tags !== undefined
            ? nextFilters.tags.slice()
            : existingFilters.tags || [],
        directory:
          nextFilters.directory !== undefined
            ? nextFilters.directory
            : existingFilters.directory || '',
      },
      updatedAt: new Date().toISOString(),
    };
    await store.put(updated);
    return updated;
  });

export const deleteSavedQuery = async (id: string): Promise<void> => {
  await withDb(STORES.SAVED_QUERIES, 'readwrite', async (tx) => {
    await tx.objectStore(STORES.SAVED_QUERIES).delete(id);
  });
};

export const exportExplorerMetadata = async (): Promise<ExplorerExportPayload | null> => {
  const dbPromise = openExplorerDb();
  if (!dbPromise) return null;
  const db = (await dbPromise) as ExplorerDb;
  const tags = ((await db.getAll(STORES.TAGS)) || []) as TagRecord[];
  const assignments = ((await db.getAll(STORES.TAG_ASSIGNMENTS)) || []) as TagAssignmentRecord[];
  const savedQueries = ((await db.getAll(STORES.SAVED_QUERIES)) || []) as SavedQueryRecord[];
  return {
    version: 1,
    tags: tags.map(normalizeTag),
    tagAssignments: assignments,
    savedQueries,
  };
};

export const importExplorerMetadata = async (payload: ExplorerExportPayload): Promise<void> => {
  if (!payload || typeof payload !== 'object') return;
  await withDb([STORES.TAGS, STORES.TAG_ASSIGNMENTS, STORES.SAVED_QUERIES], 'readwrite', async (tx) => {
    const tagStore = tx.objectStore(STORES.TAGS);
    const assignmentStore = tx.objectStore(STORES.TAG_ASSIGNMENTS);
    const queryStore = tx.objectStore(STORES.SAVED_QUERIES);
    await Promise.all([
      tagStore.clear(),
      assignmentStore.clear(),
      queryStore.clear(),
    ]);
    for (const tag of payload.tags || []) {
      await tagStore.put({
        ...tag,
        description: tag.description || '',
      });
    }
    for (const assignment of payload.tagAssignments || []) {
      await assignmentStore.put(assignment);
    }
    for (const query of payload.savedQueries || []) {
      await queryStore.put({
        ...query,
        filters: {
          tags: query.filters?.tags || [],
          directory: query.filters?.directory || '',
        },
      });
    }
  });
};

export interface SearchResult {
  file: string;
  line: number;
  text: string;
}

export const filterResultsByTagIds = (
  results: SearchResult[],
  assignments: Record<string, string[]>,
  requiredTagIds: string[],
): SearchResult[] => {
  if (!requiredTagIds.length) return results;
  return results.filter((result) => {
    const tags = assignments[result.file] || [];
    return requiredTagIds.every((tagId) => tags.includes(tagId));
  });
};

export const clearExplorerDatabase = async () => {
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error('Failed to delete database'));
    request.onblocked = () => resolve();
  });
};

