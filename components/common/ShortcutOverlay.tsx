'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';

const highlightMatches = (text: string, query: string) => {
  if (!query) return text;
  const normalizedQuery = query.toLowerCase();
  const normalizedText = text.toLowerCase();
  const result: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);
  let key = 0;

  while (matchIndex !== -1) {
    if (matchIndex > lastIndex) {
      result.push(
        <React.Fragment key={`text-${key}`}>
          {text.slice(lastIndex, matchIndex)}
        </React.Fragment>
      );
      key += 1;
    }

    const match = text.slice(matchIndex, matchIndex + query.length);
    result.push(
      <mark key={`mark-${key}`} className="bg-yellow-400/80 text-black rounded px-0.5">
        {match}
      </mark>
    );
    key += 1;

    lastIndex = matchIndex + query.length;
    matchIndex = normalizedText.indexOf(normalizedQuery, lastIndex);
  }

  if (lastIndex < text.length) {
    result.push(
      <React.Fragment key={`text-${key}`}>
        {text.slice(lastIndex)}
      </React.Fragment>
    );
  }

  return result;
};

const formatEvent = (e: KeyboardEvent) => {
  const parts = [
    e.ctrlKey ? 'Ctrl' : '',
    e.altKey ? 'Alt' : '',
    e.shiftKey ? 'Shift' : '',
    e.metaKey ? 'Meta' : '',
    e.key.length === 1 ? e.key.toUpperCase() : e.key,
  ];
  return parts.filter(Boolean).join('+');
};

const ShortcutOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const { shortcuts } = useKeymap();
  const inputRef = useRef<HTMLInputElement>(null);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable;
      if (isInput) return;
      const show =
        shortcuts.find((s) => s.description === 'Show keyboard shortcuts')?.keys ||
        '?';
      if (formatEvent(e) === show) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle, shortcuts]);

  useEffect(() => {
    if (open) {
      setFilter('');
      inputRef.current?.focus();
    }
  }, [open]);

  const normalizedFilter = filter.trim().toLowerCase();

  const filteredShortcuts = useMemo(() => {
    if (!normalizedFilter) return shortcuts;
    return shortcuts.filter((s) => {
      const keyMatch = s.keys.toLowerCase().includes(normalizedFilter);
      const descriptionMatch = s.description.toLowerCase().includes(normalizedFilter);
      return keyMatch || descriptionMatch;
    });
  }, [shortcuts, normalizedFilter]);

  const handleExport = () => {
    const data = JSON.stringify(filteredShortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const keyCounts = shortcuts.reduce<Map<string, number>>((map, s) => {
    map.set(s.keys, (map.get(s.keys) || 0) + 1);
    return map;
  }, new Map());
  const conflicts = new Set(
    Array.from(keyCounts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-lg w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-sm underline"
          >
            Close
          </button>
        </div>
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by key or description"
            className="flex-1 rounded bg-black/40 border border-white/20 px-2 py-1 text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-sky-500"
            aria-label="Filter keyboard shortcuts"
          />
          <button
            type="button"
            onClick={handleExport}
            className="px-2 py-1 bg-gray-700 rounded text-sm"
            disabled={filteredShortcuts.length === 0}
          >
            Export JSON
          </button>
        </div>
        {filteredShortcuts.length === 0 ? (
          <p className="text-sm text-white/70">No shortcuts match your filter.</p>
        ) : (
          <ul className="space-y-1">
            {filteredShortcuts.map((s, i) => (
              <li
                key={i}
                data-conflict={conflicts.has(s.keys) ? 'true' : 'false'}
                className={
                  conflicts.has(s.keys)
                    ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
                    : 'flex justify-between px-2 py-1'
                }
              >
                <span className="font-mono mr-4">{highlightMatches(s.keys, normalizedFilter)}</span>
                <span className="flex-1">{highlightMatches(s.description, normalizedFilter)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ShortcutOverlay;
