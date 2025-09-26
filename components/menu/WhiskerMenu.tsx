'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import {
  clearRecentEntries,
  readRecentEntries,
  type RecentEntry,
} from '../../utils/recentStorage';

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

type CategoryDefinition = {
  id: string;
  label: string;
  icon: string;
} & CategorySource;

type CategoryConfig = CategoryDefinition & { apps: AppMeta[] };

const CATEGORY_DEFINITIONS: readonly CategoryDefinition[] = [
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
];


const WhiskerMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FilterCategory>('all');

  const [query, setQuery] = useState('');
  const [recentEntries, setRecentEntries] = useState<RecentEntry[]>([]);
  const [highlight, setHighlight] = useState(0);
  const [categoryHighlight, setCategoryHighlight] = useState(0);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const categoryListRef = useRef<HTMLDivElement>(null);
  const categoryButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);


  const allApps: AppMeta[] = apps as any;
  const favoriteApps = useMemo(() => allApps.filter(a => a.favourite), [allApps]);
  const loadRecentEntries = useCallback(() => {
    const entries = readRecentEntries().filter(entry => entry.type === 'app');
    setRecentEntries(entries);
  }, []);

  useEffect(() => {
    loadRecentEntries();
  }, [loadRecentEntries]);

  useEffect(() => {
    if (!open) return;
    loadRecentEntries();
  }, [open, loadRecentEntries]);

  const recentApps = useMemo(() => {
    if (!open) {
      return [];
    }
    const entries = recentEntries;
    const mapById = new Map(allApps.map(app => [app.id, app] as const));
    return entries
      .map(entry => mapById.get(entry.id))
      .filter((app): app is AppMeta => Boolean(app));
  }, [allApps, open, recentEntries]);
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
    const storedCategory = safeLocalStorage?.getItem('whisker-menu-category');
    if (!storedCategory) return;
    if (CATEGORY_DEFINITIONS.some(cat => cat.id === storedCategory)) {
      setCategory(storedCategory);
    }
  }, []);

  useEffect(() => {
    safeLocalStorage?.setItem('whisker-menu-category', currentCategory.id);
  }, [currentCategory.id]);

  useEffect(() => {
    if (!isVisible) return;
    setHighlight(0);
  }, [isVisible, category, query]);

  useEffect(() => {
    if (!open) return;
    const index = categoryConfigs.findIndex(cat => cat.id === currentCategory.id);
    setCategoryHighlight(index === -1 ? 0 : index);
  }, [open, currentCategory.id, categoryConfigs]);

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
      if (!open) return;
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
    if (!isVisible) return;
    loadRecentEntries();
  }, [isVisible, loadRecentEntries]);

  const handleClearRecents = useCallback(() => {
    clearRecentEntries();
    setRecentEntries([]);
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
          className={`absolute left-0 mt-1 z-50 flex w-[520px] bg-ub-grey text-white shadow-lg rounded-md overflow-hidden transition-all duration-200 ease-out ${
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
          <div
            ref={categoryListRef}
            className="flex max-h-80 w-64 flex-col gap-1 overflow-y-auto bg-gray-900 p-3"
            role="listbox"
            aria-label="Application categories"
            tabIndex={0}
            onKeyDown={handleCategoryKeyDown}
          >
            {categoryConfigs.map((cat, index) => (
              <button
                key={cat.id}
                ref={(el) => {
                  categoryButtonRefs.current[index] = el;
                }}
                type="button"
                className={`flex items-center gap-3 rounded px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-ubb-orange focus:ring-offset-2 focus:ring-offset-gray-900 ${
                  category === cat.id ? 'bg-gray-700/80' : 'hover:bg-gray-700/60'
                }`}
                role="option"
                aria-selected={category === cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setCategoryHighlight(index);
                }}

              >
                <span className="w-8 font-mono text-xs text-gray-300">{String(index + 1).padStart(2, '0')}</span>
                <span className="flex items-center gap-2">
                  <Image
                    src={cat.icon}
                    alt=""
                    width={20}
                    height={20}
                    className="h-5 w-5"
                    sizes="20px"
                  />
                  <span className="text-sm">{cat.label}</span>
                </span>
              </button>
            ))}
            <div className="mt-4 border-t border-gray-700 pt-3">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Kali Linux Groups</p>
              <ul className="space-y-1 text-sm">
                {KALI_CATEGORIES.map((cat) => (
                  <li key={cat.id} className="flex items-baseline text-gray-300">
                    <span className="font-mono text-ubt-blue mr-2 w-8">{cat.number}</span>
                    <span>{cat.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col p-3">
            <input
              className="mb-3 w-64 rounded bg-black bg-opacity-20 px-2 py-1 focus:outline-none"

              placeholder="Search"
              aria-label="Search applications"
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
            />
            {currentCategory?.id === 'recent' && (
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs text-gray-300">
                  {currentApps.length > 0 ? 'Last opened applications' : 'No recently opened applications yet.'}
                </p>
                {currentApps.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearRecents}
                    className="text-xs font-semibold uppercase tracking-wide text-ubt-blue transition hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
            <div className="grid max-h-64 grid-cols-3 gap-2 overflow-y-auto">

              {currentApps.map((app, idx) => (
                <div
                  key={app.id}
                  className={`rounded transition ring-offset-2 ${
                    idx === highlight ? 'ring-2 ring-ubb-orange ring-offset-gray-900' : 'ring-0'
                  }`}
                >
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
