'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import useTrashState from './state';
import TrashView from '../../components/apps/files/TrashView';
import {
  estimateTotalSize,
  markLargeItems,
  restoreToOriginalLocation,
  formatBytes,
  getRetentionDays,
} from '../../utils/files/trash';

export default function Trash({ openApp }: { openApp: (id: string) => void }) {
  const {
    items,
    setItems,
    history,
    pushHistory,
    restoreFromHistory,
    restoreAllFromHistory,
  } = useTrashState();
  const [selected, setSelected] = useState<number | null>(null);
  const [purgeDays, setPurgeDays] = useState(30);
  const [emptyCountdown, setEmptyCountdown] = useState<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    const refreshRetention = () => setPurgeDays(getRetentionDays());
    refreshRetention();
    const id = setInterval(() => setTick(t => t + 1), 60 * 1000);
    const handleStorage = () => refreshRetention();
    const handleCustom = () => refreshRetention();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('trash-retention-change', handleCustom);
    return () => {
      clearInterval(id);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('trash-retention-change', handleCustom);
    };
  }, []);

  const notifyChange = () => window.dispatchEvent(new Event('trash-change'));

  const restore = useCallback(async () => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Restore ${item.title}?`)) return;
    let restored = await restoreToOriginalLocation(item);
    if (!restored && (!item.metadata?.kind || item.metadata?.kind === 'window')) {
      openApp(item.id);
      restored = true;
    }
    if (!restored) {
      window.alert('Could not restore the item to its original location.');
      return;
    }
    setItems(items => items.filter((_, i) => i !== selected));
    setSelected(null);
    notifyChange();
  }, [items, selected, openApp, setItems]);

  const remove = useCallback(() => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Delete ${item.title}?`)) return;
    const next = items.filter((_, i) => i !== selected);
    setItems(next);
    pushHistory(item, 'delete');
    setSelected(null);
    notifyChange();
  }, [items, selected, setItems, pushHistory]);

  const purge = useCallback(() => {
    if (selected === null) return;
    const item = items[selected];
    if (
      !window.confirm(
        `Permanently delete ${item.title}? This action cannot be undone.`,
      )
    )
      return;
    setItems(items => items.filter((_, i) => i !== selected));
    setSelected(null);
    notifyChange();
  }, [items, selected, setItems]);

  const restoreAll = () => {
    if (items.length === 0) return;
    if (!window.confirm('Restore all windows?')) return;
    (async () => {
      const remaining: typeof items = [];
      for (const item of items) {
        let restored = await restoreToOriginalLocation(item);
        if (!restored && (!item.metadata?.kind || item.metadata?.kind === 'window')) {
          openApp(item.id);
          restored = true;
        }
        if (!restored) remaining.push(item);
      }
      if (remaining.length && remaining.length !== items.length) {
        window.alert(
          `Restored ${items.length - remaining.length} item${
            items.length - remaining.length === 1 ? '' : 's'
          }, but ${remaining.length} failed to restore.`,
        );
      } else if (remaining.length === items.length && remaining.length) {
        window.alert('Could not restore the selected items.');
      }
      setItems(remaining);
      setSelected(null);
      notifyChange();
    })();
  };

  const totalSize = useMemo(() => estimateTotalSize(items), [items]);
  const largeItems = useMemo(() => markLargeItems(items), [items]);

  const empty = () => {
    if (items.length === 0 || emptyCountdown !== null) return;
    const estimateLabel = totalSize ? ` (~${formatBytes(totalSize)})` : '';
    if (!window.confirm(`Empty trash${estimateLabel}?`)) return;
    let count = 3;
    setEmptyCountdown(count);
    const timer = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(timer);
        pushHistory(items, 'empty');
        setItems([]);
        setSelected(null);
        setEmptyCountdown(null);
        notifyChange();
      } else {
        setEmptyCountdown(count);
      }
    }, 1000);
  };

  const handleKey = useCallback((e: KeyboardEvent) => {
    if (selected === null) return;
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      remove();
    } else if (e.key === 'Enter' || e.key.toLowerCase() === 'r') {
      e.preventDefault();
      restore();
    }
  }, [selected, remove, restore]);

  useEffect(() => {
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleKey]);

  const handleRestoreFromHistory = useCallback(
    (idx: number) => {
      restoreFromHistory(idx);
      notifyChange();
    },
    [restoreFromHistory],
  );

  const handleRestoreAllFromHistory = useCallback(() => {
    restoreAllFromHistory();
    notifyChange();
  }, [restoreAllFromHistory]);

  return (
    <TrashView
      items={items}
      history={history}
      selectedIndex={selected}
      onSelect={setSelected}
      onRestore={restore}
      onDelete={remove}
      onPurge={purge}
      onRestoreAll={restoreAll}
      onEmpty={empty}
      emptyCountdown={emptyCountdown}
      purgeDays={purgeDays}
      totalSize={totalSize}
      largeItems={largeItems}
      onRestoreHistory={handleRestoreFromHistory}
      onRestoreHistoryAll={handleRestoreAllFromHistory}
    />
  );
}
