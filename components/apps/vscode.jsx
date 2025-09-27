'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import apps from '../../apps.config';
import useAppSearch from '../../hooks/useAppSearch';

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

  const paletteItems = useMemo(
    () => [
      ...apps.map((a) => ({ type: 'app', id: a.id, title: a.title })),
      ...files.map((f) => ({ type: 'file', id: f, title: f })),
    ],
    [],
  );

  const highlightFuzzy = useCallback((text, rawQuery) => {
    if (!rawQuery) return text;
    const queryLower = rawQuery.toLowerCase();
    let pointer = 0;
    return Array.from(text).map((char, index) => {
      if (pointer < queryLower.length && char.toLowerCase() === queryLower[pointer]) {
        pointer += 1;
        return (
          <mark key={`mark-${index}`} className="bg-yellow-500/40 text-inherit">
            {char}
          </mark>
        );
      }
      return (
        <React.Fragment key={`char-${index}`}>{char}</React.Fragment>
      );
    });
  }, []);

  const {
    query,
    setQuery,
    results,
    highlight,
    metadata,
    reset,
  } = useAppSearch(paletteItems, {
    getLabel: (item) => item.title,
    filter: (item, { query: raw }) => fuzzyMatch(item.title, raw),
    highlight: (text, raw) => highlightFuzzy(text, raw),
    debounceMs: 150,
  });

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

  useEffect(() => {
    if (!visible) {
      reset();
    }
  }, [reset, visible]);

  const selectItem = (item) => {
    setVisible(false);
    reset();
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
              {results.map(({ item }) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => selectItem(item)}
                    className="w-full text-left px-2 py-1 rounded hover:bg-gray-700"
                  >
                    <span className="block text-sm font-medium">{highlight(item.title)}</span>
                    <span className="block text-xs text-gray-400 uppercase tracking-wide">
                      {item.type}
                    </span>
                  </button>
                </li>
              ))}
              {!metadata.isSearching && metadata.hasQuery && results.length === 0 && (
                <li className="px-2 py-1 text-sm text-gray-400">No results</li>
              )}
            </ul>
            <p
              className="mt-2 text-xs text-gray-400"
              role="status"
              aria-live="polite"
            >
              {metadata.hasQuery
                ? `${metadata.matched} of ${metadata.total} items match` +
                  (metadata.debouncedQuery ? ` "${metadata.debouncedQuery}"` : '')
                : `${metadata.total} quick actions available`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export const displayVsCode = (openApp) => <VsCodeWrapper openApp={openApp} />;

