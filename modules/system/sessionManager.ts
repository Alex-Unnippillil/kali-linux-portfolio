import { safeLocalStorage } from '../../utils/safeStorage';
import {
  DesktopSession,
  createInitialDesktopSession,
} from '../../hooks/useSession';

const STORAGE_PREFIX = 'user-switcher';
const INDEX_KEY = `${STORAGE_PREFIX}:index`;
const ACTIVE_KEY = `${STORAGE_PREFIX}:active`;
const SESSION_PREFIX = `${STORAGE_PREFIX}:session:`;
const EVENT_NAME = `${STORAGE_PREFIX}:change`;

type MaybeStorage = Storage | undefined;

export interface SessionMetadata {
  id: string;
  displayName: string;
  locked: boolean;
  lastActive: number;
}

export interface SessionRecord {
  meta: SessionMetadata;
  session: DesktopSession;
}

export interface SessionSnapshot {
  sessions: SessionMetadata[];
  active: SessionRecord | null;
}

export type SessionChangeListener = (snapshot: SessionSnapshot) => void;

const listeners = new Set<SessionChangeListener>();
let metadataCache: SessionMetadata[] | null = null;
const sessionCache = new Map<string, DesktopSession>();
let activeIdCache: string | null | undefined;

const disabledValues = new Set(['false', 'disabled', 'off', '0']);

const defaultSessions = (): SessionRecord[] => {
  const now = Date.now();
  return [
    {
      meta: {
        id: 'analyst',
        displayName: 'Lead Analyst',
        locked: false,
        lastActive: now,
      },
      session: createInitialDesktopSession(),
    },
    {
      meta: {
        id: 'guest',
        displayName: 'Guest Review',
        locked: false,
        lastActive: now - 1000,
      },
      session: createInitialDesktopSession(),
    },
  ];
};

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cloneSession = (session: DesktopSession): DesktopSession => ({
  wallpaper:
    typeof session.wallpaper === 'string'
      ? session.wallpaper
      : createInitialDesktopSession().wallpaper,
  dock: Array.isArray(session.dock)
    ? session.dock.filter((id): id is string => typeof id === 'string')
    : [],
  windows: Array.isArray(session.windows)
    ? session.windows.reduce<DesktopSession['windows']>((acc, win) => {
        if (win && typeof win.id === 'string') {
          acc.push({
            id: win.id,
            x: toNumber(win.x, 60),
            y: toNumber(win.y, 10),
          });
        }
        return acc;
      }, [])
    : [],
});

const normalizeMetadata = (
  meta: Partial<SessionMetadata> | null,
  index: number,
): SessionMetadata => ({
  id:
    meta && typeof meta.id === 'string' && meta.id.trim().length
      ? meta.id
      : `session-${index + 1}`,
  displayName:
    meta && typeof meta.displayName === 'string' && meta.displayName.trim().length
      ? meta.displayName
      : `Session ${index + 1}`,
  locked: Boolean(meta?.locked),
  lastActive:
    meta && typeof meta.lastActive === 'number' && Number.isFinite(meta.lastActive)
      ? meta.lastActive
      : Date.now() - index,
});

const getStorage = (): MaybeStorage => safeLocalStorage;

const readIndexFromStorage = (): SessionMetadata[] | null => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(INDEX_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map((meta, index) => normalizeMetadata(meta, index));
  } catch {
    return null;
  }
};

const writeIndex = (index: SessionMetadata[]): void => {
  metadataCache = index.map((meta, idx) => normalizeMetadata(meta, idx));
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(INDEX_KEY, JSON.stringify(metadataCache));
  } catch {
    // ignore storage errors
  }
};

const writeActiveId = (id: string | null): void => {
  activeIdCache = id;
  const storage = getStorage();
  if (!storage) return;
  try {
    if (id === null) {
      storage.removeItem(ACTIVE_KEY);
    } else {
      storage.setItem(ACTIVE_KEY, id);
    }
  } catch {
    // ignore storage errors
  }
};

const readActiveId = (): string | null => {
  if (typeof activeIdCache !== 'undefined') {
    return activeIdCache;
  }
  const storage = getStorage();
  if (!storage) {
    activeIdCache = metadataCache?.[0]?.id ?? null;
    return activeIdCache;
  }
  try {
    const stored = storage.getItem(ACTIVE_KEY);
    activeIdCache = stored ?? metadataCache?.[0]?.id ?? null;
    return activeIdCache;
  } catch {
    activeIdCache = metadataCache?.[0]?.id ?? null;
    return activeIdCache;
  }
};

const writeSession = (id: string, session: DesktopSession): void => {
  const normalized = cloneSession(session);
  sessionCache.set(id, normalized);
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(SESSION_PREFIX + id, JSON.stringify(normalized));
  } catch {
    // ignore storage errors
  }
};

const readSession = (id: string): DesktopSession => {
  const cached = sessionCache.get(id);
  if (cached) {
    return cloneSession(cached);
  }
  const storage = getStorage();
  if (storage) {
    try {
      const raw = storage.getItem(SESSION_PREFIX + id);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = cloneSession(parsed);
        sessionCache.set(id, normalized);
        return cloneSession(normalized);
      }
    } catch {
      // ignore parse errors
    }
  }
  const initial = createInitialDesktopSession();
  sessionCache.set(id, initial);
  return cloneSession(initial);
};

const ensureInitialized = (): void => {
  if (!isUserSwitcherEnabled()) return;
  if (metadataCache) return;

  const storedIndex = readIndexFromStorage();
  if (storedIndex && storedIndex.length) {
    metadataCache = storedIndex;
  } else {
    const defaults = defaultSessions();
    metadataCache = defaults.map((record, index) =>
      normalizeMetadata(record.meta, index),
    );
    const storage = getStorage();
    if (storage) {
      try {
        storage.setItem(
          INDEX_KEY,
          JSON.stringify(metadataCache),
        );
      } catch {
        // ignore
      }
    }
    defaults.forEach((record) => writeSession(record.meta.id, record.session));
  }

  metadataCache.forEach((meta) => {
    if (!sessionCache.has(meta.id)) {
      sessionCache.set(meta.id, readSession(meta.id));
    }
  });

  if (typeof activeIdCache === 'undefined') {
    activeIdCache = readActiveId();
    if (!activeIdCache && metadataCache.length) {
      const fallback = metadataCache[0].id;
      writeActiveId(fallback);
    }
  }
};

const emitChange = (): void => {
  const snapshot = getSnapshot();
  listeners.forEach((listener) => listener(snapshot));
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: snapshot }));
    } catch {
      // ignore dispatch errors
    }
  }
};

const sortSessions = (sessions: SessionMetadata[]): SessionMetadata[] =>
  [...sessions].sort((a, b) => b.lastActive - a.lastActive);

export const isUserSwitcherEnabled = (): boolean => {
  const flag = process.env.NEXT_PUBLIC_ENABLE_USER_SWITCHER;
  if (!flag) return true;
  return !disabledValues.has(flag.toLowerCase());
};

export const getSnapshot = (): SessionSnapshot => {
  if (!isUserSwitcherEnabled()) {
    return { sessions: [], active: null };
  }
  ensureInitialized();
  const sessions = metadataCache ? sortSessions(metadataCache) : [];
  const activeId = readActiveId();
  const activeMeta = sessions.find((meta) => meta.id === activeId);
  const activeSession = activeMeta
    ? {
        meta: { ...activeMeta },
        session: readSession(activeMeta.id),
      }
    : null;
  return { sessions, active: activeSession };
};

export const getActiveSessionId = (): string | null => {
  if (!isUserSwitcherEnabled()) return null;
  ensureInitialized();
  return readActiveId();
};

export const updateActiveSessionState = (
  session: DesktopSession,
): void => {
  if (!isUserSwitcherEnabled()) return;
  ensureInitialized();
  const activeId = readActiveId();
  if (!activeId) return;
  writeSession(activeId, session);
};

export const switchToUser = async (
  id: string,
): Promise<SessionRecord> => {
  if (!isUserSwitcherEnabled()) {
    throw new Error('User switching disabled by policy');
  }
  ensureInitialized();
  if (!metadataCache) {
    throw new Error('Session store is unavailable');
  }
  const meta = metadataCache.find((item) => item.id === id);
  if (!meta) {
    throw new Error(`Unknown session: ${id}`);
  }
  if (meta.locked) {
    throw new Error('Session is locked');
  }
  meta.lastActive = Date.now();
  writeIndex(metadataCache);
  writeActiveId(id);
  const session = readSession(id);
  emitChange();
  return { meta: { ...meta }, session };
};

export const setLockState = (id: string, locked: boolean): void => {
  if (!isUserSwitcherEnabled()) return;
  ensureInitialized();
  if (!metadataCache) return;
  const meta = metadataCache.find((item) => item.id === id);
  if (!meta || meta.locked === locked) return;
  meta.locked = locked;
  writeIndex(metadataCache);
  emitChange();
};

export const subscribe = (
  listener: SessionChangeListener,
): (() => void) => {
  if (!isUserSwitcherEnabled()) {
    listener({ sessions: [], active: null });
    return () => undefined;
  }
  ensureInitialized();
  listeners.add(listener);
  listener(getSnapshot());
  return () => {
    listeners.delete(listener);
  };
};

export const __resetSessionManagerForTests = (): void => {
  metadataCache = null;
  sessionCache.clear();
  activeIdCache = undefined;
  listeners.clear();
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(INDEX_KEY);
    storage.removeItem(ACTIVE_KEY);
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(SESSION_PREFIX)) {
        keys.push(key);
      }
    }
    keys.forEach((key) => storage.removeItem(key));
  } catch {
    // ignore storage cleanup errors
  }
};

