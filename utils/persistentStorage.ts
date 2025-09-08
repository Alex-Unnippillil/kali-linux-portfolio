import { safeLocalStorage } from './safeStorage';

export function getPersistent<T>(
  key: string,
  fallback: T,
  validator: (value: unknown) => value is T,
): T {
  if (!safeLocalStorage) return fallback;
  try {
    const raw = safeLocalStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (validator(parsed)) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

export function setPersistent<T>(key: string, value: T): void {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write errors
  }
}

export function removePersistent(key: string): void {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.removeItem(key);
  } catch {
    // ignore remove errors
  }
}
