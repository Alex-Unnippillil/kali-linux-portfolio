import { createStore, get, set } from 'idb-keyval';

import type { AppNotification } from '../../components/common/NotificationCenter';
import { hasIndexedDB } from '../isBrowser';

export const NOTIFICATION_DB_NAME = 'kali.notifications';
export const NOTIFICATION_STORE_NAME = 'state';
export const NOTIFICATION_STORAGE_KEY = 'notificationsByApp';
export const NOTIFICATION_STORAGE_VERSION = 1;
export const DEFAULT_RETENTION_MS = 1000 * 60 * 60 * 24 * 7; // seven days

interface PersistedState {
  version: number;
  timestamp: number;
  data: Record<string, AppNotification[]>;
}

type LegacyPersistedState = Record<string, AppNotification[]>;

type NotificationStore = ReturnType<typeof createStore> | null;

let storeRef: NotificationStore = null;

const getStore = (): NotificationStore => {
  if (!hasIndexedDB) return null;
  if (!storeRef) {
    storeRef = createStore(NOTIFICATION_DB_NAME, NOTIFICATION_STORE_NAME);
  }
  return storeRef;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNotification = (value: unknown): value is AppNotification => {
  if (!isObject(value)) return false;
  const candidate = value as Record<string, unknown>;
  const classification = candidate.classification as Record<string, unknown> | undefined;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.appId === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.timestamp === 'number' &&
    typeof candidate.read === 'boolean' &&
    typeof candidate.priority === 'string' &&
    isObject(classification) &&
    typeof classification.priority === 'string' &&
    typeof classification.source === 'string' &&
    ('matchedRuleId' in classification
      ? classification.matchedRuleId === null || typeof classification.matchedRuleId === 'string'
      : true)
  );
};

const normalizeRecord = (
  value: unknown,
): Record<string, AppNotification[]> | null => {
  if (!isObject(value)) return null;
  const entries = Object.entries(value);
  if (entries.length === 0) return {};

  let changed = false;
  const next: Record<string, AppNotification[]> = {};

  for (const [key, maybeList] of entries) {
    if (!Array.isArray(maybeList)) {
      changed = true;
      continue;
    }
    const valid = maybeList.filter(isNotification);
    if (valid.length === 0) {
      if (maybeList.length > 0) changed = true;
      continue;
    }
    if (valid.length !== maybeList.length) changed = true;
    next[key] = valid;
  }

  return changed || Object.keys(next).length !== entries.length ? next : (value as LegacyPersistedState);
};

export const migratePersistedNotifications = (
  value: unknown,
): Record<string, AppNotification[]> => {
  if (!value) return {};

  if (isObject(value) && 'version' in value && 'data' in value) {
    const persisted = value as PersistedState;
    const normalized = normalizeRecord(persisted.data);
    return normalized ?? {};
  }

  const normalized = normalizeRecord(value);
  return normalized ?? {};
};

export const pruneExpiredNotifications = (
  value: Record<string, AppNotification[]>,
  now: number = Date.now(),
  retentionMs: number = DEFAULT_RETENTION_MS,
): Record<string, AppNotification[]> => {
  const threshold = now - retentionMs;
  let changed = false;
  const next: Record<string, AppNotification[]> = {};

  for (const [appId, list] of Object.entries(value)) {
    if (!Array.isArray(list) || list.length === 0) continue;
    const filtered = list.filter(notification => notification.timestamp >= threshold);
    if (filtered.length === 0) {
      if (list.length > 0) changed = true;
      continue;
    }
    if (filtered.length !== list.length) changed = true;
    next[appId] = filtered;
  }

  return changed ? next : value;
};

export const createPersistedState = (
  data: Record<string, AppNotification[]>,
  timestamp: number = Date.now(),
): PersistedState => ({
  version: NOTIFICATION_STORAGE_VERSION,
  timestamp,
  data,
});

export const loadPersistedNotifications = async (): Promise<
  Record<string, AppNotification[]>
> => {
  const store = getStore();
  if (!store) return {};

  try {
    const raw = await get<PersistedState | LegacyPersistedState | undefined>(
      NOTIFICATION_STORAGE_KEY,
      store,
    );
    if (!raw) return {};
    const migrated = migratePersistedNotifications(raw);
    if (!migrated || Object.keys(migrated).length === 0) return {};
    const pruned = pruneExpiredNotifications(migrated);
    if (pruned !== migrated) {
      await set(NOTIFICATION_STORAGE_KEY, createPersistedState(pruned), store);
    }
    return pruned;
  } catch (error) {
    return {};
  }
};

export const persistNotificationsState = async (
  data: Record<string, AppNotification[]>,
): Promise<void> => {
  const store = getStore();
  if (!store) return;

  const pruned = pruneExpiredNotifications(data);
  try {
    await set(NOTIFICATION_STORAGE_KEY, createPersistedState(pruned), store);
  } catch (error) {
    // Swallow persistence errors to avoid breaking the UI flow
  }
};

export const resetNotificationStore = (): void => {
  storeRef = null;
};

