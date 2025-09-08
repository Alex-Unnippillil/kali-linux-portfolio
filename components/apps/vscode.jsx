'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import apps from '../../apps.config';
import EmptyState from '../ui/EmptyState';

// Load the actual VSCode app lazily so no editor dependencies are required
const VsCode = dynamic(
  () =>
    import(
      /* webpackChunkName: "app-vscode" */ '../../apps/vscode'
    ),
  {
    ssr: false,
    loading: () => <p>Loading VSCode...</p>,
  },
);

// Simple fuzzy match: returns true if query characters appear in order
function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length;
}

// Static files that can be opened directly in a new tab
const files = ['README.md', 'CHANGELOG.md', 'package.json'];

export default function VsCodeWrapper({ openApp }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const list = [
      ...apps.map((a) => ({ type: 'app', id: a.id, title: a.title })),
      ...files.map((f) => ({ type: 'file', id: f, title: f })),
    ];
    if (!query) return list;
    return list.filter((item) => fuzzyMatch(item.title, query));
  }, [query]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setVisible((v) => !v);
      } else if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectItem = (item) => {
    setVisible(false);
    setQuery('');
    if (item.type === 'app' && openApp) {
      openApp(item.id);
    } else if (item.type === 'file') {
      window.open(item.id, '_blank');
    }
  };

  return (
    <div className="relative h-full w-full">
      <VsCode />
      {visible && (
        <div className="absolute inset-0 flex items-start justify-center pt-24 bg-black/50">
          <div className="bg-gray-800 text-white w-11/12 max-w-md rounded shadow-lg p-2">
            <input
              autoFocus
              className="w-full p-2 mb-2 bg-gray-700 rounded outline-none"
              placeholder="Search apps or files"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <ul className="max-h-60 overflow-y-auto">
              {items.map((item) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => selectItem(item)}
                    className="w-full text-left px-2 py-1 rounded hover:bg-gray-700"
                  >
                    {item.title}
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="py-8">
                  <EmptyState
                    variant="search"
                    headline="No results"
                    helperText="Try another search"
                  />
                </li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export const displayVsCode = (openApp) => <VsCodeWrapper openApp={openApp} />;

