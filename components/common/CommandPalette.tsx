'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import clsx from 'clsx';
import { useRouter } from 'next/router';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { rankPaletteItems } from '../../utils/commandPaletteSearch';
import { loadCommandPaletteItems, type PaletteItem } from '../../utils/commandPaletteData';

const OPTION_ID_PREFIX = 'command-option-';

const useSafeRouter = () => {
  try {
    return useRouter();
  } catch (error) {
    return null;
  }
};

const CommandPalette = () => {
  const router = useSafeRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PaletteItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const itemsCache = useRef<PaletteItem[] | null>(null);

  const loadItems = useCallback(async () => {
    if (itemsCache.current) return itemsCache.current;
    try {
      const data = await loadCommandPaletteItems();
      itemsCache.current = data;
      return data;
    } catch (error) {
      console.error('Failed to load command palette metadata', error);
      itemsCache.current = [];
      throw error;
    }
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    loadItems()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, loadItems]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey } = event;
      const target = event.target as HTMLElement | null;
      const isEditable = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      if ((ctrlKey || metaKey) && key.toLowerCase() === 'k') {
        if (isEditable) return;
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (key === 'Escape' && open) {
        event.preventDefault();
        closePalette();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, closePalette]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const results = useMemo(() => rankPaletteItems(items, query, 12), [items, query]);
  const clampedIndex = results.length ? Math.min(activeIndex, results.length - 1) : -1;
  const activeItem = clampedIndex >= 0 ? results[clampedIndex] : undefined;

  const handleSelect = useCallback(
    (item: PaletteItem) => {
      if (!item) return;
      switch (item.action.type) {
        case 'open-app': {
          const event = new CustomEvent('open-app', { detail: item.action.target });
          window.dispatchEvent(event);
          break;
        }
        case 'navigate': {
          if (router?.push) {
            const result = router.push(item.action.target);
            if (result && typeof (result as Promise<unknown>).catch === 'function') {
              (result as Promise<unknown>).catch((err) => {
                console.error('Failed to navigate from command palette', err);
              });
            }
          } else if (typeof window !== 'undefined') {
            window.location.assign(item.action.target);
          }
          break;
        }
        case 'callback':
          item.action.fn();
          break;
        default:
          break;
      }
      closePalette();
    },
    [router, closePalette],
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (!results.length) return;

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((index) => (index + 1) % results.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((index) => (index - 1 + results.length) % results.length);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = results[clampedIndex >= 0 ? clampedIndex : 0];
        if (item) handleSelect(item);
      } else if (event.key === 'Tab') {
        event.preventDefault();
        setActiveIndex((index) => (index + (event.shiftKey ? -1 : 1) + results.length) % results.length);
      }
    },
    [results, clampedIndex, handleSelect],
  );

  if (!open) return null;

  const activeOptionId = activeItem ? `${OPTION_ID_PREFIX}${activeItem.id}` : undefined;

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[150] flex items-start justify-center bg-black/70 px-4 py-16 sm:py-24',
        prefersReducedMotion ? 'transition-none' : 'transition-opacity duration-150 ease-out',
      )}
      role="dialog"
      aria-modal="true"
      aria-labelledby="command-palette-title"
      data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          closePalette();
        }
      }}
    >
      <div className="w-full max-w-2xl rounded-lg bg-gray-900/95 text-white shadow-xl ring-1 ring-white/20">
        <div className="border-b border-white/10 p-4">
          <h2 id="command-palette-title" className="text-lg font-semibold text-white">
            Command Palette
          </h2>
          <label
            id="command-palette-input-label"
            htmlFor="command-palette-input"
            className="block text-sm font-semibold text-white/70"
          >
            Search apps and commands
          </label>
          <input
            ref={inputRef}
            id="command-palette-input"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type to search..."
            className="mt-2 w-full rounded-md bg-black/40 px-3 py-2 text-base text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-400"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="true"
            aria-controls="command-palette-options"
            aria-labelledby="command-palette-title command-palette-input-label"
            aria-activedescendant={activeOptionId}
          />
        </div>
        <div className="max-h-80 overflow-y-auto" role="presentation">
          <ul
            id="command-palette-options"
            role="listbox"
            aria-label="Command palette results"
            className="divide-y divide-white/5"
          >
            {results.length === 0 ? (
              <li className="p-6 text-center text-sm text-white/60" role="presentation">
                No matches found. Try a different search term.
              </li>
            ) : (
              results.map((item) => {
                const optionId = `${OPTION_ID_PREFIX}${item.id}`;
                return (
                  <li
                    key={item.id}
                    id={optionId}
                    role="option"
                    aria-selected={activeItem?.id === item.id}
                    className={clsx(
                      'flex cursor-pointer items-start gap-3 px-5 py-4 text-left hover:bg-white/10',
                      activeItem?.id === item.id ? 'bg-white/10' : 'bg-transparent',
                    )}
                    onMouseEnter={() => {
                      const index = results.findIndex((result) => result.id === item.id);
                      if (index !== -1) setActiveIndex(index);
                    }}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(item);
                    }}
                  >
                    {item.icon ? (
                      <img src={item.icon} alt="" className="h-8 w-8 flex-shrink-0 rounded" />
                    ) : (
                      <div className="h-8 w-8 flex-shrink-0 rounded bg-white/10" aria-hidden="true" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{item.title}</span>
                        <span className="text-xs uppercase tracking-wide text-white/60">{item.group}</span>
                      </div>
                      <p className="mt-1 text-sm text-white/70">{item.description}</p>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </div>
        <div className="flex items-center justify-between px-5 py-3 text-xs text-white/50">
          <span>Press Esc to close</span>
          <span>
            <kbd className="rounded border border-white/20 px-1 py-0.5">Ctrl</kbd>
            <span className="mx-1">+</span>
            <kbd className="rounded border border-white/20 px-1 py-0.5">K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
