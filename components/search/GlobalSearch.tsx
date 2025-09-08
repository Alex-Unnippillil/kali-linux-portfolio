'use client';

import React, { useEffect, useRef, useState } from 'react';
import { searchAll, SearchDoc } from '../../lib/search-index';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
  searchFn?: (query: string) => Promise<SearchDoc[]>;
}

export default function GlobalSearch({ open, onClose, searchFn = searchAll }: GlobalSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchDoc[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setActive(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      searchFn(query).then((res) => {
        setResults(res);
        setActive(0);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((a) => (a + 1) % (results.length || 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((a) => (a - 1 + results.length) % (results.length || 1));
      }
      if (e.key === 'Enter') {
        const r = results[active];
        if (r) window.location.href = r.url;
      }
    };
    if (open) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [open, results, active, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 bg-black/70 p-4 flex flex-col"
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search query"
        className="p-2 rounded"
        placeholder="Search..."
      />
      <ul className="mt-4 overflow-y-auto">
        {results.map((r, i) => (
          <li key={r.id}>
            <a
              href={r.url}
              aria-selected={i === active}
              className={`block px-2 py-1 rounded ${
                i === active ? 'bg-white/20 text-white' : 'text-white'
              }`}
            >
              {r.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
