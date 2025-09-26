'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

interface AppMeta {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All Applications' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' },
];

const ApplicationsMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const allApps: AppMeta[] = apps as unknown as AppMeta[];
  const favoriteApps = useMemo(() => allApps.filter((app) => app.favourite), [allApps]);
  const recentApps = useMemo(() => {
    if (!open) return [] as AppMeta[];
    try {
      const stored = safeLocalStorage?.getItem('recentApps');
      const ids: string[] = stored ? JSON.parse(stored) : [];
      return ids
        .map((id) => allApps.find((app) => app.id === id))
        .filter(Boolean) as AppMeta[];
    } catch {
      return [];
    }
  }, [allApps, open]);
  const utilityApps: AppMeta[] = utilities as unknown as AppMeta[];
  const gameApps: AppMeta[] = games as unknown as AppMeta[];

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
      const lower = query.toLowerCase();
      list = list.filter((app) => app.title.toLowerCase().includes(lower));
    }
    return list;
  }, [allApps, favoriteApps, gameApps, query, recentApps, utilityApps, category]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, query]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!open) return;
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlight((prev) => Math.min(prev + 1, currentApps.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlight((prev) => Math.max(prev - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const app = currentApps[highlight];
        if (app) openSelectedApp(app.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, currentApps, highlight]);

  const openSelectedApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        <Image
          src="/themes/Yaru/status/view-app-grid-symbolic.svg"
          alt="Applications"
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
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setOpen(false);
            }
          }}
        >
          <div className="flex flex-col bg-gray-800 p-2 min-w-[10rem]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`text-left px-2 py-1 rounded mb-1 rtl:text-right ${
                  category === cat.id ? 'bg-gray-700 text-white' : 'text-ubt-grey'
                }`}
                onClick={() => setCategory(cat.id)}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3">
            <input
              className="mb-3 w-64 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
              placeholder="Search applications"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {currentApps.map((app, index) => (
                <div key={app.id} className={index === highlight ? 'ring-2 ring-ubb-orange rounded' : ''}>
                  <UbuntuApp
                    id={app.id}
                    icon={app.icon}
                    name={app.title}
                    openApp={() => openSelectedApp(app.id)}
                    disabled={app.disabled}
                  />
                </div>
              ))}
              {!currentApps.length && (
                <p className="col-span-3 text-sm text-ubt-grey text-center">No applications found.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApplicationsMenu;
