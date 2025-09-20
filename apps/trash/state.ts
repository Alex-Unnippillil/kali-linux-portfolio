import { useEffect, useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import {
  TRASH_KEY,
  HISTORY_KEY,
  HISTORY_LIMIT,
  TrashItem,
  TrashHistoryEntry,
  createHistoryEntry,
  pushHistoryEntry,
  purgeExpired,
  isTrashItemArray,
  isTrashHistoryArray,
  loadTrashItems,
  loadHistory,
} from '../../utils/files/trash';

export type { TrashItem, TrashHistoryEntry } from '../../utils/files/trash';

export default function useTrashState() {
  const [items, setItems] = usePersistentState<TrashItem[]>(
    TRASH_KEY,
    () => loadTrashItems(),
    isTrashItemArray,
  );
  const [history, setHistory] = usePersistentState<TrashHistoryEntry[]>(
    HISTORY_KEY,
    () => loadHistory(),
    isTrashHistoryArray,
  );

  useEffect(() => {
    setItems(prev => {
      const filtered = purgeExpired(prev);
      if (filtered.length === prev.length) return prev;
      return filtered;
    });
  }, [setItems]);

  const pushHistory = useCallback(
    (
      item: TrashItem | TrashItem[],
      action: TrashHistoryEntry['action'] = 'delete',
    ) => {
      setHistory(prev =>
        pushHistoryEntry(
          prev,
          createHistoryEntry(
            Array.isArray(item) ? item : [item],
            action,
          ),
        ),
      );
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
        const entry = prev[index];
        if (!entry) return prev;
        let remaining: TrashItem[] = [];
        setItems(items => {
          let nextItems = [...items];
          entry.items.forEach(restored => {
            const result = resolveNameConflict(restored, nextItems);
            nextItems = result.items;
            if (!result.resolved) {
              remaining.push(restored);
            }
          });
          return nextItems;
        });
        const next = [...prev];
        if (remaining.length) {
          next[index] = { ...entry, items: remaining };
        } else {
          next.splice(index, 1);
        }
        return next;
      });
    },
    [setHistory, setItems],
  );

  const restoreAllFromHistory = useCallback(() => {
    setHistory(prev => {
      if (!prev.length) return prev;
      const survivors: TrashHistoryEntry[] = [];
      setItems(items => {
        let nextItems = [...items];
        prev.forEach(entry => {
          const remaining: TrashItem[] = [];
          entry.items.forEach(restored => {
            const result = resolveNameConflict(restored, nextItems);
            nextItems = result.items;
            if (!result.resolved) {
              remaining.push(restored);
            }
          });
          if (remaining.length) {
            survivors.push({ ...entry, items: remaining });
          }
        });
        return nextItems;
      });
      return survivors;
    });
  }, [setHistory, setItems]);

  return {
    items,
    setItems,
    history,
    pushHistory,
    restoreFromHistory,
    restoreAllFromHistory,
  };
}

