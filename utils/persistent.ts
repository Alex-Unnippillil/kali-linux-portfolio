import { isBrowser } from '@/utils/env';

export function loadFromStorage<T>(
  key: string,
  fallback: T,
  validator?: (v: unknown) => v is T,
): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (!validator || validator(parsed)) {
        return parsed as T;
      }
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function saveToStorage<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}
