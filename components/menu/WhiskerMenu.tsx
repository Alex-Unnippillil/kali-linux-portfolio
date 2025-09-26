import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import ContextMenu from '../common/ContextMenu';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

type AppGridItemProps = {
  app: AppMeta;
  highlighted: boolean;
  onOpen: () => void;
  onAddFavorite: () => void;
  onAddPanel: () => void;
  onAddDesktop: () => void;
};

const FAVORITES_STORAGE_KEY = 'kali-favorites';

const AppGridItem: React.FC<AppGridItemProps> = ({
  app,
  highlighted,
  onOpen,
  onAddFavorite,
  onAddPanel,
  onAddDesktop,
}) => {
  const tileRef = useRef<HTMLDivElement>(null);

  const menuItems = useMemo(
    () => [
      { label: 'Add to Favorites', onSelect: onAddFavorite },
      { label: 'Add to Panel', onSelect: onAddPanel },
      { label: 'Add to Desktop', onSelect: onAddDesktop },
    ],
    [onAddFavorite, onAddPanel, onAddDesktop],
  );

  return (
    <div ref={tileRef} className={`relative ${highlighted ? 'ring-2 ring-ubb-orange rounded' : ''}`}>
      <UbuntuApp
        id={app.id}
        icon={app.icon}
        name={app.title}
        openApp={onOpen}
        disabled={app.disabled}
      />
      <ContextMenu targetRef={tileRef} items={menuItems} />
    </div>
  );
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
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const allApps: AppMeta[] = apps as any;
  const loadFavoriteIds = useCallback(() => {
    if (!safeLocalStorage) return;
    try {
      const raw = JSON.parse(safeLocalStorage.getItem(FAVORITES_STORAGE_KEY) || '[]');
      if (Array.isArray(raw)) {
        const filtered = raw.filter((id): id is string => typeof id === 'string');
        const unique = Array.from(new Set(filtered));
        setFavoriteIds(prev => {
          const sameLength = prev.length === unique.length && prev.every((val, idx) => val === unique[idx]);
          if (!sameLength) {
            if (unique.length !== filtered.length) {
              safeLocalStorage?.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(unique));
            }
            return unique;
          }
          return prev;
        });
      } else {
        setFavoriteIds([]);
        safeLocalStorage?.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([]));
      }
    } catch {
      setFavoriteIds([]);
      safeLocalStorage?.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([]));
    }
  }, []);

  useEffect(() => {
    loadFavoriteIds();
  }, [loadFavoriteIds]);

  useEffect(() => {
    if (open) {
      loadFavoriteIds();
    }
  }, [open, loadFavoriteIds]);

  const favoriteApps = allApps.filter(app => {
    if (app.favourite) return true;
    return favoriteIds.includes(app.id);
  });
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
  }, [category, query, allApps, favoriteApps, favoriteIds, recentApps, utilityApps, gameApps]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, query]);

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

  const addToFavorites = useCallback((id: string) => {
    const app = allApps.find(a => a.id === id);
    if (app?.favourite) return;
    setFavoriteIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      safeLocalStorage?.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, [allApps]);

  const dispatchDesktopEvent = useCallback((type: string, id: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(type, { detail: id }));
  }, []);

  const addToPanel = useCallback((id: string) => {
    dispatchDesktopEvent('desktop-pin-app', id);
    setFavoriteIds(prev => [...prev]);
  }, [dispatchDesktopEvent]);

  const addToDesktop = useCallback((id: string) => {
    dispatchDesktopEvent('desktop-add-shortcut', id);
  }, [dispatchDesktopEvent]);

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
                <AppGridItem
                  key={app.id}
                  app={app}
                  highlighted={idx === highlight}
                  onOpen={() => openSelectedApp(app.id)}
                  onAddFavorite={() => addToFavorites(app.id)}
                  onAddPanel={() => addToPanel(app.id)}
                  onAddDesktop={() => addToDesktop(app.id)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
