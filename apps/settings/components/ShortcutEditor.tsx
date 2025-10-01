'use client';

import { useCallback, useMemo, useState } from 'react';
import useKeymap from '../keymapRegistry';
import { keyboardEventToShortcut } from '../utils/shortcutParser';

interface ShortcutEditorProps {
  className?: string;
}

type ConflictMap = Map<string, string[]>;

const buildConflictMap = (entries: { description: string; keys: string }[]) => {
  const map: ConflictMap = new Map();
  entries.forEach(({ description, keys }) => {
    if (!keys) return;
    const existing = map.get(keys) ?? [];
    existing.push(description);
    map.set(keys, existing);
  });
  return map;
};

export default function ShortcutEditor({ className }: ShortcutEditorProps) {
  const { shortcuts, updateShortcut, resetShortcut } = useKeymap();
  const [recording, setRecording] = useState<string | null>(null);

  const conflicts = useMemo(() => buildConflictMap(shortcuts), [shortcuts]);

  const handleReset = useCallback(
    (description: string) => {
      resetShortcut(description);
      setRecording((active) => (active === description ? null : active));
    },
    [resetShortcut]
  );

  return (
    <div className={className}>
      <p className="text-sm text-ubt-grey">
        Click a shortcut, then press the desired keys. Press Esc to cancel without saving.
      </p>
      <ul className="mt-4 space-y-3">
        {shortcuts.map((shortcut) => {
          const { description, keys, defaultKeys, isDefault } = shortcut;
          const conflictEntries = conflicts.get(keys) ?? [];
          const conflictWith = conflictEntries.filter((name) => name !== description);
          const hasConflict = conflictWith.length > 0;
          const isRecording = recording === description;

          return (
            <li key={description} data-conflict={hasConflict ? 'true' : 'false'}>
              <div
                className={`rounded-lg border p-3 transition-colors ${
                  hasConflict
                    ? 'border-red-500/70 bg-red-500/10'
                    : 'border-gray-700/70 bg-black/40'
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-white">{description}</p>
                    <p className="text-xs text-ubt-grey">
                      Default: <span className="font-mono">{defaultKeys}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={isRecording ? 'Press keys…' : keys}
                      onFocus={() => setRecording(description)}
                      onBlur={() =>
                        setRecording((current) =>
                          current === description ? null : current
                        )
                      }
                      onKeyDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();

                        if (event.key === 'Escape') {
                          setRecording(null);
                          event.currentTarget.blur();
                          return;
                        }

                        const chord = keyboardEventToShortcut(event.nativeEvent);
                        if (!chord) return;
                        updateShortcut(description, chord);
                        setRecording(null);
                        event.currentTarget.blur();
                      }}
                      aria-label={`Shortcut for ${description}`}
                      className={`w-40 rounded border px-2 py-1 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-ub-orange ${
                        isRecording
                          ? 'border-ub-orange bg-black/40'
                          : 'border-gray-600 bg-black/60'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => handleReset(description)}
                      disabled={isDefault}
                      className={`rounded border px-2 py-1 text-xs transition-colors ${
                        isDefault
                          ? 'cursor-not-allowed border-gray-600 text-gray-500'
                          : 'border-ub-orange text-ub-orange hover:bg-ub-orange hover:text-white'
                      }`}
                    >
                      Reset
                    </button>
                  </div>
                </div>
                {hasConflict && (
                  <div className="mt-3 space-y-2 rounded border border-red-500/60 bg-red-500/10 p-3 text-xs text-red-100">
                    <p>
                      Conflicts with{' '}
                      {conflictWith.map((name, index) => (
                        <span key={name} className="font-semibold">
                          {index > 0 ? ', ' : ''}
                          {name}
                        </span>
                      ))}
                      .
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleReset(description)}
                        className="rounded border border-red-300 px-2 py-1 text-xs text-red-100 hover:bg-red-500/30"
                      >
                        Reset this action
                      </button>
                      {conflictWith.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => handleReset(name)}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-100 hover:bg-red-500/30"
                        >
                          Reset {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
