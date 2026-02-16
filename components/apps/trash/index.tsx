'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface TrashItem {
  id: string;
  title: string;
  icon?: string;
  image?: string;
  closedAt: number;
}

type SortMode = 'newest' | 'oldest' | 'title';

const formatAge = (closedAt: number): string => {
  const diff = Date.now() - closedAt;
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const minutes = Math.floor(diff / (60 * 1000));
  if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  return 'Just now';
};

const getItemKey = (item: TrashItem): string => `${item.id}-${item.closedAt}`;

export default function Trash({ openApp }: { openApp: (id: string) => void }) {
  const [items, setItems] = useState<TrashItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('newest');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const purgeDays = parseInt(localStorage.getItem('trash-purge-days') || '30', 10);
    const ms = purgeDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let data: TrashItem[] = [];
    try {
      data = JSON.parse(localStorage.getItem('window-trash') || '[]');
    } catch {
      data = [];
    }
    data = data.filter((item) => now - item.closedAt <= ms);
    localStorage.setItem('window-trash', JSON.stringify(data));
    setItems(data);
  }, []);

  const persist = (next: TrashItem[]) => {
    setItems(next);
    localStorage.setItem('window-trash', JSON.stringify(next));
  };

  const selectedItem = useMemo(
    () => items.find((item) => getItemKey(item) === selectedKey) ?? null,
    [items, selectedKey]
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const filtered = normalizedQuery
      ? items.filter((item) => item.title.toLowerCase().includes(normalizedQuery))
      : items;

    return [...filtered].sort((a, b) => {
      if (sortMode === 'newest') return b.closedAt - a.closedAt;
      if (sortMode === 'oldest') return a.closedAt - b.closedAt;
      return a.title.localeCompare(b.title);
    });
  }, [items, searchQuery, sortMode]);

  const restore = useCallback(() => {
    if (!selectedItem) return;
    if (!window.confirm(`Restore ${selectedItem.title}?`)) return;
    openApp(selectedItem.id);
    const selected = getItemKey(selectedItem);
    const next = items.filter((item) => getItemKey(item) !== selected);
    persist(next);
    setSelectedKey(null);
  }, [items, selectedItem, openApp]);

  const remove = useCallback(() => {
    if (!selectedItem) return;
    if (!window.confirm(`Delete ${selectedItem.title}?`)) return;
    const selected = getItemKey(selectedItem);
    const next = items.filter((item) => getItemKey(item) !== selected);
    persist(next);
    setSelectedKey(null);
  }, [items, selectedItem]);

  const restoreAll = () => {
    if (items.length === 0) return;
    if (!window.confirm('Restore all windows?')) return;
    items.forEach((item) => openApp(item.id));
    persist([]);
    setSelectedKey(null);
  };

  const empty = () => {
    if (items.length === 0) return;
    if (!window.confirm('Empty trash?')) return;
    persist([]);
    setSelectedKey(null);
  };

  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!selectedItem) return;
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        remove();
      } else if (e.key === 'Enter' || e.key.toLowerCase() === 'r') {
        e.preventDefault();
        restore();
      }
    },
    [selectedItem, remove, restore]
  );

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
            disabled={!selectedItem}
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
            disabled={!selectedItem}
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

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 border-b border-black border-opacity-30 text-xs bg-black bg-opacity-20">
        <label className="flex items-center gap-2">
          <span className="text-gray-300">Search</span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Find deleted apps..."
            className="px-2 py-1 rounded bg-black bg-opacity-50 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-ub-orange"
            aria-label="Search trash items"
          />
        </label>

        <label className="flex items-center gap-2">
          <span className="text-gray-300">Sort</span>
          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as SortMode)}
            className="px-2 py-1 rounded bg-black bg-opacity-50 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-ub-orange"
            aria-label="Sort trash items"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </label>

        <div className="text-right text-gray-300">
          <p>
            Showing {visibleItems.length} of {items.length} item{items.length !== 1 ? 's' : ''}
          </p>
          {selectedItem && <p className="text-ub-orange">Selected: {selectedItem.title}</p>}
        </div>
      </div>

      <div className="flex flex-wrap content-start p-2 overflow-auto">
        {items.length === 0 && <div className="w-full text-center mt-10">Trash is empty</div>}
        {items.length > 0 && visibleItems.length === 0 && (
          <div className="w-full text-center mt-10 text-gray-300">No deleted apps match your search.</div>
        )}

        {visibleItems.map((item) => {
          const itemKey = getItemKey(item);
          const isSelected = selectedKey === itemKey;

          return (
            <div
              key={itemKey}
              tabIndex={0}
              onClick={() => setSelectedKey(itemKey)}
              onDoubleClick={() => {
                setSelectedKey(itemKey);
                openApp(item.id);
                persist(items.filter((nextItem) => getItemKey(nextItem) !== itemKey));
              }}
              className={`m-2 border p-1 w-32 cursor-pointer ${isSelected ? 'bg-ub-drk-abrgn' : ''}`}
            >
              {item.image ? (
                <img src={item.image} alt={item.title} className="h-20 w-full object-cover" />
              ) : item.icon ? (
                <img src={item.icon} alt={item.title} className="h-20 w-20 mx-auto object-contain" />
              ) : null}
              <p className="text-center text-xs truncate mt-1" title={item.title}>
                {item.title}
              </p>
              <p className="text-center text-[10px] text-gray-400" aria-label={`Closed ${formatAge(item.closedAt)}`}>
                {formatAge(item.closedAt)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
