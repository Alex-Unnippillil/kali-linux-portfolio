import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { hasStorage } from '../../../utils/env';
import type {
  CommandPaletteAction,
  CommandPaletteStoredAction,
} from './types';

export const COMMAND_PALETTE_RECENTS_KEY = 'desktop:commandPalette:recents';

type CommandPaletteContextValue = {
  actions: CommandPaletteStoredAction[];
  registerActions: (actions: CommandPaletteAction[]) => void;
  unregisterActions: (ids: string[]) => void;
  invokeAction: (id: string) => Promise<void>;
};

type RecentsMap = Record<string, number>;

const CommandPaletteContext = createContext<CommandPaletteContextValue | undefined>(
  undefined,
);

const loadRecents = (): RecentsMap => {
  if (typeof window === 'undefined' || !hasStorage) return {};
  try {
    const raw = window.localStorage.getItem(COMMAND_PALETTE_RECENTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.entries(parsed as Record<string, unknown>).reduce<RecentsMap>(
      (acc, [id, value]) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          acc[id] = value;
        }
        return acc;
      },
      {},
    );
  } catch (err) {
    console.warn('[CommandPalette] Failed to parse recents from storage', err);
    return {};
  }
};

const persistRecents = (recents: RecentsMap) => {
  if (typeof window === 'undefined' || !hasStorage) return;
  const keys = Object.keys(recents);
  if (!keys.length) {
    window.localStorage.removeItem(COMMAND_PALETTE_RECENTS_KEY);
    return;
  }
  try {
    window.localStorage.setItem(
      COMMAND_PALETTE_RECENTS_KEY,
      JSON.stringify(recents),
    );
  } catch (err) {
    console.warn('[CommandPalette] Failed to persist recents', err);
  }
};

export const CommandPaletteProvider = ({ children }: { children: ReactNode }) => {
  const [registry, setRegistryState] = useState<Map<string, CommandPaletteStoredAction>>(
    () => new Map(),
  );
  const registryRef = useRef(registry);
  const recentsRef = useRef<RecentsMap>(loadRecents());

  const setRegistry = useCallback(
    (updater: (prev: Map<string, CommandPaletteStoredAction>) => Map<string, CommandPaletteStoredAction>) => {
      setRegistryState((prev) => {
        const next = updater(prev);
        registryRef.current = next;
        return next;
      });
    },
    [],
  );

  const updateRecents = useCallback((updater: (prev: RecentsMap) => RecentsMap) => {
    const next = updater(recentsRef.current);
    if (next === recentsRef.current) return;
    recentsRef.current = next;
    persistRecents(next);
  }, []);

  const registerActions = useCallback(
    (actions: CommandPaletteAction[]) => {
      if (!actions.length) return;
      setRegistry((prev) => {
        let changed = false;
        const next = new Map(prev);
        const now = Date.now();
        actions.forEach((action) => {
          const lastInvoked = recentsRef.current[action.id];
          const existing = next.get(action.id);
          if (
            existing &&
            existing.label === action.label &&
            existing.handler === action.handler &&
            existing.appId === action.appId &&
            existing.lastInvoked === lastInvoked
          ) {
            return;
          }
          changed = true;
          next.set(action.id, {
            ...action,
            lastInvoked,
            registeredAt: existing?.registeredAt ?? now,
          });
        });
        return changed ? next : prev;
      });
    },
    [setRegistry],
  );

  const unregisterActions = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      setRegistry((prev) => {
        let changed = false;
        const next = new Map(prev);
        ids.forEach((id) => {
          if (next.delete(id)) changed = true;
        });
        return changed ? next : prev;
      });
      updateRecents((prev) => {
        let changed = false;
        const next = { ...prev };
        ids.forEach((id) => {
          if (id in next) {
            changed = true;
            delete next[id];
          }
        });
        return changed ? next : prev;
      });
    },
    [setRegistry, updateRecents],
  );

  const invokeAction = useCallback(
    async (id: string) => {
      const action = registryRef.current.get(id);
      if (!action) return;
      await action.handler();
      const timestamp = Date.now();
      updateRecents((prev) => ({
        ...prev,
        [id]: timestamp,
      }));
      setRegistry((prev) => {
        const current = prev.get(id);
        if (!current || current.lastInvoked === timestamp) {
          return prev;
        }
        const next = new Map(prev);
        next.set(id, {
          ...current,
          lastInvoked: timestamp,
        });
        return next;
      });
    },
    [setRegistry, updateRecents],
  );

  const actions = useMemo(() => {
    const list = Array.from(registry.values());
    list.sort((a, b) => {
      const aTime = a.lastInvoked ?? 0;
      const bTime = b.lastInvoked ?? 0;
      if (aTime && bTime) {
        return bTime - aTime;
      }
      if (aTime) return -1;
      if (bTime) return 1;
      return a.label.localeCompare(b.label);
    });
    return list;
  }, [registry]);

  const value = useMemo<CommandPaletteContextValue>(
    () => ({ actions, registerActions, unregisterActions, invokeAction }),
    [actions, registerActions, unregisterActions, invokeAction],
  );

  return (
    <CommandPaletteContext.Provider value={value}>
      {children}
    </CommandPaletteContext.Provider>
  );
};

export const useCommandPalette = () => {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider');
  }
  return context;
};
