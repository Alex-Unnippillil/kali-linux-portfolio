'use client';

import { useEffect, useState } from 'react';
import useKeymap from '../keymapRegistry';
import { eventToCombo } from '../../../src/desktop/keymap';

interface KeymapOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function KeymapOverlay({ open, onClose }: KeymapOverlayProps) {
  const { shortcuts, updateShortcut } = useKeymap();
  const [rebinding, setRebinding] = useState<string | null>(null);

  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = eventToCombo(e);
      updateShortcut(rebinding, combo);
      setRebinding(null);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding, updateShortcut]);

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
            onClick={() => {
              setRebinding(null);
              onClose();
            }}
            className="text-sm underline"
          >
            Close
          </button>
        </div>
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
      </div>
    </div>
  );
}
