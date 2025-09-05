'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

interface AppItem {
  id: string;
  title: string;
  category: string;
}

interface Props {
  apps: { id: string; title: string }[];
  games: { id: string; title: string }[];
  openApp: (id: string) => void;
}

const isHistory = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((s) => typeof s === 'string');

export default function CommandLauncher({ apps, games, openApp }: Props) {
  const items: AppItem[] = [
    ...apps.map((a) => ({ id: a.id, title: a.title, category: 'apps' })),
    ...games.map((g) => ({ id: g.id, title: g.title, category: 'games' })),
  ];

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState('all');
  const [history, setHistory] = usePersistentState<string[]>(
    'launcher-history',
    [],
    isHistory,
  );
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (!open && !isInput && e.ctrlKey && e.code === 'Space') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (open && e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  const allFiltered = items.filter(
    (i) =>
      i.title.toLowerCase().includes(query.toLowerCase()) &&
      (category === 'all' || i.category === category),
  );

  const historyItems = history
    .map((id) => items.find((i) => i.id === id))
    .filter((i): i is AppItem => Boolean(i));

  const displayList = query ? allFiltered : historyItems;

  useEffect(() => {
    setIndex(0);
  }, [query, category, open]);

  const select = (item: AppItem) => {
    openApp(item.id);
    const newHistory = [item.id, ...history.filter((h) => h !== item.id)].slice(0, 10);
    setHistory(newHistory);
    setOpen(false);
    setQuery('');
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setExpanded(true);
      setIndex((i) => Math.min(i + 1, displayList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = displayList[index];
      if (item) select(item);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-white text-black rounded shadow max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center p-2 border-b">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            className="flex-1 p-1 outline-none"
            aria-label="Command launcher"
          />
          <button
            type="button"
            aria-label="Toggle categories"
            onClick={() => setExpanded((e) => !e)}
            className="ml-2 text-sm"
          >
            {expanded ? '−' : '+'}
          </button>
        </div>
        {expanded && (
          <div className="p-2 border-b">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full p-1 border"
            >
              <option value="all">All</option>
              <option value="apps">Apps</option>
              <option value="games">Games</option>
            </select>
          </div>
        )}
        <ul className="max-h-60 overflow-y-auto">
          {displayList.map((item, i) => (
            <li
              key={item.id}
              className={`p-2 cursor-pointer ${i === index ? 'bg-ub-orange text-white' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(item)}
            >
              {item.title}
            </li>
          ))}
          {displayList.length === 0 && (
            <li className="p-2 text-sm text-gray-500">No commands</li>
          )}
        </ul>
      </div>
    </div>
  );
}

