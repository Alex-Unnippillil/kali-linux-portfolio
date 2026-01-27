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

const KALI_LOGO_PATH =
  [
    'M 22.060547 19.480469 C 18.150547 19.480469 13.970625 19.650234 9.640625 19.990234 C 8.570625 20.070234 7.7607813 20.990547 7.8007812 22.060547 C 7.8407813 23.130547 8.7207813 23.980469 9.8007812 23.980469 C 23.710781 24.000469 36.469141 25.689922 44.619141 28.419922 C 42.129141 28.209922 39.610547 28.089844 37.060547 28.089844 C 18.060547 28.089844 3.8009375 33.910391 3.2109375 34.150391 C 2.2409375 34.560391 1.7503125 35.630859 2.0703125 36.630859 C 2.3503125 37.460859 3.1307031 38 3.9707031 38 C 4.1307031 38 4.2909375 37.979453 4.4609375 37.939453 C 4.6109375 37.899453 20.480938 34 36.460938 34 C 38.520938 34 40.500859 34.069453 42.380859 34.189453',
    'C 24.690859 37.009453 11.460313 46.990469 10.820312 47.480469 C 9.9803125 48.130469 9.7908594 49.309453 10.380859 50.189453 C 10.770859 50.759453 11.399063 51.070312 12.039062 51.070312 C 12.389062 51.070312 12.740547 50.979062 13.060547 50.789062 C 13.250547 50.679063 31.949531 39.689453 50.769531 39.689453 C 51.289531 39.689453 51.800547 39.690937 52.310547 39.710938 L 52.369141 39.710938 C 49.879141 41.790937 46.609375 45.790547 46.859375 52.310547 C 47.179375 60.540547 53.159453 65.49 58.939453 66.75 C 61.319453 67.27 63.350547 67.39 65.310547 67.5 C 68.920547 67.72 72.050156 67.899375 76.910156 70.609375 C 82.340156 73.629375 86.450625 81.589141 87.390625 90.869141 C 87.490625 91.879141 88.339375 92.659922 89.359375 92.669922 L 89.380859 92.669922 C 90.390859 92.669922 91.239141 91.919922 91.369141 90.919922 C 91.429141 90.429922 92.430937 81.599687 86.960938 72.929688',
    'C 89.010937 74.779687 90.759844 77.349141 91.339844 80.869141 C 91.499844 81.829141 92.340547 82.539063 93.310547 82.539062 L 93.339844 82.539062 C 94.329844 82.519063 95.160781 81.790547 95.300781 80.810547 C 95.330781 80.560547 96.069531 74.619219 91.019531 69.199219 C 85.779531 63.569219 76.979609 60.720703 64.849609 60.720703 C 61.169609 60.720703 58.320156 59.710938 56.410156 57.710938 C 54.310156 55.520938 53.660234 52.440703 53.740234 50.470703 C 53.870234 47.320703 56.390312 43.640625 63.070312 43.640625 C 66.720313 43.640625 73.270156 46.709141 76.410156 48.369141 C 76.610156 49.469141 77.069141 50.729141 78.119141 51.369141 C 78.399141 51.549141 78.709609 51.679844 79.099609 51.839844 C 80.239609 52.329844 82.150156 53.140156 84.410156 55.660156 C 84.800156 56.090156 85.350391 56.320313 85.900391 56.320312 C 86.280391 56.320312 86.66 56.210234 87 55.990234 L 90.009766 54.009766',
    'C 90.689766 53.559766 91.030859 52.750938 90.880859 51.960938 C 90.720859 51.170938 90.110313 50.540859 89.320312 50.380859 C 88.280312 50.160859 86.969766 49.650234 86.259766 49.240234 C 86.229766 48.780234 86.089062 48.309375 85.789062 47.859375 C 85.649062 47.649375 85.480781 47.450703 85.300781 47.220703 C 84.910781 46.760703 84.389453 46.129922 83.939453 45.169922 C 83.779453 44.839922 83.380781 44.220078 82.550781 43.830078 C 82.780781 43.630078 82.979609 43.389609 83.099609 43.099609 C 83.409609 42.349609 83.240156 41.489922 82.660156 40.919922 C 74.000156 32.299922 66.640078 30.499687 66.330078 30.429688 C 66.180078 30.389688 66.029141 30.369141 65.869141 30.369141 C 65.049141 30.369141 64.3 30.879688 64 31.679688 C 63.65 32.619687 64.059219 33.680391 64.949219 34.150391 C 64.999219 34.170391 67.709297 35.589375 70.779297 37.609375 L 70.720703 37.609375',
    'C 70.260703 37.639375 69.839531 37.840859 69.519531 38.130859 C 68.549531 37.750859 67.309219 37.339375 65.949219 37.109375 C 64.739219 36.899375 63.459844 36.869609 62.339844 36.849609 C 61.359844 36.829609 59.870234 36.790312 59.490234 36.570312 C 59.360234 36.460313 59.189766 36.329453 59.009766 36.189453 C 58.039766 35.469453 56.569297 34.380938 56.029297 27.710938 C 55.989297 27.170938 55.719063 26.660313 55.289062 26.320312 C 54.949062 26.040312 46.530547 19.480469 22.060547 19.480469 z M 22.060547 21.480469 C 46.110547 21.480469 54.039063 27.880859 54.039062 27.880859 C 54.719062 36.340859 56.98 37.080859 58.25 38.130859 C 59.51 39.190859 62.869375 38.610078 65.609375 39.080078 C 68.349375 39.550078 70.550781 40.820312 70.550781 40.820312 L 70.869141 39.609375',
    'C 71.749141 41.679375 73.869141 42.390625 73.869141 42.390625 L 73.869141 40.759766 C 74.659141 42.659766 76.869141 43.970703 76.869141 43.970703 L 76.869141 42.410156 C 76.869141 42.410156 77.609844 43.539844 78.339844 44.339844 C 79.079844 45.149844 79.859375 45.599609 79.859375 45.599609 C 79.859375 45.599609 80.350859 45.480469 80.880859 45.480469 C 81.380859 45.480469 81.920859 45.589531 82.130859 46.019531 C 82.890859 47.649531 83.810859 48.500703 84.130859 48.970703 C 84.440859 49.440703 84.130859 50 84.130859 50 C 84.650859 50.98 87.390156 52.019844 88.910156 52.339844 L 85.900391 54.320312 C 82.680391 50.740313 79.939922 50.149922 79.169922 49.669922 C 78.389922 49.189922 78.269531 47.109375 78.269531 47.109375',
    'C 78.269531 47.109375 68.530313 41.640625 63.070312 41.640625 C 55.020313 41.640625 51.900234 46.460625 51.740234 50.390625 C 51.580234 54.310625 53.729609 62.720703 64.849609 62.720703 C 77.659609 62.720703 85.320547 66.020547 89.560547 70.560547 C 94.020547 75.350547 93.320313 80.539063 93.320312 80.539062 C 91.370312 68.809062 78.119141 66.429687 78.119141 66.429688 C 91.209141 75.999687 89.380859 90.669922 89.380859 90.669922 C 88.490859 81.849922 84.570859 72.589375 77.880859 68.859375 C 69.920859 64.419375 65.939375 66.230781 59.359375 64.800781 C 54.589375 63.760781 49.149375 59.720234 48.859375 52.240234 C 48.509375 43.230234 55.910156 39.720703 55.910156 39.720703 L 52.519531 30.029297',
    'C 45.979531 25.119297 28.700781 22.000469 9.8007812 21.980469 C 14.290781 21.640469 18.370547 21.480469 22.060547 21.480469 z M 37.060547 30.089844 C 41.400547 30.089844 45.969922 30.399922 50.669922 31.169922 C 50.669922 31.179922 50.679453 31.179453 50.689453 31.189453 L 51.210938 33.359375 C 46.560937 32.379375 41.500937 32 36.460938 32 C 20.030938 32 3.9707031 36 3.9707031 36 C 3.9707031 36 18.240547 30.089844 37.060547 30.089844 z M 65.900391 32.380859 C 66.380391 32.500859 73.19 34.319844 81.25 42.339844 L 79.560547 42.339844 C 75.620547 37.509844 66.470391 32.680859 65.900391 32.380859 z M 51.460938 35.449219 L 51.539062 35.449219 L 52.380859 37.710938 C 51.840859 37.690938 51.309531 37.689453 50.769531 37.689453 C 31.459531 37.689453 12.640781 48.720547 12.050781 49.060547 C 12.600781 48.650547 30.140938 35.449219 51.460938 35.449219 z',
    'M 81.912109 47.929688 C 81.912109 47.929688 81.822109 48.49825 81.912109 48.65625 C 82.084109 48.96025 83.111328 49.376953 83.111328 49.376953 L 81.912109 47.929688 z',
  ].join(' ');

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
      const menu = menuRef.current;
      const activeElement = document.activeElement;
      if (
        menu &&
        activeElement instanceof HTMLElement &&
        menu.contains(activeElement) &&
        activeElement !== input
      ) {
        return;
      }
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
    if (process.env.NODE_ENV === 'test') {
      setIsOpen(true);
      return;
    }
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
      const targetNode = e.target instanceof Node ? e.target : null;
      if (targetNode && categoryListRef.current?.contains(targetNode)) {
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
      const targetNode = e.target instanceof Node ? e.target : null;
      if (!targetNode) return;
      if (!menuRef.current?.contains(targetNode) && !buttonRef.current?.contains(targetNode)) {
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
        className="flex items-center gap-2 border-b-2 border-transparent py-1 pl-3 pr-3 outline-none transition duration-100 ease-in-out"
        tabIndex={isOpen ? -1 : 0}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="h-4 w-4 text-white"
          fill="currentColor"
          focusable="false"
        >
          <path d={KALI_LOGO_PATH} />
        </svg>
        <span className="text-sm font-medium">Applications</span>
      </button>
      {isVisible && (
        <div
          ref={menuRef}
          data-testid="whisker-menu-dropdown"
          className={`fixed z-[260] flex max-h-[80vh] w-[min(100vw-1.5rem,680px)] flex-col overflow-x-hidden overflow-y-auto rounded-xl border border-[#1f2a3a] bg-[#0b121c] text-white shadow-[0_20px_40px_rgba(0,0,0,0.45)] transition-all duration-200 ease-out sm:absolute sm:top-full sm:left-0 sm:mt-1 sm:w-[680px] sm:max-h-[440px] sm:flex-row sm:overflow-hidden ${
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
          <div className="order-2 flex max-h-[44vh] flex-1 flex-col bg-[#0f1a29] sm:order-2 sm:max-h-full">
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
          <div className="order-1 flex w-full max-h-[36vh] flex-col overflow-y-auto bg-gradient-to-b from-[#111c2b] via-[#101a27] to-[#0d1622] sm:order-1 sm:max-h-[420px] sm:w-[260px] sm:overflow-visible">
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
        </div>
      )}
    </div>
  );
};

export default WhiskerMenu;
