"use client";

import { useEffect, useCallback, useMemo } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export interface TrashItem {
  id: string;
  title: string;
  icon?: string;
  image?: string;
  closedAt: number;
  originalPath?: string;
}

const ITEMS_KEY = 'window-trash';
const HISTORY_KEY = 'window-trash-history';
const HISTORY_LIMIT = 20;

export default function useTrashState() {
  const [items, setItems] = usePersistentState<TrashItem[]>(ITEMS_KEY, []);
  const [history, setHistory] = usePersistentState<TrashItem[]>(HISTORY_KEY, []);

  useEffect(() => {
    const purgeDays = parseInt(
      window.localStorage.getItem('trash-purge-days') || '30',
      10,
    );
    const ms = purgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    setItems(prev => prev.filter(item => now - item.closedAt <= ms));
  }, [setItems]);

  const notifyChange = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('trash-change'));
  }, []);

  const pushHistory = useCallback(
    (item: TrashItem | TrashItem[]) => {
      setHistory(prev => {
        const arr = Array.isArray(item) ? item : [item];
        const next = [...arr, ...prev];
        return next.slice(0, HISTORY_LIMIT);
      });
    },
    [setHistory],
  );

  const restoreItem = useCallback(
    (index: number): TrashItem | undefined => {
      const target = items[index];
      if (!target) return undefined;
      setItems(prev => prev.filter((_, i) => i !== index));
      notifyChange();
      return target;
    },
    [items, setItems, notifyChange],
  );

  const removeItem = useCallback(
    (index: number): TrashItem | undefined => {
      const target = items[index];
      if (!target) return undefined;
      setItems(prev => prev.filter((_, i) => i !== index));
      pushHistory(target);
      notifyChange();
      return target;
    },
    [items, setItems, pushHistory, notifyChange],
  );

  const purgeItem = useCallback(
    (index: number): boolean => {
      if (index < 0 || index >= items.length) return false;
      setItems(prev => prev.filter((_, i) => i !== index));
      notifyChange();
      return true;
    },
    [items, setItems, notifyChange],
  );

  const restoreAllItems = useCallback((): TrashItem[] => {
    if (!items.length) return [];
    const snapshot = [...items];
    setItems([]);
    notifyChange();
    return snapshot;
  }, [items, setItems, notifyChange]);

  const emptyTrash = useCallback((): TrashItem[] => {
    if (!items.length) return [];
    const snapshot = [...items];
    setItems([]);
    pushHistory(snapshot);
    notifyChange();
    return snapshot;
  }, [items, setItems, pushHistory, notifyChange]);

  const resolveNameConflict = (
    restored: TrashItem,
    items: TrashItem[],
  ): { resolved: boolean; items: TrashItem[] } => {
    if (items.some(item => item.title === restored.title)) {
      const replace = window.confirm(
        `${restored.title} already exists. Click OK to replace or Cancel to rename.`,
      );
      if (replace) {
        const filtered = items.filter(item => item.title !== restored.title);
        return { resolved: true, items: [...filtered, restored] };
      }
      const newName = window.prompt('Enter new name', restored.title);
      if (newName && newName.trim()) {
        return {
          resolved: true,
          items: [...items, { ...restored, title: newName.trim() }],
        };
      }
      return { resolved: false, items };
    }
    return { resolved: true, items: [...items, restored] };
  };

  const restoreFromHistory = useCallback(
    (index: number) => {
      setHistory(prev => {
        const next = [...prev];
        const [restored] = next.splice(index, 1);
        if (restored) {
          let didRestore = false;
          setItems(items => {
            const result = resolveNameConflict(restored, items);
            didRestore = result.resolved;
            return result.items;
          });
          if (!didRestore) {
            next.splice(index, 0, restored);
          }
        }
        return next;
      });
    },
    [setHistory, setItems],
  );

  const restoreAllFromHistory = useCallback(() => {
    setHistory(prev => {
      if (!prev.length) return prev;
      const remaining: TrashItem[] = [];
      setItems(items => {
        let nextItems = [...items];
        prev.forEach(restored => {
          const result = resolveNameConflict(restored, nextItems);
          if (result.resolved) {
            nextItems = result.items;
          } else {
            remaining.push(restored);
          }
        });
        return nextItems;
      });
      return remaining;
    });
  }, [setHistory, setItems]);

  const state = useMemo(
    () => ({
      items,
      setItems,
      history,
      pushHistory,
      restoreFromHistory,
      restoreAllFromHistory,
      restoreItem,
      removeItem,
      purgeItem,
      restoreAllItems,
      emptyTrash,
    }),
    [
      items,
      setItems,
      history,
      pushHistory,
      restoreFromHistory,
      restoreAllFromHistory,
      restoreItem,
      removeItem,
      purgeItem,
      restoreAllItems,
      emptyTrash,
    ],
  );

  return state;
}

