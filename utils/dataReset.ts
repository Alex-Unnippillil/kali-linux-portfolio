'use client';

import { entries, setMany } from 'idb-keyval';

type StorageSnapshot = Record<string, string>;

type IDBRecord = {
  key: IDBValidKey;
  value: unknown;
};

export interface IDBStoreSnapshot {
  name: string;
  records: IDBRecord[];
}

export interface IndexedDBSnapshot {
  name: string;
  version?: number;
  stores: IDBStoreSnapshot[];
}

export interface DataSnapshot {
  localStorage: StorageSnapshot;
  sessionStorage: StorageSnapshot;
  keyvalEntries: [IDBValidKey, unknown][];
  indexedDBs: IndexedDBSnapshot[];
}

const KEYVAL_DB_NAME = 'keyval-store';

const readStorage = (storage: Storage | undefined | null): StorageSnapshot => {
  const snapshot: StorageSnapshot = {};
  if (!storage) return snapshot;
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) continue;
      const value = storage.getItem(key);
      if (typeof value === 'string') {
        snapshot[key] = value;
      }
    }
  } catch {
    // Ignore storage read failures (e.g., security errors)
  }
  return snapshot;
};

const captureKeyvalEntries = async (): Promise<[IDBValidKey, unknown][]> => {
  if (typeof indexedDB === 'undefined') return [];
  try {
    return await entries();
  } catch {
    return [];
  }
};

const captureIndexedDBs = async (): Promise<IndexedDBSnapshot[]> => {
  if (typeof indexedDB === 'undefined') return [];
  const getDatabases = (indexedDB as any).databases?.bind(indexedDB);
  if (typeof getDatabases !== 'function') return [];

  try {
    const dbs = await getDatabases();
    const snapshots: IndexedDBSnapshot[] = [];

    for (const info of dbs) {
      const name = info?.name;
      if (!name || name === KEYVAL_DB_NAME) continue;

      const snapshot = await new Promise<IndexedDBSnapshot | null>((resolve) => {
        try {
          const request = info?.version
            ? indexedDB.open(name, info.version)
            : indexedDB.open(name);

          request.onerror = () => resolve(null);
          request.onblocked = () => resolve(null);
          request.onsuccess = () => {
            const db = request.result;
            const storeNames = Array.from(db.objectStoreNames);
            const stores: IDBStoreSnapshot[] = [];
            if (storeNames.length === 0) {
              db.close();
              resolve({ name, version: info?.version, stores });
              return;
            }

            const transaction = db.transaction(storeNames, 'readonly');
            storeNames.forEach((storeName) => {
              const storeSnapshot: IDBStoreSnapshot = {
                name: storeName,
                records: [],
              };
              stores.push(storeSnapshot);

              const objectStore = transaction.objectStore(storeName);
              const cursorRequest = objectStore.openCursor();
              cursorRequest.onerror = () => {
                // Ignore cursor errors for individual stores
              };
              cursorRequest.onsuccess = (event) => {
                const cursor = event.target?.result as IDBCursorWithValue | null;
                if (!cursor) return;
                try {
                  storeSnapshot.records.push({ key: cursor.key, value: cursor.value });
                } catch {
                  // Ignore serialization issues for problematic records
                }
                cursor.continue();
              };
            });

            transaction.oncomplete = () => {
              db.close();
              resolve({ name, version: info?.version, stores });
            };
            transaction.onerror = () => {
              db.close();
              resolve({ name, version: info?.version, stores });
            };
          };
        } catch {
          resolve(null);
        }
      });

      if (snapshot) snapshots.push(snapshot);
    }

    return snapshots;
  } catch {
    return [];
  }
};

const deleteDatabase = async (name: string): Promise<void> => {
  if (!name || typeof indexedDB === 'undefined') return;
  await new Promise<void>((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(name);
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
      request.onsuccess = () => resolve();
    } catch {
      resolve();
    }
  });
};

const restoreDatabase = async (snapshot: IndexedDBSnapshot): Promise<void> => {
  if (typeof indexedDB === 'undefined') return;
  await new Promise<void>((resolve) => {
    try {
      const request = snapshot.version
        ? indexedDB.open(snapshot.name, snapshot.version)
        : indexedDB.open(snapshot.name);

      request.onupgradeneeded = () => {
        const db = request.result;
        try {
          const existingStores = Array.from(db.objectStoreNames);
          existingStores.forEach((storeName) => {
            if (!snapshot.stores.some((store) => store.name === storeName)) {
              db.deleteObjectStore(storeName);
            }
          });
          snapshot.stores.forEach((store) => {
            if (!db.objectStoreNames.contains(store.name)) {
              db.createObjectStore(store.name);
            }
          });
        } catch {
          // Ignore schema reconstruction errors
        }
      };

      request.onerror = () => resolve();
      request.onblocked = () => resolve();
      request.onsuccess = () => {
        const db = request.result;
        const writeRecords = async () => {
          for (const store of snapshot.stores) {
            if (!db.objectStoreNames.contains(store.name)) continue;
            await new Promise<void>((storeResolve) => {
              try {
                const tx = db.transaction(store.name, 'readwrite');
                const objectStore = tx.objectStore(store.name);
                store.records.forEach((record) => {
                  try {
                    objectStore.put(record.value, record.key);
                  } catch {
                    // Ignore put failures for individual records
                  }
                });
                tx.oncomplete = () => storeResolve();
                tx.onerror = () => storeResolve();
              } catch {
                storeResolve();
              }
            });
          }
        };

        writeRecords().finally(() => {
          db.close();
          resolve();
        });
      };
    } catch {
      resolve();
    }
  });
};

export const captureDataSnapshot = async (): Promise<DataSnapshot> => {
  const [keyvalEntries, indexedDBs] = await Promise.all([
    captureKeyvalEntries(),
    captureIndexedDBs(),
  ]);

  return {
    localStorage: typeof window === 'undefined' ? {} : readStorage(window.localStorage),
    sessionStorage:
      typeof window === 'undefined' ? {} : readStorage(window.sessionStorage),
    keyvalEntries,
    indexedDBs,
  };
};

export const clearClientData = async (snapshot: DataSnapshot): Promise<void> => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.clear();
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.clear();
    } catch {
      // ignore
    }
  }

  const names = new Set<string>();
  snapshot.indexedDBs.forEach((db) => names.add(db.name));
  names.add(KEYVAL_DB_NAME);

  await Promise.all(Array.from(names).map((name) => deleteDatabase(name)));
};

export const restoreDataSnapshot = async (snapshot: DataSnapshot): Promise<void> => {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.clear();
      Object.entries(snapshot.localStorage).forEach(([key, value]) => {
        window.localStorage.setItem(key, value);
      });
    } catch {
      // ignore failures when restoring localStorage
    }

    try {
      window.sessionStorage.clear();
      Object.entries(snapshot.sessionStorage).forEach(([key, value]) => {
        window.sessionStorage.setItem(key, value);
      });
    } catch {
      // ignore failures when restoring sessionStorage
    }
  }

  if (snapshot.keyvalEntries.length > 0) {
    try {
      await setMany(snapshot.keyvalEntries as [IDBValidKey, unknown][]);
    } catch {
      // ignore failures when restoring keyval entries
    }
  }

  for (const dbSnapshot of snapshot.indexedDBs) {
    await restoreDatabase(dbSnapshot);
  }
};
