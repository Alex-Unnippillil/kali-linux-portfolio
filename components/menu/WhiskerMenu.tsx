import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import Image from 'next/image';
import apps, { utilities, games } from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';

type LauncherApp = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
  category: string;
  recent?: boolean;
};

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'recent', label: 'Recent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'games', label: 'Games' },
];

const buildAriaLabel = (app: LauncherApp) => {
  const segments = [
    app.title,
    app.category ? `Category: ${app.category}` : undefined,
    app.recent ? 'Recent app' : undefined,
    'Press Enter to open',
    'Press Alt plus Enter (Alt+Enter) to open a new window',
  ].filter(Boolean) as string[];

  return `${segments.join('. ')}.`;
};

const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const allApps = apps as LauncherApp[];
  const favoriteApps = useMemo(
    () => allApps.filter((app) => app.favourite),
    [allApps, open]
  );

  const metadataRecentApps = useMemo(
    () => allApps.filter((app) => app.recent),
    [allApps, open]
  );

  const recentApps = useMemo(() => {
    let ids: string[] = [];
    try {
      ids = JSON.parse(safeLocalStorage?.getItem('recentApps') || '[]');
    } catch {
      ids = [];
    }
    if (!ids.length) {
      return metadataRecentApps;
    }
    const resolved = ids
      .map((id) => allApps.find((app) => app.id === id))
      .filter(Boolean) as LauncherApp[];
    const fallback = metadataRecentApps.filter(
      (app) => !resolved.some((item) => item.id === app.id)
    );
    return [...resolved, ...fallback];
  }, [allApps, metadataRecentApps, open]);

  const utilityApps = utilities as LauncherApp[];
  const gameApps = games as LauncherApp[];

  const currentApps = useMemo(() => {
    let list: LauncherApp[];
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
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((app) => app.title.toLowerCase().includes(q));
    }
    return list;
  }, [category, query, allApps, favoriteApps, recentApps, utilityApps, gameApps, open]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, category, query]);

  useEffect(() => {
    if (!open) return;
    if (!currentApps.length) {
      setHighlight(0);
      return;
    }
    setHighlight((value) => Math.min(value, currentApps.length - 1));
  }, [currentApps, open]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, currentApps.length);
  }, [currentApps.length]);

  const openSelectedApp = useCallback(
    (app: LauncherApp | undefined, options?: { spawnNew?: boolean }) => {
      if (!app || app.disabled) return;
      window.dispatchEvent(
        new CustomEvent('open-app', {
          detail: { id: app.id, spawnNew: !!options?.spawnNew },
        })
      );
      setOpen(false);
    },
    []
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Meta' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') {
        setOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlight((value) => Math.min(value + 1, currentApps.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlight((value) => Math.max(value - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const app = currentApps[highlight];
        openSelectedApp(app, { spawnNew: e.altKey });
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

  useEffect(() => {
    if (!open) return;
    const node = itemRefs.current[highlight];
    if (node?.scrollIntoView) {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [highlight, open, currentApps.length]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
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
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                aria-pressed={category === cat.id}
                className={`text-left px-2 py-1 rounded mb-1 transition ${
                  category === cat.id ? 'bg-gray-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => {
                  setCategory(cat.id);
                  setHighlight(0);
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-3 w-80">
            <input
              className="mb-3 w-full px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {currentApps.length === 0 ? (
              <p className="text-sm text-gray-300">No applications match your search.</p>
            ) : (
              <ul
                role="listbox"
                aria-label="Application results"
                className="max-h-64 overflow-y-auto space-y-2 pr-1"
              >
                {currentApps.map((app, idx) => {
                  const isHighlighted = idx === highlight;
                  const iconSrc = app.icon.replace('./', '/');
                  const className = `group w-full text-left rounded-md border border-transparent px-3 py-2 transition ${
                    isHighlighted
                      ? 'bg-gray-700 border-gray-500 ring-2 ring-orange-400'
                      : 'hover:bg-gray-700 focus-visible:ring-2 focus-visible:ring-orange-400'
                  } ${app.disabled ? 'opacity-50 cursor-not-allowed' : ''}`;

                  return (
                    <li key={app.id}>
                      <button
                        ref={(node) => {
                          itemRefs.current[idx] = node;
                        }}
                        type="button"
                        className={className}
                        aria-label={buildAriaLabel(app)}
                        aria-keyshortcuts="Enter Alt+Enter"
                        aria-selected={isHighlighted}
                        onMouseEnter={() => setHighlight(idx)}
                        onFocus={() => setHighlight(idx)}
                        onClick={() => openSelectedApp(app)}
                        disabled={app.disabled}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <Image
                              src={iconSrc}
                              alt={`${app.title} icon`}
                              width={40}
                              height={40}
                              className="h-10 w-10"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-white">{app.title}</span>
                              {app.recent && (
                                <span
                                  aria-hidden
                                  className="inline-flex items-center rounded bg-orange-400 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black"
                                >
                                  Recent
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-300">{app.category}</div>
                            <div
                              aria-hidden
                              className={`mt-2 flex flex-wrap gap-2 text-[10px] text-gray-200 ${
                                isHighlighted ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                              }`}
                            >
                              <span className="rounded border border-gray-600 bg-black bg-opacity-40 px-1.5 py-0.5">
                                Enter
                              </span>
                              <span className="rounded border border-gray-600 bg-black bg-opacity-40 px-1.5 py-0.5">
                                Alt + Enter
                              </span>
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
