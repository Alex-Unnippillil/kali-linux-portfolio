'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Image from 'next/image';
import UbuntuApp from '../base/ubuntu_app';
import apps from '../../apps.config';
import { safeLocalStorage } from '../../utils/safeStorage';
import { KALI_CATEGORIES as BASE_KALI_CATEGORIES } from './ApplicationsMenu';

const KALI_CATEGORY_NUMBER_MAP = new Map(
  BASE_KALI_CATEGORIES.map(category => [category.id, category.number] as const),
);

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
  menuNumber?: string;
} & CategorySource;

const TRANSITION_DURATION = 180;
const RECENT_STORAGE_KEY = 'recentApps';
const CATEGORY_STORAGE_KEY = 'whisker-menu-category';

const CATEGORY_DEFINITIONS = [
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
    id: 'all',
    label: 'All Applications',
    icon: '/themes/Yaru/system/view-app-grid-symbolic.svg',
    type: 'all',
  },
  {
    id: 'top-10-tools',
    label: 'Top 10 Tools',
    icon: '/themes/kali/categories/top10.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('top-10-tools') ?? '00',
    appIds: ['nmap-nse', 'wireshark', 'metasploit', 'john', 'hashcat', 'hydra', 'reconng', 'kismet', 'nessus', 'openvas'],
  },
  {
    id: 'information-gathering',
    label: 'Information Gathering',
    icon: '/themes/kali/categories/information-gathering.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('information-gathering') ?? '01',
    appIds: ['nmap-nse', 'reconng', 'kismet', 'wireshark'],
  },
  {
    id: 'vulnerability-analysis',
    label: 'Vulnerability Analysis',
    icon: '/themes/kali/categories/vulnerability-analysis.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('vulnerability-analysis') ?? '02',
    appIds: ['nessus', 'openvas', 'nikto'],
  },
  {
    id: 'web-application-analysis',
    label: 'Web Application Analysis',
    icon: '/themes/kali/categories/web-application-analysis.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('web-application-analysis') ?? '03',
    appIds: ['http', 'beef', 'security-tools'],
  },
  {
    id: 'database-assessment',
    label: 'Database Assessment',
    icon: '/themes/kali/categories/database-assessment.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('database-assessment') ?? '04',
    appIds: ['hydra', 'openvas', 'nessus'],
  },
  {
    id: 'password-attacks',
    label: 'Password Attacks',
    icon: '/themes/kali/categories/password-attacks.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('password-attacks') ?? '05',
    appIds: ['john', 'hashcat', 'hydra'],
  },
  {
    id: 'wireless-attacks',
    label: 'Wireless Attacks',
    icon: '/themes/kali/categories/wireless-attacks.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('wireless-attacks') ?? '06',
    appIds: ['kismet', 'reaver', 'wireshark'],
  },
  {
    id: 'reverse-engineering',
    label: 'Reverse Engineering',
    icon: '/themes/kali/categories/reverse-engineering.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('reverse-engineering') ?? '07',
    appIds: ['ghidra', 'radare2', 'volatility'],
  },
  {
    id: 'exploitation-tools',
    label: 'Exploitation Tools',
    icon: '/themes/kali/categories/exploitation-tools.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('exploitation-tools') ?? '08',
    appIds: ['metasploit', 'security-tools', 'beef'],
  },
  {
    id: 'sniffing-spoofing',
    label: 'Sniffing & Spoofing',
    icon: '/themes/kali/categories/sniffing-spoofing.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('sniffing-spoofing') ?? '09',
    appIds: ['dsniff', 'ettercap', 'wireshark'],
  },
  {
    id: 'post-exploitation',
    label: 'Post Exploitation',
    icon: '/themes/kali/categories/post-exploitation.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('post-exploitation') ?? '10',
    appIds: ['msf-post', 'mimikatz', 'volatility'],
  },
  {
    id: 'forensics',
    label: 'Forensics',
    icon: '/themes/kali/categories/forensics.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('forensics') ?? '11',
    appIds: ['autopsy', 'volatility', 'evidence-vault'],
  },
  {
    id: 'reporting',
    label: 'Reporting',
    icon: '/themes/kali/categories/reporting.svg',
    type: 'ids',
    menuNumber: KALI_CATEGORY_NUMBER_MAP.get('reporting') ?? '12',
    appIds: ['project-gallery', 'evidence-vault', 'contact'],
  },
] as const satisfies readonly CategoryDefinitionBase[];

type CategoryDefinition = (typeof CATEGORY_DEFINITIONS)[number];
const isCategoryId = (
  value: string,
): value is CategoryDefinition['id'] =>
  CATEGORY_DEFINITIONS.some(cat => cat.id === value);

type CategoryConfig = CategoryDefinition & { apps: AppMeta[] };

const KALI_CATEGORIES = BASE_KALI_CATEGORIES;

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
                <span className="w-8 font-mono text-xs text-gray-300">{cat.menuNumber ?? '--'}</span>
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
