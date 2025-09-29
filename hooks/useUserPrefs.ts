"use client";

import { useCallback, useMemo } from 'react';
import usePersistentState from './usePersistentState';

export interface UserPrefs {
  dockPinnedOrder: string[];
}

const USER_PREFS_KEY = 'user-preferences';

const defaultPrefs: UserPrefs = {
  dockPinnedOrder: [],
};

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

const isUserPrefs = (value: unknown): value is UserPrefs => {
  if (!value || typeof value !== 'object') return false;
  const prefs = value as Partial<UserPrefs>;
  return isStringArray(prefs.dockPinnedOrder);
};

const readLegacyPinnedApps = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = window.localStorage.getItem('pinnedApps');
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (isStringArray(parsed)) {
      return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return [];
};

const uniqueOrder = (order: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  order.forEach((id) => {
    if (typeof id !== 'string') return;
    if (seen.has(id)) return;
    seen.add(id);
    result.push(id);
  });
  return result;
};

const persistLegacyPinnedApps = (order: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem('pinnedApps', JSON.stringify(order));
  } catch {
    // ignore write errors
  }
};

export default function useUserPrefs() {
  const [prefs, setPrefs] = usePersistentState<UserPrefs>(
    USER_PREFS_KEY,
    () => {
      const legacy = uniqueOrder(readLegacyPinnedApps());
      if (legacy.length > 0) {
        return { dockPinnedOrder: legacy };
      }
      return defaultPrefs;
    },
    isUserPrefs,
  );

  const dockPinnedOrder = prefs.dockPinnedOrder;

  const setDockPinnedOrder = useCallback(
    (next: string[] | ((current: string[]) => string[])) => {
      setPrefs((previous) => {
        const currentOrder = previous.dockPinnedOrder ?? [];
        const proposed =
          typeof next === 'function' ? next(currentOrder) : next;
        const normalized = uniqueOrder(proposed ?? []);
        const isSame =
          normalized.length === currentOrder.length &&
          normalized.every((id, index) => id === currentOrder[index]);
        if (isSame) {
          return previous;
        }
        persistLegacyPinnedApps(normalized);
        return {
          ...previous,
          dockPinnedOrder: normalized,
        };
      });
    },
    [setPrefs],
  );

  const ensureDockPinnedApps = useCallback(
    (appIds: string[]) => {
      if (!Array.isArray(appIds) || appIds.length === 0) return;
      setDockPinnedOrder((current) => {
        if (!current || current.length === 0) {
          return uniqueOrder(appIds);
        }
        const merged = uniqueOrder([...current, ...appIds]);
        return merged;
      });
    },
    [setDockPinnedOrder],
  );

  const value = useMemo(
    () => ({
      prefs,
      dockPinnedOrder,
      setDockPinnedOrder,
      ensureDockPinnedApps,
    }),
    [prefs, dockPinnedOrder, setDockPinnedOrder, ensureDockPinnedApps],
  );

  return value;
}
