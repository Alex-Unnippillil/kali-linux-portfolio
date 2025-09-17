'use client';

import { useEffect, useMemo, useState } from 'react';
import useKeymap, { type ShortcutEntry } from '../keymapRegistry';
import { formatKeybinding } from '@/src/system/shortcuts';
import ShortcutRow from './ShortcutRow';

interface KeyboardShortcutSettingsProps {
  onClose?: () => void;
}

const groupShortcuts = (shortcuts: ShortcutEntry[]) => {
  const groups: { category: string; items: ShortcutEntry[] }[] = [];
  const index = new Map<string, number>();

  shortcuts.forEach((shortcut) => {
    if (index.has(shortcut.category)) {
      const bucket = groups[index.get(shortcut.category)!];
      bucket.items.push(shortcut);
      return;
    }
    index.set(shortcut.category, groups.length);
    groups.push({ category: shortcut.category, items: [shortcut] });
  });

  return groups;
};

const KeyboardShortcutSettings = ({
  onClose,
}: KeyboardShortcutSettingsProps) => {
  const { shortcuts, updateShortcut, resetShortcut, restoreDefaults } = useKeymap();
  const [capturingId, setCapturingId] = useState<string | null>(null);

  useEffect(() => {
    if (!capturingId) return;

    const handler = (event: KeyboardEvent) => {
      event.preventDefault();
      if (event.key === 'Escape') {
        setCapturingId(null);
        return;
      }

      const binding = formatKeybinding(event);
      if (binding) {
        updateShortcut(capturingId, binding);
        setCapturingId(null);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [capturingId, updateShortcut]);

  const grouped = useMemo(() => groupShortcuts(shortcuts), [shortcuts]);
  const hasConflicts = shortcuts.some((shortcut) => shortcut.conflict);

  return (
    <div className="w-full max-w-3xl overflow-hidden rounded-lg border border-gray-800 bg-ub-cool-grey text-white shadow-xl">
      <header className="flex flex-col gap-2 border-b border-gray-800 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Keyboard shortcuts</h2>
          <p className="text-sm text-ubt-grey">
            Customize the key bindings for global desktop actions.
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={() => {
              setCapturingId(null);
              onClose();
            }}
            className="self-start rounded px-3 py-1 text-sm font-medium text-ub-orange transition hover:text-white"
          >
            Close
          </button>
        )}
      </header>
      <div className="space-y-6 px-5 py-4">
        {hasConflicts && (
          <div className="rounded border border-red-500/60 bg-red-900/40 px-3 py-2 text-sm text-red-200">
            Some shortcuts share the same key combination. Reassign or reset the highlighted rows to
            resolve the conflict.
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setCapturingId(null);
              restoreDefaults();
            }}
            className="rounded bg-gray-700 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-gray-600"
          >
            Restore defaults
          </button>
        </div>
        {grouped.map(({ category, items }) => (
          <section key={category} className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ubt-grey">
              {category}
            </h3>
            <ul className="divide-y divide-gray-800 overflow-hidden rounded border border-gray-800">
              {items.map((shortcut) => (
                <ShortcutRow
                  key={shortcut.id}
                  shortcut={shortcut}
                  capturing={capturingId === shortcut.id}
                  onStartCapture={() => setCapturingId(shortcut.id)}
                  onReset={() => {
                    setCapturingId((current) => (current === shortcut.id ? null : current));
                    resetShortcut(shortcut.id);
                  }}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default KeyboardShortcutSettings;
