'use client';

import { useEffect, useState } from 'react';
import useKeymap from './keymapRegistry';

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

export default function Keyboard() {
  const { shortcuts, updateShortcut, resetShortcuts } = useKeymap();
  const [rebinding, setRebinding] = useState<string | null>(null);

  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = formatEvent(e);
      updateShortcut(rebinding, combo);
      setRebinding(null);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding, updateShortcut]);

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
    <div className="p-4 space-y-4">
      <h2 className="text-center text-lg font-bold">Keyboard Shortcuts</h2>
      <ul className="space-y-1">
        {shortcuts.map((s) => (
          <li
            key={s.description}
            data-conflict={conflicts.has(s.keys) ? 'true' : 'false'}
            className={
              conflicts.has(s.keys)
                ? 'flex justify-between items-center bg-red-600/70 px-2 py-1 rounded'
                : 'flex justify-between items-center px-2 py-1'
            }
          >
            <span className="flex-1">{s.description}</span>
            <span className="font-mono mr-2">{s.keys}</span>
            <button
              type="button"
              onClick={() => setRebinding(s.description)}
              className="px-2 py-1 bg-ub-orange text-white rounded text-sm"
            >
              {rebinding === s.description ? 'Press keys...' : 'Rebind'}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex justify-center pt-2 border-t border-gray-900">
        <button
          type="button"
          onClick={resetShortcuts}
          className="px-4 py-2 bg-ub-orange text-white rounded"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

