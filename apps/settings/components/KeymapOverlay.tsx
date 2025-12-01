'use client';

import { useEffect, useMemo, useState } from 'react';
import useKeymap, {
  keyboardEventToCombo,
  ShortcutId,
  getShortcutDescription,
} from '../keymapRegistry';

interface KeymapOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function KeymapOverlay({ open, onClose }: KeymapOverlayProps) {
  const { shortcuts, updateShortcut, resetShortcut } = useKeymap();
  const [rebinding, setRebinding] = useState<ShortcutId | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const descriptions = useMemo(() => {
    return shortcuts.reduce<Record<ShortcutId, string>>((acc, shortcut) => {
      acc[shortcut.id] = shortcut.description;
      return acc;
    }, {} as Record<ShortcutId, string>);
  }, [shortcuts]);

  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = keyboardEventToCombo(e);
      const result = updateShortcut(rebinding, combo);
      if (result.reverted.length > 0) {
        const names = result.reverted
          .map((id) => descriptions[id] || getShortcutDescription(id))
          .join(', ');
        setMessage(
          `Restored default for ${names} to resolve a shortcut conflict.`,
        );
      } else {
        setMessage(null);
      }
      setRebinding(null);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding, updateShortcut, descriptions]);

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
            onClick={() => {
              setRebinding(null);
              setMessage(null);
              onClose();
            }}
            className="text-sm underline"
          >
            Close
          </button>
        </div>
        {message && (
          <p className="text-sm text-ub-orange" role="status" aria-live="polite">
            {message}
          </p>
        )}
        <ul className="space-y-1">
          {shortcuts.map((s) => (
            <li
              key={s.id}
              data-conflict={s.conflicts.length > 0 ? 'true' : 'false'}
              className={
                s.conflicts.length > 0
                  ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
                  : 'flex flex-col gap-1 md:flex-row md:items-center md:justify-between px-2 py-1'
              }
            >
              <div className="flex-1">
                <span className="block">{s.description}</span>
                <span className="text-xs text-gray-300">
                  Default: {s.default}
                </span>
                {s.conflicts.length > 0 && (
                  <span className="block text-xs text-red-200">
                    Conflicts with{' '}
                    {s.conflicts
                      .map((id) => descriptions[id] || getShortcutDescription(id))
                      .join(', ')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono mr-2 whitespace-nowrap">{s.keys}</span>
                <button
                  type="button"
                  onClick={() => setRebinding(s.id)}
                  className="px-2 py-1 bg-ub-orange text-white rounded text-sm"
                >
                  {rebinding === s.id ? 'Press keys...' : 'Rebind'}
                </button>
                {!s.isDefault && (
                  <button
                    type="button"
                    onClick={() => {
                      resetShortcut(s.id);
                      setMessage(null);
                    }}
                    className="px-2 py-1 bg-gray-700 rounded text-sm"
                  >
                    Reset
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
