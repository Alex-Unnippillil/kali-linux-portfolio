import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import { useVirtualizer } from '@tanstack/react-virtual';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' }
];

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const appsContainerRef = useRef<HTMLDivElement>(null);

  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);
  const recentApps = useMemo(() => {
    try {
      const ids: string[] = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
      return ids.map(id => allApps.find(a => a.id === id)).filter(Boolean) as AppMeta[];
    } catch {
      return [];
    }
  }, [allApps, open]);
  const utilityApps: AppMeta[] = utilities as any;
  const gameApps: AppMeta[] = games as any;

  const currentApps = useMemo(() => {
    let list: AppMeta[];
    switch (category) {
      case 'favorites':
        list = favoriteApps;
        break;
      case 'recent':
        list = recentApps;
        break;
      case 'utilities':
        list = utilityApps;
        break;
      case 'games':
        list = gameApps;
        break;
      default:
        list = allApps;
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [category, query, allApps, favoriteApps, recentApps, utilityApps, gameApps]);

  const columns = 3;
  const rowCount = Math.ceil(currentApps.length / columns);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => appsContainerRef.current,
    estimateSize: () => 112,
    overscan: 3,
  });

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
    rowVirtualizer.scrollToOffset(0);
  }, [open, category, query, currentApps.length, rowVirtualizer]);

  useEffect(() => {
    if (!open || !currentApps.length) {
      rowVirtualizer.scrollToOffset(0);
      return;
    }
    const rowIndex = Math.floor(highlight / columns);
    rowVirtualizer.scrollToIndex(rowIndex, { align: 'nearest' });
  }, [highlight, open, currentApps.length, rowVirtualizer]);

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
        setHighlight(h => Math.min(h + 1, currentApps.length - 1));
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
            <div
              ref={appsContainerRef}
              className="max-h-64 overflow-y-auto outline-none scroll-smooth"
            >
              <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const startIndex = virtualRow.index * columns;
                  const items = [] as React.ReactNode[];
                  for (let columnIndex = 0; columnIndex < columns; columnIndex++) {
                    const index = startIndex + columnIndex;
                    if (index >= currentApps.length) {
                      items.push(
                        <div key={`empty-${virtualRow.index}-${columnIndex}`} />
                      );
                      continue;
                    }
                    const app = currentApps[index];
                    items.push(
                      <div
                        key={app.id}
                        className={`${index === highlight ? 'ring-2 ring-ubb-orange rounded' : ''}`}
                      >
                        <UbuntuApp
                          id={app.id}
                          icon={app.icon}
                          name={app.title}
                          openApp={() => openSelectedApp(app.id)}
                          disabled={app.disabled}
                        />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={virtualRow.key}
                      className="grid gap-2"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        transform: `translateY(${virtualRow.start}px)`,
                        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                      }}
                    >
                      {items}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
