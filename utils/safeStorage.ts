import { hasStorage } from './env';

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const createMemoryStorage = (): StorageLike => {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };
};

const getBrowserStorage = (): Storage | undefined => {
  if (!hasStorage) return undefined;
  try {
    const globalWithStorage = globalThis as typeof globalThis & { localStorage?: Storage };
    return globalWithStorage.localStorage ?? undefined;
  } catch {
    return undefined;
  }
};

const memoryStorage = createMemoryStorage();
const browserStorage = getBrowserStorage();

export const safeLocalStorage: Storage | undefined = browserStorage;

const storageAdapter: StorageLike = browserStorage ?? memoryStorage;

export const readStorageValue = (key: string): string | null => {
  try {
    return storageAdapter.getItem(key);
  } catch {
    return null;
  }
};

export const writeStorageValue = (key: string, value: string): void => {
  try {
    storageAdapter.setItem(key, value);
  } catch {
    // ignore write failures (quota, private mode, etc.)
  }
};

export const removeStorageValue = (key: string): void => {
  try {
    storageAdapter.removeItem(key);
  } catch {
    // ignore failures
  }
};
