import { safeLocalStorage } from './safeStorage';

export const APP_USAGE_STORAGE_KEY = 'appUsage';
export const APP_USAGE_UPDATED_EVENT = 'app-usage-updated';

export type AppUsageRecord = {
  count: number;
  lastOpened: number;
};

export type AppUsageMap = Record<string, AppUsageRecord>;

const sanitizeRecord = (value: unknown): AppUsageRecord | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const count = Number((value as { count?: unknown }).count);
  const lastOpened = Number((value as { lastOpened?: unknown }).lastOpened);
  if (!Number.isFinite(count) || !Number.isFinite(lastOpened)) return undefined;
  if (count < 0) return undefined;
  if (lastOpened < 0) return undefined;
  return {
    count: Math.floor(count),
    lastOpened,
  };
};

export const readAppUsage = (): AppUsageMap => {
  if (!safeLocalStorage) return {};
  const raw = safeLocalStorage.getItem(APP_USAGE_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    if (!parsed || typeof parsed !== 'object') return {};
    const result: AppUsageMap = {};
    Object.entries(parsed).forEach(([id, value]) => {
      const record = sanitizeRecord(value);
      if (record) {
        result[id] = record;
      }
    });
    return result;
  } catch {
    return {};
  }
};

export const writeAppUsage = (usage: AppUsageMap): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(APP_USAGE_STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // ignore storage errors
  }
};

export const recordAppUsage = (appId: string, now: number = Date.now()): AppUsageRecord | undefined => {
  if (!appId) return undefined;
  const usage = readAppUsage();
  const current = usage[appId];
  const count = current ? Math.max(0, current.count) : 0;
  const updated: AppUsageRecord = {
    count: count + 1,
    lastOpened: now,
  };
  usage[appId] = updated;
  writeAppUsage(usage);
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    const event = new CustomEvent(APP_USAGE_UPDATED_EVENT, { detail: { id: appId, usage: updated } });
    window.dispatchEvent(event);
  }
  return updated;
};

const DEFAULT_DECAY_MS = 1000 * 60 * 60 * 24 * 7; // one week

export const computeUsageScore = (
  record: AppUsageRecord | undefined,
  now: number = Date.now(),
  decayMs: number = DEFAULT_DECAY_MS,
): number => {
  if (!record) return 0;
  if (!record.count || record.count <= 0) return 0;
  if (!record.lastOpened || record.lastOpened <= 0) return 0;
  const age = Math.max(0, now - record.lastOpened);
  const normalizedDecay = decayMs > 0 ? decayMs : DEFAULT_DECAY_MS;
  const decay = Math.exp(-age / normalizedDecay);
  return Math.log1p(record.count) * decay;
};

export type RankableApp = {
  id: string;
  title: string;
};

type RankedApp = {
  app: RankableApp;
  score: number;
  exactMatch: boolean;
  lastOpened: number;
};

const normalize = (value: string): string => value.toLowerCase();

export const rankApps = (
  apps: RankableApp[],
  query: string,
  usage: AppUsageMap,
  now: number = Date.now(),
): RankableApp[] => {
  const normalizedQuery = query.trim().toLowerCase();
  const baseList = !normalizedQuery
    ? [...apps]
    : apps.filter((app) => {
        const title = normalize(app.title);
        const id = normalize(app.id);
        return title.includes(normalizedQuery) || id.includes(normalizedQuery);
      });

  const ranked: RankedApp[] = baseList.map((app) => {
    const titleLower = normalize(app.title);
    const idLower = normalize(app.id);
    const record = usage[app.id];
    const usageScore = computeUsageScore(record, now);
    let textScore = 0;
    let exactMatch = false;
    if (normalizedQuery) {
      if (titleLower === normalizedQuery || idLower === normalizedQuery) {
        textScore = 1000;
        exactMatch = true;
      } else if (titleLower.startsWith(normalizedQuery) || idLower.startsWith(normalizedQuery)) {
        textScore = 100;
      } else {
        textScore = 10;
      }
    }
    const score = textScore + usageScore;
    return {
      app,
      score,
      exactMatch,
      lastOpened: record?.lastOpened ?? 0,
    };
  });

  ranked.sort((a, b) => {
    if (a.exactMatch !== b.exactMatch) {
      return a.exactMatch ? -1 : 1;
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    if (b.lastOpened !== a.lastOpened) {
      return b.lastOpened - a.lastOpened;
    }
    return a.app.title.localeCompare(b.app.title);
  });

  return ranked.map((entry) => entry.app);
};

export type AppUsageEventDetail = {
  id: string;
  usage: AppUsageRecord;
};
