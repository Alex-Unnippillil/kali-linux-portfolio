import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

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

type DesktopOpenRequest = {
  id: string;
  spawnNew?: boolean;
};

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
    const handle = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(handle);
  }, [open, category, query]);

  const sendOpenApp = useCallback(
    (id: string, options?: { closeOverlay?: boolean; spawnNew?: boolean }) => {
      const detail: DesktopOpenRequest = { id };
      if (options?.spawnNew) {
        detail.spawnNew = true;
      }
      window.dispatchEvent(new CustomEvent('open-app', { detail }));
      if (options?.closeOverlay) {
        setOpen(false);
      } else {
        searchInputRef.current?.focus();
      }
    },
    [setOpen]
  );

  const openSelectedApp = useCallback(
    (id: string) => {
      sendOpenApp(id, { closeOverlay: true });
    },
    [sendOpenApp]
  );

  const pinApp = useCallback((id: string) => {
    window.dispatchEvent(
      new CustomEvent('desktop-pin-app', { detail: { id } })
    );
    searchInputRef.current?.focus();
  }, []);

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
  }, [open, currentApps, highlight, openSelectedApp]);

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
          role="dialog"
          aria-label="Application search"
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
              ref={searchInputRef}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {currentApps.map((app, idx) => (
                <div
                  key={app.id}
                  className={`rounded p-1 ${idx === highlight ? 'ring-2 ring-ubb-orange' : ''}`}
                >
                  <UbuntuApp
                    id={app.id}
                    icon={app.icon}
                    name={app.title}
                    openApp={() => openSelectedApp(app.id)}
                    disabled={app.disabled}
                  />
                  {query && (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => sendOpenApp(app.id)}
                        disabled={app.disabled}
                        className="px-2 py-1 bg-black bg-opacity-40 rounded hover:bg-opacity-60 disabled:opacity-40"
                        aria-label={`Open ${app.title}`}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        onClick={() => sendOpenApp(app.id, { spawnNew: true })}
                        disabled={app.disabled}
                        className="px-2 py-1 bg-black bg-opacity-40 rounded hover:bg-opacity-60 disabled:opacity-40"
                        aria-label={`Open new window for ${app.title}`}
                      >
                        Open new window
                      </button>
                      <button
                        type="button"
                        onClick={() => pinApp(app.id)}
                        disabled={app.disabled}
                        className="px-2 py-1 bg-black bg-opacity-40 rounded hover:bg-opacity-60 disabled:opacity-40"
                        aria-label={`Pin ${app.title}`}
                      >
                        Pin
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
