export type SafeStorageBackend = 'local' | 'session';

export interface SafeStorageOptions {
  backend?: SafeStorageBackend;
}

const PROBE_KEY = '__kali_safe_storage_probe__';

export const createSafeStorage = (
  { backend = 'local' }: SafeStorageOptions = {}
): Storage | undefined => {
  if (typeof window === 'undefined') return undefined;

  try {
    const storage =
      backend === 'session' ? window.sessionStorage : window.localStorage;
    if (!storage) return undefined;

    const probe = `${PROBE_KEY}:${backend}`;
    storage.setItem(probe, '1');
    storage.removeItem(probe);

    return storage;
  } catch {
    return undefined;
  }
};

export const safeLocalStorage = createSafeStorage();

export const safeSessionStorage = createSafeStorage({ backend: 'session' });
