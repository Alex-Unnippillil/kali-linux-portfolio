'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';

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
  const { shortcuts } = useKeymap();
  const closeRef = useRef<HTMLButtonElement | null>(null);

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
      closeRef.current?.focus();
    }
  }, [open]);

  const handleExport = () => {
    const data = JSON.stringify(shortcuts, null, 2);
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

  const renderKeys = (keys: string) => {
    const parts = keys.split('+');
    return (
      <span className="flex flex-wrap items-center gap-1" aria-label={keys.replace(/\+/g, ' plus ')}>
        {parts.map((part, index) => (
          <React.Fragment key={`${part}-${index}`}>
            <kbd className="px-1.5 py-0.5 bg-gray-700/70 rounded border border-white/20 text-xs uppercase tracking-wider">
              {part}
            </kbd>
            {index < parts.length - 1 && (
              <span aria-hidden="true" className="text-sm text-gray-300">+</span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcut-overlay-title"
    >
      <div className="max-w-lg w-full space-y-4">
        <div className="flex justify-between items-center">
          <h2 id="shortcut-overlay-title" className="text-xl font-bold">Keyboard Shortcuts</h2>
          <button
            type="button"
            ref={closeRef}
            onClick={() => setOpen(false)}
            className="text-sm underline"
          >
            Close
          </button>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="px-2 py-1 bg-gray-700 rounded text-sm"
        >
          Export JSON
        </button>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="grid">
            <caption className="sr-only">Desktop shortcuts</caption>
            <thead className="text-xs uppercase tracking-wide text-gray-300">
              <tr>
                <th scope="col" className="px-2 py-1">Keys</th>
                <th scope="col" className="px-2 py-1">Description</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((s, i) => (
                <tr
                  key={i}
                  data-conflict={conflicts.has(s.keys) ? 'true' : 'false'}
                  className={
                    conflicts.has(s.keys)
                      ? 'bg-red-600/40'
                      : i % 2 === 0
                      ? 'bg-white/5'
                      : ''
                  }
                >
                  <td className="px-2 py-1 align-top">
                    {renderKeys(s.keys)}
                  </td>
                  <td className="px-2 py-1">{s.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ShortcutOverlay;
