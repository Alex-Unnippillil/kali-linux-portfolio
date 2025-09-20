import { openDB, type IDBPDatabase, type IDBPObjectStore, type IDBPTransaction } from 'idb';
import { hasIndexedDB } from './isBrowser';

export interface StoreIndexDefinition {
  name: string;
  keyPath: string | string[];
  options?: IDBIndexParameters;
}

export function ensureObjectStore(
  db: IDBPDatabase<unknown>,
  transaction: IDBPTransaction<unknown, string[], 'versionchange'> | null | undefined,
  storeName: string,
  options: IDBObjectStoreParameters,
  indexes: StoreIndexDefinition[] = [],
) {
  let store: IDBPObjectStore<unknown, string[], unknown>;

  if (!db.objectStoreNames.contains(storeName)) {
    store = db.createObjectStore(storeName, options);
  } else if (transaction) {
    store = transaction.objectStore(storeName);
  } else {
    throw new Error(
      `Transaction required to upgrade existing store "${storeName}"`,
    );
  }

  for (const index of indexes) {
    if (!store.indexNames.contains(index.name)) {
      store.createIndex(index.name, index.keyPath, index.options);
    }
  }

  return store;
}

export function getDb(
  name: string,
  version = 1,
  upgrade?: Parameters<typeof openDB>[2],
) {
  if (!hasIndexedDB) return null;
  return openDB(name, version, upgrade);
}
