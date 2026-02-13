'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import apps from '../../apps.config';

interface Item {
  type: 'app' | 'section';
  id: string;
  title: string;
  url?: string;
}

const sections: Item[] = [
  { type: 'section', id: 'home', title: 'Home', url: '/' },
  { type: 'section', id: 'apps', title: 'Apps', url: '/apps' },
  { type: 'section', id: 'notes', title: 'Notes', url: '/notes' }
];

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const items: Item[] = useMemo(() => {
    const appItems: Item[] = (apps as any[])
      .filter((a) => !a.disabled)
      .map((a) => ({ type: 'app', id: a.id, title: a.title }));
    return [...appItems, ...sections];
  }, []);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    return items.filter((i) => i.title.toLowerCase().includes(q));
  }, [items, query]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (open) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setOpen(false);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlight((h) => Math.min(h + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const item = results[highlight];
          if (item) execute(item);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, highlight, results]);

  const execute = (item: Item) => {
    setOpen(false);
    if (item.type === 'app') {
      window.dispatchEvent(new CustomEvent('open-app', { detail: item.id }));
    } else if (item.url) {
      window.location.href = item.url;
    }
  };

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const node = overlayRef.current;
    const focusable = node?.querySelectorAll<HTMLElement>(
      'input,button,[tabindex]:not([tabindex="-1"])'
    );
    focusable && focusable[0]?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    node?.addEventListener('keydown', trap);
    return () => {
      node?.removeEventListener('keydown', trap);
      previousFocus.current?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md space-y-2" onClick={(e) => e.stopPropagation()}>
        <label htmlFor="cp-search" className="sr-only">
          Search
        </label>
        <input
          id="cp-search"
          aria-label="Search"
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded bg-gray-700 p-2 focus:outline-none"
          placeholder="Type to search..."
        />
        <ul className="max-h-60 overflow-y-auto">
          {results.length === 0 && (
            <li className="px-2 py-1 text-sm text-gray-400">No results</li>
          )}
          {results.map((item, idx) => (
            <li key={`${item.type}-${item.id}`}>
              <button
                type="button"
                onClick={() => execute(item)}
                className={`w-full text-left px-2 py-1 rounded ${
                  idx === highlight ? 'bg-gray-600' : ''
                }`}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;

