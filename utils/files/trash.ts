import { safeLocalStorage } from '../safeStorage';

export const TRASH_KEY = 'window-trash';
export const HISTORY_KEY = 'window-trash-history';
export const RETENTION_KEY = 'trash-purge-days';
export const DEFAULT_RETENTION_DAYS = 30;
export const HISTORY_LIMIT = 20;
export const LARGE_ITEM_THRESHOLD = 50 * 1024 * 1024; // 50 MB

type UnknownRecord = Record<string, unknown>;

export interface TrashMetadata extends UnknownRecord {
  /**
   * Original virtual path for file based entries. Consumers can use this to
   * return restored files to their previous directory.
   */
  originalPath?: string;
  /** Identifier for the item type. */
  kind?: 'file' | 'window' | string;
  /** Optional byte size for the trashed payload. */
  size?: number;
}

export interface TrashItem {
  id: string;
  title: string;
  icon?: string;
  image?: string;
  closedAt: number;
  size?: number;
  metadata?: TrashMetadata;
}

export interface TrashHistoryEntry {
  id: string;
  createdAt: number;
  items: TrashItem[];
  action: 'delete' | 'empty';
}

type TrashRestoreHandler = (item: TrashItem) => Promise<boolean> | boolean;

const restoreHandlers: TrashRestoreHandler[] = [];

const parseJSON = <T>(
  raw: string | null,
  fallback: T,
  predicate?: (value: unknown) => value is T,
): T => {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (!predicate || predicate(parsed)) {
      return parsed;
    }
  } catch {
    // ignore parse errors and fall back
  }
  return fallback;
};

const isTrashMetadata = (value: unknown): value is TrashMetadata => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as UnknownRecord;
  if (record.originalPath && typeof record.originalPath !== 'string') return false;
  if (record.kind && typeof record.kind !== 'string') return false;
  if (record.size && typeof record.size !== 'number') return false;
  return true;
};

export const isTrashItem = (value: unknown): value is TrashItem => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as UnknownRecord;
  if (typeof record.id !== 'string') return false;
  if (typeof record.title !== 'string') return false;
  if (typeof record.closedAt !== 'number') return false;
  if (record.icon && typeof record.icon !== 'string') return false;
  if (record.image && typeof record.image !== 'string') return false;
  if (record.size && typeof record.size !== 'number') return false;
  if (record.metadata && !isTrashMetadata(record.metadata)) return false;
  return true;
};

export const isTrashItemArray = (value: unknown): value is TrashItem[] =>
  Array.isArray(value) && value.every(isTrashItem);

export const isTrashHistoryEntry = (value: unknown): value is TrashHistoryEntry => {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as UnknownRecord;
  if (typeof record.id !== 'string') return false;
  if (typeof record.createdAt !== 'number') return false;
  if (record.action !== 'delete' && record.action !== 'empty') return false;
  if (!isTrashItemArray(record.items)) return false;
  return true;
};

export const isTrashHistoryArray = (value: unknown): value is TrashHistoryEntry[] =>
  Array.isArray(value) && value.every(isTrashHistoryEntry);

export const getRetentionDays = (): number => {
  if (!safeLocalStorage) return DEFAULT_RETENTION_DAYS;
  const raw = safeLocalStorage.getItem(RETENTION_KEY);
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_RETENTION_DAYS;
};

export const setRetentionDays = (days: number): void => {
  if (!safeLocalStorage) return;
  const clamped = Math.max(1, Math.min(365, Math.floor(days)));
  safeLocalStorage.setItem(RETENTION_KEY, String(clamped));
};

export const purgeExpired = (
  items: TrashItem[],
  retentionDays: number = getRetentionDays(),
): TrashItem[] => {
  const ms = retentionDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  return items.filter(item => now - item.closedAt <= ms);
};

export const loadTrashItems = (): TrashItem[] => {
  if (!safeLocalStorage) return [];
  const stored = parseJSON<TrashItem[]>(
    safeLocalStorage.getItem(TRASH_KEY),
    [],
    isTrashItemArray,
  );
  const filtered = purgeExpired(stored);
  if (filtered.length !== stored.length) {
    saveTrashItems(filtered);
  }
  return filtered;
};

export const saveTrashItems = (items: TrashItem[]): void => {
  if (!safeLocalStorage) return;
  safeLocalStorage.setItem(TRASH_KEY, JSON.stringify(items));
};

const toHistoryEntry = (item: TrashItem): TrashHistoryEntry => ({
  id: `${item.closedAt}-${item.id}`,
  createdAt: Date.now(),
  items: [item],
  action: 'delete',
});

export const loadHistory = (): TrashHistoryEntry[] => {
  if (!safeLocalStorage) return [];
  const stored = parseJSON<TrashHistoryEntry[] | TrashItem[]>(
    safeLocalStorage.getItem(HISTORY_KEY),
    [],
  );
  let entries: TrashHistoryEntry[];
  if (isTrashHistoryArray(stored)) {
    entries = stored;
  } else if (isTrashItemArray(stored)) {
    entries = stored.map(toHistoryEntry);
  } else {
    entries = [];
  }
  return entries.slice(0, HISTORY_LIMIT);
};

export const saveHistory = (entries: TrashHistoryEntry[]): void => {
  if (!safeLocalStorage) return;
  safeLocalStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
};

export const createHistoryEntry = (
  items: TrashItem[],
  action: TrashHistoryEntry['action'] = 'delete',
): TrashHistoryEntry => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: Date.now(),
  items: items.map(item => ({ ...item })),
  action,
});

export const pushHistoryEntry = (
  history: TrashHistoryEntry[],
  entry: TrashHistoryEntry,
): TrashHistoryEntry[] => [entry, ...history].slice(0, HISTORY_LIMIT);

export const estimateItemSize = (item: TrashItem): number => {
  if (typeof item.size === 'number' && Number.isFinite(item.size)) {
    return item.size;
  }
  if (typeof item.metadata?.size === 'number' && Number.isFinite(item.metadata.size)) {
    return item.metadata.size;
  }
  if (item.image) {
    const [, data = item.image] = item.image.split(',');
    const length = data.length;
    return Math.floor((length * 3) / 4);
  }
  return 0;
};

export const estimateTotalSize = (items: TrashItem[]): number =>
  items.reduce((sum, item) => sum + estimateItemSize(item), 0);

export const formatBytes = (bytes: number): string => {
  if (bytes <= 0 || Number.isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
};

export const registerTrashRestoreHandler = (
  handler: TrashRestoreHandler,
): (() => void) => {
  restoreHandlers.push(handler);
  return () => {
    const idx = restoreHandlers.indexOf(handler);
    if (idx >= 0) restoreHandlers.splice(idx, 1);
  };
};

export const restoreToOriginalLocation = async (item: TrashItem): Promise<boolean> => {
  for (const handler of restoreHandlers) {
    try {
      const result = await handler(item);
      if (result) return true;
    } catch {
      // ignore handler errors and continue
    }
  }
  if (!safeLocalStorage || !item.metadata?.originalPath) return false;
  const key = `trash-restore:${item.metadata.originalPath}`;
  const queue = parseJSON<TrashItem[]>(safeLocalStorage.getItem(key), [], isTrashItemArray);
  queue.unshift(item);
  safeLocalStorage.setItem(key, JSON.stringify(queue));
  return true;
};

export const markLargeItems = (items: TrashItem[]): TrashItem[] =>
  items.filter(item => estimateItemSize(item) >= LARGE_ITEM_THRESHOLD);

