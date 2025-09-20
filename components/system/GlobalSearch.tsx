'use client';

import Image from 'next/image';
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { KeyboardEvent } from 'react';
import milestonesData from '../../data/milestones.json';
import modulesData from '../../data/module-index.json';
import projectsData from '../../data/projects.json';

type SearchGroupId = 'apps' | 'settings' | 'content';

type AppConfig = {
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
  description?: string;
  keywords?: string[];
  tags?: string[];
};

type Project = {
  id: number;
  title: string;
  description: string;
  stack: string[];
  tags: string[];
  year: number;
  type: string;
  repo?: string;
  demo?: string;
  language?: string;
};

type Milestone = {
  date: string;
  title: string;
  link?: string;
  tags?: string[];
};

type ModuleEntry = {
  id: string;
  name: string;
  description: string;
  tags?: string[];
};

type SettingSource = {
  id: string;
  title: string;
  description: string;
  section: string;
  keywords: string[];
};

type ContentSource = {
  id: string;
  title: string;
  description?: string;
  keywords: string[];
  meta?: string;
  badge?: string;
  href?: string;
  targetApp?: string;
};

const GROUP_DEFINITIONS: readonly { id: SearchGroupId; label: string }[] = [
  { id: 'apps', label: 'Applications' },
  { id: 'settings', label: 'Settings' },
  { id: 'content', label: 'Content' },
];

const SUGGESTION_LIMIT: Record<SearchGroupId, number> = {
  apps: 6,
  settings: 6,
  content: 6,
};

const MAX_RESULTS_PER_GROUP = 20;

const SETTINGS_SOURCES: readonly SettingSource[] = [
  {
    id: 'theme',
    title: 'Desktop Theme',
    description: 'Switch between default, dark, neon, and matrix themes.',
    section: 'Appearance',
    keywords: ['theme', 'mode', 'appearance', 'dark', 'light'],
  },
  {
    id: 'accent',
    title: 'Accent Color',
    description: 'Pick the highlight color used for windows and controls.',
    section: 'Appearance',
    keywords: ['color', 'highlight', 'style', 'palette'],
  },
  {
    id: 'wallpaper',
    title: 'Wallpaper',
    description: 'Choose a new desktop background image.',
    section: 'Appearance',
    keywords: ['background', 'image', 'wallpaper'],
  },
  {
    id: 'density',
    title: 'Interface Density',
    description: 'Toggle between regular and compact spacing.',
    section: 'Display',
    keywords: ['layout', 'spacing', 'compact'],
  },
  {
    id: 'font-scale',
    title: 'Font Size',
    description: 'Adjust the system font scale for readability.',
    section: 'Accessibility',
    keywords: ['text', 'font', 'accessibility', 'size'],
  },
  {
    id: 'reduced-motion',
    title: 'Reduced Motion',
    description: 'Limit animations to reduce visual motion.',
    section: 'Accessibility',
    keywords: ['animation', 'motion', 'accessibility'],
  },
  {
    id: 'high-contrast',
    title: 'High Contrast Mode',
    description: 'Increase contrast for improved visibility.',
    section: 'Accessibility',
    keywords: ['contrast', 'vision', 'accessibility'],
  },
  {
    id: 'large-hit-areas',
    title: 'Large Hit Areas',
    description: 'Make interactive controls easier to tap or click.',
    section: 'Accessibility',
    keywords: ['touch', 'hit areas', 'accessibility'],
  },
  {
    id: 'allow-network',
    title: 'Allow Network Requests',
    description: 'Toggle simulated network activity for demos.',
    section: 'Privacy',
    keywords: ['network', 'requests', 'online', 'api'],
  },
  {
    id: 'haptics',
    title: 'Haptic Feedback',
    description: 'Enable vibration cues in supported mini-games.',
    section: 'Input',
    keywords: ['vibration', 'feedback', 'controller'],
  },
  {
    id: 'pong-spin',
    title: 'Pong Spin',
    description: 'Enable the advanced spin mechanic in Pong.',
    section: 'Games',
    keywords: ['pong', 'gameplay', 'spin'],
  },
];

const formatMilestoneDate = (value: string): string => {
  const [yearStr, monthStr] = value.split('-');
  const year = Number(yearStr);
  const month = monthStr ? Number(monthStr) - 1 : 0;
  if (!Number.isFinite(year)) {
    return value;
  }
  try {
    const date = new Date(Date.UTC(year, Math.max(0, month)));
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return value;
  }
};

const collectKeywords = (
  ...values: Array<string | number | (string | number)[] | undefined>
): string[] => {
  const keywords: string[] = [];
  values.forEach((value) => {
    if (value === undefined) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null) {
          keywords.push(String(entry));
        }
      });
      return;
    }
    keywords.push(String(value));
  });
  return keywords;
};

const projectSources: ContentSource[] = (projectsData as Project[]).map((project) => ({
  id: `project-${project.id}`,
  title: project.title,
  description: project.description,
  meta: `${project.year} • ${project.type}`,
  badge: 'Project',
  keywords: collectKeywords(
    project.title,
    project.description,
    project.type,
    project.year,
    project.language,
    project.stack,
    project.tags
  ),
  targetApp: 'project-gallery',
  href: project.demo || project.repo,
}));

const milestoneSources: ContentSource[] = (milestonesData as Milestone[]).map(
  (milestone, index) => ({
    id: `milestone-${index}`,
    title: milestone.title,
    description: 'Career milestone',
    meta: formatMilestoneDate(milestone.date),
    badge: 'Milestone',
    keywords: collectKeywords(milestone.title, milestone.date, milestone.tags),
    href: milestone.link,
  })
);

const moduleSources: ContentSource[] = (modulesData as ModuleEntry[]).map((module) => ({
  id: `module-${module.id}`,
  title: module.name,
  description: module.description,
  meta: 'Metasploit module',
  badge: 'Module',
  keywords: collectKeywords(module.name, module.description, module.id, module.tags),
  targetApp: 'metasploit',
}));

const CONTENT_SOURCES: readonly ContentSource[] = [
  ...projectSources,
  ...milestoneSources,
  ...moduleSources,
];

type BaseItem = {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  meta?: string;
  badge?: string;
  href?: string;
  keywords?: string[];
  group: SearchGroupId;
  action?: () => void;
};

type SearchItem = BaseItem & {
  keywords: string[];
  searchText: string;
};

interface GroupedResults {
  id: SearchGroupId;
  label: string;
  results: SearchItem[];
}

const createSearchItem = (item: BaseItem): SearchItem => {
  const keywords = item.keywords ?? [];
  const searchValues = [item.title, item.description, ...keywords];
  const searchText = searchValues
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ')
    .toLowerCase();
  return {
    ...item,
    keywords,
    searchText,
  };
};

const sanitizeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, '-');

const groupResults = (items: SearchItem[], normalizedQuery: string): GroupedResults[] => {
  const tokens = normalizedQuery ? normalizedQuery.split(/\s+/).filter(Boolean) : [];
  if (!tokens.length) {
    return GROUP_DEFINITIONS.map(({ id, label }) => ({
      id,
      label,
      results: items
        .filter((item) => item.group === id)
        .sort((a, b) => a.title.localeCompare(b.title))
        .slice(0, SUGGESTION_LIMIT[id]),
    })).filter((group) => group.results.length > 0);
  }

  const grouped: Record<SearchGroupId, SearchItem[]> = {
    apps: [],
    settings: [],
    content: [],
  };

  const fullQuery = normalizedQuery;

  items.forEach((item) => {
    const matches = tokens.every((token) => item.searchText.includes(token));
    if (matches) {
      grouped[item.group].push(item);
    }
  });

  return GROUP_DEFINITIONS.map(({ id, label }) => {
    const sorted = grouped[id]
      .slice()
      .sort((a, b) => {
        if (!fullQuery) {
          return a.title.localeCompare(b.title);
        }
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        const aStarts = aTitle.startsWith(fullQuery);
        const bStarts = bTitle.startsWith(fullQuery);
        if (aStarts !== bStarts) {
          return aStarts ? -1 : 1;
        }
        const aIndex = a.searchText.indexOf(fullQuery);
        const bIndex = b.searchText.indexOf(fullQuery);
        if (aIndex !== bIndex) {
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        }
        return a.title.localeCompare(b.title);
      })
      .slice(0, MAX_RESULTS_PER_GROUP);

    return {
      id,
      label,
      results: sorted,
    };
  }).filter((group) => group.results.length > 0);
};

interface GlobalSearchProps {
  autoFocus?: boolean;
  initialQuery?: string;
  onClose?: () => void;
  placeholder?: string;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  autoFocus = true,
  initialQuery = '',
  onClose,
  placeholder = 'Search apps, settings, and content',
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [apps, setApps] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const deferredQuery = useDeferredValue(query);
  const trimmedQuery = deferredQuery.trim();
  const normalizedQuery = trimmedQuery.toLowerCase();
  const listboxId = useId();
  const inputId = `${listboxId}-input`;
  const resultsId = `${listboxId}-results`;
  const previousQueryRef = useRef<string>('');
  const resultRefs = useRef(new Map<string, HTMLLIElement>());
  const [active, setActive] = useState<{ groupIndex: number; itemIndex: number } | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  const openApp = useCallback((id: string) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('open-app', { detail: id }));
  }, []);

  const focusSetting = useCallback(
    (settingId: string) => {
      openApp('settings');
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('settings-focus', { detail: settingId }));
      }
    },
    [openApp]
  );

  const openLink = useCallback((url: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = url;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const loadApps = async () => {
      try {
        const mod = await import('../../apps.config');
        if (cancelled) return;
        const list = (mod.default ?? []) as AppConfig[];
        const items = list
          .filter((app) => !app.disabled)
          .map((app) => {
            const keywords = collectKeywords(app.id, app.title, app.keywords, app.tags);
            return createSearchItem({
              id: `app-${app.id}`,
              title: app.title,
              description: app.description,
              icon: app.icon,
              keywords,
              badge: 'App',
              group: 'apps',
              action: () => openApp(app.id),
            });
          })
          .sort((a, b) => a.title.localeCompare(b.title));
        setApps(items);
      } catch {
        if (!cancelled) {
          setApps([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadApps();

    return () => {
      cancelled = true;
    };
  }, [openApp]);

  const settingsItems = useMemo(
    () =>
      SETTINGS_SOURCES.map((setting) =>
        createSearchItem({
          id: `setting-${setting.id}`,
          title: setting.title,
          description: setting.description,
          meta: setting.section,
          badge: 'Setting',
          keywords: collectKeywords(setting.title, setting.description, setting.section, setting.keywords),
          group: 'settings',
          action: () => focusSetting(setting.id),
        })
      ),
    [focusSetting]
  );

  const contentItems = useMemo(
    () =>
      CONTENT_SOURCES.map((source) =>
        createSearchItem({
          id: source.id,
          title: source.title,
          description: source.description,
          meta: source.meta,
          badge: source.badge,
          keywords: source.keywords,
          href: source.href,
          group: 'content',
          action: () => {
            if (source.targetApp) {
              openApp(source.targetApp);
              return;
            }
            if (source.href) {
              openLink(source.href);
            }
          },
        })
      ),
    [openApp, openLink]
  );

  const allItems = useMemo(() => [...apps, ...settingsItems, ...contentItems], [apps, settingsItems, contentItems]);

  const filteredGroups = useMemo(
    () => groupResults(allItems, normalizedQuery),
    [allItems, normalizedQuery]
  );

  const activeItem =
    active && filteredGroups[active.groupIndex]
      ? filteredGroups[active.groupIndex].results[active.itemIndex]
      : undefined;
  const activeResultId =
    activeItem && active
      ? `${resultsId}-${sanitizeId(`${filteredGroups[active.groupIndex].id}-${activeItem.id}`)}`
      : undefined;

  useEffect(() => {
    setActive((prev) => {
      if (!filteredGroups.length) {
        return null;
      }
      if (!normalizedQuery) {
        return null;
      }
      if (!prev || previousQueryRef.current !== normalizedQuery) {
        return { groupIndex: 0, itemIndex: 0 };
      }
      const group = filteredGroups[prev.groupIndex];
      if (group && group.results[prev.itemIndex]) {
        return prev;
      }
      return { groupIndex: 0, itemIndex: 0 };
    });
    previousQueryRef.current = normalizedQuery;
  }, [filteredGroups, normalizedQuery]);

  useEffect(() => {
    if (!active) return;
    const group = filteredGroups[active.groupIndex];
    if (!group) return;
    const item = group.results[active.itemIndex];
    if (!item) return;
    const key = `${group.id}-${item.id}`;
    const element = resultRefs.current.get(key);
    element?.scrollIntoView({ block: 'nearest' });
  }, [active, filteredGroups]);

  const registerResultRef = useCallback(
    (key: string) => (node: HTMLLIElement | null) => {
      const map = resultRefs.current;
      if (!node) {
        map.delete(key);
        return;
      }
      map.set(key, node);
    },
    []
  );

  const navigateVertical = useCallback(
    (direction: 1 | -1) => {
      if (!filteredGroups.length) return;
      setActive((prev) => {
        if (!prev) {
          if (direction > 0) {
            return { groupIndex: 0, itemIndex: 0 };
          }
          const lastGroupIndex = filteredGroups.length - 1;
          const lastItemIndex = filteredGroups[lastGroupIndex].results.length - 1;
          return { groupIndex: lastGroupIndex, itemIndex: lastItemIndex };
        }
        let groupIndex = prev.groupIndex;
        let itemIndex = prev.itemIndex + direction;
        if (itemIndex < 0) {
          if (groupIndex === 0) return prev;
          groupIndex -= 1;
          itemIndex = filteredGroups[groupIndex].results.length - 1;
        } else if (itemIndex >= filteredGroups[groupIndex].results.length) {
          if (groupIndex === filteredGroups.length - 1) return prev;
          groupIndex += 1;
          itemIndex = 0;
        }
        return { groupIndex, itemIndex };
      });
    },
    [filteredGroups]
  );

  const navigateHorizontal = useCallback(
    (direction: 1 | -1) => {
      if (!filteredGroups.length) return;
      setActive((prev) => {
        if (!prev) {
          return direction > 0
            ? { groupIndex: 0, itemIndex: 0 }
            : {
                groupIndex: filteredGroups.length - 1,
                itemIndex: filteredGroups[filteredGroups.length - 1].results.length - 1,
              };
        }
        const nextGroupIndex = prev.groupIndex + direction;
        if (nextGroupIndex < 0 || nextGroupIndex >= filteredGroups.length) {
          return prev;
        }
        const nextGroup = filteredGroups[nextGroupIndex];
        const nextItemIndex = Math.min(prev.itemIndex, nextGroup.results.length - 1);
        return { groupIndex: nextGroupIndex, itemIndex: nextItemIndex };
      });
    },
    [filteredGroups]
  );

  const handleSelect = useCallback(
    (item?: SearchItem) => {
      const target = item ?? activeItem;
      if (!target) return;
      if (target.action) {
        target.action();
      } else if (target.href) {
        openLink(target.href);
      }
      onClose?.();
    },
    [activeItem, onClose, openLink]
  );

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        navigateVertical(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        navigateVertical(-1);
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        navigateHorizontal(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateHorizontal(-1);
      } else if (event.key === 'Enter') {
        if (activeItem) {
          event.preventDefault();
          handleSelect();
        }
      }
    },
    [activeItem, handleSelect, navigateHorizontal, navigateVertical]
  );

  const totalResults = filteredGroups.reduce((sum, group) => sum + group.results.length, 0);
  const totalIndexed = allItems.length;
  const showEmptyState = !loading && trimmedQuery !== '' && totalResults === 0;

  const statusMessage = loading
    ? 'Loading search index'
    : trimmedQuery
    ? totalResults
      ? `${totalResults} result${totalResults === 1 ? '' : 's'} for "${trimmedQuery}"`
      : `No results for "${trimmedQuery}"`
    : `Indexed ${totalIndexed} entries from apps, settings, and content.`;

  const renderAvatar = (item: SearchItem) => {
    if (item.icon) {
      return (
        <Image
          src={item.icon}
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 rounded"
        />
      );
    }
    const initial = item.title.trim().charAt(0).toUpperCase() || '•';
    return (
      <div className="flex h-8 w-8 items-center justify-center rounded bg-white/10 text-sm font-semibold">
        {initial}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col bg-ub-dark text-white">
      <div className="border-b border-white/10 px-4 pb-3 pt-4">
        <label htmlFor={inputId} className="sr-only">
          Search the desktop
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleInputKeyDown}
          aria-controls={resultsId}
          aria-activedescendant={activeResultId}
          placeholder={placeholder}
          autoFocus={autoFocus}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          className="w-full rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm placeholder:text-ubt-grey focus:outline-none focus:ring-2 focus:ring-ub-orange"
        />
        <p className="mt-2 text-xs text-ubt-grey">
          Search across applications, quick settings, and portfolio content. Use the arrow keys to navigate results.
        </p>
      </div>
      <div className="relative flex-1 overflow-hidden px-4 pb-4 pt-3">
        <div role="status" aria-live="polite" className="sr-only">
          {statusMessage}
        </div>
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-ubt-grey">
            Building search index…
          </div>
        ) : showEmptyState ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-ubt-grey">
            <p>No results for “{trimmedQuery}”.</p>
            <p className="mt-2">
              Try a different keyword, like “Metasploit”, “Dark theme”, or “Project Alpha”.
            </p>
          </div>
        ) : (
          <div className="max-h-full overflow-y-auto pr-1">
            <div id={resultsId} role="listbox" aria-label="Search results" className="space-y-5">
              {filteredGroups.map((group, groupIndex) => {
                const labelId = `${resultsId}-${sanitizeId(`${group.id}-label`)}`;
                return (
                  <div key={group.id}>
                    <div id={labelId} className="text-xs font-semibold uppercase tracking-wide text-ubt-grey">
                      {group.label}
                    </div>
                    <ul className="mt-2 space-y-1" role="group" aria-labelledby={labelId}>
                      {group.results.map((item, itemIndex) => {
                        const mapKey = `${group.id}-${item.id}`;
                        const optionId = `${resultsId}-${sanitizeId(mapKey)}`;
                        const isActive =
                          !!active &&
                          active.groupIndex === groupIndex &&
                          active.itemIndex === itemIndex;
                        return (
                          <li
                            key={mapKey}
                            id={optionId}
                            role="option"
                            aria-selected={isActive}
                            ref={registerResultRef(mapKey)}
                          >
                            <button
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onMouseEnter={() => setActive({ groupIndex, itemIndex })}
                              onClick={() => handleSelect(item)}
                              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-ub-orange focus:ring-offset-2 focus:ring-offset-ub-dark ${
                                isActive ? 'bg-ub-orange text-black shadow-inner' : 'bg-white/5 hover:bg-white/10'
                              }`}
                            >
                              {renderAvatar(item)}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium">{item.title}</span>
                                  {item.badge && (
                                    <span className="rounded bg-black/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="mt-1 text-xs text-ubt-grey line-clamp-2">{item.description}</p>
                                )}
                              </div>
                              {item.meta && (
                                <span className="whitespace-nowrap text-xs text-ubt-grey">{item.meta}</span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
