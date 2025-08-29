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

  useEffect(() => {
    const purgeDays = parseInt(
      window.localStorage.getItem('trash-purge-days') || '30',
      10,
    );
    const ms = purgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    setItems(prev => prev.filter(item => now - item.closedAt <= ms));
  }, [setItems]);

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

  const restoreFromHistory = useCallback(
    (index: number) => {
      setHistory(prev => {
        const next = [...prev];
        const [restored] = next.splice(index, 1);
        if (restored) {
          setItems(items => [...items, restored]);
        }
        return next;
      });
    },
    [setHistory, setItems],
  );

  const restoreAllFromHistory = useCallback(() => {
    setHistory(prev => {
      if (prev.length) {
        setItems(items => [...items, ...prev]);
      }
      return [];
    });
  }, [setHistory, setItems]);

  return { items, setItems, history, pushHistory, restoreFromHistory, restoreAllFromHistory };
}

