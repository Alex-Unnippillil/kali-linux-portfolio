import { hasStorage } from './env';

let resolvedStorage: Storage | undefined;

if (hasStorage) {
  try {
    const testKey = '__safe_local_storage__';
    localStorage.getItem(testKey);
    resolvedStorage = localStorage;
  } catch {
    resolvedStorage = undefined;
  }
}

export const safeLocalStorage: Storage | undefined = resolvedStorage;
