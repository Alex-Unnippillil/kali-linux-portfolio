'use client';

import Image from 'next/image';
import { useRouter } from 'next/router';
import {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import rawApps from '../../apps.config';
import projectsData from '../../data/projects.json';

const CATEGORY_LABELS = {
  apps: 'Applications',
  settings: 'Settings',
  content: 'Content',
} as const;

type SearchCategory = keyof typeof CATEGORY_LABELS;

type NavigateTarget = string | { pathname: string; query?: Record<string, string> };

type AppMeta = {
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
  favourite?: boolean;
};

type Project = {
  id: number;
  title: string;
  description: string;
  stack?: string[];
  tags?: string[];
  year?: number;
  type?: string;
};

type SettingsEntry = {
  id: string;
  title: string;
  description: string;
  tab: 'appearance' | 'accessibility' | 'privacy';
  keywords: string[];
};

type ContentEntry = {
  id: string;
  title: string;
  description: string;
  target: NavigateTarget;
  keywords: string[];
};

type ResultItem = {
  id: string;
  title: string;
  description?: string;
  category: SearchCategory;
  target: NavigateTarget;
  icon?: string;
};

type ResultGroup = {
  category: SearchCategory;
  items: ResultItem[];
  startIndex: number;
};

const settingsEntries: SettingsEntry[] = [
  {
    id: 'theme',
    title: 'Theme',
    description: 'Switch between the available desktop themes.',
    tab: 'appearance',
    keywords: ['appearance', 'color', 'dark mode', 'light mode'],
  },
  {
    id: 'accent',
    title: 'Accent color',
    description: 'Pick the accent color that highlights controls across the desktop.',
    tab: 'appearance',
    keywords: ['appearance', 'color', 'highlight'],
  },
  {
    id: 'wallpaper',
    title: 'Wallpaper',
    description: 'Choose a wallpaper for the desktop background.',
    tab: 'appearance',
    keywords: ['appearance', 'background', 'image'],
  },
  {
    id: 'icon-size',
    title: 'Icon size',
    description: 'Adjust icon sizing for desktop windows and apps.',
    tab: 'accessibility',
    keywords: ['accessibility', 'font', 'scale'],
  },
  {
    id: 'density',
    title: 'Interface density',
    description: 'Toggle between regular and compact layouts.',
    tab: 'accessibility',
    keywords: ['accessibility', 'layout', 'spacing'],
  },
  {
    id: 'reduced-motion',
    title: 'Reduced motion',
    description: 'Minimise animations and transitions across the UI.',
    tab: 'accessibility',
    keywords: ['accessibility', 'animation', 'motion'],
  },
  {
    id: 'high-contrast',
    title: 'High contrast',
    description: 'Increase contrast for improved readability.',
    tab: 'accessibility',
    keywords: ['accessibility', 'vision', 'contrast'],
  },
  {
    id: 'haptics',
    title: 'Haptics',
    description: 'Enable interface haptics when supported.',
    tab: 'accessibility',
    keywords: ['feedback', 'vibration'],
  },
  {
    id: 'shortcuts',
    title: 'Edit shortcuts',
    description: 'Open the keyboard shortcut editor.',
    tab: 'accessibility',
    keywords: ['keyboard', 'shortcuts', 'keymap'],
  },
  {
    id: 'export-settings',
    title: 'Export settings',
    description: 'Download the current desktop configuration as JSON.',
    tab: 'privacy',
    keywords: ['backup', 'privacy', 'download'],
  },
  {
    id: 'import-settings',
    title: 'Import settings',
    description: 'Restore settings from a saved JSON file.',
    tab: 'privacy',
    keywords: ['restore', 'privacy', 'upload'],
  },
  {
    id: 'reset-desktop',
    title: 'Reset desktop',
    description: 'Reset the environment to its default configuration.',
    tab: 'appearance',
    keywords: ['restore', 'defaults', 'clear'],
  },
];

const contentEntries: ContentEntry[] = (projectsData as Project[]).map((project) => ({
  id: `project-${project.id}`,
  title: project.title,
  description: project.description,
  target: {
    pathname: '/apps/project-gallery',
    query: { q: project.title },
  },
  keywords: [
    project.description,
    project.type,
    project.year ? String(project.year) : undefined,
    ...(project.stack ?? []),
    ...(project.tags ?? []),
  ].filter((value): value is string => Boolean(value)),
}));

const allApps: AppMeta[] = (rawApps as AppMeta[]).filter((app) => !app.disabled);

const favouriteApps = allApps.filter((app) => app.favourite);

function normaliseTokens(value: string) {
  return value
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function itemMatches(tokens: string[], fields: (string | undefined)[]) {
  if (!tokens.length) return true;
  const haystack = fields
    .filter((field): field is string => Boolean(field))
    .map((field) => field.toLowerCase());
  return tokens.every((token) => haystack.some((field) => field.includes(token)));
}

const getAppResults = (tokens: string[]): ResultItem[] => {
  const source = tokens.length ? allApps : favouriteApps.length ? favouriteApps : allApps;
  const matches = source.filter((app) =>
    itemMatches(tokens, [app.title, app.id])
  );
  const trimmed = tokens.length ? matches : matches.slice(0, 8);
  return trimmed.map((app) => ({
    id: `app-${app.id}`,
    title: app.title,
    description: `Open the ${app.title} application`,
    category: 'apps' as const,
    target: `/apps/${app.id}`,
    icon: app.icon,
  }));
};

const getSettingsResults = (tokens: string[]): ResultItem[] => {
  const matches = settingsEntries.filter((entry) =>
    itemMatches(tokens, [entry.title, entry.description, ...entry.keywords])
  );
  const trimmed = tokens.length ? matches : matches.slice(0, 6);
  return trimmed.map((entry) => ({
    id: `setting-${entry.id}`,
    title: entry.title,
    description: entry.description,
    category: 'settings' as const,
    target: {
      pathname: '/apps/settings',
      query: { tab: entry.tab, focus: entry.id },
    },
  }));
};

const getContentResults = (tokens: string[]): ResultItem[] => {
  const matches = contentEntries.filter((entry) =>
    itemMatches(tokens, [entry.title, entry.description, ...entry.keywords])
  );
  const trimmed = tokens.length ? matches : matches.slice(0, 6);
  return trimmed.map((entry) => ({
    id: entry.id,
    title: entry.title,
    description: entry.description,
    category: 'content' as const,
    target: entry.target,
  }));
};

const GlobalSearch: React.FC = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const tokens = useMemo(() => normaliseTokens(query), [query]);

  useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [query, open]);

  const groups = useMemo<ResultGroup[]>(() => {
    if (!open && !tokens.length) return [];

    const appItems = getAppResults(tokens);
    const settingsItems = getSettingsResults(tokens);
    const contentItems = getContentResults(tokens);

    const result: ResultGroup[] = [];
    let offset = 0;
    if (appItems.length) {
      result.push({ category: 'apps', items: appItems, startIndex: offset });
      offset += appItems.length;
    }
    if (settingsItems.length) {
      result.push({ category: 'settings', items: settingsItems, startIndex: offset });
      offset += settingsItems.length;
    }
    if (contentItems.length) {
      result.push({ category: 'content', items: contentItems, startIndex: offset });
    }
    return result;
  }, [tokens, open]);

  const flatResults = useMemo(
    () => groups.flatMap((group) => group.items),
    [groups]
  );

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setHighlight(0);
    requestAnimationFrame(() => {
      previousFocusRef.current?.focus?.();
    });
  }, []);

  const openPalette = useCallback(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
    setHighlight(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handle = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => cancelAnimationFrame(handle);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (highlight >= flatResults.length && flatResults.length > 0) {
      setHighlight(flatResults.length - 1);
    }
  }, [flatResults.length, highlight, open]);

  useEffect(() => {
    if (!open) return;
    const element = document.getElementById(`global-search-item-${highlight}`);
    element?.scrollIntoView({ block: 'nearest' });
    const { target } = flatResults[highlight] ?? {};
    if (!target) return;
    if (typeof target === 'string') {
      router.prefetch(target).catch(() => {});
    } else {
      router.prefetch(target).catch(() => {});
    }
  }, [highlight, flatResults, router, open]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput = target
        ? ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
        : false;

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        if (!isInput) {
          event.preventDefault();
          openPalette();
        }
        return;
      }

      if (!open) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, close, openPalette]);

  useEffect(() => {
    if (!open) return;
    const handleRouteChange = () => close();
    router.events?.on('routeChangeComplete', handleRouteChange);
    router.events?.on('routeChangeError', handleRouteChange);
    return () => {
      router.events?.off('routeChangeComplete', handleRouteChange);
      router.events?.off('routeChangeError', handleRouteChange);
    };
  }, [open, router.events, close]);

  const handleSelect = useCallback(
    (item: ResultItem | undefined) => {
      if (!item) return;
      const navigate = () => {
        if (typeof item.target === 'string') {
          return router.push(item.target);
        }
        return router.push(item.target);
      };
      close();
      navigate().catch(() => {});
    },
    [router, close]
  );

  const handleKeyNavigation = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (!flatResults.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlight((index) => (index + 1) % flatResults.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlight((index) => (index - 1 + flatResults.length) % flatResults.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleSelect(flatResults[highlight]);
    } else if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      // prevent focus from leaving the dialog while navigating
      event.preventDefault();
      setHighlight((index) => (index + 1) % flatResults.length);
    }
  };

  const handleResultClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    index: number
  ) => {
    event.preventDefault();
    handleSelect(flatResults[index]);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4"
      role="presentation"
      onClick={() => close()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-label"
        className="w-full max-w-xl rounded-lg bg-ub-grey text-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-white/10 p-4">
          <label
            id="global-search-label"
            htmlFor="global-search-input"
            className="block text-xs uppercase tracking-wide text-white/70"
          >
            Search the desktop
          </label>
          <input
            id="global-search-input"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyNavigation}
            placeholder="Search apps, settings, and projects"
            className="mt-2 w-full rounded bg-black/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ub-orange"
            autoComplete="off"
          />
        </div>
        <div
          className="max-h-80 overflow-y-auto p-2"
          role="listbox"
          aria-activedescendant={`global-search-item-${highlight}`}
        >
          {flatResults.length === 0 ? (
            <div className="px-3 py-6 text-sm text-white/70">
              {tokens.length
                ? 'No results match your search.'
                : 'Start typing to search applications, settings, or project entries.'}
            </div>
          ) : (
            groups.map((group) => (
              <div key={group.category} className="mb-3">
                <div className="px-3 text-xs font-semibold uppercase text-white/60">
                  {CATEGORY_LABELS[group.category]}
                </div>
                <div role="group" aria-label={CATEGORY_LABELS[group.category]}>
                  {group.items.map((item, index) => {
                    const globalIndex = group.startIndex + index;
                    const active = highlight === globalIndex;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        id={`global-search-item-${globalIndex}`}
                        role="option"
                        aria-selected={active}
                        className={`flex w-full items-center gap-3 rounded px-3 py-2 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-ub-orange ${
                          active ? 'bg-white/15' : 'hover:bg-white/10'
                        }`}
                        onMouseEnter={() => setHighlight(globalIndex)}
                        onClick={(event) => handleResultClick(event, globalIndex)}
                      >
                        {item.icon ? (
                          <Image
                            src={item.icon}
                            alt=""
                            width={32}
                            height={32}
                            className="h-8 w-8 flex-shrink-0 rounded"
                          />
                        ) : (
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-white/10 text-xs uppercase">
                            {item.title.slice(0, 2)}
                          </span>
                        )}
                        <span className="flex-1">
                          <span className="block font-medium">{item.title}</span>
                          {item.description && (
                            <span className="block text-xs text-white/70">
                              {item.description}
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] uppercase text-white/50">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs text-white/60">
          <span>Press Esc to close • ⌘K / Ctrl+K to toggle</span>
          <span>{flatResults.length} result{flatResults.length === 1 ? '' : 's'}</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
