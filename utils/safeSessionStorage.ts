import { isBrowser } from './isBrowser';

const getSessionStorage = (): Storage | undefined => {
  if (!isBrowser) return undefined;
  try {
    const storage = window.sessionStorage;
    const testKey = '__session_test__';
    storage.setItem(testKey, '1');
    storage.removeItem(testKey);
    return storage;
  } catch {
    return undefined;
  }
};

export const safeSessionStorage: Storage | undefined = getSessionStorage();
