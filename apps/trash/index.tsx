'use client';

import { useState, useEffect, useCallback } from 'react';
import useTrashState from './state';
import HistoryList from './components/HistoryList';
import type { TrashItem } from './state';

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

  const restore = useCallback(() => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Restore ${item.title}?`)) return;
    openApp(item.id);
    setItems(items => items.filter((_, i) => i !== selected));
    setSelected(null);
  }, [items, selected, openApp, setItems]);

  const remove = useCallback(() => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Delete ${item.title}?`)) return;
    const next = items.filter((_, i) => i !== selected);
    setItems(next);
    pushHistory(item);
    setSelected(null);
  }, [items, selected, setItems, pushHistory]);

  const restoreAll = () => {
    if (items.length === 0) return;
    if (!window.confirm('Restore all windows?')) return;
    items.forEach(item => openApp(item.id));
    setItems([]);
    setSelected(null);
  };

  const empty = () => {
    if (items.length === 0) return;
    if (!window.confirm('Empty trash?')) return;
    pushHistory(items);
    setItems([]);
    setSelected(null);
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

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="flex items-center justify-between w-full bg-ub-warm-grey bg-opacity-40 text-sm">
        <span className="font-bold ml-2">Trash</span>
        <div className="flex">
          <button
            onClick={restore}
            disabled={selected === null}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Restore
          </button>
          <button
            onClick={restoreAll}
            disabled={items.length === 0}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Restore All
          </button>
          <button
            onClick={remove}
            disabled={selected === null}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Delete
          </button>
          <button
            onClick={empty}
            disabled={items.length === 0}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Empty
          </button>
        </div>
      </div>
      <div className="flex flex-wrap content-start p-2 overflow-auto flex-1">
        {items.length === 0 && <div className="w-full text-center mt-10">Trash is empty</div>}
        {items.map((item, idx) => (
          <div
            key={item.closedAt}
            tabIndex={0}
            onClick={() => setSelected(idx)}
            className={`m-2 border p-1 w-32 cursor-pointer ${selected === idx ? 'bg-ub-drk-abrgn' : ''}`}
          >
            {item.image ? (
              <img src={item.image} alt={item.title} className="h-20 w-full object-cover" />
            ) : item.icon ? (
              <img src={item.icon} alt={item.title} className="h-20 w-20 mx-auto object-contain" />
            ) : null}
            <p className="text-center text-xs truncate mt-1" title={item.title}>
              {item.title}
            </p>
          </div>
        ))}
      </div>
      <HistoryList history={history} onRestore={restoreFromHistory} onRestoreAll={restoreAllFromHistory} />
    </div>
  );
}
