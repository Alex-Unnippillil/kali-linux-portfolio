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

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);
  const categoryRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const axeInitialized = useRef(false);

  const menuId = 'whisker-menu-panel';
  const treeId = 'whisker-menu-categories';
  const listboxId = 'whisker-menu-apps';

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

  const clampIndex = useCallback(
    (value: number) => {
      if (currentApps.length === 0) {
        return 0;
      }
      return Math.min(Math.max(value, 0), currentApps.length - 1);
    },
    [currentApps.length]
  );

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, query]);

  useEffect(() => {
    setHighlight(h => clampIndex(h));
  }, [clampIndex]);

  const openSelectedApp = useCallback(
    (app: AppMeta) => {
      if (app.disabled) {
        return;
      }
      window.dispatchEvent(new CustomEvent('open-app', { detail: app.id }));
      setOpen(false);
    },
    []
  );

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
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

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

  useEffect(() => {
    if (!open || axeInitialized.current) {
      return;
    }
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
      return;
    }

    let active = true;

    const initAxe = async () => {
      try {
        const [{ default: axe }, ReactDOM] = await Promise.all([
          import('@axe-core/react'),
          import('react-dom'),
        ]);
        if (!active) {
          return;
        }
        axeInitialized.current = true;
        axe(React, ReactDOM, 1000, undefined, {
          elementRef: menuRef,
          resultTypes: ['violations'],
        });
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.warn('Failed to initialize axe accessibility checks', error);
        }
      }
    };

    void initAxe();

    return () => {
      active = false;
    };
  }, [open]);

  const focusCategoryAt = useCallback((index: number) => {
    const button = categoryRefs.current[index];
    button?.focus();
  }, []);

  const handleCategoryKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const delta = event.key === 'ArrowDown' ? 1 : -1;
        const nextIndex = Math.min(Math.max(index + delta, 0), CATEGORIES.length - 1);
        if (nextIndex !== index) {
          setCategory(CATEGORIES[nextIndex].id);
          focusCategoryAt(nextIndex);
        }
      } else if (event.key === 'Home') {
        event.preventDefault();
        setCategory(CATEGORIES[0].id);
        focusCategoryAt(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        const lastIndex = CATEGORIES.length - 1;
        setCategory(CATEGORIES[lastIndex].id);
        focusCategoryAt(lastIndex);
      }
    },
    [focusCategoryAt]
  );

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight(prev => clampIndex(prev + 1));
      listboxRef.current?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight(prev => clampIndex(prev - 1));
      listboxRef.current?.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const app = currentApps[highlight];
      if (app) {
        openSelectedApp(app);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const activeOption = currentApps[highlight];
  const activeOptionId = activeOption ? `whisker-option-${activeOption.id}` : undefined;

  const handleListboxKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight(prev => clampIndex(prev + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight(prev => clampIndex(prev - 1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      setHighlight(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      setHighlight(clampIndex(currentApps.length - 1));
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (activeOption) {
        openSelectedApp(activeOption);
      }
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
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
          id={menuId}
          role="menu"
          aria-label="Application launcher"
          className="absolute left-0 mt-1 z-50 flex bg-ub-grey text-white shadow-lg"
          tabIndex={-1}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setOpen(false);
            }
          }}
        >
          <div className="flex flex-col bg-gray-800 p-2" role="presentation">
            <ul
              id={treeId}
              role="tree"
              aria-label="Application categories"
              aria-controls={listboxId}
              className="flex flex-col"
            >
              {CATEGORIES.map((cat, idx) => {
                const isActiveCategory = category === cat.id;
                return (
                  <li key={cat.id} role="none">
                    <button
                      ref={(el) => {
                        categoryRefs.current[idx] = el;
                      }}
                      role="treeitem"
                      aria-selected={isActiveCategory}
                      tabIndex={isActiveCategory ? 0 : -1}
                      className={`text-left px-2 py-1 rounded mb-1 ${isActiveCategory ? 'bg-gray-700' : ''}`}
                      onClick={() => setCategory(cat.id)}
                      onKeyDown={(event) => handleCategoryKeyDown(event, idx)}
                    >
                      {cat.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="p-3">
            <input
              className="mb-3 w-64 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
              placeholder="Search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
            />
            <ul
              ref={listboxRef}
              id={listboxId}
              role="listbox"
              aria-label="Applications"
              className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto focus:outline-none"
              tabIndex={0}
              aria-activedescendant={activeOptionId}
              onKeyDown={handleListboxKeyDown}
            >
              {currentApps.map((app, idx) => {
                const optionId = `whisker-option-${app.id}`;
                const isActive = idx === highlight;
                return (
                  <li key={app.id} role="none" className="list-none">
                    <div
                      id={optionId}
                      role="option"
                      aria-selected={isActive}
                      aria-disabled={app.disabled || undefined}
                      className={isActive ? 'ring-2 ring-ubb-orange rounded' : 'rounded'}
                      onMouseEnter={() => setHighlight(idx)}
                      onFocus={() => setHighlight(idx)}
                      onClick={() => {
                        setHighlight(idx);
                        listboxRef.current?.focus();
                      }}
                      onDoubleClick={() => openSelectedApp(app)}
                    >
                      <UbuntuApp
                        id={app.id}
                        icon={app.icon}
                        name={app.title}
                        openApp={() => openSelectedApp(app)}
                        disabled={app.disabled}
                        roleOverride="presentation"
                        tabIndexOverride={-1}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
