'use client';

import React, { useEffect, useState, useCallback } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';
import Modal from '../base/Modal';

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

  const handleClose = useCallback(() => setOpen(false), []);

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
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);

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
    <Modal isOpen={open} onClose={handleClose}>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto">
        <div className="max-w-lg w-full space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Keyboard Shortcuts</h2>
            <button
              type="button"
              onClick={handleClose}
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
          <ul className="space-y-1">
            {shortcuts.map((s, i) => (
              <li
                key={i}
                data-conflict={conflicts.has(s.keys) ? 'true' : 'false'}
                className={
                  conflicts.has(s.keys)
                    ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
                    : 'flex justify-between px-2 py-1'
                }
              >
                <span className="font-mono mr-4">{s.keys}</span>
                <span className="flex-1">{s.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default ShortcutOverlay;
