import { useEffect, useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

export interface TrashItem {
  id: string;
  title: string;
  icon?: string;
  image?: string;
  closedAt: number;
}

const ITEMS_KEY = 'window-trash';
const HISTORY_KEY = 'window-trash-history';
const HISTORY_LIMIT = 20;

export default function useTrashState() {
  const [items, setItems] = usePersistentState<TrashItem[]>(ITEMS_KEY, []);
  const [history, setHistory] = usePersistentState<TrashItem[]>(HISTORY_KEY, []);
  const emitChange = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('trash-change'));
    }
  }, []);

  useEffect(() => {
    const purgeDays = parseInt(
      window.localStorage.getItem('trash-purge-days') || '30',
      10,
    );
    const ms = purgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    setItems(prev => {
      const filtered = prev.filter(item => now - item.closedAt <= ms);
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [setItems]);

  useEffect(() => {
    emitChange();
  }, [items, emitChange]);

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

  return { items, setItems, history, pushHistory, restoreFromHistory, restoreAllFromHistory };
}

