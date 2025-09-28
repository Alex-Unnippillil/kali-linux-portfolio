'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import { KALI_CATEGORIES as BASE_KALI_CATEGORIES } from './ApplicationsMenu';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

type CategorySource =
  | { type: 'all' }
  | { type: 'favorites' }
  | { type: 'recent' }
  | { type: 'ids'; appIds: readonly string[] };

type CategoryDefinitionBase = {
  id: string;
  label: string;
  icon: string;
} & CategorySource;

const TRANSITION_DURATION = 180;
const RECENT_STORAGE_KEY = 'recentApps';
const CATEGORY_STORAGE_KEY = 'whisker-menu-category';

const CATEGORY_DEFINITIONS = [
  {
    id: 'all',
    label: 'All Applications',
    icon: '/themes/Kali/panel/decompiler-symbolic.svg',
    type: 'all',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: '/themes/Kali/panel/emblem-system-symbolic.svg',
    type: 'favorites',
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: '/themes/Kali/panel/process-working-symbolic.svg',
    type: 'recent',
  },
  {
    id: 'information-gathering',
    label: 'Information Gathering',
    icon: '/themes/kali/categories/information-gathering.svg',
    type: 'ids',
    appIds: ['nmap-nse', 'reconng', 'kismet', 'wireshark'],
  },
  {
    id: 'vulnerability-analysis',
    label: 'Vulnerability Analysis',
    icon: '/themes/kali/categories/vulnerability-analysis.svg',
    type: 'ids',
    appIds: ['nessus', 'openvas', 'nikto'],
  },
  {
    id: 'web-app-analysis',
    label: 'Web App Analysis',
    icon: '/themes/kali/categories/web-application-analysis.svg',
    type: 'ids',
    appIds: ['http', 'beef', 'metasploit'],
  },
  {
    id: 'password-attacks',
    label: 'Password Attacks',
    icon: '/themes/kali/categories/password-attacks.svg',
    type: 'ids',
    appIds: ['john', 'hashcat', 'hydra'],
  },
  {
    id: 'wireless-attacks',
    label: 'Wireless Attacks',
    icon: '/themes/kali/categories/wireless-attacks.svg',
    type: 'ids',
    appIds: ['kismet', 'reaver', 'wireshark'],
  },
  {
    id: 'exploitation-tools',
    label: 'Exploitation Tools',
    icon: '/themes/kali/categories/exploitation-tools.svg',
    type: 'ids',
    appIds: ['metasploit', 'security-tools', 'beef'],
  },
  {
    id: 'sniffing-spoofing',
    label: 'Sniffing & Spoofing',
    icon: '/themes/kali/categories/sniffing-spoofing.svg',
    type: 'ids',
    appIds: ['dsniff', 'ettercap', 'wireshark'],
  },
  {
    id: 'post-exploitation',
    label: 'Post Exploitation',
    icon: '/themes/kali/categories/post-exploitation.svg',
    type: 'ids',
    appIds: ['msf-post', 'mimikatz', 'volatility'],
  },
  {
    id: 'forensics-reporting',
    label: 'Forensics & Reporting',
    icon: '/themes/kali/categories/forensics.svg',
    type: 'ids',
    appIds: ['autopsy', 'evidence-vault', 'project-gallery'],
  },
] as const satisfies readonly CategoryDefinitionBase[];

type CategoryDefinition = (typeof CATEGORY_DEFINITIONS)[number];
const isCategoryId = (
  value: string,
): value is CategoryDefinition['id'] =>
  CATEGORY_DEFINITIONS.some(cat => cat.id === value);

type CategoryConfig = CategoryDefinition & { apps: AppMeta[] };

const KALI_CATEGORIES = BASE_KALI_CATEGORIES.map((category, index) => ({
  ...category,
  number: String(index + 1).padStart(2, '0'),
}));

const QUICK_FILTER_ORDER: Array<CategoryDefinition['id']> = ['all', 'favorites', 'recent'];

const readRecentAppIds = (): string[] => {
  try {
    const stored = safeLocalStorage?.getItem(RECENT_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
};


const WhiskerMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [category, setCategory] = useState<CategoryDefinition['id']>('all');

  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [categoryHighlight, setCategoryHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);


  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);
  useEffect(() => {
    setRecentIds(readRecentAppIds());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setRecentIds(readRecentAppIds());
  }, [isOpen]);

  const recentApps = useMemo(() => {
    const mapById = new Map(allApps.map(app => [app.id, app] as const));
    return recentIds
      .map(appId => mapById.get(appId))
      .filter((app): app is AppMeta => Boolean(app));
  }, [allApps, recentIds]);
  const categoryConfigs = useMemo<CategoryConfig[]>(() => {
    const mapById = new Map(allApps.map(app => [app.id, app] as const));

    return CATEGORY_DEFINITIONS.map((definition) => {
      let appsForCategory: AppMeta[] = [];
      switch (definition.type) {
        case 'all':
          appsForCategory = allApps;
          break;
        case 'favorites':
          appsForCategory = favoriteApps;
          break;
        case 'recent':
          appsForCategory = recentApps;
          break;
        case 'ids':
          appsForCategory = definition.appIds
            .map(appId => mapById.get(appId))
            .filter((app): app is AppMeta => Boolean(app));
          break;
        default:
          appsForCategory = allApps;
      }
      return {
        ...definition,
        apps: appsForCategory,
      } as CategoryConfig;
    });
  }, [allApps, favoriteApps, recentApps]);

  const currentCategory = useMemo(() => {
    const found = categoryConfigs.find(cat => cat.id === category);
    return found ?? categoryConfigs[0];
  }, [category, categoryConfigs]);

  const currentApps = useMemo(() => {
    let list = currentCategory?.apps ?? [];
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(a => a.title.toLowerCase().includes(q));
    }
    return list;
  }, [currentCategory, query]);

  useEffect(() => {
    const storedCategory = safeLocalStorage?.getItem(CATEGORY_STORAGE_KEY);
    if (storedCategory && isCategoryId(storedCategory)) {
      setCategory(storedCategory);
    }
  }, []);

  useEffect(() => {
    safeLocalStorage?.setItem(CATEGORY_STORAGE_KEY, currentCategory.id);
  }, [currentCategory.id]);

  useEffect(() => {
    if (!isVisible) return;
    setHighlight(0);
  }, [isVisible, category, query]);

  useEffect(() => {
    if (!isVisible) return;
    const index = categoryConfigs.findIndex(cat => cat.id === currentCategory.id);
    setCategoryHighlight(index === -1 ? 0 : index);
  }, [isVisible, currentCategory.id, categoryConfigs]);

  const openSelectedApp = (id: string) => {
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen && isVisible) {
      hideTimer.current = setTimeout(() => {
        setIsVisible(false);
      }, TRANSITION_DURATION);
      return () => {
        if (hideTimer.current) clearTimeout(hideTimer.current);
      };
    }
    if (isOpen) {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    }
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
    };
  }, [isOpen, isVisible]);

  const showMenu = useCallback(() => {
    setIsVisible(true);
    requestAnimationFrame(() => setIsOpen(true));
  }, []);

  const hideMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleMenu = useCallback(() => {
    if (isOpen || isVisible) {
      hideMenu();
    } else {
      showMenu();
    }
  }, [hideMenu, isOpen, isVisible, showMenu]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Meta' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        toggleMenu();
        return;
      }
      if (!isVisible) return;
      const target = e.target as Node | null;
      if (target && categoryListRef.current?.contains(target)) {
        return;
      }

      if (e.key === 'Escape') {
        hideMenu();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (currentApps.length === 0) return;
        setHighlight(h => Math.min(h + 1, currentApps.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (currentApps.length === 0) return;
        setHighlight(h => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentApps.length === 0) return;
        const app = currentApps[Math.min(highlight, currentApps.length - 1)];
        if (app) openSelectedApp(app.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [currentApps, highlight, hideMenu, isVisible, toggleMenu]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isVisible) return;
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) {
        hideMenu();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [hideMenu, isVisible]);

  useEffect(() => () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
  }, []);

  const focusCategoryButton = (index: number) => {
    const btn = categoryButtonRefs.current[index];
    if (btn) {
      btn.focus();
    }
  };

  const handleCategoryNavigation = (direction: 1 | -1) => {
    setCategoryHighlight((current) => {
      const nextIndex = (current + direction + categoryConfigs.length) % categoryConfigs.length;
      const nextCategory = categoryConfigs[nextIndex];
      if (nextCategory) {
        setCategory(nextCategory.id);
        focusCategoryButton(nextIndex);
      }
      return nextIndex;
    });
  };

  const handleCategoryKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      handleCategoryNavigation(1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      handleCategoryNavigation(-1);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const selected = categoryConfigs[categoryHighlight];
      if (selected) {
        setCategory(selected.id);
      }
    }
  };

  const quickCategories = useMemo(
    () =>
      QUICK_FILTER_ORDER.map(id => CATEGORY_DEFINITIONS.find(cat => cat.id === id)).filter(
        (cat): cat is CategoryDefinition => Boolean(cat),
      ),
    [],
  );

  const hasApps = currentApps.length > 0;

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        className="group flex items-center gap-2 rounded-full border border-slate-700/40 bg-[#0b1320] px-4 py-1.5 text-sm font-medium text-slate-200 shadow-[0_0_0_1px_rgba(15,23,42,0.6)] transition hover:border-sky-500/70 hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <Image
          src="/themes/Kali/panel/decompiler-symbolic.svg"
          alt="Menu"
          width={16}
          height={16}
          className="h-4 w-4"
        />
        <span className="tracking-wide">Applications</span>
      </button>
      {isVisible && (
        <div
          ref={menuRef}
          className={`absolute left-0 mt-2 z-50 flex w-[720px] max-w-[80vw] origin-top-left text-white transition-all ease-out ${
            isOpen ? 'opacity-100 translate-y-0 scale-100' : 'pointer-events-none opacity-0 -translate-y-2 scale-95'
          }`}
          style={{ transitionDuration: `${TRANSITION_DURATION}ms` }}
          tabIndex={-1}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              hideMenu();
            }
          }}
        >
          <div className="flex h-[540px] w-full overflow-hidden rounded-2xl border border-slate-700/80 bg-gradient-to-br from-[#0b1320] via-[#0d1a2b] to-[#0b1423] text-slate-100 shadow-[0_20px_45px_rgba(8,12,24,0.55)] ring-1 ring-slate-900/60">
            <aside
              ref={categoryListRef}
              className="flex h-full w-[240px] flex-col border-r border-slate-700/60 bg-[#0c1424]/90 backdrop-blur-sm"
              role="listbox"
              aria-label="Application categories"
              tabIndex={0}
              onKeyDown={handleCategoryKeyDown}
            >
              <div className="px-5 pt-5 pb-3">
                <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Browse</p>
                <p className="mt-1 text-base font-semibold text-slate-100">Categories</p>
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-4">
                <div className="space-y-2">
                  {categoryConfigs.map((cat, index) => (
                    <button
                      key={cat.id}
                      ref={(el) => {
                        categoryButtonRefs.current[index] = el;
                      }}
                      type="button"
                      className={`group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                        category === cat.id
                          ? 'border-sky-500/70 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                          : 'hover:border-slate-600/60 hover:bg-slate-700/20'
                      }`}
                      role="option"
                      aria-selected={category === cat.id}
                      onClick={() => {
                        setCategory(cat.id);
                        setCategoryHighlight(index);
                      }}
                    >
                      <span className="w-8 text-xs font-mono uppercase tracking-wider text-slate-500">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900/70 ring-1 ring-slate-800/60">
                        <Image src={cat.icon} alt="" width={20} height={20} className="h-5 w-5" sizes="20px" />
                      </span>
                      <span className="truncate font-medium text-slate-100">{cat.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-6 border-t border-slate-700/60 pt-4">
                  <p className="mb-3 text-[11px] uppercase tracking-[0.2em] text-slate-400">Kali Linux Groups</p>
                  <ul className="space-y-2 text-sm text-slate-300">
                    {KALI_CATEGORIES.map((cat) => (
                      <li key={cat.id} className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/80 font-mono text-xs text-sky-400">
                          {cat.number}
                        </span>
                        <span className="leading-5">{cat.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </aside>
            <section className="flex min-w-0 flex-1 flex-col bg-[#0b1220]/80">
              <div className="border-b border-slate-700/60 px-6 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <label className="group relative flex min-w-[220px] flex-1 items-center gap-2 rounded-full border border-slate-700/70 bg-[#0d1626]/80 px-4 py-2 text-slate-100 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/40">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="h-4 w-4 flex-shrink-0 text-slate-400 group-focus-within:text-sky-300"
                    >
                      <path
                        d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.71.71l.27.28v.79l4.25 4.25a1 1 0 0 0 1.41-1.41L15.5 14Zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z"
                        fill="currentColor"
                      />
                    </svg>
                    <input
                      className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
                      placeholder="Search applications"
                      aria-label="Search applications"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      autoFocus
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    {quickCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
                          category === cat.id
                            ? 'border-sky-500/70 bg-sky-500/10 text-sky-300 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                            : 'border-slate-700/60 text-slate-300 hover:border-sky-500/60 hover:text-sky-300'
                        }`}
                        onClick={() => setCategory(cat.id)}
                        aria-pressed={category === cat.id}
                      >
                        <Image src={cat.icon} alt="" width={16} height={16} className="h-4 w-4" sizes="16px" />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden">
                <div className="absolute inset-0 overflow-y-auto px-5 py-4">
                  {hasApps ? (
                    <ul className="space-y-2">
                      {currentApps.map((app, idx) => (
                        <li key={app.id}>
                          <button
                            type="button"
                            className={`group flex w-full items-center gap-3 rounded-xl border border-transparent px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                              idx === highlight
                                ? 'border-sky-500/70 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]'
                                : 'hover:border-slate-600/60 hover:bg-slate-700/20'
                            } ${
                              app.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                            }`}
                            onClick={() => !app.disabled && openSelectedApp(app.id)}
                            onMouseEnter={() => setHighlight(idx)}
                            onFocus={() => setHighlight(idx)}
                            disabled={app.disabled}
                          >
                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900/80 ring-1 ring-slate-800/70">
                              <Image
                                src={app.icon.replace('./', '/')}
                                alt=""
                                width={28}
                                height={28}
                                className="h-7 w-7"
                                sizes="28px"
                              />
                            </span>
                            <div className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate font-medium text-slate-100">{app.title}</span>
                              <span className="truncate text-xs uppercase tracking-wide text-slate-500">{app.id}</span>
                            </div>
                            {!app.disabled && (
                              <span className="text-[10px] uppercase tracking-[0.3em] text-sky-400 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                                Launch
                              </span>
                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-700/70 bg-slate-900/20">
                      <p className="px-6 py-8 text-center text-sm text-slate-400">
                        No applications match your search. Try another query or switch categories.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="border-t border-slate-700/60 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/20 text-sm font-semibold text-sky-300">
                      K
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-100">kali</p>
                      <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Ready to hack the planet*</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-sky-500/50 hover:text-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      title="Open settings"
                      aria-label="Open settings"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.07 7.07 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 14.9 2h-3.8a.5.5 0 0 0-.49.41l-.36 2.54a7.07 7.07 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.61.22L1.7 8.01a.5.5 0 0 0 .12.64l2.03 1.58c-.04.3-.06.61-.06.94s.02.64.06.94L1.82 13.7a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .61.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .49.41h3.8a.5.5 0 0 0 .49-.41l.36-2.54c.58-.22 1.13-.54 1.63-.94l2.39.96a.5.5 0 0 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent text-slate-400 transition hover:border-rose-500/50 hover:text-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                      title="Power options"
                      aria-label="Power options"
                    >
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="M11 2a1 1 0 0 1 2 0v9a1 1 0 0 1-2 0V2Zm-1 2.07V6a7 7 0 1 0 4 0V4.07a9 9 0 1 1-4 0Z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
