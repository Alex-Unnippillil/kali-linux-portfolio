'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import useKeymap, {
  keyboardEventToCombo,
  ShortcutId,
  getShortcutDescription,
} from '../../apps/settings/keymapRegistry';

const ShortcutOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { shortcuts } = useKeymap();

  const descriptions = useMemo(() => {
    return shortcuts.reduce<Record<ShortcutId, string>>((acc, shortcut) => {
      acc[shortcut.id] = shortcut.description;
      return acc;
    }, {} as Record<ShortcutId, string>);
  }, [shortcuts]);

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
        shortcuts.find((s) => s.id === 'show-shortcuts')?.keys || '?';
      if (keyboardEventToCombo(e) === show) {
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
              data-conflict={s.conflicts.length > 0 ? 'true' : 'false'}
              className={
                s.conflicts.length > 0
                  ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
                  : 'flex justify-between px-2 py-1'
              }
            >
              <span className="font-mono mr-4">{s.keys}</span>
              <span className="flex-1">{s.description}</span>
              {s.conflicts.length > 0 && (
                <span className="text-xs text-red-200 ml-2">
                  Conflicts with{' '}
                  {s.conflicts
                    .map((id) => descriptions[id] || getShortcutDescription(id))
                    .join(', ')}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ShortcutOverlay;
