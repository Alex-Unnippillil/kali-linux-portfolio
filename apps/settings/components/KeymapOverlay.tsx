'use client';

import { useEffect, useState } from 'react';
import useKeymap from '../keymapRegistry';

interface KeymapOverlayProps {
  open: boolean;
  onClose: () => void;
}

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

export default function KeymapOverlay({ open, onClose }: KeymapOverlayProps) {
  const { shortcuts, updateShortcut } = useKeymap();
  const [rebinding, setRebinding] = useState<string | null>(null);
  const [conflict, setConflict] = useState<
    | {
        attempted: { description: string; keys: string };
        existing: { description: string; keys: string };
      }
    | null
  >(null);

  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = formatEvent(e);
      const existing = shortcuts.find(
        (s) => s.keys === combo && s.description !== rebinding,
      );
      if (existing && rebinding) {
        setConflict({
          attempted: { description: rebinding, keys: combo },
          existing,
        });
        setRebinding(null);
      } else {
        updateShortcut(rebinding, combo);
        setRebinding(null);
      }
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding, shortcuts, updateShortcut]);

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
        {conflict && (
          <div className="bg-red-600/70 px-2 py-2 rounded space-y-2" role="alert">
            <p>
              {conflict.attempted.keys} is already assigned to{' '}
              {conflict.existing.description}.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  updateShortcut(
                    conflict.attempted.description,
                    conflict.attempted.keys,
                  );
                  updateShortcut(conflict.existing.description, '');
                  setConflict(null);
                  setRebinding(conflict.existing.description);
                }}
                className="px-2 py-1 bg-ub-orange text-white rounded text-sm"
              >
                Reassign {conflict.existing.description}
              </button>
              <button
                type="button"
                onClick={() => setConflict(null)}
                className="px-2 py-1 bg-gray-700 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
