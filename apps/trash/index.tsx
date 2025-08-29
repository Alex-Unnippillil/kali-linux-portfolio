'use client';

import { useState, useEffect, useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import ConfirmBanner from './components/ConfirmBanner';
import { bindEmptyShortcut } from './shortcuts';

interface TrashItem {
  id: string;
  title: string;
  icon?: string;
  image?: string;
  closedAt: number;
}

export default function Trash({ openApp }: { openApp: (id: string) => void }) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [lastItems, setLastItems] = usePersistentState<TrashItem[] | null>(
    'trash-last-empty',
    null
  );
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const purgeDays = parseInt(localStorage.getItem('trash-purge-days') || '30', 10);
    const ms = purgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let data: TrashItem[] = [];
    try {
      data = JSON.parse(localStorage.getItem('window-trash') || '[]');
    } catch (e) {
      data = [];
    }
    data = data.filter(item => now - item.closedAt <= ms);
    localStorage.setItem('window-trash', JSON.stringify(data));
    setItems(data);
  }, []);

  const persist = (next: TrashItem[]) => {
    setItems(next);
    localStorage.setItem('window-trash', JSON.stringify(next));
  };

  const restore = useCallback(() => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Restore ${item.title}?`)) return;
    openApp(item.id);
    const next = items.filter((_, i) => i !== selected);
    persist(next);
    setSelected(null);
  }, [items, selected, openApp]);

  const remove = useCallback(() => {
    if (selected === null) return;
    const item = items[selected];
    if (!window.confirm(`Delete ${item.title}?`)) return;
    const next = items.filter((_, i) => i !== selected);
    persist(next);
    setSelected(null);
  }, [items, selected]);

  const restoreAll = () => {
    if (items.length === 0) return;
    if (!window.confirm('Restore all windows?')) return;
    items.forEach(item => openApp(item.id));
    persist([]);
    setSelected(null);
  };

  const empty = useCallback(() => {
    if (items.length === 0) return;
    if (!window.confirm('Empty trash?')) return;
    setLastItems(items);
    persist([]);
    setSelected(null);
    setShowBanner(true);
  }, [items, setLastItems]);

  const undoEmpty = useCallback(() => {
    if (!lastItems) return;
    persist(lastItems);
    setLastItems(null);
    setShowBanner(false);
  }, [lastItems, setLastItems]);

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

  useEffect(() => {
    if (lastItems) setShowBanner(true);
  }, [lastItems]);

  useEffect(() => bindEmptyShortcut(empty), [empty]);

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
      <div className="flex flex-wrap content-start p-2 overflow-auto">
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
      {showBanner && (
        <ConfirmBanner onUndo={undoEmpty} onClose={() => setShowBanner(false)} />
      )}
    </div>
  );
}
