import { safeLocalStorage } from './safeStorage';

export type RecentKind = 'app' | 'file';

export interface RecentItem {
  id: string;
  kind: RecentKind;
  name: string;
  lastUsed: number;
  icon?: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
  openable?: boolean;
}

type Listener = (items: RecentItem[]) => void;

type RecordRecentInput = Omit<RecentItem, 'lastUsed'> & {
  lastUsed?: number;
};

export interface RecordAppLaunchInput {
  appId: string;
  title?: string;
  icon?: string;
}

export interface RecordFileOpenInput {
  fileName: string;
  /** Directory names leading to the file. Root should be omitted. */
  directorySegments: string[];
  /** Display path for UI. */
  displayPath?: string;
  /** Source filesystem. Defaults to `external`. */
  source?: 'opfs' | 'external';
  /** Override open availability. */
  openable?: boolean;
}

const STORAGE_KEY = 'system:recents';
const MAX_ITEMS = 50;
export const RECENT_OPEN_EVENT = 'system:open-recent';
const RECENTS_UPDATED_EVENT = 'system:recents-updated';

let cache: RecentItem[] | null = null;
const listeners = new Set<Listener>();

const hasWindow = typeof window !== 'undefined';

function sanitizeItems(items: unknown): RecentItem[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const { id, kind, name, lastUsed, icon, subtitle, meta, openable } =
        item as Record<string, unknown>;
      if (
        typeof id !== 'string' ||
        (kind !== 'app' && kind !== 'file') ||
        typeof name !== 'string' ||
        typeof lastUsed !== 'number'
      ) {
        return null;
      }
      const sanitized: RecentItem = {
        id,
        kind,
        name,
        lastUsed,
      };
      if (typeof icon === 'string') sanitized.icon = icon;
      if (typeof subtitle === 'string') sanitized.subtitle = subtitle;
      if (meta && typeof meta === 'object') sanitized.meta = meta as Record<string, unknown>;
      if (typeof openable === 'boolean') sanitized.openable = openable;
      return sanitized;
    })
    .filter((item): item is RecentItem => Boolean(item));
}

function readStorage(): RecentItem[] {
  if (!safeLocalStorage) return cache ?? [];
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return sanitizeItems(parsed);
  } catch {
    return [];
  }
}

function sortItems(items: RecentItem[]): RecentItem[] {
  return [...items].sort((a, b) => b.lastUsed - a.lastUsed);
}

function writeStorage(items: RecentItem[]): void {
  cache = sortItems(items);
  if (safeLocalStorage) {
    try {
      safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
      // ignore write failures (quota, private mode, etc.)
    }
  }
}

function notify(): void {
  const items = getRecentItems();
  listeners.forEach((listener) => listener(items));
  if (hasWindow) {
    window.dispatchEvent(
      new CustomEvent<RecentItem[]>(RECENTS_UPDATED_EVENT, { detail: items }),
    );
  }
}

if (hasWindow) {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    cache = null;
    notify();
  });
}

export function getRecentItems(): RecentItem[] {
  if (!cache) {
    cache = sortItems(readStorage());
  }
  return [...cache];
}

export function subscribeToRecents(listener: Listener): () => void {
  listeners.add(listener);
  listener(getRecentItems());
  return () => {
    listeners.delete(listener);
  };
}

export function recordRecentItem(input: RecordRecentInput): RecentItem {
  const now = typeof input.lastUsed === 'number' ? input.lastUsed : Date.now();
  const current = getRecentItems();
  const index = current.findIndex((item) => item.id === input.id);
  const existing = index >= 0 ? current[index] : undefined;

  const meta = input.meta
    ? { ...(existing?.meta ?? {}), ...input.meta }
    : existing?.meta;

  const updated: RecentItem = {
    ...existing,
    ...input,
    lastUsed: now,
    meta,
    openable:
      typeof input.openable === 'boolean'
        ? input.openable
        : typeof existing?.openable === 'boolean'
        ? existing.openable
        : true,
  };

  let next: RecentItem[];
  if (index >= 0) {
    next = [...current];
    next[index] = updated;
  } else {
    next = [updated, ...current];
  }

  if (next.length > MAX_ITEMS) {
    next = next.slice(0, MAX_ITEMS);
  }

  writeStorage(next);
  notify();
  return updated;
}

export function removeRecentItem(id: string): void {
  const current = getRecentItems();
  const next = current.filter((item) => item.id !== id);
  writeStorage(next);
  notify();
}

export function clearRecentItems(): void {
  writeStorage([]);
  notify();
}

export function recordAppLaunch({ appId, title, icon }: RecordAppLaunchInput): void {
  if (!appId) return;
  const name = title ?? appId;
  recordRecentItem({
    id: `app:${appId}`,
    kind: 'app',
    name,
    icon,
    subtitle: 'Application',
    meta: { ...(title ? { title } : {}), appId },
    openable: true,
  });
}

export function recordFileOpen({
  fileName,
  directorySegments,
  displayPath,
  source = 'external',
  openable,
}: RecordFileOpenInput): void {
  if (!fileName) return;
  const segments = Array.isArray(directorySegments)
    ? directorySegments.filter((seg) => typeof seg === 'string' && seg.trim().length > 0)
    : [];
  const normalizedPath = segments.join('/');
  const pathKey = normalizedPath ? `${normalizedPath}/` : '';
  const id = `file:${source}:${pathKey}${fileName}`;
  const subtitle =
    displayPath ?? (normalizedPath ? `/${normalizedPath}` : '/');

  const canOpen =
    typeof openable === 'boolean' ? openable : source === 'opfs';

  recordRecentItem({
    id,
    kind: 'file',
    name: fileName,
    subtitle,
    meta: {
      source,
      directorySegments: segments,
      fileName,
    },
    openable: canOpen,
  });
}

export function openRecentItem(item: RecentItem): boolean {
  if (!hasWindow) return false;
  if (item.kind === 'app') {
    const appId =
      (item.meta?.appId as string | undefined) || item.id.replace(/^app:/, '');
    if (appId) {
      window.dispatchEvent(new CustomEvent('open-app', { detail: appId }));
      return true;
    }
    return false;
  }

  if (item.openable === false) return false;
  window.dispatchEvent(new CustomEvent(RECENT_OPEN_EVENT, { detail: item }));
  return true;
}

export function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const rtf = hasWindow && 'Intl' in window && (Intl as any).RelativeTimeFormat
    ? new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
    : null;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    const seconds = Math.round(diff / 1000);
    if (rtf) return (rtf as Intl.RelativeTimeFormat).format(-seconds, 'second');
    return seconds <= 1 ? 'just now' : `${seconds}s ago`;
  }
  if (diff < hour) {
    const minutes = Math.round(diff / minute);
    if (rtf) return (rtf as Intl.RelativeTimeFormat).format(-minutes, 'minute');
    return `${minutes}m ago`;
  }
  if (diff < day) {
    const hours = Math.round(diff / hour);
    if (rtf) return (rtf as Intl.RelativeTimeFormat).format(-hours, 'hour');
    return `${hours}h ago`;
  }
  const days = Math.round(diff / day);
  if (rtf) return (rtf as Intl.RelativeTimeFormat).format(-days, 'day');
  return `${days}d ago`;
}

