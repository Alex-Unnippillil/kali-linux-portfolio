"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import usePersistentState from './usePersistentState';

export interface DockPersistedState {
  pinned: string[];
}

export interface UseDockStoreOptions {
  /**
   * Storage key used for persisting the dock state.
   * Allowing overrides keeps tests isolated and avoids collisions with other docks.
   */
  storageKey?: string;
  /**
   * Default pinned app order. Any ids not yet present in storage will be appended
   * the first time the hook runs.
   */
  initialPinned?: string[];
}

const isPersistedState = (value: unknown): value is DockPersistedState =>
  Boolean(
    value &&
    typeof value === 'object' &&
    Array.isArray((value as DockPersistedState).pinned) &&
    (value as DockPersistedState).pinned.every((id) => typeof id === 'string'),
  );

const unique = (values: string[]) => {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
};

const move = (list: string[], from: number, to: number) => {
  if (from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

export default function useDockStore(options: UseDockStoreOptions = {}) {
  const { storageKey = 'dock-state', initialPinned = [] } = options;
  const [persisted, setPersisted] = usePersistentState<DockPersistedState>(
    storageKey,
    () => ({ pinned: [...initialPinned] }),
    isPersistedState,
  );
  const [running, setRunning] = useState<string[]>([]);
  const didInit = useRef(false);
  const cachedInitial = useRef<string[]>(initialPinned);

  useEffect(() => {
    // Only react to changes if the caller truly changed the defaults.
    if (cachedInitial.current.join('\u0000') === initialPinned.join('\u0000')) {
      return;
    }
    cachedInitial.current = [...initialPinned];
  }, [initialPinned]);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    setPersisted((prev) => {
      const merged = unique([...prev.pinned, ...cachedInitial.current]);
      if (merged.length === prev.pinned.length) {
        return prev;
      }
      return { pinned: merged };
    });
  }, [setPersisted]);

  const pinApp = useCallback(
    (id: string, position?: number) => {
      if (!id) return;
      setPersisted((prev) => {
        if (prev.pinned.includes(id)) return prev;
        const next = [...prev.pinned];
        if (typeof position === 'number' && position >= 0 && position <= next.length) {
          next.splice(position, 0, id);
        } else {
          next.push(id);
        }
        return { pinned: next };
      });
    },
    [setPersisted],
  );

  const unpinApp = useCallback(
    (id: string) => {
      if (!id) return;
      setPersisted((prev) => {
        if (!prev.pinned.includes(id)) return prev;
        return { pinned: prev.pinned.filter((item) => item !== id) };
      });
    },
    [setPersisted],
  );

  const togglePin = useCallback(
    (id: string) => {
      setPersisted((prev) =>
        prev.pinned.includes(id)
          ? { pinned: prev.pinned.filter((item) => item !== id) }
          : { pinned: [...prev.pinned, id] },
      );
    },
    [setPersisted],
  );

  const reorderPinned = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;
      setPersisted((prev) => {
        if (
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= prev.pinned.length ||
          toIndex >= prev.pinned.length
        ) {
          return prev;
        }
        return { pinned: move(prev.pinned, fromIndex, toIndex) };
      });
    },
    [setPersisted],
  );

  const movePinnedByOffset = useCallback(
    (id: string, offset: number) => {
      if (!offset) return;
      setPersisted((prev) => {
        const index = prev.pinned.indexOf(id);
        if (index === -1) return prev;
        let nextIndex = index + offset;
        if (nextIndex < 0) nextIndex = 0;
        if (nextIndex >= prev.pinned.length) nextIndex = prev.pinned.length - 1;
        return { pinned: move(prev.pinned, index, nextIndex) };
      });
    },
    [setPersisted],
  );

  const setRunningApps = useCallback((ids: string[]) => {
    setRunning((prev) => {
      const next = unique(ids);
      if (prev.length === next.length && prev.every((value, index) => value === next[index])) {
        return prev;
      }
      return next;
    });
  }, []);

  const isPinned = useCallback(
    (id: string) => persisted.pinned.includes(id),
    [persisted.pinned],
  );

  const visibleRunning = useMemo(
    () => running.filter((id) => !persisted.pinned.includes(id)),
    [running, persisted.pinned],
  );

  return {
    pinned: persisted.pinned,
    running: visibleRunning,
    pinApp,
    unpinApp,
    togglePin,
    reorderPinned,
    movePinnedByOffset,
    setRunningApps,
    isPinned,
  };
}
