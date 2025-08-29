'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import useTrashState from './state';
import HistoryList from './components/HistoryList';

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
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [date, setDate] = useState('');

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

  const types = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(item => {
      if (!map.has(item.id)) map.set(item.id, item.title);
    });
    return Array.from(map.entries());
  }, [items]);

  const formatDate = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const filtered = useMemo(
    () =>
      items
        .map((item, index) => ({ item, index }))
        .filter(({ item }) =>
          (!type || item.id === type) &&
          (!date || formatDate(item.closedAt) === date) &&
          (search === '' || item.title.toLowerCase().includes(search.toLowerCase())),
        ),
    [items, type, date, search],
  );

  useEffect(() => {
    setSelected(null);
  }, [search, type, date]);

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
      <div className="p-2 flex flex-wrap gap-2 bg-ub-cool-grey">
        <input
          aria-label="Search"
          type="search"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-2 py-1 text-black"
        />
        <select
          aria-label="Type filter"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-2 py-1 text-black"
        >
          <option value="">All Types</option>
          {types.map(([id, title]) => (
            <option key={id} value={id}>
              {title}
            </option>
          ))}
        </select>
        <input
          aria-label="Deletion date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-2 py-1 text-black"
        />
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
        ) : filtered.length === 0 ? (
          <div className="p-2">No items match your filters.</div>
        ) : (
          <ul className="p-2 space-y-1.5">
            {filtered.map(({ item, index }) => (
              <li
                key={item.closedAt}
                tabIndex={0}
                onClick={() => setSelected(index)}
                className={`flex items-center p-1 cursor-pointer ${selected === index ? 'bg-ub-drk-abrgn' : ''}`}
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
