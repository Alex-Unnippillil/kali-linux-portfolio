'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';
import Image from 'next/image';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import { readRecentAppIds } from '../../utils/recentStorage';
import { useFocusTrap } from '../../hooks/useFocusTrap';

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


const WhiskerMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [category, setCategory] = useState<CategoryDefinition['id']>('all');
  const [isDesktop, setIsDesktop] = useState(false);

  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [categoryHighlight, setCategoryHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const focusTimeoutRef = useRef<number | null>(null);
  const focusFrameRef = useRef<number | null>(null);


  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const mediaQuery = window.matchMedia('(min-width: 640px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };
    setIsDesktop(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
    mediaQuery.addListener(handleChange);
    return () => {
      mediaQuery.removeListener(handleChange);
    };
  }, []);
  useEffect(() => {
    setRecentIds(readRecentAppIds());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setRecentIds(readRecentAppIds());
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const focusSearchInput = () => {
      const input = searchInputRef.current;
      if (!input) return;
      input.focus();
      if (typeof input.setSelectionRange === 'function') {
        const length = input.value.length;
        input.setSelectionRange(length, length);
      }
    };

    const frame = window.requestAnimationFrame(() => {
      focusSearchInput();
      const timeout = window.setTimeout(focusSearchInput, 120);
      focusTimeoutRef.current = timeout;
    });

    focusFrameRef.current = frame;

    return () => {
      if (focusFrameRef.current !== null) {
        window.cancelAnimationFrame(focusFrameRef.current);
        focusFrameRef.current = null;
      }
      if (focusTimeoutRef.current !== null) {
        window.clearTimeout(focusTimeoutRef.current);
        focusTimeoutRef.current = null;
      }
    };
  }, [isOpen]);

  useFocusTrap(menuRef, isOpen, {
    initialFocusRef: searchInputRef,
    restoreFocusRef: buttonRef,
  });

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
      const metaShortcut =
        e.key === 'Meta' && !e.ctrlKey && !e.shiftKey && !e.altKey;
      const altF1Shortcut =
        e.key === 'F1' && e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey;

      if (metaShortcut || altF1Shortcut) {
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

  useEffect(() => {
    if (!isVisible) {
      setMenuStyle({});
      return;
    }

    const updateMenuPosition = () => {
      const trigger = buttonRef.current;
      if (!trigger) {
        setMenuStyle({});
        return;
      }

      if (window.innerWidth >= 640) {
        setMenuStyle({});
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const desiredWidth = Math.min(window.innerWidth - 24, 680);
      const rootStyle = getComputedStyle(document.documentElement);
      const parseInset = (value: string) => {
        const numeric = parseFloat(value);
        return Number.isFinite(numeric) ? numeric : 0;
      };
      const safeAreaLeft = parseInset(rootStyle.getPropertyValue('--safe-area-left'));
      const safeAreaRight = parseInset(rootStyle.getPropertyValue('--safe-area-right'));

      const availableWidth = Math.max(window.innerWidth - safeAreaLeft - safeAreaRight, 0);
      const width = Math.min(desiredWidth, availableWidth);
      const maxLeft = Math.max(safeAreaLeft, window.innerWidth - safeAreaRight - width);
      const centeredLeft = rect.left + rect.width / 2 - width / 2;
      const clampedLeft = Math.min(Math.max(centeredLeft, safeAreaLeft), maxLeft);

      setMenuStyle({
        width: `${width}px`,
        left: `${clampedLeft}px`,
        top: `${rect.bottom + 12}px`,
      });
    };

    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
    };
  }, [isVisible]);

  const focusCategoryButton = (index: number) => {
    const btn = categoryButtonRefs.current[index];
    if (btn) {
      btn.focus({ preventScroll: true });
      requestAnimationFrame(() => {
        btn.scrollIntoView({
          behavior: 'smooth',
          block: isDesktop ? 'nearest' : 'center',
          inline: 'center',
        });
      });
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
    const isHorizontal = !isDesktop;
    if (isHorizontal && event.key === 'ArrowRight') {
      event.preventDefault();
      handleCategoryNavigation(1);
    } else if (isHorizontal && event.key === 'ArrowLeft') {
      event.preventDefault();
      handleCategoryNavigation(-1);
    } else if (!isHorizontal && event.key === 'ArrowDown') {
      event.preventDefault();
      handleCategoryNavigation(1);
    } else if (!isHorizontal && event.key === 'ArrowUp') {
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

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleMenu}
        aria-keyshortcuts="Meta Alt+F1"
        className="pl-3 pr-3 outline-none transition duration-100 ease-in-out border-b-2 border-transparent py-1"
        tabIndex={isOpen ? -1 : 0}
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
          data-testid="whisker-menu-dropdown"
          className={`fixed z-50 flex max-h-[80vh] w-[min(100vw-1.5rem,680px)] flex-col overflow-x-hidden overflow-y-auto rounded-xl border border-[#1f2a3a] bg-[#0b121c] text-white shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-all duration-200 ease-out sm:absolute sm:top-full sm:left-0 sm:mt-1 sm:w-[680px] sm:max-h-[440px] sm:flex-row sm:overflow-hidden ${
            isOpen ? 'opacity-100 translate-y-0 scale-100' : 'pointer-events-none opacity-0 -translate-y-2 scale-95'
          }`}
          style={{ ...menuStyle, transitionDuration: `${TRANSITION_DURATION}ms` }}
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
              className="-mx-1 flex gap-2 overflow-x-auto px-2 pb-3 pt-3 sm:mx-0 sm:max-h-full sm:flex-1 sm:flex-col sm:gap-1 sm:overflow-y-auto sm:px-2 sm:py-3"
              role="listbox"
              aria-label="Application categories"
              aria-orientation={isDesktop ? 'vertical' : 'horizontal'}
              tabIndex={0}
              onKeyDown={handleCategoryKeyDown}
              style={{
                WebkitOverflowScrolling: 'touch',
                scrollSnapType: isDesktop
                  ? undefined
                  : ('x proximity' as React.CSSProperties['scrollSnapType']),
              }}
            >
              {categoryConfigs.map((cat, index) => (
                <button
                  key={cat.id}
                  ref={(el) => {
                    categoryButtonRefs.current[index] = el;
                  }}
                  type="button"
                  className={`group inline-flex min-h-[48px] min-w-[48px] flex-shrink-0 items-center gap-3 rounded-full border border-transparent bg-[#142132] px-5 py-2 text-sm text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#53b9ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1724] sm:min-h-[44px] sm:min-w-0 sm:w-full sm:rounded-lg sm:px-3 sm:py-3 ${
                    category === cat.id
                      ? 'bg-[#1d2c43] text-white shadow-[inset_0_0_0_1px_rgba(83,185,255,0.35)]'
                      : 'text-gray-300 hover:bg-[#152133] hover:text-white'
                  }`}
                  style={{ scrollSnapAlign: 'start' }}
                  role="option"
                  aria-selected={category === cat.id}
                  onClick={() => {
                    setCategory(cat.id);
                    setCategoryHighlight(index);
                  }}
                >
                  <span className="hidden w-8 font-mono text-[11px] uppercase tracking-[0.2em] text-[#4aa8ff] sm:inline-flex">{String(index + 1).padStart(2, '0')}</span>
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
              ))}
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
              <div className="relative mb-4">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4aa8ff]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="20" y1="20" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  ref={searchInputRef}
                  className="h-11 w-full rounded-lg border border-transparent bg-[#101c2d] pl-10 pr-4 text-sm text-gray-100 shadow-inner focus:border-[#53b9ff] focus:outline-none focus:ring-0"
                  type="search"
                  inputMode="search"
                  enterKeyHint="search"
                  placeholder="Search applications"
                  aria-label="Search applications"
                  autoFocus={isOpen}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {favoriteApps.slice(0, 6).map((app) => (
                  <button
                    key={app.id}
                    type="button"
                    onClick={() => openSelectedApp(app.id)}
                    className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#122136] text-white transition hover:-translate-y-0.5 hover:bg-[#1b2d46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53b9ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a29]"
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
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-3">
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
                <ul className="space-y-2" data-testid="whisker-menu-app-list">
                  {currentApps.map((app, idx) => (
                    <li key={app.id}>
                      <button
                        type="button"
                        className={`flex w-full min-h-[44px] items-center justify-between gap-4 rounded-xl px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53b9ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a29] ${
                          idx === highlight
                            ? 'bg-[#162438] text-white shadow-[0_0_0_1px_rgba(83,185,255,0.35)]'
                            : 'text-gray-200 hover:bg-[#142132]'
                        } ${app.disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                        aria-label={app.title}
                        disabled={app.disabled}
                        onClick={() => {
                          if (!app.disabled) {
                            openSelectedApp(app.id);
                          }
                        }}
                        onMouseEnter={() => setHighlight(idx)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#121f33]">
                            <Image
                              src={app.icon}
                              alt=""
                              width={28}
                              height={28}
                              className="h-7 w-7"
                              sizes="28px"
                            />
                          </div>
                          <div className="flex flex-col gap-1">
                            <p className="text-[15px] font-medium">{app.title}</p>
                            <p className="text-xs uppercase tracking-[0.25em] text-[#4aa8ff]">Application</p>
                          </div>
                        </div>
                        <svg
                          className="h-4 w-4 flex-shrink-0 text-[#4aa8ff]"
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
