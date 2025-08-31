"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

interface Item {
  type: string;
  title: string;
  url: string;
  content: string;
}

const InstantSearch = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<Item[]>([]);
  const [results, setResults] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/search/index.json')
      .then((r) => r.json())
      .then((data: Item[]) => setIndex(data))
      .catch(() => setIndex([]));
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const filtered = index.filter(
      (i) =>
        i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q)
    );
    setResults(filtered);
    setActive(0);
  }, [query, index]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const groups = results.reduce<Record<string, Item[]>>((acc, item) => {
    acc[item.type] = acc[item.type] || [];
    acc[item.type].push(item);
    return acc;
  }, {});

  const flat = Object.values(groups).flat();

  const highlight = (text: string) => {
    const esc = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(${esc})`, 'ig');
    return text.replace(re, '<mark>$1</mark>');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter' && flat[active]) {
      window.location.href = flat[active].url;
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/30 ${open ? '' : 'hidden'} z-50 flex items-start justify-center p-4`}>
      <div className="bg-white w-full max-w-xl rounded shadow p-4">
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search..."
          className="w-full p-2 border border-gray-300 rounded"
        />
        {query && results.length > 0 && (
          <div className="mt-2 max-h-80 overflow-y-auto">
            {Object.entries(groups).map(([type, items]) => (
              <div key={type}>
                <div className="px-2 py-1 text-xs font-bold uppercase text-gray-500">
                  {type}
                </div>
                {items.map((item) => {
                  const idx = flat.indexOf(item);
                  return (
                    <Link
                      key={item.url + idx}
                      href={item.url}
                      className={`block px-2 py-2 rounded ${
                        idx === active ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div
                        className="font-medium"
                        dangerouslySetInnerHTML={{ __html: highlight(item.title) }}
                      />
                      <div
                        className="text-sm text-gray-600"
                        dangerouslySetInnerHTML={{
                          __html: highlight(item.content.slice(0, 80)),
                        }}
                      />
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default InstantSearch;
