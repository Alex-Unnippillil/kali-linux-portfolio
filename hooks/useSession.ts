"use client";

import { useCallback, useEffect, useMemo } from 'react';
import usePersistentState from './usePersistentState';
import { defaults } from '../utils/settingsStore';

export interface SessionWindowPosition {
  x: number;
  y: number;
}

export interface SessionProfileSnapshot {
  openWindows: string[];
  zOrder: string[];
  positions: Record<string, SessionWindowPosition>;
  minimized: string[];
  wallpaper: string;
  dock: string[];
  appState: Record<string, unknown>;
  focusedWindow: string | null;
  restoreCursor: number;
}

export interface DesktopSession {
  activeProfile: string;
  profiles: Record<string, SessionProfileSnapshot>;
}

type LegacyWindow = { id?: string; x?: number; y?: number };
interface LegacySession {
  windows?: LegacyWindow[];
  wallpaper?: string;
  dock?: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const ensureArrayOfStrings = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  value.forEach((item) => {
    if (typeof item === 'string' && !seen.has(item)) {
      seen.add(item);
      result.push(item);
    }
  });
  return result;
};

const createProfileSnapshot = (): SessionProfileSnapshot => ({
  openWindows: [],
  zOrder: [],
  positions: {},
  minimized: [],
  wallpaper: defaults.wallpaper,
  dock: [],
  appState: {},
  focusedWindow: null,
  restoreCursor: 0,
});

const createInitialStore = (): DesktopSession => ({
  activeProfile: 'default',
  profiles: {
    default: createProfileSnapshot(),
  },
});

const sanitizeProfileId = (value: string | undefined): string => {
  if (!value) return '';
  return value.trim();
};

const isLegacySession = (value: unknown): value is LegacySession =>
  isRecord(value) && Array.isArray((value as LegacySession).windows);

const normalizePositions = (
  positions: unknown,
  openSet: Set<string>,
): Record<string, SessionWindowPosition> => {
  if (!isRecord(positions)) return {};
  const result: Record<string, SessionWindowPosition> = {};
  Object.entries(positions as Record<string, unknown>).forEach(([id, raw]) => {
    if (!openSet.has(id)) return;
    if (!isRecord(raw)) return;
    const x = Number((raw as { x?: unknown }).x);
    const y = Number((raw as { y?: unknown }).y);
    if (Number.isFinite(x) || Number.isFinite(y)) {
      result[id] = {
        x: Number.isFinite(x) ? (x as number) : 0,
        y: Number.isFinite(y) ? (y as number) : 0,
      };
    }
  });
  return result;
};

const legacyToSnapshot = (legacy: LegacySession): SessionProfileSnapshot => {
  const snapshot = createProfileSnapshot();
  const windows = Array.isArray(legacy.windows) ? legacy.windows : [];
  const openWindows = windows
    .map((win) => (typeof win.id === 'string' ? win.id : null))
    .filter((id): id is string => id !== null);
  snapshot.openWindows = [...new Set(openWindows)];
  snapshot.zOrder = [...snapshot.openWindows];
  const openSet = new Set(snapshot.openWindows);
  snapshot.positions = {};
  windows.forEach((win) => {
    if (!win.id || !openSet.has(win.id)) return;
    const x = Number(win.x);
    const y = Number(win.y);
    snapshot.positions[win.id] = {
      x: Number.isFinite(x) ? (x as number) : 0,
      y: Number.isFinite(y) ? (y as number) : 0,
    };
  });
  snapshot.wallpaper =
    typeof legacy.wallpaper === 'string' ? legacy.wallpaper : defaults.wallpaper;
  snapshot.dock = ensureArrayOfStrings(legacy.dock);
  return snapshot;
};

const normalizeProfile = (
  value: Partial<SessionProfileSnapshot> | LegacySession | undefined,
): SessionProfileSnapshot => {
  if (!value) return createProfileSnapshot();
  if (isLegacySession(value)) return legacyToSnapshot(value);
  const snapshot = createProfileSnapshot();
  const openWindows = ensureArrayOfStrings(value.openWindows);
  snapshot.openWindows = openWindows;
  const openSet = new Set(snapshot.openWindows);
  let zOrder = ensureArrayOfStrings(value.zOrder).filter((id) => openSet.has(id));
  if (!zOrder.length) {
    zOrder = [...snapshot.openWindows];
  }
  const orderedOpen = [...zOrder];
  snapshot.openWindows.forEach((id) => {
    if (!orderedOpen.includes(id)) orderedOpen.push(id);
  });
  snapshot.openWindows = orderedOpen;
  snapshot.zOrder = zOrder;
  snapshot.positions = normalizePositions(value.positions, new Set(snapshot.openWindows));
  snapshot.minimized = ensureArrayOfStrings(value.minimized).filter((id) =>
    snapshot.openWindows.includes(id),
  );
  snapshot.wallpaper =
    typeof value.wallpaper === 'string' ? value.wallpaper : defaults.wallpaper;
  snapshot.dock = ensureArrayOfStrings(value.dock);
  snapshot.appState = isRecord(value.appState) ? value.appState : {};
  const focus = value.focusedWindow;
  snapshot.focusedWindow =
    typeof focus === 'string' && snapshot.openWindows.includes(focus) ? focus : null;
  const cursor = value.restoreCursor;
  snapshot.restoreCursor = typeof cursor === 'number' ? cursor : 0;
  return snapshot;
};

const normalizeStore = (
  value: DesktopSession | LegacySession | undefined,
): DesktopSession => {
  if (!value) return createInitialStore();
  if (isLegacySession(value)) {
    return {
      activeProfile: 'default',
      profiles: { default: normalizeProfile(value) },
    };
  }
  if (!isRecord(value) || !isRecord((value as DesktopSession).profiles)) {
    return createInitialStore();
  }
  const profilesEntries = Object.entries(
    (value as DesktopSession).profiles as Record<string, unknown>,
  );
  const profiles: Record<string, SessionProfileSnapshot> = {};
  profilesEntries.forEach(([key, snapshot]) => {
    profiles[key] = normalizeProfile(snapshot as SessionProfileSnapshot);
  });
  if (!Object.keys(profiles).length) {
    profiles.default = createProfileSnapshot();
  }
  const preferred =
    typeof value.activeProfile === 'string' && profiles[value.activeProfile]
      ? value.activeProfile
      : Object.keys(profiles)[0];
  return {
    activeProfile: preferred,
    profiles,
  };
};

const mergeProfile = (
  prev: SessionProfileSnapshot,
  next: SessionProfileSnapshot,
): SessionProfileSnapshot => {
  const combined: Partial<SessionProfileSnapshot> = {
    ...prev,
    ...next,
    positions: { ...prev.positions, ...next.positions },
    appState: { ...prev.appState, ...next.appState },
  };
  if (next.openWindows) combined.openWindows = next.openWindows;
  if (next.zOrder) combined.zOrder = next.zOrder;
  if (next.minimized) combined.minimized = next.minimized;
  if (next.dock) combined.dock = next.dock;
  if (next.focusedWindow === null) combined.focusedWindow = null;
  if (typeof next.restoreCursor === 'number') combined.restoreCursor = next.restoreCursor;
  return normalizeProfile(combined);
};

const isStoreOrLegacy = (value: unknown): value is DesktopSession | LegacySession => {
  if (!value) return false;
  return isLegacySession(value) || (isRecord(value) && 'profiles' in value);
};

export default function useSession() {
  const [rawStore, setRawStore, _reset, clearRaw] = usePersistentState<
    DesktopSession | LegacySession
  >('desktop-session', createInitialStore, isStoreOrLegacy);

  const store = useMemo(() => normalizeStore(rawStore), [rawStore]);

  useEffect(() => {
    if (!('profiles' in rawStore)) {
      setRawStore(store);
    }
  }, [rawStore, setRawStore, store]);

  const setStore = useCallback(
    (updater: (prev: DesktopSession) => DesktopSession) => {
      setRawStore((prev) => updater(normalizeStore(prev)));
    },
    [setRawStore],
  );

  const session = useMemo(() => {
    const current = store.profiles[store.activeProfile];
    return current ? current : createProfileSnapshot();
  }, [store]);

  const profiles = useMemo(() => Object.keys(store.profiles), [store.profiles]);

  const setSession = useCallback(
    (
      update:
        | SessionProfileSnapshot
        | ((prev: SessionProfileSnapshot) => SessionProfileSnapshot),
    ) => {
      setStore((prev) => {
        const profileId = prev.activeProfile;
        const current = prev.profiles[profileId] || createProfileSnapshot();
        const nextSnapshot =
          typeof update === 'function' ? update(current) : update;
        return {
          ...prev,
          profiles: {
            ...prev.profiles,
            [profileId]: mergeProfile(current, nextSnapshot),
          },
        };
      });
    },
    [setStore],
  );

  const resetSession = useCallback(() => {
    setStore((prev) => ({
      ...prev,
      profiles: {
        ...prev.profiles,
        [prev.activeProfile]: createProfileSnapshot(),
      },
    }));
  }, [setStore]);

  const clearSession = useCallback(() => {
    clearRaw();
    setRawStore(createInitialStore());
  }, [clearRaw, setRawStore]);

  const setActiveProfile = useCallback(
    (name: string) => {
      const id = sanitizeProfileId(name) || 'default';
      setStore((prev) => {
        const profilesMap = { ...prev.profiles };
        if (!profilesMap[id]) {
          profilesMap[id] = createProfileSnapshot();
        }
        return {
          activeProfile: id,
          profiles: profilesMap,
        };
      });
    },
    [setStore],
  );

  const createProfile = useCallback(
    (name: string) => {
      const id = sanitizeProfileId(name);
      if (!id) return null;
      setStore((prev) => {
        if (prev.profiles[id]) {
          return { ...prev, activeProfile: id };
        }
        return {
          activeProfile: id,
          profiles: {
            ...prev.profiles,
            [id]: createProfileSnapshot(),
          },
        };
      });
      return id;
    },
    [setStore],
  );

  const deleteProfile = useCallback(
    (name: string) => {
      const id = sanitizeProfileId(name);
      if (!id || id === 'default') return;
      setStore((prev) => {
        if (!prev.profiles[id]) return prev;
        const profilesMap = { ...prev.profiles };
        delete profilesMap[id];
        const activeProfile =
          prev.activeProfile === id
            ? Object.keys(profilesMap)[0] || 'default'
            : prev.activeProfile;
        if (!profilesMap[activeProfile]) {
          profilesMap[activeProfile] = createProfileSnapshot();
        }
        return {
          activeProfile,
          profiles: profilesMap,
        };
      });
    },
    [setStore],
  );

  const requestRestore = useCallback(
    (profileId?: string) => {
      setStore((prev) => {
        const target = sanitizeProfileId(profileId) || prev.activeProfile;
        const profilesMap = { ...prev.profiles };
        const snapshot = profilesMap[target] || createProfileSnapshot();
        profilesMap[target] = { ...snapshot, restoreCursor: Date.now() };
        return {
          activeProfile: target,
          profiles: profilesMap,
        };
      });
    },
    [setStore],
  );

  return {
    session,
    setSession,
    resetSession,
    clearSession,
    profiles,
    activeProfile: store.activeProfile,
    setActiveProfile,
    createProfile,
    deleteProfile,
    requestRestore,
  };
}

export function useSessionAppState<T>(
  key: string,
  initial: T | (() => T),
) {
  const resolveInitial = useCallback(() =>
    (typeof initial === 'function' ? (initial as () => T)() : initial), [initial]);
  const { session, setSession } = useSession();
  const stored = session.appState[key] as T | undefined;

  const value = stored ?? resolveInitial();

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setSession((prev) => {
        const current = prev.appState[key] as T | undefined;
        const resolved =
          typeof next === 'function'
            ? (next as (prev: T) => T)(current ?? resolveInitial())
            : next;
        return {
          ...prev,
          appState: {
            ...prev.appState,
            [key]: resolved,
          },
        };
      });
    },
    [key, resolveInitial, setSession],
  );

  const reset = useCallback(() => {
    setSession((prev) => {
      const appState = { ...prev.appState };
      const initialValue = resolveInitial();
      if (initialValue === undefined) {
        delete appState[key];
      } else {
        appState[key] = initialValue;
      }
      return {
        ...prev,
        appState,
      };
    });
  }, [key, resolveInitial, setSession]);

  return [value, setValue, reset] as const;
}
