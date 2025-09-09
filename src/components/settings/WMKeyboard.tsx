'use client';

import { useEffect, useMemo, useState } from 'react';
import defaultShortcuts from '@/data/xfce4/default-shortcuts.json';

interface Shortcut {
  command: string;
  keys: string;
}

const STORAGE_KEY = 'xfce4_shortcuts';

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
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setShortcuts(parsed as Shortcut[]);
          return;
        }
      }
      setShortcuts(defaultShortcuts);
    } catch {
      setShortcuts(defaultShortcuts);
    }
  }, []);

  const filtered = useMemo(
    () =>
      shortcuts.filter((s) =>
        s.command.toLowerCase().includes(query.toLowerCase())
      ),
    [shortcuts, query]
  );

  const saveShortcuts = (next: Shortcut[]) => {
    setShortcuts(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
      saveShortcuts(updated);
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

