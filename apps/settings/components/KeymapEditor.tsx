'use client';

import { useEffect, useState } from 'react';
import useKeymap from '../keymapRegistry';

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

export default function KeymapEditor() {
  const { shortcuts, updateShortcut } = useKeymap();
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
    <ul className="space-y-1">
      {shortcuts.map((s) => (
        <li
          key={s.description}
          data-conflict={conflicts.has(s.keys) ? 'true' : 'false'}
          className={
            conflicts.has(s.keys)
              ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
              : 'flex justify-between px-2 py-1'
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
  );
}

