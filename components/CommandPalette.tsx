import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
interface AppInfo {
  id: string;
  title: string;
}

interface CommandItem {
  type: 'app' | 'file' | 'help';
  title: string;
  action: () => void;
}

interface CommandPaletteProps {
  openApp: (id: string) => void;
  apps: AppInfo[];
}

const filesIndex: CommandItem[] = [
  {
    type: 'file',
    title: 'README.md',
    action: () => window.open('/README.md', '_blank'),
  },
  {
    type: 'file',
    title: 'LICENSE',
    action: () => window.open('/LICENSE', '_blank'),
  },
];

const helpIndex: CommandItem[] = [
  {
    type: 'help',
    title: 'Security Education',
    action: () => (window.location.href = '/security-education'),
  },
  {
    type: 'help',
    title: 'Video Gallery',
    action: () => (window.location.href = '/video-gallery'),
  },
];

const CommandPalette: React.FC<CommandPaletteProps> = ({ openApp, apps }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'app' | 'file' | 'help'>('all');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const appItems: CommandItem[] = useMemo(
    () =>
      apps.map((a) => ({
        type: 'app',
        title: a.title,
        action: () => openApp(a.id),
      })),
    [apps, openApp],
  );

  const allItems = useMemo(() => [...appItems, ...filesIndex, ...helpIndex], [appItems]);

  const filtered = useMemo(() => {
    let items = allItems;
    if (scope !== 'all') items = items.filter((i) => i.type === scope);
    if (query) items = items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()));
    return items;
  }, [allItems, query, scope]);

  useEffect(() => {
    const handleGlobal = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handleGlobal as any);
    return () => window.removeEventListener('keydown', handleGlobal as any);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setScope('all');
      setActive(0);
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive((i) => (i + 1) % Math.max(filtered.length, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive((i) => (i - 1 + Math.max(filtered.length, 1)) % Math.max(filtered.length, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filtered[active];
        if (item) {
          item.action();
          setOpen(false);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handle as any);
    return () => window.removeEventListener('keydown', handle as any);
  }, [open, filtered, active]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black bg-opacity-50 pt-20">
      <div className="bg-ub-grey w-80 rounded shadow-lg p-4">
        <div className="flex mb-2 gap-2">
          <input
            ref={inputRef}
            className="flex-1 rounded bg-black bg-opacity-20 text-white px-2 py-1 focus:outline-none"
            placeholder="Search..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
          />
          <select
            className="bg-black bg-opacity-20 text-white rounded px-1"
            value={scope}
            onChange={(e) => {
              setScope(e.target.value as any);
              setActive(0);
            }}
          >
            <option value="all">All</option>
            <option value="app">Apps</option>
            <option value="file">Files</option>
            <option value="help">Help</option>
          </select>
        </div>
        <ul className="max-h-60 overflow-y-auto">
          {filtered.map((item, idx) => (
            <li
              key={`${item.type}-${item.title}`}
              className={`px-2 py-1 cursor-pointer ${
                idx === active ? 'bg-ubt-blue text-white' : 'text-ubt-grey'
              }`}
              onMouseEnter={() => setActive(idx)}
              onClick={() => {
                item.action();
                setOpen(false);
              }}
            >
              {item.title}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-2 py-1 text-ubt-grey">No results</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
