import React, { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import {
  KALI_CATEGORIES,
  KALI_TOOL_REGISTRY,
  type KaliCategoryId,
  type KaliSubcategoryId,
} from '../../data/kali';

type FilterKind = 'builtin' | 'kali-category' | 'kali-subcategory';

interface FilterOption {
  id: string;
  label: string;
  kind: FilterKind;
  categoryId?: KaliCategoryId;
  subcategoryId?: KaliSubcategoryId;
}

const BUILTIN_FILTERS: FilterOption[] = [
  { id: 'all', label: 'All', kind: 'builtin' },
  { id: 'favorites', label: 'Favorites', kind: 'builtin' },
  { id: 'recent', label: 'Recent', kind: 'builtin' },
  { id: 'utilities', label: 'Utilities', kind: 'builtin' },
  { id: 'games', label: 'Games', kind: 'builtin' },
];

const KALI_FILTER_GROUPS = KALI_CATEGORIES.map((category) => ({
  option: {
    id: `kali:${category.id}`,
    label: category.shortLabel,
    kind: 'kali-category' as const,
    categoryId: category.id,
  },
  subOptions: category.subcategories.map((subcategory) => ({
    id: `kali:${category.id}:${subcategory.id}`,
    label: subcategory.label,
    kind: 'kali-subcategory' as const,
    categoryId: category.id,
    subcategoryId: subcategory.id,
  })),
}));

const FILTER_LOOKUP = new Map<string, FilterOption>();

BUILTIN_FILTERS.forEach((filter) => FILTER_LOOKUP.set(filter.id, filter));
KALI_FILTER_GROUPS.forEach(({ option, subOptions }) => {
  FILTER_LOOKUP.set(option.id, option);
  subOptions.forEach((sub) => FILTER_LOOKUP.set(sub.id, sub));
});

const CATEGORY_APP_LOOKUP = (() => {
  const map = new Map<string, Set<string>>();
  const register = (key: string, appId: string) => {
    if (!map.has(key)) {
      map.set(key, new Set([appId]));
    } else {
      map.get(key)!.add(appId);
    }
  };
  KALI_TOOL_REGISTRY.forEach((entry) => {
    register(`kali:${entry.categoryId}`, entry.appId);
    if (entry.subcategoryId) {
      register(`kali:${entry.categoryId}:${entry.subcategoryId}`, entry.appId);
    }
  });
  return map;
})();

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [activeFilterId, setActiveFilterId] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const activeFilter = FILTER_LOOKUP.get(activeFilterId) ?? BUILTIN_FILTERS[0];

  const currentApps = useMemo(() => {
    let list: AppMeta[];
    switch (activeFilter.kind) {
      case 'builtin':
        switch (activeFilter.id) {
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
        break;
      case 'kali-category':
      case 'kali-subcategory': {
        const allowed = CATEGORY_APP_LOOKUP.get(activeFilter.id);
        if (!allowed || allowed.size === 0) {
          list = [];
        } else {
          list = allApps.filter((app) => allowed.has(app.id));
        }
        break;
      }
      default:
        list = allApps;
    }
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [activeFilter, query, allApps, favoriteApps, recentApps, utilityApps, gameApps]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, activeFilterId, query]);

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
            {BUILTIN_FILTERS.map((cat) => (
              <button
                key={cat.id}
                className={`text-left px-2 py-1 rounded mb-1 ${activeFilterId === cat.id ? 'bg-gray-700' : ''}`}
                onClick={() => setActiveFilterId(cat.id)}
              >
                {cat.label}
              </button>
            ))}
            <div className="mt-2 text-xs uppercase tracking-wide text-gray-400">Kali Categories</div>
            {KALI_FILTER_GROUPS.map(({ option, subOptions }) => (
              <div key={option.id} className="mb-1">
                <button
                  className={`text-left px-2 py-1 rounded w-full ${activeFilterId === option.id ? 'bg-gray-700' : ''}`}
                  onClick={() => setActiveFilterId(option.id)}
                >
                  {option.label}
                </button>
                {subOptions.map((sub) => (
                  <button
                    key={sub.id}
                    className={`text-left px-4 py-1 rounded w-full text-sm ${activeFilterId === sub.id ? 'bg-gray-700' : ''}`}
                    onClick={() => setActiveFilterId(sub.id)}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
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

export default WhiskerMenu;
