import type { TrashItem } from '../apps/trash/state';
import type { ScheduledTweet } from '../apps/x/state/scheduled';
import type { FetchEntry } from '../lib/fetchProxy';

const STORAGE_KEY = 'data-retention-settings';
const LOG_STORAGE_KEY = 'data-retention-log';

export const DAY_MS = 24 * 60 * 60 * 1000;

export type ArtifactType = 'trash' | 'trashHistory' | 'scheduledTweets' | 'networkHistory';

export interface RetentionSettings {
  trash: number;
  trashHistory: number;
  scheduledTweets: number;
  networkHistory: number;
}

export type RetentionLog = {
  id: string;
  timestamp: number;
  trigger: 'manual' | 'scheduled' | 'startup';
  summary: string;
  details: Array<{
    type: ArtifactType;
    removed: number;
  }>;
};

export interface PurgeResult<T = unknown> {
  type: ArtifactType;
  removed: number;
  removedItems: T[];
}

export type ArtifactSnapshot = Partial<Record<ArtifactType, unknown[]>>;

type LoggedFetchEntry = FetchEntry & { recordedAt?: number };

const TRASH_KEY = 'window-trash';
const TRASH_HISTORY_KEY = 'window-trash-history';
const SCHEDULED_TWEETS_KEY = 'x-scheduled-tweets';
const NETWORK_HISTORY_KEY = 'network-insights-history';

const MAX_LOG_ENTRIES = 50;

const defaultSettings: RetentionSettings = {
  trash: 30 * DAY_MS,
  trashHistory: 14 * DAY_MS,
  scheduledTweets: 14 * DAY_MS,
  networkHistory: 7 * DAY_MS,
};

const isNumberRecord = (value: unknown): value is Record<string, number> =>
  Boolean(
    value &&
      typeof value === 'object' &&
      Object.values(value as Record<string, unknown>).every(v => typeof v === 'number'),
  );

const isRetentionSettings = (value: unknown): value is RetentionSettings => {
  if (!isNumberRecord(value)) return false;
  const record = value as Record<string, number>;
  return (
    ['trash', 'trashHistory', 'scheduledTweets', 'networkHistory'] as ArtifactType[]
  ).every(key => typeof record[key] === 'number');
};

const isRetentionLog = (value: unknown): value is RetentionLog[] =>
  Array.isArray(value) &&
  value.every(
    entry =>
      entry &&
      typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      typeof entry.timestamp === 'number' &&
      (entry.trigger === 'manual' || entry.trigger === 'scheduled' || entry.trigger === 'startup') &&
      typeof entry.summary === 'string' &&
      Array.isArray(entry.details) &&
      entry.details.every(
        detail =>
          detail &&
          typeof detail === 'object' &&
          typeof detail.type === 'string' &&
          typeof detail.removed === 'number',
      ),
  );

const readJson = <T>(key: string): T | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
};

const partition = <T>(items: T[], predicate: (item: T) => boolean): { keep: T[]; removed: T[] } => {
  const keep: T[] = [];
  const removed: T[] = [];
  items.forEach(item => {
    if (predicate(item)) keep.push(item);
    else removed.push(item);
  });
  return { keep, removed };
};

export const parseTrashPurgeSetting = (value: string | null): number => {
  if (!value) return 30;
  if (value === '0') return Number.POSITIVE_INFINITY;
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 0) return 30;
  return parsed;
};

export const loadRetentionSettings = (): RetentionSettings => {
  const stored = readJson<RetentionSettings>(STORAGE_KEY);
  if (stored && isRetentionSettings(stored)) {
    return { ...defaultSettings, ...stored };
  }
  const settings = { ...defaultSettings };
  if (typeof window !== 'undefined') {
    const trashDays = parseTrashPurgeSetting(window.localStorage.getItem('trash-purge-days'));
    settings.trash = !Number.isFinite(trashDays) ? 0 : trashDays * DAY_MS;
  }
  return settings;
};

export const saveRetentionSettings = (settings: RetentionSettings) => {
  writeJson(STORAGE_KEY, settings);
};

export const loadRetentionLog = (): RetentionLog[] => {
  const stored = readJson<RetentionLog[]>(LOG_STORAGE_KEY);
  if (stored && isRetentionLog(stored)) {
    return stored.slice(0, MAX_LOG_ENTRIES);
  }
  return [];
};

export const appendRetentionLog = (entry: RetentionLog) => {
  const current = loadRetentionLog();
  const next = [entry, ...current].slice(0, MAX_LOG_ENTRIES);
  writeJson(LOG_STORAGE_KEY, next);
  return next;
};

const saveTrash = (items: TrashItem[]) => writeJson(TRASH_KEY, items);
const saveTrashHistory = (items: TrashItem[]) => writeJson(TRASH_HISTORY_KEY, items);
const saveScheduledTweets = (items: ScheduledTweet[]) => writeJson(SCHEDULED_TWEETS_KEY, items);
const saveNetworkHistory = (items: LoggedFetchEntry[]) => writeJson(NETWORK_HISTORY_KEY, items);

const readTrash = () => (readJson<TrashItem[]>(TRASH_KEY) || []).filter(Boolean);
const readTrashHistory = () => (readJson<TrashItem[]>(TRASH_HISTORY_KEY) || []).filter(Boolean);
const readScheduledTweets = () => (readJson<ScheduledTweet[]>(SCHEDULED_TWEETS_KEY) || []).filter(Boolean);
const readNetworkHistory = () => (readJson<LoggedFetchEntry[]>(NETWORK_HISTORY_KEY) || []).filter(Boolean);

const shouldKeepByTimestamp = (timestamp: number | undefined, threshold: number) => {
  if (threshold <= 0) return true;
  if (typeof timestamp !== 'number') return true;
  return timestamp >= threshold;
};

export const purgeArtifacts = (settings: RetentionSettings, now = Date.now()): PurgeResult[] => {
  if (typeof window === 'undefined') return [];

  const results: PurgeResult[] = [];

  const handleResult = <T>(type: ArtifactType, removed: T[], save: (items: T[]) => void, keep: T[]) => {
    if (removed.length > 0) {
      save(keep);
      results.push({ type, removed: removed.length, removedItems: removed });
    }
  };

  // trash
  const trashTtl = settings.trash;
  if (trashTtl > 0) {
    const trash = readTrash();
    const threshold = now - trashTtl;
    const { keep, removed } = partition(trash, item => shouldKeepByTimestamp(item?.closedAt, threshold));
    handleResult('trash', removed, items => {
      saveTrash(items);
      window.dispatchEvent(new Event('trash-change'));
    }, keep);
  }

  // trash history
  const trashHistoryTtl = settings.trashHistory;
  if (trashHistoryTtl > 0) {
    const history = readTrashHistory();
    const threshold = now - trashHistoryTtl;
    const { keep, removed } = partition(history, item => shouldKeepByTimestamp(item?.closedAt, threshold));
    handleResult('trashHistory', removed, saveTrashHistory, keep);
  }

  // scheduled tweets
  const scheduledTtl = settings.scheduledTweets;
  if (scheduledTtl > 0) {
    const scheduled = readScheduledTweets();
    const threshold = now - scheduledTtl;
    const { keep, removed } = partition(
      scheduled,
      item => shouldKeepByTimestamp(item?.time, threshold),
    );
    handleResult('scheduledTweets', removed, saveScheduledTweets, keep);
  }

  // network history
  const networkTtl = settings.networkHistory;
  if (networkTtl > 0) {
    const history = readNetworkHistory();
    const threshold = now - networkTtl;
    const { keep, removed } = partition(history, item => shouldKeepByTimestamp(item?.recordedAt, threshold));
    handleResult('networkHistory', removed, saveNetworkHistory, keep);
  }

  return results;
};

export const purgeArtifactType = (
  type: ArtifactType,
  settings: RetentionSettings,
  now = Date.now(),
): PurgeResult | null => {
  const scoped: RetentionSettings = {
    trash: type === 'trash' ? settings.trash : 0,
    trashHistory: type === 'trashHistory' ? settings.trashHistory : 0,
    scheduledTweets:
      type === 'scheduledTweets' ? settings.scheduledTweets : 0,
    networkHistory: type === 'networkHistory' ? settings.networkHistory : 0,
  };
  const [result] = purgeArtifacts(scoped, now);
  return result ?? null;
};

const mergeTrash = (current: TrashItem[], restored: TrashItem[]) => {
  const combined = [...current, ...restored];
  combined.sort((a, b) => (a.closedAt || 0) - (b.closedAt || 0));
  return combined;
};

const mergeScheduledTweets = (current: ScheduledTweet[], restored: ScheduledTweet[]) => {
  const map = new Map<string, ScheduledTweet>();
  [...current, ...restored].forEach(item => {
    if (item && item.id) {
      map.set(item.id, item);
    }
  });
  return Array.from(map.values()).sort((a, b) => (a.time || 0) - (b.time || 0));
};

const mergeNetworkHistory = (current: LoggedFetchEntry[], restored: LoggedFetchEntry[]) => {
  const combined = [...current, ...restored];
  combined.sort((a, b) => (a.recordedAt || 0) - (b.recordedAt || 0));
  return combined;
};

export const restoreArtifacts = (snapshot: ArtifactSnapshot) => {
  if (typeof window === 'undefined') return;
  if (snapshot.trash && snapshot.trash.length) {
    const current = readTrash();
    saveTrash(mergeTrash(current, snapshot.trash as TrashItem[]));
    window.dispatchEvent(new Event('trash-change'));
  }
  if (snapshot.trashHistory && snapshot.trashHistory.length) {
    const current = readTrashHistory();
    saveTrashHistory(mergeTrash(current, snapshot.trashHistory as TrashItem[]));
  }
  if (snapshot.scheduledTweets && snapshot.scheduledTweets.length) {
    const current = readScheduledTweets();
    saveScheduledTweets(mergeScheduledTweets(current, snapshot.scheduledTweets as ScheduledTweet[]));
  }
  if (snapshot.networkHistory && snapshot.networkHistory.length) {
    const current = readNetworkHistory();
    saveNetworkHistory(mergeNetworkHistory(current, snapshot.networkHistory as LoggedFetchEntry[]));
  }
};

export const retentionArtifacts: Record<ArtifactType, { label: string; description: string }> = {
  trash: {
    label: 'Trash Bin',
    description: 'Closed windows kept for quick restore.',
  },
  trashHistory: {
    label: 'Trash History',
    description: 'Recently purged windows available for restore.',
  },
  scheduledTweets: {
    label: 'Scheduled Posts',
    description: 'Pending social posts and reminders.',
  },
  networkHistory: {
    label: 'Network History',
    description: 'Saved fetch logs from Resource Monitor.',
  },
};

export const RETENTION_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '24 hours', value: DAY_MS },
  { label: '7 days', value: 7 * DAY_MS },
  { label: '30 days', value: 30 * DAY_MS },
  { label: '90 days', value: 90 * DAY_MS },
  { label: 'Keep forever', value: 0 },
];

export const formatTtl = (ttl: number): string => {
  if (ttl <= 0) return 'Keep forever';
  if (ttl % DAY_MS === 0) {
    const days = Math.round(ttl / DAY_MS);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
  return `${Math.round(ttl / (60 * 60 * 1000))} hours`;
};

export const buildLogEntry = (
  trigger: RetentionLog['trigger'],
  results: PurgeResult[],
): RetentionLog => {
  const totalRemoved = results.reduce((sum, result) => sum + result.removed, 0);
  const summary =
    totalRemoved > 0
      ? `Purged ${totalRemoved} item${totalRemoved === 1 ? '' : 's'} across ${results.length} artifact${
          results.length === 1 ? '' : 's'
        }`
      : 'No expired artifacts to purge';
  return {
    id: `ret-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
    trigger,
    summary,
    details: results.map(result => ({ type: result.type, removed: result.removed })),
  };
};

export const retentionDefaults = defaultSettings;
export const retentionSettingsKey = STORAGE_KEY;
export const retentionLogKey = LOG_STORAGE_KEY;
