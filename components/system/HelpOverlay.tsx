'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';

export interface HelpOverlayShortcut {
  description: string;
  keys: string;
}

export interface HelpOverlayContextMetadata {
  appId: string;
  appName: string;
  shortcuts: HelpOverlayShortcut[];
}

interface HelpOverlayContextValue {
  context: HelpOverlayContextMetadata | null;
  setContext: (context: HelpOverlayContextMetadata | null) => void;
}

export const HelpOverlayContext = createContext<HelpOverlayContextValue>({
  context: null,
  setContext: () => {},
});

export const HelpOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [context, setContext] = useState<HelpOverlayContextMetadata | null>(null);
  const value = useMemo(() => ({ context, setContext }), [context]);
  return (
    <HelpOverlayContext.Provider value={value}>
      {children}
    </HelpOverlayContext.Provider>
  );
};

export const useHelpOverlayContext = () => useContext(HelpOverlayContext);

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

const findConflicts = (entries: HelpOverlayShortcut[]): Set<string> => {
  const counts = entries.reduce<Map<string, number>>((map, shortcut) => {
    map.set(shortcut.keys, (map.get(shortcut.keys) || 0) + 1);
    return map;
  }, new Map());
  return new Set(
    Array.from(counts.entries())
      .filter(([, count]) => count > 1)
      .map(([key]) => key),
  );
};

const HelpOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { shortcuts } = useKeymap();
  const { context } = useHelpOverlayContext();

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) return;
      const show =
        shortcuts.find((s) => s.description === 'Show keyboard shortcuts')?.keys || '?';
      if (formatEvent(e) === show) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, toggle, shortcuts]);

  const handleExport = useCallback(() => {
    const data = JSON.stringify(shortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shortcuts.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [shortcuts]);

  if (!open) return null;

  const globalConflicts = findConflicts(shortcuts);
  const contextShortcuts = context?.shortcuts ?? [];
  const hasContextShortcuts = contextShortcuts.length > 0;
  const contextConflicts = findConflicts(contextShortcuts);
  const activeLabel = context?.appName || context?.appId;

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
        {hasContextShortcuts && activeLabel && (
          <section className="space-y-2">
            <h3 className="text-lg font-semibold">Active app — {activeLabel}</h3>
            <ul className="space-y-1">
              {contextShortcuts.map((shortcut, index) => (
                <li
                  key={`${shortcut.description}-${index}`}
                  data-conflict={contextConflicts.has(shortcut.keys) ? 'true' : 'false'}
                  className={
                    contextConflicts.has(shortcut.keys)
                      ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
                      : 'flex justify-between px-2 py-1'
                  }
                >
                  <span className="font-mono mr-4">{shortcut.keys}</span>
                  <span className="flex-1">{shortcut.description}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="space-y-2">
          <h3 className="text-lg font-semibold">Global shortcuts</h3>
          <ul className="space-y-1">
            {shortcuts.map((shortcut, index) => (
              <li
                key={`${shortcut.description}-${index}`}
                data-conflict={globalConflicts.has(shortcut.keys) ? 'true' : 'false'}
                className={
                  globalConflicts.has(shortcut.keys)
                    ? 'flex justify-between bg-red-600/70 px-2 py-1 rounded'
                    : 'flex justify-between px-2 py-1'
                }
              >
                <span className="font-mono mr-4">{shortcut.keys}</span>
                <span className="flex-1">{shortcut.description}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

export default HelpOverlay;
