import { safeLocalStorage } from './safeStorage';

const KEY = 'recent-apps';
const LIMIT = 10;

export function getRecent(): string[] {
  if (!safeLocalStorage) return [];
  try {
    const stored = safeLocalStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addRecent(id: string): void {
  if (!safeLocalStorage) return;
  const list = getRecent();
  const idx = list.indexOf(id);
  if (idx !== -1) list.splice(idx, 1);
  list.unshift(id);
  if (list.length > LIMIT) list.length = LIMIT;
  safeLocalStorage.setItem(KEY, JSON.stringify(list));
}
