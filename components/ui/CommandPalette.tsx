"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';

type CommandPaletteItemType = 'app' | 'window' | 'action';

type BasicItem = {
  id: string;
  title: string;
  subtitle?: string;
  icon?: string;
  keywords?: string[];
  data?: Record<string, unknown>;
};

export type CommandPaletteItem = BasicItem & {
  type: CommandPaletteItemType;
};

type CommandPaletteProps = {
  open: boolean;
  apps: BasicItem[];
  recentWindows: BasicItem[];
  settingsActions: BasicItem[];
  onSelect: (item: CommandPaletteItem) => void;
  onClose: () => void;
};

const SECTION_METADATA: Record<CommandPaletteItemType, { label: string }> = {
  // eslint-disable-next-line no-top-level-window/no-top-level-window-or-document
  window: { label: 'Recent Windows' },
  app: { label: 'Applications' },
  action: { label: 'Settings & Actions' },
};

const isMacLike = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const platform = navigator.platform || '';
  const userAgent = navigator.userAgent || '';
  return /Mac|iPhone|iPad|iPod/i.test(platform || userAgent);
};

const modifierHint = isMacLike() ? '⌘' : 'Ctrl';

const normalizeIconPath = (icon?: string): string | undefined => {
  if (!icon || typeof icon !== 'string') return undefined;
  if (/^(https?:|data:)/i.test(icon)) return icon;
  const sanitized = icon.replace(/^\.\//, '').replace(/^\/+/, '');
  return sanitized ? `/${sanitized}` : undefined;
};

const matchesQuery = (item: CommandPaletteItem, query: string): boolean => {
  if (!query) return true;
  const haystack = [item.title, item.subtitle, ...(item.keywords || [])]
    .filter(Boolean)
    .map((value) => value!.toString().toLowerCase());
  return haystack.some((value) => value.includes(query));
};

const buildItems = (items: BasicItem[], type: CommandPaletteItemType): CommandPaletteItem[] =>
  items.map((item) => ({
    ...item,
    icon: normalizeIconPath(item.icon),
    type,
  }));

export default function CommandPalette({
  open,
  apps,
  recentWindows,
  settingsActions,
  onSelect,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const sections = useMemo(() => {
    return [
      { type: 'window' as const, label: SECTION_METADATA.window.label, items: buildItems(recentWindows, 'window') },
      { type: 'app' as const, label: SECTION_METADATA.app.label, items: buildItems(apps, 'app') },
      { type: 'action' as const, label: SECTION_METADATA.action.label, items: buildItems(settingsActions, 'action') },
    ];
  }, [apps, recentWindows, settingsActions]);

  const filteredSections = useMemo(() => {
    const term = query.trim().toLowerCase();
    return sections.map((section) => ({
      ...section,
      items: section.items.filter((item) => matchesQuery(item, term)),
    }));
  }, [query, sections]);

  const flatItems = useMemo(() => {
    const list: CommandPaletteItem[] = [];
    filteredSections.forEach((section) => {
      section.items.forEach((item) => {
        list.push(item);
      });
    });
    return list;
  }, [filteredSections]);

  const indexLookup = useMemo(() => {
    const map = new Map<string, number>();
    flatItems.forEach((item, index) => {
      map.set(`${item.type}:${item.id}`, index);
    });
    return map;
  }, [flatItems]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
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

  const handleSelect = (index: number) => {
    const item = flatItems[index];
    if (!item) return;
    onSelect(item);
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
      setActiveIndex((current) => {
        const next = current + 1;
        if (next >= length) return 0;
        return next;
      });
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => {
        if (current <= 0) return length - 1;
        return current - 1;
      });
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
    const navigationKeys = new Set([
      'ArrowDown',
      'ArrowUp',
      'Home',
      'End',
      'Enter',
      'Escape',
    ]);

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
          Search across applications, recent windows, and settings. Use the arrow keys to navigate and Enter to run a command.
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
            placeholder="Search apps, windows, and settings"
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-white/10 bg-white/10 px-4 py-2 text-sm text-white shadow-inner focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
            aria-label="Search commands"
          />
          <span className="pointer-events-none absolute inset-y-0 right-2 hidden items-center gap-1 rounded-md border border-white/10 bg-black/40 px-2 text-xs font-medium text-white/60 sm:flex">
            <kbd className="font-sans text-[10px] uppercase tracking-wide text-white/60">{modifierHint}</kbd>
            <kbd className="font-sans text-[10px] uppercase tracking-wide text-white/60">Space</kbd>
          </span>
        </div>
      </div>

      <div
        ref={listRef}
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
          filteredSections.map((section) => {
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
                        className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${isActive
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
