import { safeLocalStorage } from './safeStorage';

export const RECENT_STORAGE_KEY = 'kali-recent:v2';
const LEGACY_RECENT_KEYS = ['kali-recent', 'recentApps'] as const;
const MAX_RECENT_ENTRIES = 20;

export type RecentEntryType = 'app' | 'file';

export type RecentMeta = {
  title?: string;
  subtitle?: string;
  path?: string;
  icon?: string;
};

export type RecentEntry = {
  id: string;
  type: RecentEntryType;
  openedAt: number;
  meta?: RecentMeta;
};

type RecentEntryInput = {
  id: string;
  type: RecentEntryType;
  openedAt?: number;
  meta?: RecentMeta;
};

const clampMeta = (meta?: RecentMeta): RecentMeta | undefined => {
  if (!meta || typeof meta !== 'object') return undefined;
  const next: RecentMeta = {};
  if (typeof meta.title === 'string') next.title = meta.title;
  if (typeof meta.subtitle === 'string') next.subtitle = meta.subtitle;
  if (typeof meta.path === 'string') next.path = meta.path;
  if (typeof meta.icon === 'string') next.icon = meta.icon;
  return Object.keys(next).length > 0 ? next : undefined;
};

const normalizeRecentEntry = (value: unknown, fallbackOpenedAt: number): RecentEntry | null => {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Partial<RecentEntry>;
  if (typeof candidate.id !== 'string') return null;
  const type = candidate.type === 'file' || candidate.type === 'app' ? candidate.type : null;
  if (!type) return null;
  const openedAtValue = typeof candidate.openedAt === 'number' && Number.isFinite(candidate.openedAt)
    ? candidate.openedAt
    : fallbackOpenedAt;

  const meta = clampMeta(candidate.meta);

  return {
    id: candidate.id,
    type,
    openedAt: openedAtValue,
    ...(meta ? { meta } : {}),
  };
};

const sanitizeEntries = (raw: unknown): RecentEntry[] => {
  if (!Array.isArray(raw)) return [];
  if (raw.every((value) => typeof value === 'string')) {
    const now = Date.now();
    return (raw as string[])
      .filter((value) => typeof value === 'string')
      .slice(0, MAX_RECENT_ENTRIES)
      .map((id, index) => ({
        id,
        type: 'app' as const,
        openedAt: now - index,
      }));
  }

  const now = Date.now();
  const normalized = (raw as unknown[])
    .map((value, index) => normalizeRecentEntry(value, now - index))
    .filter((entry): entry is RecentEntry => Boolean(entry));

  const deduped = new Map<string, RecentEntry>();
  for (const entry of normalized) {
    const key = `${entry.type}:${entry.id}`;
    const existing = deduped.get(key);
    if (!existing || existing.openedAt < entry.openedAt) {
      deduped.set(key, entry);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => b.openedAt - a.openedAt)
    .slice(0, MAX_RECENT_ENTRIES);
};

const parseStoredValue = (raw: string): RecentEntry[] => {
  try {
    const parsed = JSON.parse(raw);
    return sanitizeEntries(parsed);
  } catch {
    return [];
  }
};

export const readRecentEntries = (): RecentEntry[] => {
  if (!safeLocalStorage) return [];

  const currentRaw = safeLocalStorage.getItem(RECENT_STORAGE_KEY);
  if (currentRaw !== null) {
    const entries = parseStoredValue(currentRaw);
    writeRecentEntries(entries);
    return entries;
  }

  for (const key of LEGACY_RECENT_KEYS) {
    const legacyRaw = safeLocalStorage.getItem(key);
    if (legacyRaw === null) continue;
    const entries = parseStoredValue(legacyRaw);
    writeRecentEntries(entries);
    try {
      safeLocalStorage.removeItem(key);
    } catch {
      // ignore storage failures while cleaning up legacy keys
    }
    return entries;
  }

  return [];
};

export const writeRecentEntries = (entries: RecentEntry[]): void => {
  if (!safeLocalStorage) return;
  try {
    const sanitized = sanitizeEntries(entries);
    safeLocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(sanitized));
  } catch {
    // ignore storage failures
  }
};

export const clearRecentEntries = (): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify([]));
  } catch {
    // ignore storage failures
  }
};

export const addRecentEntry = (entry: RecentEntryInput): RecentEntry[] => {
  if (!entry || typeof entry.id !== 'string' || !entry.id) return readRecentEntries();
  if (entry.type !== 'app' && entry.type !== 'file') return readRecentEntries();

  const openedAt = typeof entry.openedAt === 'number' && Number.isFinite(entry.openedAt)
    ? entry.openedAt
    : Date.now();

  const meta = clampMeta(entry.meta);
  const next: RecentEntry = {
    id: entry.id,
    type: entry.type,
    openedAt,
    ...(meta ? { meta } : {}),
  };

  const current = readRecentEntries();
  const updated = sanitizeEntries([next, ...current]);
  writeRecentEntries(updated);
  return updated;
};

export const addRecentApp = (id: string): RecentEntry[] =>
  addRecentEntry({ id, type: 'app' });

export const addRecentFile = (options: { path: string; title?: string; icon?: string; subtitle?: string }): RecentEntry[] => {
  const { path, title, icon, subtitle } = options;
  if (typeof path !== 'string' || !path) {
    return readRecentEntries();
  }

  const meta: RecentMeta = {
    title: typeof title === 'string' ? title : undefined,
    icon: typeof icon === 'string' ? icon : undefined,
    subtitle: typeof subtitle === 'string' ? subtitle : path,
    path,
  };

  return addRecentEntry({ id: path, type: 'file', meta });
};
