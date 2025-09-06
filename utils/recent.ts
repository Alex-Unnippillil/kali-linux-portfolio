import { safeLocalStorage } from './safeStorage';

const RECENT_KEY = 'recentApps';
const MAX_RECENT = 10;

// Retrieve the list of recently used app IDs
export function getRecentApps(): string[] {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Add an app ID to the recent list with LRU semantics
export function addRecentApp(id: string): string[] {
  const recent = getRecentApps();
  const existingIndex = recent.indexOf(id);
  if (existingIndex !== -1) {
    recent.splice(existingIndex, 1);
  }
  recent.unshift(id);
  if (recent.length > MAX_RECENT) {
    recent.length = MAX_RECENT;
  }
  try {
    safeLocalStorage?.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // ignore storage errors
  }
  return recent;
}

