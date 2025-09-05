'use client';

import { useEffect, useMemo, useState } from 'react';
import path from 'path';
import defaultShortcuts from '@/data/xfce4/default-shortcuts.json';

interface Shortcut {
  command: string;
  keys: string;
}

const SHORTCUT_PATH = path.join(
  process.env.HOME || '',
  '.config',
  'xfce4',
  'shortcuts.json'
);

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

export default function WMKeyboard() {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(defaultShortcuts);
  const [query, setQuery] = useState('');
  const [rebinding, setRebinding] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const fs = await import('fs/promises');
        const data = await fs.readFile(SHORTCUT_PATH, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setShortcuts(parsed as Shortcut[]);
        }
      } catch {
        // if file doesn't exist, initialize with defaults
        setShortcuts(defaultShortcuts);
      }
    })();
  }, []);

  const filtered = useMemo(
    () =>
      shortcuts.filter((s) =>
        s.command.toLowerCase().includes(query.toLowerCase())
      ),
    [shortcuts, query]
  );

  const saveShortcuts = async (next: Shortcut[]) => {
    setShortcuts(next);
    try {
      const fs = await import('fs/promises');
      await fs.mkdir(path.dirname(SHORTCUT_PATH), { recursive: true });
      await fs.writeFile(SHORTCUT_PATH, JSON.stringify(next, null, 2), 'utf8');
    } catch (err) {
      console.error('Failed to save shortcuts', err);
    }
  };

  useEffect(() => {
    if (!rebinding) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      const combo = formatEvent(e);
      const updated = shortcuts.map((s) =>
        s.command === rebinding ? { ...s, keys: combo } : s
      );
      void saveShortcuts(updated);
      setRebinding(null);
    };
    window.addEventListener('keydown', handler, { once: true });
    return () => window.removeEventListener('keydown', handler);
  }, [rebinding, shortcuts]);

  return (
    <div className="space-y-2">
      <input
        type="text"
        placeholder="Search shortcuts"
        aria-label="Search shortcuts"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full rounded border px-2 py-1"
      />
      <ul className="space-y-1">
        {filtered.map((s) => (
          <li key={s.command} className="flex items-center justify-between px-2 py-1">
            <span className="flex-1">{s.command}</span>
            <span className="font-mono mr-2">{s.keys}</span>
            <button
              type="button"
              onClick={() => setRebinding(s.command)}
              className="px-2 py-1 bg-ub-orange text-white rounded text-sm"
            >
              {rebinding === s.command ? 'Press keys...' : 'Rebind'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

