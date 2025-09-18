import { safeLocalStorage } from '../safeStorage';

export const APP_SUGGESTIONS_STORAGE_KEY = 'preferences:app-suggestions-enabled';
const OPEN_HISTORY_STORAGE_KEY = 'analytics:open-history';
const OPEN_HISTORY_BLOCKLIST_KEY = 'analytics:open-history-blocklist';
const MAX_ENTRIES_PER_TYPE = 20;

type HistoryMap = Record<string, Record<string, AppHistoryRecord>>;
type BlockMap = Record<string, string[]>;

export interface AppHistoryRecord {
  lastUsed: number;
  count: number;
}

export interface HistoryEntry {
  appId: string;
  lastUsed: number;
  count: number;
}

export type RecommendationReason = 'lastUsed' | 'popular';

export interface RecommendationEntry extends HistoryEntry {
  reason: RecommendationReason;
  reasonDescription: string;
}

export interface RecommendationSections {
  lastUsed: RecommendationEntry[];
  popular: RecommendationEntry[];
}

interface RecommendationOptions {
  lastUsedLimit?: number;
  popularLimit?: number;
}

const isBrowserEnvironment = () => typeof window !== 'undefined';

const getStorage = () => (isBrowserEnvironment() ? safeLocalStorage : undefined);

const parseHistory = (raw: unknown): HistoryMap => {
  if (!raw || typeof raw !== 'object') return {};
  const map: HistoryMap = {};
  for (const [type, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') continue;
    const entries: Record<string, AppHistoryRecord> = {};
    for (const [appId, record] of Object.entries(value as Record<string, unknown>)) {
      if (!record || typeof record !== 'object') continue;
      const { lastUsed, count } = record as Partial<AppHistoryRecord>;
      if (typeof lastUsed !== 'number' || typeof count !== 'number') continue;
      if (!Number.isFinite(lastUsed) || !Number.isFinite(count)) continue;
      entries[appId] = { lastUsed, count };
    }
    if (Object.keys(entries).length > 0) {
      map[type] = entries;
    }
  }
  return map;
};

const parseBlockMap = (raw: unknown): BlockMap => {
  if (!raw || typeof raw !== 'object') return {};
  const map: BlockMap = {};
  for (const [type, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const ids = value.filter((v): v is string => typeof v === 'string');
    if (ids.length > 0) {
      map[type] = Array.from(new Set(ids));
    }
  }
  return map;
};

const loadHistory = (): HistoryMap => {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const stored = storage.getItem(OPEN_HISTORY_STORAGE_KEY);
    if (!stored) return {};
    return parseHistory(JSON.parse(stored));
  } catch {
    return {};
  }
};

const loadBlockMap = (): BlockMap => {
  const storage = getStorage();
  if (!storage) return {};
  try {
    const stored = storage.getItem(OPEN_HISTORY_BLOCKLIST_KEY);
    if (!stored) return {};
    return parseBlockMap(JSON.parse(stored));
  } catch {
    return {};
  }
};

const saveHistory = (history: HistoryMap) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(OPEN_HISTORY_STORAGE_KEY, JSON.stringify(history));
  } catch {
    // Ignore storage write failures
  }
};

const saveBlockMap = (map: BlockMap) => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(OPEN_HISTORY_BLOCKLIST_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage write failures
  }
};

const toEntries = (records: Record<string, AppHistoryRecord> | undefined): HistoryEntry[] => {
  if (!records) return [];
  return Object.entries(records).map(([appId, record]) => ({
    appId,
    lastUsed: record.lastUsed,
    count: record.count,
  }));
};

const sortByLastUsed = (entries: HistoryEntry[]) =>
  [...entries].sort((a, b) => b.lastUsed - a.lastUsed);

const sortByPopularity = (entries: HistoryEntry[]) =>
  [...entries].sort((a, b) => {
    if (b.count === a.count) return b.lastUsed - a.lastUsed;
    return b.count - a.count;
  });

const trimEntries = (records: Record<string, AppHistoryRecord>) => {
  const entries = sortByPopularity(toEntries(records));
  if (entries.length <= MAX_ENTRIES_PER_TYPE) return;
  for (let i = MAX_ENTRIES_PER_TYPE; i < entries.length; i += 1) {
    delete records[entries[i].appId];
  }
};

const relativeTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = Math.max(0, now - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return 'Used just now';
  if (diff < 2 * minute) return 'Used a minute ago';
  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    return `Used ${minutes} minutes ago`;
  }
  if (diff < 2 * hour) return 'Used an hour ago';
  if (diff < day) {
    const hours = Math.round(diff / hour);
    return `Used ${hours} hours ago`;
  }
  if (diff < 2 * day) return 'Used yesterday';
  if (diff < 7 * day) {
    const days = Math.round(diff / day);
    return `Used ${days} days ago`;
  }
  const date = new Date(timestamp);
  return `Used on ${date.toLocaleDateString()}`;
};

const popularReason = (count: number): string => {
  if (count <= 1) {
    return 'Opened once recently';
  }
  return `Opened ${count} times recently`;
};

export const areSuggestionsEnabled = (): boolean => {
  if (!isBrowserEnvironment()) return false;
  const storage = getStorage();
  if (!storage) return false;
  const stored = storage.getItem(APP_SUGGESTIONS_STORAGE_KEY);
  if (stored === null) return true;
  return stored !== 'false';
};

export const recordOpen = (type: string, appId: string, timestamp: number = Date.now()): void => {
  if (!type || !appId) return;
  if (!areSuggestionsEnabled()) return;
  const storage = getStorage();
  if (!storage) return;
  const history = loadHistory();
  const records = history[type] ?? {};
  const current = records[appId];
  records[appId] = {
    lastUsed: timestamp,
    count: current ? current.count + 1 : 1,
  };
  trimEntries(records);
  history[type] = records;
  saveHistory(history);
};

export const setDoNotSuggest = (type: string, appId: string, value: boolean): void => {
  if (!type || !appId) return;
  const storage = getStorage();
  if (!storage) return;
  const blockMap = loadBlockMap();
  const current = new Set(blockMap[type] ?? []);
  if (value) {
    current.add(appId);
  } else {
    current.delete(appId);
  }
  if (current.size === 0) {
    delete blockMap[type];
  } else {
    blockMap[type] = Array.from(current);
  }
  saveBlockMap(blockMap);
};

export const getDoNotSuggest = (type: string): string[] => {
  const blockMap = loadBlockMap();
  return blockMap[type] ?? [];
};

export const isBlocked = (type: string, appId: string): boolean => {
  if (!type || !appId) return false;
  const blockMap = loadBlockMap();
  return blockMap[type]?.includes(appId) ?? false;
};

export const getHistory = (type: string): HistoryEntry[] => {
  const history = loadHistory();
  return sortByLastUsed(toEntries(history[type]));
};

export const getPopular = (type: string): HistoryEntry[] => {
  const history = loadHistory();
  return sortByPopularity(toEntries(history[type]));
};

export const getRecommendations = (
  type: string,
  options: RecommendationOptions = {},
): RecommendationSections => {
  const history = loadHistory();
  const blockMap = loadBlockMap();
  const blocked = new Set(blockMap[type] ?? []);
  const records = history[type];
  if (!records) {
    return { lastUsed: [], popular: [] };
  }
  const entries = toEntries(records).filter(entry => !blocked.has(entry.appId));
  const lastUsed = sortByLastUsed(entries)
    .slice(0, options.lastUsedLimit ?? 3)
    .map<RecommendationEntry>(entry => ({
      ...entry,
      reason: 'lastUsed',
      reasonDescription: relativeTime(entry.lastUsed),
    }));
  const seen = new Set(lastUsed.map(entry => entry.appId));
  const popular = sortByPopularity(entries)
    .filter(entry => !seen.has(entry.appId))
    .slice(0, options.popularLimit ?? 4)
    .map<RecommendationEntry>(entry => ({
      ...entry,
      reason: 'popular',
      reasonDescription: popularReason(entry.count),
    }));
  return { lastUsed, popular };
};

export const clearHistory = (type?: string): void => {
  const storage = getStorage();
  if (!storage) return;
  if (!type) {
    storage.removeItem(OPEN_HISTORY_STORAGE_KEY);
    storage.removeItem(OPEN_HISTORY_BLOCKLIST_KEY);
    return;
  }
  const history = loadHistory();
  if (history[type]) {
    delete history[type];
    saveHistory(history);
  }
  const blockMap = loadBlockMap();
  if (blockMap[type]) {
    delete blockMap[type];
    saveBlockMap(blockMap);
  }
};
