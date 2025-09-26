import Image from 'next/image';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';

import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { appIndex, appIndexMap, AppIndexEntry } from '../../apps';

type AppConfig = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
  desktop_shortcut?: boolean;
  screen: unknown;
  defaultWidth?: number;
  defaultHeight?: number;
};

type AppWithMeta = AppConfig & {
  label: string;
  keywords: string[];
  category: string;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' },
];

const fuseKeys: Fuse.FuseOptionKey<AppIndexEntry>[] = [
  { name: 'label', weight: 0.55 },
  { name: 'keywords', weight: 0.3 },
  { name: 'category', weight: 0.15 },
];

const fuseOptions: Fuse.IFuseOptions<AppIndexEntry> = {
  keys: fuseKeys,
  threshold: 0.32,
  ignoreLocation: true,
  includeScore: false,
};

const augment = (list: AppConfig[]): AppWithMeta[] =>
  list.map(item => {
    const meta = appIndexMap.get(item.id);
    if (!meta) {
      return {
        ...item,
        label: item.title,
        keywords: [item.title, item.id],
        category: 'applications',
      };
    }

    return {
      ...item,
      label: meta.label,
      keywords: meta.keywords,
      category: meta.category,
    };
  });

const WhiskerMenuClient: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebouncedValue(query, 75);

  const fuse = useMemo(() => {
    const index = Fuse.createIndex(fuseKeys, appIndex);
    return new Fuse(appIndex, fuseOptions, index);
  }, []);

  const allApps = useMemo(() => augment(apps as AppConfig[]), []);
  const favoriteApps = useMemo(() => allApps.filter(app => app.favourite), [allApps]);
  const utilityApps = useMemo(() => augment(utilities as AppConfig[]), []);
  const gameApps = useMemo(() => augment(games as AppConfig[]), []);

  const recentApps = useMemo(() => {
    try {
      const ids: string[] = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
      return ids
        .map(id => allApps.find(app => app.id === id))
        .filter(Boolean) as AppWithMeta[];
    } catch {
      return [];
    }
  }, [allApps, open]);

  const baseApps = useMemo(() => {
    switch (category) {
      case 'favorites':
        return favoriteApps;
      case 'recent':
        return recentApps;
      case 'utilities':
        return utilityApps;
      case 'games':
        return gameApps;
      default:
        return allApps;
    }
  }, [category, allApps, favoriteApps, recentApps, utilityApps, gameApps]);

  const [filteredApps, setFilteredApps] = useState<AppWithMeta[]>(baseApps);

  useEffect(() => {
    setFilteredApps(baseApps);
  }, [baseApps]);

  useEffect(() => {
    if (!open) return;

    const trimmed = debouncedQuery.trim();
    if (!trimmed) {
      setFilteredApps(baseApps);
      return;
    }

    const baseMap = new Map(baseApps.map(app => [app.id, app]));
    const matches = fuse.search(trimmed, { limit: Math.max(baseApps.length, 24) });
    const resolved: AppWithMeta[] = [];

    for (const { item } of matches) {
      const candidate = baseMap.get(item.id);
      if (candidate) {
        resolved.push(candidate);
      }
    }

    setFilteredApps(resolved.length > 0 ? resolved : baseApps);
  }, [debouncedQuery, baseApps, fuse, open]);

  const currentApps = filteredApps;

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, debouncedQuery, currentApps.length]);

  const openSelectedApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setOpen(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Meta' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight(h => Math.min(h + 1, Math.max(currentApps.length - 1, 0)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight(h => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const app = currentApps[highlight];
        if (app) openSelectedApp(app.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, currentApps, highlight]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!open) return;
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        <Image
          src="/themes/Yaru/status/decompiler-symbolic.svg"
          alt="Menu"
          width={16}
          height={16}
          className="inline mr-1"
        />
        Applications
      </button>
      {open && (
        <div
          ref={menuRef}
          className="absolute left-0 mt-1 z-50 flex bg-ub-grey text-white shadow-lg"
          tabIndex={-1}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setOpen(false);
            }
          }}
        >
          <div className="flex flex-col bg-gray-800 p-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`text-left px-2 py-1 rounded mb-1 ${category === cat.id ? 'bg-gray-700' : ''}`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <input
              className="mb-3 w-64 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
              placeholder="Search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {currentApps.map((app, idx) => (
                <div key={app.id} className={idx === highlight ? 'ring-2 ring-ubb-orange' : ''}>
                  <UbuntuApp
                    id={app.id}
                    icon={app.icon}
                    name={app.title}
                    openApp={() => openSelectedApp(app.id)}
                    disabled={app.disabled}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenuClient;
