'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import apps, { type AppConfig } from '../../apps.config';

// Load the actual VSCode app lazily so no editor dependencies are required
const VsCode = dynamic(() => import('../../apps/vscode'), { ssr: false });

interface AppListItem {
  type: 'app' | 'file';
  id: string;
  title: string;
}

interface VsCodeWrapperProps {
  openApp?: (appId: AppConfig['id']) => void;
}

// Simple fuzzy match: returns true if query characters appear in order
function fuzzyMatch(text: string, query: string): boolean {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi += 1;
    ti += 1;
  }
  return qi === q.length;
}

// Static files that can be opened directly in a new tab
const files = ['README.md', 'CHANGELOG.md', 'package.json'];

export default function VsCodeWrapper({ openApp }: VsCodeWrapperProps) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  const items = useMemo<AppListItem[]>(() => {
    const list: AppListItem[] = [
      ...apps.map((app) => ({ type: 'app', id: app.id, title: app.title })),
      ...files.map((file) => ({ type: 'file', id: file, title: file })),
    ];
    if (!query) return list;
    return list.filter((item) => fuzzyMatch(item.title, query));
  }, [query]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setVisible((value) => !value);
      } else if (event.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const selectItem = (item: AppListItem) => {
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
              onChange={(event) => setQuery(event.target.value)}
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

export const displayVsCode = (openApp?: (appId: AppConfig['id']) => void) => (
  <VsCodeWrapper openApp={openApp} />
);
