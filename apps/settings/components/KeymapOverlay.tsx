'use client';

import { useEffect, useMemo, useState } from 'react';
import useKeymap, { ResolvedShortcut } from '../keymapRegistry';

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
  const { shortcuts, groups, updateShortcut } = useKeymap();
  const [rebinding, setRebinding] = useState<string | null>(null);

  const shortcutLookup = useMemo(
    () => new Map(shortcuts.map((shortcut) => [shortcut.id, shortcut])),
    [shortcuts]
  );

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

  if (!open) return null;

  const renderConflictTargets = (shortcut: ResolvedShortcut) => {
    const items = shortcut.conflictIds
      .map((id) => shortcutLookup.get(id))
      .filter((item): item is ResolvedShortcut => Boolean(item));
    if (!items.length) return null;
    const label = items.map((item) => item.description).join(', ');
    return (
      <p className="mt-2 text-xs text-red-100">
        Conflicts with {label}. Assign a unique key combination to resolve the clash.
      </p>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 text-white p-4 overflow-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-2xl w-full space-y-4">
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
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.context} aria-label={`${group.context} shortcuts`}>
              <h3 className="text-lg font-semibold border-b border-white/20 pb-1">
                {group.context}
              </h3>
              <ul className="mt-3 space-y-2">
                {group.shortcuts.map((shortcut) => {
                  const hasConflict = shortcut.conflictIds.length > 0;
                  const scopeLabel = shortcut.scope === 'global' ? 'Global' : 'Contextual';
                  const scopeClass =
                    shortcut.scope === 'global'
                      ? 'bg-ub-orange text-black'
                      : 'bg-white/10 text-white';
                  const isActive = rebinding === shortcut.id;
                  return (
                    <li
                      key={shortcut.id}
                      data-conflict={hasConflict ? 'true' : 'false'}
                      className={`rounded border px-3 py-2 transition-colors ${
                        hasConflict
                          ? 'border-red-400 bg-red-600/40'
                          : 'border-white/10 bg-white/5'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">{shortcut.description}</span>
                          <span
                            className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded ${scopeClass}`}
                          >
                            {scopeLabel}
                          </span>
                          {shortcut.isOverride && (
                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-blue-500/30">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm min-w-[120px] text-right">
                            {isActive ? 'Press keys…' : shortcut.keys || 'Unassigned'}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setRebinding((current) =>
                                current === shortcut.id ? null : shortcut.id
                              )
                            }
                            className="px-2 py-1 bg-ub-orange text-black rounded text-sm font-semibold focus:outline-none focus:ring focus:ring-ubt-blue"
                          >
                            {isActive ? 'Cancel' : 'Rebind'}
                          </button>
                        </div>
                      </div>
                      {renderConflictTargets(shortcut)}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
