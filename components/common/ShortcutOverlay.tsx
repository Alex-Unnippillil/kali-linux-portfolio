'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';
import {
  groupShortcutsByCategory,
  matchesShortcut,
  resolveShortcuts,
} from '../../hooks/useShortcuts';

const ShortcutOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { overrides } = useKeymap();

  const resolvedShortcuts = useMemo(
    () => resolveShortcuts(overrides),
    [overrides]
  );

  const groupedShortcuts = useMemo(
    () => groupShortcutsByCategory(resolvedShortcuts),
    [resolvedShortcuts]
  );

  const toggleShortcut = resolvedShortcuts.find(
    (shortcut) => shortcut.id === 'help.shortcuts'
  );

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        (target as HTMLElement).isContentEditable;
      if (isInput) return;
      if (toggleShortcut && matchesShortcut(e, toggleShortcut.keys)) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle, toggleShortcut]);

  const handleExport = () => {
    const data = JSON.stringify(resolvedShortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const keyCounts = resolvedShortcuts.reduce<Map<string, number>>((map, s) => {
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
        <button
          type="button"
          onClick={handleExport}
          className="px-2 py-1 bg-gray-700 rounded text-sm"
        >
          Export JSON
        </button>
        <div className="space-y-4">
          {groupedShortcuts.map(({ category, items }) => (
            <section key={category} aria-label={`${category} shortcuts`}>
              <h3 className="text-lg font-semibold mb-2">{category}</h3>
              <div className="overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-1">
                  <thead>
                    <tr className="text-left text-sm uppercase tracking-wider text-gray-300">
                      <th scope="col" className="px-3 py-2">
                        Keys
                      </th>
                      <th scope="col" className="px-3 py-2">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((shortcut) => (
                      <tr
                        key={shortcut.id}
                        data-conflict={
                          conflicts.has(shortcut.keys) ? 'true' : 'false'
                        }
                        className={
                          conflicts.has(shortcut.keys)
                            ? 'bg-red-600/70'
                            : 'bg-black/30'
                        }
                      >
                        <td className="px-3 py-2 font-mono whitespace-nowrap align-middle">
                          {shortcut.label}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          {shortcut.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutOverlay;
