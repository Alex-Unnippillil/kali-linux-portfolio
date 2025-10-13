import { safeLocalStorage } from './safeStorage';

export const RECENT_STORAGE_KEY = 'kali-recent';
const LEGACY_RECENT_STORAGE_KEY = 'recentApps';
const MAX_RECENT_ENTRIES = 20;
const MAX_RECENT_EVENTS = 10;

export const RECENT_APP_EVENT = 'recent-app-history';

type RecentId = string;
export type RecentAppEventType = 'open' | 'close' | 'write' | 'clear';

export interface RecentAppEvent {
  type: RecentAppEventType;
  timestamp: number;
}

interface RecentAppRecord {
  id: RecentId;
  events: RecentAppEvent[];
}

const parseIds = (raw: string | null): RecentId[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is RecentId => typeof value === 'string');
  } catch {
    return [];
  }
};

const sanitizeEvent = (event: unknown): RecentAppEvent | null => {
  if (!event || typeof event !== 'object') return null;
  const candidate = event as Partial<RecentAppEvent>;
  const type: RecentAppEvent['type'] = candidate.type === 'close' ? 'close' : 'open';
  const timestampRaw = (candidate.timestamp ?? null) as unknown;
  const numericTimestamp = typeof timestampRaw === 'number' ? timestampRaw : Number(timestampRaw);
  if (!Number.isFinite(numericTimestamp)) {
    return null;
  }
  return { type, timestamp: numericTimestamp };
};

const persistRecords = (records: RecentAppRecord[]): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(
      RECENT_STORAGE_KEY,
      JSON.stringify(records.slice(0, MAX_RECENT_ENTRIES)),
    );
  } catch {
    // ignore storage failures (e.g., quota exceeded)
  }
};

const parseRecords = (raw: string): { records: RecentAppRecord[]; migrated: boolean } => {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return { records: [], migrated: true };
    }

    let migrated = false;
    const records: RecentAppRecord[] = [];

    parsed.forEach((entry) => {
      if (typeof entry === 'string') {
        if (entry) {
          records.push({ id: entry, events: [] });
        }
        migrated = true;
        return;
      }

      if (!entry || typeof entry !== 'object') {
        migrated = true;
        return;
      }

      const id = (entry as { id?: unknown }).id;
      if (typeof id !== 'string' || !id) {
        migrated = true;
        return;
      }

      const rawEvents = (entry as { events?: unknown }).events;
      let events: RecentAppEvent[] = [];
      if (Array.isArray(rawEvents)) {
        events = rawEvents
          .map(sanitizeEvent)
          .filter((event): event is RecentAppEvent => Boolean(event))
          .slice(0, MAX_RECENT_EVENTS);
        if (events.length !== rawEvents.length) {
          migrated = true;
        }
      } else if (rawEvents !== undefined) {
        migrated = true;
      }

      records.push({ id, events });
    });

    return { records: records.slice(0, MAX_RECENT_ENTRIES), migrated };
  } catch {
    return { records: [], migrated: true };
  }
};

const seedFromLegacy = (): RecentAppRecord[] => {
  if (!safeLocalStorage) return [];
  const legacyRaw = safeLocalStorage.getItem(LEGACY_RECENT_STORAGE_KEY);
  if (legacyRaw === null) {
    return [];
  }

  const legacyIds = parseIds(legacyRaw).slice(0, MAX_RECENT_ENTRIES);
  const records = legacyIds.map((id) => ({ id, events: [] }));

  persistRecords(records);

  try {
    safeLocalStorage.removeItem(LEGACY_RECENT_STORAGE_KEY);
  } catch {
    // ignore storage failures (e.g., quota exceeded)
  }

  return records;
};

const readRecords = (): RecentAppRecord[] => {
  if (!safeLocalStorage) return [];
  const currentRaw = safeLocalStorage.getItem(RECENT_STORAGE_KEY);
  if (currentRaw === null) {
    return seedFromLegacy();
  }

  const { records, migrated } = parseRecords(currentRaw);
  if (migrated) {
    persistRecords(records);
  }
  return records;
};

const notifyRecentChange = (id: RecentId, events: RecentAppEvent[], action: RecentAppEventType): void => {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(
      new CustomEvent(RECENT_APP_EVENT, {
        detail: { id, events, action },
      }),
    );
  } catch {
    // ignore event dispatch issues
  }
};

const recordEvent = (id: RecentId, type: RecentAppEvent['type'], timestamp = Date.now()): RecentAppEvent[] => {
  if (!safeLocalStorage || !id) return [];

  const records = readRecords();
  const sanitizedTimestamp = Number.isFinite(timestamp) ? timestamp : Date.now();
  const existingIndex = records.findIndex((record) => record.id === id);
  const existing = existingIndex !== -1 ? records[existingIndex] : null;
  const baseEvents = existing?.events ?? [];
  const nextEvents: RecentAppEvent[] = [
    { type, timestamp: sanitizedTimestamp },
    ...baseEvents,
  ].slice(0, MAX_RECENT_EVENTS);

  if (existingIndex !== -1) {
    records.splice(existingIndex, 1);
  }

  const nextRecords: RecentAppRecord[] = [
    { id, events: nextEvents },
    ...records,
  ].slice(0, MAX_RECENT_ENTRIES);

  persistRecords(nextRecords);
  notifyRecentChange(id, nextEvents, type);
  return nextEvents;
};

export const seedRecentAppsFromLegacy = (): RecentAppRecord[] => seedFromLegacy();

export const readRecentAppIds = (): RecentId[] => {
  const records = readRecords();
  return records.map((record) => record.id);
};

export const writeRecentAppIds = (ids: RecentId[]): void => {
  if (!safeLocalStorage) return;
  const records = readRecords();
  const eventMap = new Map(records.map((record) => [record.id, record.events]));
  const normalizedIds = ids
    .filter((id): id is RecentId => typeof id === 'string' && Boolean(id))
    .slice(0, MAX_RECENT_ENTRIES);

  const nextRecords: RecentAppRecord[] = normalizedIds.map((id) => ({
    id,
    events: (eventMap.get(id) ?? []).slice(0, MAX_RECENT_EVENTS),
  }));

  persistRecords(nextRecords);
  nextRecords.forEach((record) => notifyRecentChange(record.id, record.events, 'write'));
};

export const recordRecentAppOpen = (id: RecentId, timestamp = Date.now()): RecentAppEvent[] =>
  recordEvent(id, 'open', timestamp);

export const recordRecentAppClose = (id: RecentId, timestamp = Date.now()): RecentAppEvent[] =>
  recordEvent(id, 'close', timestamp);

export const addRecentApp = (id: RecentId): RecentId[] => {
  recordRecentAppOpen(id);
  return readRecentAppIds();
};

export const getRecentAppHistory = (id: RecentId, limit = 5): RecentAppEvent[] => {
  if (!id) return [];
  const records = readRecords();
  const record = records.find((entry) => entry.id === id);
  if (!record) return [];
  const normalizedLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : MAX_RECENT_EVENTS;
  return record.events.slice(0, normalizedLimit);
};

export const clearRecentAppHistory = (id: RecentId): void => {
  if (!safeLocalStorage || !id) return;
  const records = readRecords();
  const nextRecords = records.filter((record) => record.id !== id);
  persistRecords(nextRecords);
  notifyRecentChange(id, [], 'clear');
};
