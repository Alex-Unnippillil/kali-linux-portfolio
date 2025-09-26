import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  metadata?: {
    kaliCategory?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' },
];

const DEFAULT_KALI_CATEGORY = 'utilities';
const STORAGE_KEY = 'kali-category-filter';

const utilityIds = new Set((utilities as AppMeta[]).map((app) => app.id));
const gameIds = new Set((games as AppMeta[]).map((app) => app.id));

const deriveKaliCategory = (app: AppMeta) => {
  const meta = app.metadata?.kaliCategory;
  if (typeof meta === 'string' && meta.trim()) {
    return meta.trim().toLowerCase();
  }
  if (gameIds.has(app.id)) return 'games';
  if (utilityIds.has(app.id)) return 'utilities';
  return DEFAULT_KALI_CATEGORY;
};

const ApplicationsMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [kaliCategory, setKaliCategory] = useState<string>(() => {
    try {
      return safeLocalStorage?.getItem(STORAGE_KEY) || 'all';
    } catch {
      return 'all';
    }
  });

  const { allApps, favorites, recents, kaliCategories } = useMemo(() => {
    let pinned: string[] = [];
    try {
      pinned = JSON.parse(safeLocalStorage?.getItem('pinnedApps') || '[]');
    } catch {
      pinned = [];
    }
    const pinnedSet = new Set(pinned.filter((id): id is string => typeof id === 'string'));

    const baseApps = (apps as AppMeta[]).map((app) => {
      const normalizedCategory = deriveKaliCategory(app);
      return {
        ...app,
        favourite: pinnedSet.has(app.id) ? true : app.favourite,
        metadata: {
          ...app.metadata,
          kaliCategory: normalizedCategory,
        },
      } as AppMeta;
    });

    let recentIds: string[] = [];
    try {
      recentIds = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
    } catch {
      recentIds = [];
    }

    const seen = new Set<string>();
    const recentList = recentIds
      .filter((id): id is string => typeof id === 'string')
      .map((id) => {
        const match = baseApps.find((app) => app.id === id);
        if (!match || seen.has(match.id)) return null;
        seen.add(match.id);
        return match;
      })
      .filter((app): app is AppMeta => Boolean(app));

    const categories = new Set<string>();
    baseApps.forEach((app) => {
      categories.add((app.metadata?.kaliCategory || DEFAULT_KALI_CATEGORY).toLowerCase());
    });

    return {
      allApps: baseApps,
      favorites: baseApps.filter((app) => app.favourite),
      recents: recentList,
      kaliCategories: Array.from(categories).sort((a, b) => a.localeCompare(b)),
    };
  }, [open]);

  useEffect(() => {
    if (!safeLocalStorage) return;
    try {
      if (kaliCategory === 'all') {
        safeLocalStorage.removeItem(STORAGE_KEY);
      } else {
        safeLocalStorage.setItem(STORAGE_KEY, kaliCategory);
      }
    } catch {
      // ignore persistence errors
    }
  }, [kaliCategory]);

  useEffect(() => {
    if (kaliCategory === 'all') return;
    if (!kaliCategories.includes(kaliCategory)) {
      setKaliCategory('all');
    }
  }, [kaliCategories, kaliCategory]);

  const currentApps = useMemo(() => {
    let list: AppMeta[];
    switch (category) {
      case 'favorites':
        list = favorites;
        break;
      case 'recent':
        list = recents;
        break;
      default:
        list = allApps;
    }

    const activeCategory =
      category === 'utilities' || category === 'games' ? category : kaliCategory;

    if (activeCategory !== 'all') {
      list = list.filter(
        (app) => (app.metadata?.kaliCategory || DEFAULT_KALI_CATEGORY) === activeCategory
      );
    }

    if (query) {
      const q = query.toLowerCase();
      list = list.filter((app) => app.title.toLowerCase().includes(q));
    }

    return list;
  }, [category, query, allApps, favorites, recents, kaliCategory]);

  const handleCategoryChange = (id: string) => {
    setCategory(id);
    if (id === 'all') {
      setKaliCategory('all');
    } else if (id === 'utilities' || id === 'games') {
      setKaliCategory(id);
    }
  };

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, query, kaliCategory]);

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
                onClick={() => handleCategoryChange(cat.id)}
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

export default ApplicationsMenu;
