import { buildAppMetadata, loadAppRegistry } from '../appRegistry';

export interface SearchIndexEntry {
  id: string;
  title: string;
  description: string;
  path: string;
  icon?: string;
  keywords: string;
}

const STORAGE_KEY = 'app-search-index';

let cache: SearchIndexEntry[] | null = null;
const listeners = new Set<(entries: SearchIndexEntry[]) => void>();

const isBrowser = () => typeof window !== 'undefined';

const readFromStorage = (): SearchIndexEntry[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      cache = parsed as SearchIndexEntry[];
      return cache;
    }
  } catch {
    // ignore malformed storage entries
  }
  return [];
};

const writeToStorage = (entries: SearchIndexEntry[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota errors
  }
};

export const getSearchIndex = (): SearchIndexEntry[] => {
  if (cache) return cache;
  return readFromStorage();
};

export const subscribeToSearchIndex = (
  listener: (entries: SearchIndexEntry[]) => void,
): (() => void) => {
  listeners.add(listener);
  if (cache) {
    listener(cache);
  }
  return () => listeners.delete(listener);
};

export const refreshSearchIndex = async (): Promise<SearchIndexEntry[]> => {
  try {
    const { apps, metadata } = await loadAppRegistry();
    const entries: SearchIndexEntry[] = apps
      .filter((app: any) => !app?.disabled)
      .map((app: any) => {
        const meta = metadata[app.id] ?? buildAppMetadata(app);
        const keyboardHints = Array.isArray(meta.keyboard)
          ? meta.keyboard.join(' ')
          : '';
        const entry: SearchIndexEntry = {
          id: app.id,
          title: meta.title,
          description: meta.description,
          path: meta.path,
          icon: meta.icon,
          keywords: [
            app.id,
            meta.title,
            meta.description,
            keyboardHints,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase(),
        };
        return entry;
      });

    cache = entries;
    writeToStorage(entries);
    listeners.forEach((listener) => listener(entries));
    return entries;
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Failed to refresh search index', error);
    }
    return cache ?? getSearchIndex();
  }
};

export const SEARCH_INDEX_STORAGE_KEY = STORAGE_KEY;

export default {
  getSearchIndex,
  refreshSearchIndex,
  subscribeToSearchIndex,
};
