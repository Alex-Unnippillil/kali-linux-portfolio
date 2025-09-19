'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import useTrashState from './state';
import HistoryList from './components/HistoryList';

const DEFAULT_ICON = '/themes/Yaru/system/folder.png';
const EMPTY_ICON = '/themes/Yaru/status/user-trash-symbolic.svg';
const FULL_ICON = '/themes/Yaru/status/user-trash-full-symbolic.svg';

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
  const [filter, setFilter] = useState<'all' | 'expiring'>('all');
  const [purgeDays, setPurgeDays] = useState(30);
  const [emptyCountdown, setEmptyCountdown] = useState<number | null>(null);
  const [, setTick] = useState(0);
  const daysLeft = useCallback(
    (closedAt: number) =>
      Math.max(
        purgeDays -
          Math.floor((Date.now() - closedAt) / (24 * 60 * 60 * 1000)),
        0,
      ),
    [purgeDays],
  );

  useEffect(() => {
    const pd = parseInt(
      window.localStorage.getItem('trash-purge-days') || '30',
      10,
    );
    setPurgeDays(pd);
    const id = setInterval(() => setTick(t => t + 1), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('trash-filter');
      if (stored) {
        setFilter(stored === 'expiring' ? 'expiring' : 'all');
        sessionStorage.removeItem('trash-filter');
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const notifyChange = () => window.dispatchEvent(new Event('trash-change'));

  const restore = useCallback(() => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Restore ${item.title}?`)) return;
    openApp(item.id);
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
    pushHistory(item);
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
    items.forEach(item => openApp(item.id));
    setItems([]);
    setSelected(null);
    notifyChange();
  };

  const empty = () => {
    if (items.length === 0 || emptyCountdown !== null) return;
    if (!window.confirm('Empty trash?')) return;
    let count = 3;
    setEmptyCountdown(count);
    const timer = setInterval(() => {
      count -= 1;
      if (count <= 0) {
        clearInterval(timer);
        pushHistory(items);
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

  const visibleItems = useMemo(
    () => {
      const entries = items.map((item, index) => ({ item, index }));
      if (filter !== 'expiring') return entries;
      const threshold = Math.min(purgeDays, 7);
      return entries.filter(({ item }) => daysLeft(item.closedAt) <= threshold);
    },
    [items, filter, purgeDays, daysLeft],
  );

  useEffect(() => {
    if (selected === null) return;
    if (!visibleItems.some(entry => entry.index === selected)) {
      setSelected(null);
    }
  }, [selected, visibleItems]);

  const hasItems = items.length > 0;
  const hasVisibleItems = visibleItems.length > 0;

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="flex items-center justify-between w-full bg-ub-warm-grey bg-opacity-40 text-sm">
        <span className="font-bold ml-2">Trash</span>
        <div className="flex items-center">
          <div className="flex mr-2">
            <button
              onClick={restore}
              disabled={selected === null}
              className="px-3 py-1 my-1 rounded bg-blue-600 text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
            >
              Restore
            </button>
            <button
              onClick={remove}
              disabled={selected === null}
              className="px-3 py-1 my-1 ml-3 rounded bg-red-600 text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
            >
              Delete
            </button>
            <button
              onClick={purge}
              disabled={selected === null}
              className="px-3 py-1 my-1 ml-3 rounded bg-yellow-600 text-white hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
            >
              Purge
            </button>
          </div>
          <button
            onClick={restoreAll}
            disabled={items.length === 0}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Restore All
          </button>
          <button
            onClick={empty}
            disabled={items.length === 0 || emptyCountdown !== null}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            {emptyCountdown !== null ? `Emptying in ${emptyCountdown}` : 'Empty'}
          </button>
        </div>
      </div>
      {filter === 'expiring' && (
        <div className="flex items-center justify-between bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
          <span>Showing items that purge within 7 days.</span>
          <button
            type="button"
            onClick={() => setFilter('all')}
            className="rounded border border-yellow-300/40 px-2 py-1 text-yellow-100 transition hover:bg-yellow-500/20 hover:text-yellow-50 focus:outline-none focus:ring-2 focus:ring-yellow-300/60"
          >
            Show all
          </button>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col items-center justify-center mt-12 space-y-1.5">
          <img
            src={items.length ? FULL_ICON : EMPTY_ICON}
            alt={items.length ? 'Full trash' : 'Empty trash'}
            className="h-16 w-16 opacity-60"
          />
          {!hasItems && <span>Trash is empty</span>}
          {hasItems && filter === 'expiring' && !hasVisibleItems && (
            <span>No items expiring soon.</span>
          )}
        </div>
        {hasVisibleItems && (
          <ul className="p-2 space-y-1.5 mt-4">
            {visibleItems.map(({ item, index }) => {
              const days = daysLeft(item.closedAt);
              return (
                <li
                  key={item.closedAt}
                  tabIndex={0}
                  onClick={() => setSelected(index)}
                  className={`flex items-center h-9 px-1 cursor-pointer ${selected === index ? 'bg-ub-drk-abrgn' : ''}`}
                >
                  <img
                    src={item.icon || DEFAULT_ICON}
                    alt=""
                    className="h-4 w-4 mr-2"
                  />
                  <span className="truncate font-mono" title={item.title}>
                    {item.title}
                  </span>
                  <span
                    className="ml-auto text-xs opacity-70"
                    aria-label={`Purges in ${days} day${days === 1 ? '' : 's'}`}
                  >
                    {`${days} day${days === 1 ? '' : 's'} left`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <HistoryList history={history} onRestore={handleRestoreFromHistory} onRestoreAll={handleRestoreAllFromHistory} />
    </div>
  );
}
