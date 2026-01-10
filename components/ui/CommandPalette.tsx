"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { CommandPaletteItem, CommandPaletteItemType } from '../../utils/commandPalette/types';
import {
  SECTION_METADATA,
  filterAndRankSections,
  normalizeItems,
  type SearchSection,
  type SearchableSourceItem,
  type SectionSource,
} from '../../utils/commandPalette/indexing';
import { readRecentSelections } from '../../utils/recentStorage';

export type BasicItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  keywords?: string[];
  href?: string;
  data?: Record<string, unknown>;
};

type CommandPaletteProps = {
  open: boolean;
  apps: BasicItem[];
  recentWindows: BasicItem[];
  settingsActions: BasicItem[];
  onSelect: (item: CommandPaletteItem) => void;
  onClose: () => void;
};

type WorkerResultMessage = {
  type: 'result';
  requestId: number;
  sections: SearchSection[];
};

type WorkerReadyMessage = {
  type: 'ready';
};

type WorkerErrorMessage = {
  type: 'error';
};

type WorkerMessage = WorkerResultMessage | WorkerReadyMessage | WorkerErrorMessage;

let workerUrl: URL | undefined;
try {
  if (typeof window !== 'undefined') {
    workerUrl = new URL('../../workers/commandPaletteIndex.worker.ts', import.meta.url);
  }
} catch (error) {
  workerUrl = undefined;
}

const isMacLike = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform || userAgent);
};

const modifierHint = isMacLike() ? '⌘' : 'Ctrl';

const buildSection = (items: BasicItem[], type: CommandPaletteItemType): SectionSource => ({
  type,
  items: normalizeItems(items, type),
});

const flattenItems = (sections: SearchSection[]): CommandPaletteItem[] =>
  sections.flatMap((section) => section.items);

export default function CommandPalette({
  open,
  apps,
  recentWindows,
  settingsActions,
  onSelect,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [sections, setSections] = useState<SearchSection[]>([]);
  const [useWorker, setUseWorker] = useState(true);
  const [staticSections, setStaticSections] = useState<SectionSource[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef(0);
  const recentSelectionsRef = useRef<SearchableSourceItem[]>([]);

  const baseSources = useMemo<SectionSource[]>(() => [
    buildSection(recentWindows, 'window'),
    buildSection(apps, 'app'),
    buildSection(settingsActions, 'action'),
  ], [apps, recentWindows, settingsActions]);

  const fallbackSections = useMemo(
    () => filterAndRankSections([...baseSources, ...staticSections], query, recentSelectionsRef.current),
    [baseSources, query, staticSections]
  );

  const flatItems = useMemo(() => flattenItems(sections.length ? sections : fallbackSections), [sections, fallbackSections]);

  const indexLookup = useMemo(() => {
    const map = new Map<string, number>();
    flatItems.forEach((item, index) => {
      map.set(`${item.type}:${item.id}`, index);
    });
    return map;
  }, [flatItems]);

  const ensureWorker = useCallback(() => {
    if (!useWorker) return null;
    if (typeof window === 'undefined') return null;
    if (!workerUrl) return null;
    if (typeof Worker === 'undefined') {
      setUseWorker(false);
      return null;
    }
    if (!workerRef.current) {
      try {
        const worker = new Worker(workerUrl, { type: 'module' });
        worker.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
          const message = event.data;
          if (!message || typeof message !== 'object') return;
          if (message.type === 'error') {
            setUseWorker(false);
            return;
          }
          if (message.type === 'result') {
            if (message.requestId !== requestIdRef.current) return;
            setSections(message.sections);
          }
        });
        worker.addEventListener('error', () => {
          setUseWorker(false);
        });
        workerRef.current = worker;
      } catch (error) {
        console.warn('Failed to start command palette worker:', error);
        setUseWorker(false);
        workerRef.current = null;
      }
    }
    return workerRef.current;
  }, [useWorker]);

  const loadStaticSections = useCallback(async (): Promise<SectionSource[]> => {
    if (staticSections.length) {
      return staticSections;
    }
    if (typeof window === 'undefined' || typeof fetch !== 'function') return [];

    const sections: SectionSource[] = [];

    try {
      const response = await fetch('/docs/index.json', { cache: 'force-cache' });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          const docsItems = data.map((entry: any) => ({
            id: entry.id,
            title: entry.title ?? entry.id,
            subtitle: entry.summary,
            href: entry.path,
            keywords: [entry.title, entry.summary, entry.path].filter(Boolean),
          }));
          sections.push({ type: 'doc', items: normalizeItems(docsItems, 'doc') });
        }
      }
    } catch (error) {
      console.warn('Failed to load docs manifest for command palette fallback', error);
    }

    try {
      const response = await fetch('/sitemap.xml', { cache: 'force-cache' });
      if (response.ok) {
        const xml = await response.text();
        const matches = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)];
        const paths = new Set<string>();
        matches.forEach((match) => {
          const value = match[1];
          try {
            const url = new URL(value, window.location.origin);
            if (url.pathname) {
              paths.add(url.pathname);
            }
          } catch {
            if (value.startsWith('/')) {
              paths.add(value);
            }
          }
        });
        const routeItems = Array.from(paths).map((path) => ({
          id: path || '/',
          title: path && path !== '/' ? path.replace(/\//g, ' / ').replace(/\s+/g, ' ').trim() || path : 'Home',
          subtitle: 'Site page',
          href: path || '/',
          keywords: path.split('/').filter(Boolean),
        }));
        sections.push({ type: 'route', items: normalizeItems(routeItems, 'route') });
      }
    } catch (error) {
      console.warn('Failed to load sitemap for command palette fallback', error);
    }

    setStaticSections(sections);
    return sections;
  }, [staticSections]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      setSections([]);
      return;
    }

    const recentSelections = readRecentSelections();
    recentSelectionsRef.current = recentSelections.map((item) => ({
      ...item,
      type: item.type as CommandPaletteItemType,
    }));

    const worker = ensureWorker();
    if (!worker) {
      loadStaticSections();
      setSections(fallbackSections);
      return;
    }

    worker.postMessage({
      type: 'warm',
      payload: {
        sections: baseSources,
        docsManifestUrl: '/docs/index.json',
        sitemapUrl: '/sitemap.xml',
        recentSelections: recentSelectionsRef.current,
      },
    });
  }, [open, baseSources, ensureWorker, fallbackSections, loadStaticSections]);

  useEffect(() => {
    if (!open) return;
    if (!useWorker) {
      loadStaticSections();
      setSections(fallbackSections);
      return;
    }

    const worker = ensureWorker();
    if (!worker) {
      loadStaticSections();
      setSections(fallbackSections);
      return;
    }

    const requestId = ++requestIdRef.current;
    worker.postMessage({
      type: 'search',
      payload: {
        requestId,
        query,
        sections: baseSources,
        recentSelections: recentSelectionsRef.current,
      },
    });
  }, [query, baseSources, fallbackSections, open, ensureWorker, useWorker, loadStaticSections]);

  useEffect(() => {
    if (!open) return;
    const raf = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!flatItems.length) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(0);
  }, [query, flatItems.length, open]);

  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, flatItems.length);
  }, [flatItems.length]);

  useEffect(() => {
    if (activeIndex < 0) return;
    const node = itemRefs.current[activeIndex];
    if (node) {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, flatItems]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const handleSelect = (index: number) => {
    const item = flatItems[index];
    if (!item) return;
    onSelect(item);
    setTimeout(() => {
      recentSelectionsRef.current = readRecentSelections().map((entry) => ({
        ...entry,
        type: entry.type as CommandPaletteItemType,
      }));
    }, 0);
  };

  const handleKeyNavigation = (event: KeyboardEvent<HTMLElement>) => {
    if (!open) return;
    const { key } = event;
    const length = flatItems.length;

    if (!length) {
      if (key === 'Escape' && !query) {
        event.preventDefault();
        onClose();
      }
      return;
    }

    if (key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (current + 1 >= length ? 0 : current + 1));
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? length - 1 : current - 1));
    } else if (key === 'Home') {
      event.preventDefault();
      setActiveIndex(0);
    } else if (key === 'End') {
      event.preventDefault();
      setActiveIndex(length - 1);
    } else if (key === 'Enter') {
      event.preventDefault();
      if (activeIndex >= 0) {
        handleSelect(activeIndex);
      }
    } else if (key === 'Escape') {
      if (query) {
        event.preventDefault();
        setQuery('');
      } else {
        event.preventDefault();
        onClose();
      }
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const navigationKeys = new Set(['ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', 'Escape']);
    if (navigationKeys.has(event.key)) {
      handleKeyNavigation(event);
    }
  };

  const handleListKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target === searchInputRef.current) return;
    handleKeyNavigation(event);
  };

  const activeOptionId = activeIndex >= 0 && flatItems[activeIndex]
    ? `command-palette-option-${flatItems[activeIndex].type}-${flatItems[activeIndex].id}`
    : undefined;

  return (
    <div className="flex h-full w-full flex-col gap-4 bg-slate-950/70 p-6 text-white">
      <header className="space-y-2">
        <h2 className="text-xl font-semibold tracking-wide">Command Palette</h2>
        <p className="text-sm text-white/70">
          Search across applications, open windows, documentation, and site pages. Use the arrow keys to navigate and Enter to launch.
        </p>
      </header>

      <div>
        <label htmlFor="command-palette-search" className="sr-only">
          Search commands
        </label>
        <div className="relative">
          <input
            ref={searchInputRef}
            id="command-palette-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search apps, windows, docs, and pages"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm text-white shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
            aria-label="Search commands"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 hidden items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 text-xs font-medium text-white/60 sm:flex">
            <kbd className="font-sans text-[10px] uppercase tracking-wide text-white/60">{modifierHint}</kbd>
            <kbd className="font-sans text-[10px] uppercase tracking-wide text-white/60">K</kbd>
          </span>
        </div>
      </div>

      <div
        role="listbox"
        aria-label="Command palette results"
        aria-activedescendant={activeOptionId}
        tabIndex={-1}
        className="relative flex-1 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2"
        onKeyDown={handleListKeyDown}
      >
        {flatItems.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-white/60">No matching commands.</p>
        ) : (
          (sections.length ? sections : fallbackSections).map((section) => {
            if (!section.items.length) return null;
            return (
              <div key={section.type} className="mb-4 last:mb-0">
                <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-white/50">
                  {section.label}
                </p>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const lookupKey = `${item.type}:${item.id}`;
                    const globalIndex = indexLookup.get(lookupKey) ?? -1;
                    const optionId = `command-palette-option-${item.type}-${item.id}`;
                    const isActive = globalIndex === activeIndex;
                    return (
                      <button
                        key={optionId}
                        ref={(node) => {
                          if (globalIndex >= 0) {
                            itemRefs.current[globalIndex] = node;
                          }
                        }}
                        type="button"
                        id={optionId}
                        role="option"
                        aria-selected={isActive}
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                          isActive
                            ? 'border-sky-400/70 bg-sky-500/20 shadow-[0_0_0_1px_rgba(14,165,233,0.45)]'
                            : 'border-white/5 bg-black/20 hover:border-white/15 hover:bg-white/10'
                        }`}
                        onClick={() => {
                          if (globalIndex >= 0) {
                            handleSelect(globalIndex);
                          }
                        }}
                        onMouseEnter={() => {
                          if (globalIndex >= 0) {
                            setActiveIndex(globalIndex);
                          }
                        }}
                      >
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-white/70">
                          {item.icon ? (
                            <img
                              src={item.icon}
                              alt=""
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          ) : (
                            <span aria-hidden="true" className="text-base font-semibold">
                              {item.title.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate font-medium text-white">{item.title}</span>
                          {item.subtitle ? (
                            <span className="truncate text-xs text-white/60">{item.subtitle}</span>
                          ) : item.href ? (
                            <span className="truncate text-xs text-white/50">{item.href}</span>
                          ) : null}
                        </span>
                        <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">
                          {SECTION_METADATA[item.type].label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/40">
        <span>Press Esc to close</span>
        <span>Enter to launch</span>
      </footer>
    </div>
  );
}
