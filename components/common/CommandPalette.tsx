'use client';

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import apps from '../../apps.config';
import useKeymap from '../../apps/settings/keymapRegistry';

interface CommandItem {
  type: 'app' | 'file' | 'setting';
  label: string;
  action: () => void;
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

function fuzzyMatch(text: string, query: string) {
  const q = query.toLowerCase();
  let qi = 0;
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (qi < q.length && ch.toLowerCase() === q[qi]) {
      nodes.push(<mark key={i}>{ch}</mark>);
      qi += 1;
    } else {
      nodes.push(ch);
    }
  }
  return { matched: qi === q.length, nodes };
}

const staticFiles = [
  'architecture.md',
  'getting-started.md',
  'nmap-nse-walkthrough.md',
];

const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);

  const { shortcuts } = useKeymap();

  const items = useMemo<CommandItem[]>(() => {
    const appItems: CommandItem[] = apps
      .filter((a) => !a.disabled)
      .map((a) => ({
        type: 'app',
        label: a.title,
        action: () => {
          window.location.href = `/apps/${a.id}`;
        },
      }));
    const fileItems: CommandItem[] = staticFiles.map((f) => ({
      type: 'file',
      label: f,
      action: () => {
        window.open(`/docs/${f}`, '_blank');
      },
    }));
    const settingItems: CommandItem[] = [
      {
        type: 'setting',
        label: 'Settings',
        action: () => {
          window.location.href = '/apps/settings';
        },
      },
    ];
    return [...appItems, ...fileItems, ...settingItems];
  }, []);

  const filtered = useMemo(() => {
    if (!query) return items.map((i) => ({ ...i, nodes: i.label }));
    return items
      .map((item) => {
        const { matched, nodes } = fuzzyMatch(item.label, query);
        return matched ? { ...item, nodes } : null;
      })
      .filter(Boolean) as Array<CommandItem & { nodes: React.ReactNode[] }>;
  }, [items, query]);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return;
      const openShortcut =
        shortcuts.find((s) => s.description === 'Open command palette')?.keys ||
        'Ctrl+K';
      if (formatEvent(e) === openShortcut) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, shortcuts, toggle]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
    }
  }, [open]);

  const execute = () => {
    const item = filtered[selected];
    if (item) {
      setOpen(false);
      item.action();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 text-white"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg space-y-2">
        <input
          autoFocus
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelected((s) => (s + 1) % filtered.length);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelected((s) => (s - 1 + filtered.length) % filtered.length);
            } else if (e.key === 'Enter') {
              e.preventDefault();
              execute();
            }
          }}
          placeholder="Type a command"
          className="w-full rounded bg-black/40 p-2 text-white placeholder-gray-300 focus:outline-none"
        />
        <ul className="max-h-64 overflow-auto rounded bg-gray-900">
          {filtered.map((item, i) => (
            <li
              key={item.label + i}
              className={
                i === selected ? 'bg-blue-600 px-2 py-1' : 'px-2 py-1'
              }
            >
              {item.nodes}
              <span className="ml-2 text-xs opacity-60">[{item.type}]</span>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-2 py-1 opacity-60">No results</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
