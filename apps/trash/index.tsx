'use client';

import { useState, useEffect, useCallback } from 'react';
import useTrashState from './state';
import HistoryList from './components/HistoryList';
import type { TrashItem } from './state';

const DEFAULT_ICON = './themes/Yaru/system/folder.png';

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

  const restoreAll = () => {
    if (items.length === 0) return;
    if (!window.confirm('Restore all windows?')) return;
    items.forEach(item => openApp(item.id));
    setItems([]);
    setSelected(null);
    notifyChange();
  };

  const empty = () => {
    if (items.length === 0) return;
    if (!window.confirm('Empty trash?')) return;
    pushHistory(items);
    setItems([]);
    setSelected(null);
    notifyChange();
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
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="flex items-center justify-between w-full bg-ub-warm-grey bg-opacity-40 text-sm">
        <span className="font-bold ml-2">Trash</span>
        <div className="flex items-center">
          <div className="flex space-x-3 mr-2">
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
              className="px-3 py-1 my-1 rounded bg-red-600 text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-50"
            >
              Delete
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
            disabled={items.length === 0}
            className="border border-black bg-black bg-opacity-50 px-3 py-1 my-1 mx-1 rounded hover:bg-opacity-80 focus:outline-none focus:ring-2 focus:ring-ub-orange disabled:opacity-50"
          >
            Empty
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-12 space-y-1.5">
            <img
              src="./themes/Yaru/status/user-trash-symbolic.svg"
              alt="Empty trash"
              className="h-12 w-12 opacity-60"
            />
            <span>Trash is empty</span>
          </div>
        ) : (
          <ul className="p-2 space-y-1.5">
            {items.map((item, idx) => (
              <li
                key={item.closedAt}
                tabIndex={0}
                onClick={() => setSelected(idx)}
                className={`flex items-center p-1 cursor-pointer ${selected === idx ? 'bg-ub-drk-abrgn' : ''}`}
              >
                <img
                  src={item.icon || DEFAULT_ICON}
                  alt=""
                  className="h-6 w-6 mr-2"
                />
                <span className="truncate" title={item.title}>
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <HistoryList history={history} onRestore={handleRestoreFromHistory} onRestoreAll={handleRestoreAllFromHistory} />
    </div>
  );
}
