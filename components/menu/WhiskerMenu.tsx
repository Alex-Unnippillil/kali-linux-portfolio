'use client';

import type { CSSProperties } from 'react';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import { useMenuNavigation } from '../../hooks/useMenuNavigation';

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
    icon: '/themes/Yaru/system/view-app-grid-symbolic.svg',
    type: 'all',
  },
  {
    id: 'favorites',
    label: 'Favorites',
    icon: '/themes/Yaru/status/projects.svg',
    type: 'favorites',
  },
  {
    id: 'recent',
    label: 'Recent',
    icon: '/themes/Yaru/status/process-working-symbolic.svg',
    type: 'recent',
  },
  {
    id: 'information-gathering',
    label: 'Information Gathering',
    icon: '/themes/Yaru/apps/radar-symbolic.svg',
    type: 'ids',
    appIds: ['nmap-nse', 'reconng', 'kismet', 'wireshark'],
  },
  {
    id: 'vulnerability-analysis',
    label: 'Vulnerability Analysis',
    icon: '/themes/Yaru/apps/nessus.svg',
    type: 'ids',
    appIds: ['nessus', 'openvas', 'nikto'],
  },
  {
    id: 'web-app-analysis',
    label: 'Web App Analysis',
    icon: '/themes/Yaru/apps/http.svg',
    type: 'ids',
    appIds: ['http', 'beef', 'metasploit'],
  },
  {
    id: 'password-attacks',
    label: 'Password Attacks',
    icon: '/themes/Yaru/apps/john.svg',
    type: 'ids',
    appIds: ['john', 'hashcat', 'hydra'],
  },
  {
    id: 'wireless-attacks',
    label: 'Wireless Attacks',
    icon: '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg',
    type: 'ids',
    appIds: ['kismet', 'reaver', 'wireshark'],
  },
  {
    id: 'exploitation-tools',
    label: 'Exploitation Tools',
    icon: '/themes/Yaru/apps/metasploit.svg',
    type: 'ids',
    appIds: ['metasploit', 'security-tools', 'beef'],
  },
  {
    id: 'sniffing-spoofing',
    label: 'Sniffing & Spoofing',
    icon: '/themes/Yaru/apps/ettercap.svg',
    type: 'ids',
    appIds: ['dsniff', 'ettercap', 'wireshark'],
  },
  {
    id: 'post-exploitation',
    label: 'Post Exploitation',
    icon: '/themes/Yaru/apps/msf-post.svg',
    type: 'ids',
    appIds: ['msf-post', 'mimikatz', 'volatility'],
  },
  {
    id: 'forensics-reporting',
    label: 'Forensics & Reporting',
    icon: '/themes/Yaru/apps/autopsy.svg',
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);


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

  const categoryIndex = useMemo(() => {
    return categoryConfigs.findIndex(cat => cat.id === category);
  }, [category, categoryConfigs]);

  const openSelectedApp = useCallback(
    (id: string) => {
      window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
      setIsOpen(false);
    },
    [],
  );

  const categoryNavigation = useMenuNavigation({
    itemCount: categoryConfigs.length,
    initialIndex: categoryIndex >= 0 ? categoryIndex : 0,
    hoverDelay: 140,
    onActiveChange: (index) => {
      const next = categoryConfigs[index];
      if (next && next.id !== category) {
        setCategory(next.id);
      }
    },
  });

  useEffect(() => {
    if (categoryIndex >= 0) {
      categoryNavigation.setActiveIndex(categoryIndex);
    }
  }, [categoryIndex, categoryNavigation]);

  const appNavigation = useMenuNavigation({
    itemCount: currentApps.length,
    hoverDelay: 110,
    isItemDisabled: (index) => Boolean(currentApps[index]?.disabled),
    onActivate: (index) => {
      const app = currentApps[index];
      if (app && !app.disabled) {
        openSelectedApp(app.id);
      }
    },
  });

  useEffect(() => {
    if (!isVisible) return;
    if (currentApps.length > 0) {
      appNavigation.setActiveIndex(0);
    }
  }, [appNavigation, currentApps, isVisible]);

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
        appNavigation.moveActiveIndex(1, { focus: true });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        appNavigation.moveActiveIndex(-1, { focus: true });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const app = currentApps[appNavigation.activeIndex];
        if (app && !app.disabled) {
          openSelectedApp(app.id);
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [appNavigation, currentApps, hideMenu, isVisible, openSelectedApp, toggleMenu]);

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

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
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
      {isVisible && (
        <div
          ref={menuRef}
          className={`absolute top-full left-1/2 mt-3 z-50 flex max-h-[80vh] w-[min(100vw-1.5rem,680px)] -translate-x-1/2 flex-col overflow-x-hidden overflow-y-auto rounded-xl border border-[#1f2a3a] bg-[#0b121c] text-white shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-all duration-200 ease-out sm:left-0 sm:mt-1 sm:w-[680px] sm:max-h-[440px] sm:-translate-x-0 sm:flex-row sm:overflow-hidden ${
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
          <div className="flex w-full max-h-[36vh] flex-col overflow-y-auto bg-gradient-to-b from-[#111c2b] via-[#101a27] to-[#0d1622] sm:max-h-[420px] sm:w-[260px] sm:overflow-visible">
            <div className="flex items-center gap-2 border-b border-[#1d2a3c] px-4 py-3 text-xs uppercase tracking-[0.2em] text-[#4aa8ff]">
              <span className="inline-flex h-2 w-2 rounded-full bg-[#4aa8ff]" aria-hidden />
              Categories
            </div>
            <div
              ref={categoryListRef}
              {...categoryNavigation.getListProps<HTMLDivElement>({
                className: 'flex max-h-[32vh] flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 sm:max-h-full sm:px-2',
                role: 'listbox',
                'aria-label': 'Application categories',
              })}
              style={{ '--menu-hover-bg': 'transparent', '--menu-active-bg': 'transparent' } as CSSProperties}
            >
              {categoryConfigs.map((cat, index) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    {...categoryNavigation.getItemProps<HTMLButtonElement>(index, {
                      className: `group items-center justify-start rounded-md px-3 py-2 text-left text-sm transition focus-visible:ring-2 focus-visible:ring-[#53b9ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1724] ${
                        isSelected
                          ? 'bg-[#162236] text-white shadow-[inset_2px_0_0_#53b9ff]'
                          : 'text-gray-300 hover:bg-[#152133] hover:text-white'
                      }`,
                      role: 'option',
                      'aria-selected': isSelected,
                      onClick: () => setCategory(cat.id),
                    })}
                    ref={(node) => categoryNavigation.registerItem(index, node)}
                    type="button"
                  >
                    <span className="w-8 font-mono text-[11px] uppercase tracking-[0.2em] text-[#4aa8ff]">{String(index + 1).padStart(2, '0')}</span>
                    <span className="flex items-center gap-2">
                      <Image
                        src={cat.icon}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 opacity-80 group-hover:opacity-100"
                        sizes="20px"
                      />
                      <span>{cat.label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="border-t border-[#1d2a3c] px-4 py-3 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#142132] text-sm font-semibold uppercase text-[#53b9ff]">k</span>
                <div>
                  <p className="text-sm font-semibold text-white">kali</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">User Session</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex max-h-[44vh] flex-1 flex-col bg-[#0f1a29] sm:max-h-full">
            <div className="border-b border-[#1d2a3c] px-4 py-4 sm:px-5">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {favoriteApps.slice(0, 6).map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => openSelectedApp(app.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#122136] text-white transition hover:-translate-y-0.5 hover:bg-[#1b2d46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53b9ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a29]"
                    aria-label={`Open ${app.title}`}
                  >
                    <Image
                      src={app.icon}
                      alt=""
                      width={24}
                      height={24}
                      className="h-6 w-6"
                      sizes="24px"
                    />
                  </button>
                ))}
              </div>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4aa8ff]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="20" y1="20" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  className="h-10 w-full rounded-lg border border-transparent bg-[#101c2d] pl-9 pr-3 text-sm text-gray-100 shadow-inner focus:border-[#53b9ff] focus:outline-none focus:ring-0"
                  placeholder="Search applications"
                  aria-label="Search applications"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <div
              className="flex-1 overflow-y-auto px-3 py-3 sm:px-2"
              data-menu-surface
              style={{
                '--menu-hover-bg': 'rgba(20, 33, 50, 0.85)',
                '--menu-active-bg': '#162438',
                '--menu-active-color': 'rgb(255 255 255)',
                '--menu-ring-color': 'rgba(83, 185, 255, 0.8)',
              } as CSSProperties}
            >
              {currentApps.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-gray-500">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#121f33] text-[#4aa8ff]">
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </span>
                  <p>No applications match your search.</p>
                </div>
              ) : (
                <ul
                  {...appNavigation.getListProps<HTMLUListElement>({
                    className: 'space-y-1',
                    role: 'listbox',
                    'aria-label': 'Application results',
                  })}
                >
                  {currentApps.map((app, idx) => (
                    <li key={app.id}>
                      <button
                        {...appNavigation.getItemProps<HTMLButtonElement>(idx, {
                          className:
                            'items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm text-gray-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53b9ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a29] hover:bg-[#142132]',
                          'aria-label': app.title,
                          disabled: app.disabled,
                          onClick: () => {
                            if (!app.disabled) {
                              openSelectedApp(app.id);
                            }
                          },
                        })}
                        ref={(node) => appNavigation.registerItem(idx, node)}
                        type="button"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#121f33]">
                            <Image
                              src={app.icon}
                              alt=""
                              width={28}
                              height={28}
                              className="h-7 w-7"
                              sizes="28px"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-[15px]">{app.title}</p>
                            <p className="text-xs uppercase tracking-[0.25em] text-[#4aa8ff]">Application</p>
                          </div>
                        </div>
                        <svg
                          className="h-4 w-4 text-[#4aa8ff]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
