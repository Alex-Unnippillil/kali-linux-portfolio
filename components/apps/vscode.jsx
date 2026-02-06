'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import apps from '../../apps.config';

// Load the actual VSCode app lazily so no editor dependencies are required
const VsCode = dynamic(() => import('../../apps/vscode'), { ssr: false });

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
  const [showIframe, setShowIframe] = useState(false);

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
      {showIframe ? (
        <VsCode />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-neutral-900/80">
          <div className="max-w-md rounded border border-gray-700 bg-gray-900/90 p-6 text-center text-gray-100 shadow-lg">
            <h2 className="text-lg font-semibold">VSCode (web)</h2>
            <p className="mt-2 text-sm text-gray-400">
              Launch the embedded editor when you are ready to start browsing the workspace.
            </p>
            <button
              type="button"
              onClick={() => setShowIframe(true)}
              className="mt-4 inline-flex items-center justify-center rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Launch VSCode
            </button>
          </div>
        </div>
      )}
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
                <li className="px-2 py-1 text-sm text-gray-400">No results</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export const displayVsCode = (openApp) => <VsCodeWrapper openApp={openApp} />;
