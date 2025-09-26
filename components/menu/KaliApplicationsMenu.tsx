import React, { useMemo, useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

type Category = {
  id: string;
  label: string;
  apps: AppMeta[];
};

const buildCategories = (allApps: AppMeta[], open: boolean): Category[] => {
  const favoriteApps = allApps.filter(app => app.favourite);
  let recentApps: AppMeta[] = [];
  if (open) {
    try {
      const ids: string[] = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
      recentApps = ids
        .map(id => allApps.find(app => app.id === id))
        .filter(Boolean) as AppMeta[];
    } catch {
      recentApps = [];
    }
  }

  const utilityApps = (utilities as unknown as AppMeta[]) || [];
  const gameApps = (games as unknown as AppMeta[]) || [];

  return [
    { id: 'favorites', label: 'Favorites', apps: favoriteApps },
    { id: 'recent', label: 'Recent', apps: recentApps },
    { id: 'utilities', label: 'Utilities', apps: utilityApps },
    { id: 'games', label: 'Games', apps: gameApps },
    { id: 'all', label: 'All Applications', apps: allApps },
  ];
};

const KaliApplicationsMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState('favorites');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const allApps = useMemo(() => (apps as unknown as AppMeta[]) || [], []);
  const categories = useMemo(() => buildCategories(allApps, open), [allApps, open]);
  const activeCategory = categories.find(cat => cat.id === categoryId) ?? categories[0];

  const filteredApps = useMemo(() => {
    const list = activeCategory?.apps ?? [];
    if (!query.trim()) return list;
    const lower = query.toLowerCase();
    return list.filter(app => app.title.toLowerCase().includes(lower));
  }, [activeCategory, query]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlight(index => Math.min(index + 1, Math.max(filteredApps.length - 1, 0)));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlight(index => Math.max(index - 1, 0));
      } else if (event.key === 'Enter') {
        const app = filteredApps[highlight];
        if (app) {
          window.dispatchEvent(new CustomEvent('open-app', { detail: app.id }));
          setOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, filteredApps, highlight]);

  useEffect(() => {
    if (open) {
      setHighlight(0);
    }
  }, [open, categoryId, query]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
      >
        <Image
          src="/themes/Yaru/status/decompiler-symbolic.svg"
          alt="Applications menu"
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
          role="menu"
          tabIndex={-1}
        >
          <div className="flex flex-col bg-gray-800 p-2 min-w-[140px]" role="none">
            {categories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setCategoryId(cat.id);
                  setHighlight(0);
                }}
                className={`text-left px-2 py-1 rounded mb-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange ${
                  cat.id === activeCategory?.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
                role="menuitemradio"
                aria-checked={cat.id === activeCategory?.id}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3 min-w-[260px]">
            <label className="block text-xs uppercase tracking-wide text-gray-300" htmlFor="kali-applications-search">
              Search
            </label>
            <input
              id="kali-applications-search"
              className="mb-3 mt-1 w-full px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
              placeholder="Type to filter applications"
              value={query}
              onChange={event => setQuery(event.target.value)}
              autoFocus
            />
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
              {filteredApps.map((app, index) => (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('open-app', { detail: app.id }));
                    setOpen(false);
                  }}
                  className={`flex items-center rounded px-2 py-1 text-left text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ubb-orange ${
                    highlight === index ? 'bg-gray-700' : 'hover:bg-gray-700'
                  }`}
                >
                  <Image
                    src={app.icon.replace('./', '/')}
                    alt={`${app.title} icon`}
                    width={16}
                    height={16}
                    className="mr-2 h-4 w-4"
                  />
                  <span className="truncate">{app.title}</span>
                </button>
              ))}
              {filteredApps.length === 0 && (
                <div className="col-span-2 text-sm text-gray-300">No applications match your search.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KaliApplicationsMenu;
