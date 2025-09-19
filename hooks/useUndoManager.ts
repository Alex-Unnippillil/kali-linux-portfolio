import { useMemo, useSyncExternalStore } from 'react';
import logger from '../utils/logger';
import { JournalEntry, JournalEvent, subscribeToJournal } from '../utils/journal';

export type UndoStackEntry = {
  id: string;
  appId: string | null;
  undo: JournalEntry['undo'];
  redo?: JournalEntry['redo'];
  description?: string;
  metadata?: JournalEntry['metadata'];
  timestamp: number;
};

interface UndoState {
  global: UndoStackEntry[];
  apps: Record<string, UndoStackEntry[]>;
}

export type UndoManagerSnapshot = {
  global: ReadonlyArray<UndoStackEntry>;
  apps: Readonly<Record<string, ReadonlyArray<UndoStackEntry>>>;
};

type Listener = () => void;

type UndoResult = boolean;

const listeners = new Set<Listener>();
let state: UndoState = { global: [], apps: {} };
let snapshot: UndoManagerSnapshot = createSnapshot(state);
let idCounter = 0;

function createSnapshot(value: UndoState): UndoManagerSnapshot {
  const appsEntries = Object.entries(value.apps).reduce<
    Record<string, ReadonlyArray<UndoStackEntry>>
  >((acc, [key, stack]) => {
    acc[key] = Object.freeze([...stack]);
    return acc;
  }, {});

  return {
    global: Object.freeze([...value.global]),
    apps: Object.freeze(appsEntries),
  };
}

function notify() {
  listeners.forEach((listener) => listener());
}

function setState(updater: (prev: UndoState) => UndoState) {
  const next = updater(state);
  if (next.global === state.global && next.apps === state.apps) {
    return;
  }
  state = next;
  snapshot = createSnapshot(state);
  notify();
}

const recordEntry = (entry: JournalEntry) => {
  const undoEntry: UndoStackEntry = {
    id: `undo-${Date.now()}-${++idCounter}`,
    appId: entry.appId ?? null,
    undo: entry.undo,
    redo: entry.redo,
    description: entry.description,
    metadata: entry.metadata,
    timestamp: Date.now(),
  };

  setState((prev) => {
    const global = [...prev.global, undoEntry];
    if (!undoEntry.appId) {
      return { global, apps: prev.apps };
    }

    const current = prev.apps[undoEntry.appId] ?? [];
    return {
      global,
      apps: {
        ...prev.apps,
        [undoEntry.appId]: [...current, undoEntry],
      },
    };
  });
};

const clearAppEntries = (appId: string) => {
  setState((prev) => {
    const stack = prev.apps[appId];
    if (!stack?.length) return prev;

    const ids = new Set(stack.map((item) => item.id));
    const global = prev.global.filter((item) => !ids.has(item.id));
    const apps = { ...prev.apps };
    delete apps[appId];

    return { global, apps };
  });
};

const clearGlobalOnly = () => {
  setState((prev) => {
    const global = prev.global.filter((item) => item.appId !== null);
    if (global.length === prev.global.length) return prev;
    return { global, apps: prev.apps };
  });
};

const clearAllEntries = () => {
  setState((prev) => {
    if (!prev.global.length && !Object.keys(prev.apps).length) {
      return prev;
    }
    return { global: [], apps: {} };
  });
};

const removeEntry = (entry: UndoStackEntry) => {
  setState((prev) => {
    let changed = false;
    const global = prev.global.filter((item) => {
      if (item.id === entry.id) {
        changed = true;
        return false;
      }
      return true;
    });

    let apps = prev.apps;
    if (entry.appId) {
      const stack = prev.apps[entry.appId];
      if (stack) {
        const filtered = stack.filter((item) => item.id !== entry.id);
        if (filtered.length !== stack.length) {
          apps = { ...prev.apps };
          if (filtered.length) {
            apps[entry.appId] = filtered;
          } else {
            delete apps[entry.appId];
          }
          changed = true;
        }
      }
    }

    if (!changed) return prev;
    return { global, apps };
  });
};

const runUndo = (entry: UndoStackEntry) => {
  try {
    const result = entry.undo();
    if (result && typeof (result as Promise<void>).then === 'function') {
      (result as Promise<void>).catch((error) => {
        logger.error('Undo handler rejected', error);
      });
    }
  } catch (error) {
    logger.error('Undo handler threw', error);
  }
};

const undoApp = (appId: string): UndoResult => {
  const stack = state.apps[appId];
  if (!stack?.length) return false;
  const entry = stack[stack.length - 1];
  removeEntry(entry);
  runUndo(entry);
  return true;
};

const undoGlobal = (): UndoResult => {
  const entry = state.global[state.global.length - 1];
  if (!entry) return false;
  removeEntry(entry);
  runUndo(entry);
  return true;
};

const clearApp = (appId: string): void => {
  clearAppEntries(appId);
};

const clearAll = (): void => {
  clearAllEntries();
};

const getSnapshot = (): UndoManagerSnapshot => snapshot;

const subscribe = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const handleJournalEvent = (event: JournalEvent) => {
  if (event.type === 'record') {
    recordEntry(event.entry);
  } else if (event.type === 'clear') {
    if (event.appId === undefined) {
      clearAllEntries();
    } else if (event.appId === null) {
      clearGlobalOnly();
    } else {
      clearAppEntries(event.appId);
    }
  } else if (event.type === 'reset') {
    clearAllEntries();
  }
};

subscribeToJournal(handleJournalEvent);

export const undoManager = {
  subscribe,
  getSnapshot,
  undoApp,
  undoGlobal,
  clearApp,
  clearAll,
  record: recordEntry,
};

export interface UseUndoManagerValue extends UndoManagerSnapshot {
  undoApp: typeof undoApp;
  undoGlobal: typeof undoGlobal;
  clearApp: typeof clearApp;
  clearAll: typeof clearAll;
}

export default function useUndoManager(): UseUndoManagerValue {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return useMemo(
    () => ({
      global: snap.global,
      apps: snap.apps,
      undoApp,
      undoGlobal,
      clearApp,
      clearAll,
    }),
    [snap],
  );
}
