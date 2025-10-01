import { safeLocalStorage } from './safeStorage';

export type RunTool = 'nmap' | 'hydra' | 'hashcat';

export interface RunHistoryEntry {
  id: string;
  tool: RunTool;
  command: string;
  summary: string;
  createdAt: number;
  tags: string[];
  notes?: string;
  options: Record<string, unknown>;
}

const STORAGE_KEY = 'kali/run-history/v1';

let cache: RunHistoryEntry[] = [];
let loaded = false;
const listeners = new Set<(entries: RunHistoryEntry[]) => void>();

const createId = () => {
  const cryptoApi =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis
      ? (globalThis as typeof globalThis & {
          crypto?: { randomUUID?: () => string };
        }).crypto
      : undefined;
  if (cryptoApi && 'randomUUID' in cryptoApi) {
    return cryptoApi.randomUUID();
  }
  return `run-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normaliseTags = (tags?: string[]): string[] => {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const next: string[] = [];
  tags.forEach((tag) => {
    if (!tag) return;
    const trimmed = tag.trim();
    if (trimmed) {
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        next.push(trimmed);
      }
    }
  });
  return next;
};

const normaliseEntry = (entry: Partial<RunHistoryEntry>): RunHistoryEntry => ({
  id: entry.id || createId(),
  tool: entry.tool || 'nmap',
  command: entry.command || '',
  summary: entry.summary || entry.command || 'Run',
  createdAt: entry.createdAt || Date.now(),
  tags: normaliseTags(entry.tags),
  notes: entry.notes || '',
  options: entry.options || {},
});

const ensureLoaded = () => {
  if (loaded) return;
  loaded = true;
  if (!safeLocalStorage) {
    cache = [];
    return;
  }
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cache = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      cache = [];
      return;
    }
    cache = parsed
      .map((entry) => normaliseEntry(entry))
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    cache = [];
  }
};

const persist = () => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // ignore quota errors
  }
};

const notify = () => {
  const snapshot = cache.slice();
  listeners.forEach((listener) => listener(snapshot));
};

export const getRunHistory = (): RunHistoryEntry[] => {
  ensureLoaded();
  return cache.slice();
};

export const addRunHistoryEntry = (
  entry: Partial<RunHistoryEntry>
): RunHistoryEntry => {
  ensureLoaded();
  const normalised = normaliseEntry(entry);
  cache = [normalised, ...cache].sort((a, b) => b.createdAt - a.createdAt);
  if (cache.length > 1000) {
    cache = cache.slice(0, 1000);
  }
  persist();
  notify();
  return normalised;
};

export const subscribeRunHistory = (
  listener: (entries: RunHistoryEntry[]) => void
): (() => void) => {
  ensureLoaded();
  listeners.add(listener);
  listener(cache.slice());
  return () => {
    listeners.delete(listener);
  };
};

export const getLastRunForTool = (
  tool: RunTool
): RunHistoryEntry | undefined => {
  ensureLoaded();
  return cache.find((entry) => entry.tool === tool);
};

export const resetRunHistory = () => {
  ensureLoaded();
  cache = [];
  persist();
  notify();
};

export const prepareHistoryEntries = (
  entries: RunHistoryEntry[]
): Array<RunHistoryEntry & { searchText: string }> =>
  entries.map((entry) => ({
    ...entry,
    searchText: [
      entry.summary,
      entry.command,
      entry.tool,
      entry.tags.join(' '),
      entry.notes || '',
    ]
      .join(' ')
      .toLowerCase(),
  }));

export interface HistoryFilterParams {
  query: string;
  tags: string[];
  tool: RunTool | 'all';
  tools?: RunTool[];
}

export const filterHistoryEntries = <T extends { searchText: string; tool: RunTool; tags: string[] }>(
  entries: T[],
  { query, tags, tool, tools }: HistoryFilterParams
): T[] => {
  const loweredQuery = query.trim().toLowerCase();
  const tagSet = new Set(tags.map((t) => t.toLowerCase()));
  return entries.filter((entry) => {
    if (tools && tools.length && !tools.includes(entry.tool)) {
      return false;
    }
    if (tool !== 'all' && entry.tool !== tool) {
      return false;
    }
    if (tagSet.size > 0) {
      const hasTag = entry.tags.some((tag) => tagSet.has(tag));
      if (!hasTag) return false;
    }
    if (loweredQuery && !entry.searchText.includes(loweredQuery)) {
      return false;
    }
    return true;
  });
};
