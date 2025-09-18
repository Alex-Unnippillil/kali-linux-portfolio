'use client';

import Image from 'next/image';
import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  icon?: string;
  keywords: string;
  action: () => void;
};

type AppMeta = {
  id: string;
  title: string;
  icon?: string;
  disabled?: boolean;
};

type ModuleMeta = {
  id: string;
  name: string;
  description: string;
  tags?: string[];
};

interface SearchPaletteContextValue {
  openSearchPalette: () => void;
  closeSearchPalette: () => void;
  toggleSearchPalette: () => void;
}

const noop = () => undefined;

const SearchPaletteContext = createContext<SearchPaletteContextValue>({
  openSearchPalette: noop,
  closeSearchPalette: noop,
  toggleSearchPalette: noop,
});

export const useSearchPalette = (): SearchPaletteContextValue =>
  useContext(SearchPaletteContext);

type SearchPaletteProviderProps = {
  children: ReactNode;
};

const FALLBACK_ICON = '/themes/Yaru/status/decompiler-symbolic.svg';

const loadApps = async (): Promise<SearchResult[]> => {
  const mod = await import('../../apps.config');
  const appList = (mod.default ?? mod) as AppMeta[];
  return appList
    .filter((app) => !app.disabled)
    .map((app) => ({
      id: `app:${app.id}`,
      title: app.title,
      subtitle: 'Application',
      description: 'Launch simulated desktop application',
      icon: app.icon ?? FALLBACK_ICON,
      keywords: `${app.id} ${app.title}`.toLowerCase(),
      action: () => {
        window.dispatchEvent(new CustomEvent('open-app', { detail: app.id }));
      },
    }));
};

const loadModules = async (): Promise<SearchResult[]> => {
  const mod = await import('../../data/module-index.json');
  const modules = (mod.default ?? mod) as ModuleMeta[];
  return modules.map((module) => ({
    id: `module:${module.id}`,
    title: module.name,
    subtitle: 'Simulated module',
    description: module.description,
    icon: '/themes/Yaru/status/projects.svg',
    keywords: `${module.name} ${module.description} ${(module.tags || []).join(' ')}`.toLowerCase(),
    action: () => {
      if (typeof window !== 'undefined') {
        window.open('/popular-modules', '_blank', 'noopener,noreferrer');
      }
    },
  }));
};

const SearchPaletteProvider: React.FC<SearchPaletteProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingSources, setPendingSources] = useState(0);
  const indexRef = useRef<SearchResult[]>([]);
  const [indexVersion, setIndexVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prefetchPromiseRef = useRef<Promise<void> | null>(null);

  const ensureIndex = useCallback(async () => {
    if (indexRef.current.length) {
      return;
    }
    if (!prefetchPromiseRef.current) {
      const loader = async () => {
        setLoading(true);
        const queries: Array<Promise<SearchResult[]>> = [loadApps(), loadModules()];
        setPendingSources(queries.length);
        const settled = await Promise.allSettled(queries);
        const aggregated: SearchResult[] = [];
        settled.forEach((result) => {
          if (result.status === 'fulfilled') {
            aggregated.push(...result.value);
          } else {
            console.error('Search worker query failed', result.reason);
          }
        });
        indexRef.current = aggregated;
        setIndexVersion((v) => v + 1);
      };
      prefetchPromiseRef.current = loader()
        .catch((error) => {
          console.error('Failed to prefetch search index', error);
        })
        .finally(() => {
          setLoading(false);
          setPendingSources(0);
          prefetchPromiseRef.current = null;
        });
    }
    await prefetchPromiseRef.current;
  }, []);

  const openSearchPalette = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeSearchPalette = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleSearchPalette = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    ensureIndex().catch(() => undefined);
    setActiveIndex(0);
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [ensureIndex, isOpen]);

  useEffect(() => {
    const toggleListener = () => toggleSearchPalette();
    const openListener = () => openSearchPalette();
    const closeListener = () => closeSearchPalette();
    window.addEventListener('toggle-search-palette', toggleListener);
    window.addEventListener('open-search-palette', openListener);
    window.addEventListener('close-search-palette', closeListener);
    return () => {
      window.removeEventListener('toggle-search-palette', toggleListener);
      window.removeEventListener('open-search-palette', openListener);
      window.removeEventListener('close-search-palette', closeListener);
    };
  }, [closeSearchPalette, openSearchPalette, toggleSearchPalette]);

  const filteredResults = useMemo(() => {
    const list = indexRef.current;
    if (!query.trim()) {
      return list.slice(0, 20);
    }
    const q = query.trim().toLowerCase();
    return list.filter((item) => item.keywords.includes(q)).slice(0, 20);
  }, [indexVersion, query]);

  useEffect(() => {
    setActiveIndex((idx) => {
      if (!filteredResults.length) return 0;
      return Math.min(idx, filteredResults.length - 1);
    });
  }, [filteredResults.length]);

  const handleResultSelect = useCallback(
    (result: SearchResult) => {
      try {
        result.action();
      } finally {
        closeSearchPalette();
      }
    },
    [closeSearchPalette],
  );

  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((idx) => Math.min(idx + 1, Math.max(filteredResults.length - 1, 0)));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((idx) => Math.max(idx - 1, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const result = filteredResults[activeIndex];
        if (result) {
          handleResultSelect(result);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeSearchPalette();
      }
    },
    [activeIndex, closeSearchPalette, filteredResults, handleResultSelect],
  );

  const skeletonCount = pendingSources > 0 ? pendingSources * 3 : 6;

  return (
    <SearchPaletteContext.Provider
      value={{ openSearchPalette, closeSearchPalette, toggleSearchPalette }}
    >
      {children}
      {isOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-start justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          onClick={closeSearchPalette}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-lg border border-white/10 bg-ub-grey text-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-white/10 px-4 py-3">
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Search apps, modules, and tools"
                className="w-full rounded bg-black/30 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ubb-orange"
              />
            </div>
            <div className="max-h-80 overflow-y-auto" role="listbox">
              {loading ? (
                <ul className="divide-y divide-white/10">
                  {Array.from({ length: skeletonCount }).map((_, idx) => (
                    <li key={idx} className="flex items-center gap-3 px-4 py-3">
                      <div className="h-10 w-10 animate-pulse rounded bg-white/10" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-white/10" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : filteredResults.length ? (
                <ul className="divide-y divide-white/10" role="presentation">
                  {filteredResults.map((result, idx) => (
                    <li
                      key={result.id}
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                        idx === activeIndex ? 'bg-white/15' : 'hover:bg-white/10'
                      }`}
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleResultSelect(result)}
                    >
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-black/30">
                        <Image
                          src={result.icon ?? FALLBACK_ICON}
                          alt={result.subtitle}
                          width={40}
                          height={40}
                          className="h-10 w-10 object-contain"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{result.title}</p>
                        <p className="text-xs text-white/70">{result.subtitle}</p>
                        {result.description && (
                          <p className="mt-1 text-xs text-white/60">
                            {result.description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="px-4 py-6 text-center text-sm text-white/70">
                  No matches yet. Try a different keyword.
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2 text-xs text-white/60">
              <div className="flex items-center gap-2">
                <kbd className="rounded bg-white/20 px-1 py-0.5 text-[0.65rem]">Ctrl</kbd>
                <span>+</span>
                <kbd className="rounded bg-white/20 px-1 py-0.5 text-[0.65rem]">Space</kbd>
                <span>Toggle palette</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-white/20 px-1 py-0.5 text-[0.65rem]">↑</kbd>
                  <kbd className="rounded bg-white/20 px-1 py-0.5 text-[0.65rem]">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-white/20 px-1 py-0.5 text-[0.65rem]">Enter</kbd>
                  Launch
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded bg-white/20 px-1 py-0.5 text-[0.65rem]">Esc</kbd>
                  Close
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </SearchPaletteContext.Provider>
  );
};

export { SearchPaletteProvider };
export default SearchPaletteProvider;
