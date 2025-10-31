const DB_NAME = 'action-queue';
const STORE_NAME = 'pendingActions';
const DB_VERSION = 1;

export interface StoredAction<T = unknown> {
  id: number;
  type: string;
  payload: T;
  createdAt: number;
  retries: number;
}

type MutableStoredAction<T> = Omit<StoredAction<T>, 'id'> & { id?: number };

const isIndexedDbAvailable = (): boolean => typeof indexedDB !== 'undefined';

let dbPromise: Promise<IDBDatabase | null> | null = null;

const openDatabase = (): Promise<IDBDatabase | null> => {
  if (!isIndexedDbAvailable()) {
    return Promise.resolve(null);
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('type', 'type', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      console.warn('IndexedDB unavailable, action queue disabled');
      resolve(null);
    };
  });

  return dbPromise;
};

const runRequest = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });

const withStore = async (
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => Promise<void> | void,
): Promise<void> => {
  const db = await openDatabase();
  if (!db) return;

  const transaction = db.transaction(STORE_NAME, mode);
  const store = transaction.objectStore(STORE_NAME);

  await callback(store);

  await new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
};

export const isQueueSupported = (): boolean => isIndexedDbAvailable();

export const enqueueAction = async <T>(
  type: string,
  payload: T,
): Promise<number | null> => {
  let insertedId: number | null = null;
  await withStore('readwrite', async (store) => {
    const action: MutableStoredAction<T> = {
      type,
      payload,
      createdAt: Date.now(),
      retries: 0,
    };
    const request = store.add(action);
    try {
      const id = await runRequest(request as IDBRequest<number>);
      insertedId = id;
    } catch (error) {
      console.warn('Failed to enqueue action', error);
    }
  });
  return insertedId;
};

const getAllFromStore = async <T>(store: IDBObjectStore): Promise<StoredAction<T>[]> => {
  const request = store.getAll();
  const result = await runRequest(request as IDBRequest<MutableStoredAction<T>[]>);
  return result
    .map((entry) => ({
      ...entry,
      id: Number(entry.id),
    }))
    .filter((entry): entry is StoredAction<T> => typeof entry.id === 'number');
};

export const getActions = async <T = unknown>(type?: string): Promise<StoredAction<T>[]> => {
  const db = await openDatabase();
  if (!db) return [];

  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  let actions: StoredAction<T>[] = [];

  if (type) {
    if (store.indexNames.contains('type')) {
      const index = store.index('type');
      const request = index.getAll(IDBKeyRange.only(type));
      const result = await runRequest(request as IDBRequest<MutableStoredAction<T>[]>);
      actions = result
        .map((entry) => ({ ...entry, id: Number(entry.id) }))
        .filter((entry): entry is StoredAction<T> => typeof entry.id === 'number');
    } else {
      actions = (await getAllFromStore<T>(store)).filter((entry) => entry.type === type);
    }
  } else {
    actions = await getAllFromStore<T>(store);
  }

  return actions;
};

export const deleteAction = async (id: number): Promise<void> =>
  withStore('readwrite', async (store) => {
    store.delete(id);
  });

export const clearActions = async (type?: string): Promise<void> => {
  if (!type) {
    await withStore('readwrite', async (store) => {
      store.clear();
    });
    return;
  }

  const actions = await getActions(type);
  if (!actions.length) return;

  await withStore('readwrite', async (store) => {
    actions.forEach((action) => {
      store.delete(action.id);
    });
  });
};

export const countActions = async (type?: string): Promise<number> => {
  const db = await openDatabase();
  if (!db) return 0;

  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);

  if (!type) {
    const request = store.count();
    const result = await runRequest(request as IDBRequest<number>);
    return result;
  }

  if (store.indexNames.contains('type')) {
    const index = store.index('type');
    const request = index.count(IDBKeyRange.only(type));
    const result = await runRequest(request as IDBRequest<number>);
    return result;
  }

  const actions = await getAllFromStore(store);
  return actions.filter((action) => action.type === type).length;
};

export const updateAction = async <T = unknown>(
  id: number,
  update: Partial<StoredAction<T>>,
): Promise<void> =>
  withStore('readwrite', async (store) => {
    const request = store.get(id);
    const existing = await runRequest(request as IDBRequest<MutableStoredAction<T> | undefined>);
    if (!existing) return;
    const next: MutableStoredAction<T> = {
      ...existing,
      ...update,
      id,
    };
    store.put(next);
  });

export { DB_NAME as ACTION_QUEUE_DB_NAME, STORE_NAME as ACTION_QUEUE_STORE_NAME };
