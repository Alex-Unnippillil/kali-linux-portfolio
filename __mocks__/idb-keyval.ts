const stores = new Map<string, Map<IDBValidKey, unknown>>();

interface MockStore {
  namespace: string;
}

const namespaceFor = (store?: MockStore) => store?.namespace ?? 'default';

const ensureStore = (store?: MockStore) => {
  const namespace = namespaceFor(store);
  if (!stores.has(namespace)) {
    stores.set(namespace, new Map());
  }
  return stores.get(namespace)!;
};

export const createStore = (dbName: string, storeName: string): MockStore => ({
  namespace: `${dbName || 'db'}:${storeName || 'store'}`,
});

export const get = async <T = unknown>(key: IDBValidKey, store?: MockStore): Promise<T | undefined> =>
  ensureStore(store).get(key) as T | undefined;

export const set = async (key: IDBValidKey, value: unknown, store?: MockStore): Promise<void> => {
  ensureStore(store).set(key, value);
};

export const del = async (key: IDBValidKey, store?: MockStore): Promise<void> => {
  ensureStore(store).delete(key);
};

export const update = async <T = unknown>(
  key: IDBValidKey,
  updater: (value: T | undefined) => T,
  store?: MockStore,
): Promise<void> => {
  const map = ensureStore(store);
  const next = updater(map.get(key) as T | undefined);
  map.set(key, next);
};

export const keys = async (store?: MockStore): Promise<IDBValidKey[]> =>
  Array.from(ensureStore(store).keys());

export const __resetStore = (): void => {
  stores.clear();
};
