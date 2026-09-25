'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const baseActionButton =
    'px-3 py-1.5 rounded-md text-sm font-semibold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] disabled:opacity-45 disabled:cursor-not-allowed';
  const subtleActionButton =
    'px-3 py-1.5 rounded-md border border-[color:var(--kali-panel-border)] bg-[color:var(--kali-panel-highlight)] text-sm font-semibold text-[color:var(--color-text)] transition-all hover:bg-[color:color-mix(in_srgb,var(--kali-panel-highlight)_82%,transparent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-focus focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-panel)] disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-[color:var(--kali-panel-highlight)]';

  return (
    <div className="w-full h-full flex flex-col bg-[color:var(--kali-panel)] text-[color:var(--color-text)] select-none">
      <div className="flex flex-wrap items-center justify-between gap-3 w-full bg-ub-warm-grey/40 px-3 py-2 text-sm">
        <span className="font-bold text-base">Trash</span>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={restore}
              disabled={selected === null}
              className={`${baseActionButton} bg-[color:var(--color-accent)] text-[color:var(--color-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-accent)_85%,white_15%)] disabled:hover:bg-[color:var(--color-accent)]`}
            >
              Restore
            </button>
            <button
              onClick={remove}
              disabled={selected === null}
              className={`${baseActionButton} bg-[color:var(--color-severity-high)] text-[color:var(--color-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-severity-high)_85%,white_15%)] disabled:hover:bg-[color:var(--color-severity-high)]`}
            >
              Delete
            </button>
            <button
              onClick={purge}
              disabled={selected === null}
              className={`${baseActionButton} bg-[color:var(--color-severity-critical)] text-[color:var(--color-bg)] hover:bg-[color:color-mix(in_srgb,var(--color-severity-critical)_85%,white_15%)] disabled:hover:bg-[color:var(--color-severity-critical)]`}
            >
              Purge
            </button>
          </div>
          <button
            onClick={restoreAll}
            disabled={items.length === 0}
            className={`${subtleActionButton} whitespace-nowrap`}
          >
            Restore All
          </button>
          <button
            onClick={empty}
            disabled={items.length === 0 || emptyCountdown !== null}
            className={`${subtleActionButton} whitespace-nowrap`}
          >
            {emptyCountdown !== null ? `Emptying in ${emptyCountdown}` : 'Empty'}
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <div className="flex flex-col items-center justify-center mt-12 space-y-1.5">
          <img
            src={items.length ? FULL_ICON : EMPTY_ICON}
            alt={items.length ? 'Full trash' : 'Empty trash'}
            className="h-16 w-16 opacity-60"
          />
          {items.length === 0 && <span>Trash is empty</span>}
        </div>
        {items.length > 0 && (
          <ul className="mt-6 space-y-2 px-3" role="listbox" aria-label="Windows in trash">
            {items.map((item, idx) => {
              const remainingDays = daysLeft(item.closedAt);
              return (
              <li
                key={item.closedAt}
                tabIndex={0}
                onClick={() => setSelected(idx)}
                onFocus={() => setSelected(idx)}
                role="option"
                aria-selected={selected === idx}
                className={`flex items-center gap-3 px-3 py-2 rounded-md border border-transparent transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
                  selected === idx
                    ? 'bg-ub-drk-abrgn/80 border-ub-drk-abrgn'
                    : 'bg-black/20 hover:bg-black/30'
                }`}
              >
                <img
                  src={item.icon || DEFAULT_ICON}
                  alt=""
                  className="h-6 w-6 shrink-0"
                />
                <span className="truncate font-mono text-sm" title={item.title}>
                  {item.title}
                </span>
                <span
                  className="ml-auto text-xs font-medium text-ub-orange whitespace-nowrap"
                  aria-label={`Purges in ${remainingDays} day${
                    remainingDays === 1 ? '' : 's'
                  }`}
                >
                  {`${remainingDays} day${remainingDays === 1 ? '' : 's'} left`}
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
