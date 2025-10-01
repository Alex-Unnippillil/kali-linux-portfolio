'use client';

import { useEffect, useMemo, useState } from 'react';
import useKeymap from '../keymapRegistry';
import {
  ORDERED_PLATFORMS,
  PLATFORM_LABELS,
  type ShortcutPlatform,
} from '../../../config/shortcuts';

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
  const [rebinding, setRebinding] = useState<
    { id: string; platform: ShortcutPlatform } | null
  >(null);

  const conflictMap = useMemo(() => {
    return ORDERED_PLATFORMS.reduce(
      (acc, platform) => {
        const counts = new Map<string, number>();
        shortcuts.forEach((shortcut) => {
          const binding = shortcut.bindings[platform];
          if (!binding) return;
          counts.set(binding, (counts.get(binding) || 0) + 1);
        });
        acc[platform] = counts;
        return acc;
      },
      {} as Record<ShortcutPlatform, Map<string, number>>
    );
  }, [shortcuts]);

  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = formatEvent(e);
      updateShortcut(rebinding.id, rebinding.platform, combo);
      setRebinding(null);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding, updateShortcut]);

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
              key={s.id}
              className="space-y-2 rounded border border-white/10 bg-black/40 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">{s.description}</span>
                <span className="text-xs uppercase tracking-wide text-white/60">
                  {s.section}
                </span>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                {ORDERED_PLATFORMS.map((platform) => {
                  const binding = s.bindings[platform];
                  const isRebinding =
                    rebinding?.id === s.id && rebinding.platform === platform;
                  const hasConflict =
                    (conflictMap[platform]?.get(binding) || 0) > 1;
                  return (
                    <button
                      key={platform}
                      type="button"
                      onClick={() =>
                        setRebinding({ id: s.id, platform })
                      }
                      className={`flex flex-col rounded border px-2 py-1 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange/80 ${
                        hasConflict
                          ? 'border-red-500/70 bg-red-500/20'
                          : 'border-white/20 hover:border-white/60'
                      }`}
                    >
                      <span className="text-xs uppercase tracking-wide text-white/70">
                        {PLATFORM_LABELS[platform]}
                      </span>
                      <span className="font-mono">
                        {isRebinding ? 'Press keys…' : binding}
                      </span>
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
