'use client';

import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';
import Modal from '../base/Modal';

interface Shortcut {
  description: string;
  keys: string;
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

const Shortcuts: React.FC = () => {
  const { shortcuts: globalShortcuts } = useKeymap();
  const [appShortcuts, setAppShortcuts] = useState<Shortcut[]>([]);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<'global' | 'app'>('global');
  const searchRef = useRef<HTMLInputElement>(null);
  const tabRefs = {
    global: useRef<HTMLButtonElement>(null),
    app: useRef<HTMLButtonElement>(null),
  } as const;

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const handleGlobalKey = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (isInput) return;
      const show =
        globalShortcuts.find(
          (s) => s.description === 'Show keyboard shortcuts',
        )?.keys || '?';
      if (formatEvent(e) === show) {
        e.preventDefault();
        toggle();
      }
    },
    [globalShortcuts, toggle],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleGlobalKey]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive('global');
      setAppShortcuts(((window as any).__appShortcuts as Shortcut[]) || []);
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  const categories = [
    { id: 'global', label: 'Global', shortcuts: globalShortcuts },
    { id: 'app', label: 'App', shortcuts: appShortcuts },
  ];

  const filterList = (list: Shortcut[]) =>
    list.filter(
      (s) =>
        s.description.toLowerCase().includes(query.toLowerCase()) ||
        s.keys.toLowerCase().includes(query.toLowerCase()),
    );

  const handleTabKey = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    id: 'global' | 'app',
  ) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const order: Array<'global' | 'app'> = ['global', 'app'];
    const idx = order.indexOf(id);
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = order[(idx + dir + order.length) % order.length];
    setActive(next);
    tabRefs[next].current?.focus();
  };

  const current = categories.find((c) => c.id === active)!;
  const visible = filterList(current.shortcuts);

  return (
    <Modal isOpen={open} onClose={() => setOpen(false)}>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 text-white">
        <div className="max-w-xl w-full space-y-4" role="document">
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
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shortcuts..."
            className="w-full p-2 rounded bg-black/30 text-white"
          />
          <div role="tablist" aria-label="Shortcut categories" className="flex space-x-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                role="tab"
                aria-selected={active === cat.id}
                tabIndex={active === cat.id ? 0 : -1}
                ref={tabRefs[cat.id as 'global' | 'app']}
                onKeyDown={(e) => handleTabKey(e, cat.id as 'global' | 'app')}
                onClick={() => setActive(cat.id as 'global' | 'app')}
                disabled={cat.shortcuts.length === 0}
                className={`px-2 py-1 rounded focus:outline-none ${
                  active === cat.id ? 'bg-white text-black' : 'bg-black/30'
                } ${cat.shortcuts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <ul className="space-y-1" aria-label={`${current.label} shortcuts`}>
            {visible.map((s, i) => (
              <li key={i} className="flex justify-between px-2 py-1">
                <span className="font-mono mr-4">{s.keys}</span>
                <span className="flex-1">{s.description}</span>
              </li>
            ))}
            {visible.length === 0 && (
              <li className="px-2 py-1 text-sm">No shortcuts</li>
            )}
          </ul>
        </div>
      </div>
    </Modal>
  );
};

export default Shortcuts;
