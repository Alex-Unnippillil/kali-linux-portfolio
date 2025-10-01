'use client';

import clsx from 'clsx';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import useKeymap from '../../apps/settings/keymapRegistry';
import {
  ORDERED_PLATFORMS,
  PLATFORM_LABELS,
  SHORTCUT_LOOKUP,
  SHORTCUT_TRIGGER_ID,
  SHORTCUT_SECTIONS,
  type ShortcutPlatform,
} from '../../config/shortcuts';

interface EnrichedShortcut {
  id: string;
  description: string;
  section: string;
  bindings: Record<ShortcutPlatform, string>;
  keywords: string[];
  command?: string;
}

const DISPLAY_TOKEN_MAP: Partial<Record<ShortcutPlatform, Record<string, string>>> = {
  mac: {
    Meta: '⌘',
    Ctrl: '⌃',
    Alt: '⌥',
    Shift: '⇧',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  },
  windows: {
    Meta: 'Win',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  },
  linux: {
    Meta: 'Super',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
  },
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const detectPlatform = (): ShortcutPlatform => {
  if (typeof navigator === 'undefined') return 'windows';
  const platform = navigator.platform.toLowerCase();
  if (platform.includes('mac')) return 'mac';
  if (platform.includes('linux')) return 'linux';
  return 'windows';
};

const formatEvent = (event: KeyboardEvent) => {
  const parts: string[] = [];
  if (event.metaKey) parts.push('Meta');
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');

  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;

  if (key === ' ') {
    parts.push('Space');
  } else if (key === 'Escape') {
    parts.push('Escape');
  } else {
    parts.push(key);
  }

  return parts.join('+');
};

const formatBindingForDisplay = (
  binding: string,
  platform: ShortcutPlatform
) => {
  const replacements = DISPLAY_TOKEN_MAP[platform] ?? {};
  return binding
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => replacements[token] ?? token)
    .join(' + ');
};

const isEditableElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.isContentEditable ||
    (target as HTMLInputElement).type === 'search'
  );
};

const ShortcutsOverlay = () => {
  const { shortcuts } = useKeymap();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const focusByKeyboardRef = useRef(false);
  const platform = useMemo(detectPlatform, []);
  const titleId = useId();
  const descriptionId = useId();

  const enrichedShortcuts: EnrichedShortcut[] = useMemo(() => {
    return shortcuts.map((shortcut) => {
      const definition = SHORTCUT_LOOKUP.get(shortcut.id);
      return {
        ...shortcut,
        keywords: definition?.keywords ?? [],
        command: definition?.command,
      };
    });
  }, [shortcuts]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredShortcuts = useMemo(() => {
    if (!normalizedQuery) {
      return enrichedShortcuts;
    }

    return enrichedShortcuts.filter((shortcut) => {
      const haystack = [
        shortcut.description,
        shortcut.section,
        shortcut.command ?? '',
        ...shortcut.keywords,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [enrichedShortcuts, normalizedQuery]);

  useEffect(() => {
    if (!filteredShortcuts.length) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((prev) => {
      if (prev < 0) return 0;
      return Math.min(prev, filteredShortcuts.length - 1);
    });
  }, [filteredShortcuts]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setActiveIndex(0);
      focusByKeyboardRef.current = false;
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveIndex(0);
  }, []);

  const triggerBinding = useMemo(() => {
    const trigger = enrichedShortcuts.find(
      (shortcut) => shortcut.id === SHORTCUT_TRIGGER_ID
    );
    return trigger?.bindings[platform] ?? 'Ctrl+/';
  }, [enrichedShortcuts, platform]);

  const moveActiveIndex = useCallback(
    (delta: number) => {
      if (!filteredShortcuts.length) return;
      focusByKeyboardRef.current = true;
      setActiveIndex((current) => {
        const fallback = delta > 0 ? 0 : filteredShortcuts.length - 1;
        if (current < 0) return fallback;
        const next = current + delta;
        if (next < 0) return filteredShortcuts.length - 1;
        if (next >= filteredShortcuts.length) return 0;
        return next;
      });
    },
    [filteredShortcuts]
  );

  const trapFocus = useCallback(
    (event: KeyboardEvent) => {
      if (!open || event.key !== 'Tab') return;
      const container = dialogRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute('disabled'));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      }
    },
    [open]
  );

  const handleGlobalKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) return;
      const combo = formatEvent(event);
      if (combo === triggerBinding) {
        event.preventDefault();
        setOpen((prev) => !prev);
        return;
      }
    },
    [triggerBinding]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleGlobalKeydown);
    return () => window.removeEventListener('keydown', handleGlobalKeydown);
  }, [handleGlobalKeydown]);

  useEffect(() => {
    if (!open) return;

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }

      if (event.key === 'ArrowDown') {
        const active = document.activeElement;
        if (
          active === searchInputRef.current ||
          (active instanceof HTMLElement && active.getAttribute('role') === 'option')
        ) {
          event.preventDefault();
          moveActiveIndex(1);
        }
      }

      if (event.key === 'ArrowUp') {
        const active = document.activeElement;
        if (
          active === searchInputRef.current ||
          (active instanceof HTMLElement && active.getAttribute('role') === 'option')
        ) {
          event.preventDefault();
          moveActiveIndex(-1);
        }
      }

      trapFocus(event);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, close, moveActiveIndex, trapFocus]);

  useEffect(() => {
    if (!open || !focusByKeyboardRef.current) return;
    focusByKeyboardRef.current = false;
    const option = optionRefs.current[activeIndex];
    option?.focus();
  }, [activeIndex, open]);

  optionRefs.current = optionRefs.current.slice(0, filteredShortcuts.length);

  const orderedSections = useMemo(() => {
    const knownSections = SHORTCUT_SECTIONS.map((section) => ({
      title: section.title,
      shortcuts: filteredShortcuts.filter(
        (shortcut) => shortcut.section === section.title
      ),
    })).filter((section) => section.shortcuts.length > 0);

    const knownTitles = new Set(knownSections.map((section) => section.title));
    const extraSections = filteredShortcuts.filter(
      (shortcut) => !knownTitles.has(shortcut.section)
    );

    if (!extraSections.length) {
      return knownSections;
    }

    return [
      ...knownSections,
      {
        title: 'Other',
        shortcuts: extraSections,
      },
    ];
  }, [filteredShortcuts]);

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 p-4 text-white print:static print:h-auto print:w-full print:items-stretch print:bg-white print:p-8 print:text-black"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="w-full max-w-5xl space-y-6 rounded-lg bg-zinc-900/90 p-6 shadow-2xl backdrop-blur print:bg-transparent print:shadow-none">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold">
              Keyboard shortcuts
            </h2>
            <p id={descriptionId} className="text-sm text-zinc-300 print:text-zinc-700">
              Search shortcuts, use arrow keys to navigate, and press Escape to close.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded border border-white/20 px-3 py-1 text-sm transition hover:border-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange/80 print:hidden"
            >
              Print
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded bg-ub-orange px-3 py-1 text-sm font-semibold text-white transition hover:bg-ub-orange/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Close
            </button>
          </div>
        </header>
        <div>
          <label htmlFor="shortcut-search" className="sr-only">
            Search shortcuts
          </label>
          <input
            ref={searchInputRef}
            id="shortcut-search"
            type="search"
            role="searchbox"
            aria-label="Search shortcuts"
            value={query}
            placeholder="Search shortcuts"
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded border border-white/20 bg-black/40 px-3 py-2 text-base text-white placeholder:text-zinc-400 focus:border-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange/80 print:border-zinc-400 print:bg-white print:text-black"
          />
        </div>
        <div
          role="listbox"
          aria-label="Keyboard shortcuts"
          className="max-h-[60vh] space-y-6 overflow-y-auto pr-2 print:max-h-none print:overflow-visible"
        >
          {orderedSections.length === 0 ? (
            <p className="text-sm text-zinc-300 print:text-zinc-700">
              No shortcuts found. Try a different search term.
            </p>
          ) : (
            orderedSections.map((section) => (
              <section key={section.title} aria-label={section.title} className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-100 print:text-black">
                  {section.title}
                </h3>
                <div className="space-y-2">
                  {section.shortcuts.map((shortcut) => {
                    runningIndex += 1;
                    const isActive = runningIndex === activeIndex;
                    return (
                      <div
                        key={shortcut.id}
                        role="option"
                        aria-label={shortcut.description}
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        ref={(element) => {
                          optionRefs.current[runningIndex] = element;
                        }}
                        onFocus={() => setActiveIndex(runningIndex)}
                        className={clsx(
                          'rounded border border-white/10 bg-black/40 p-4 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange/80 print:border-zinc-400 print:bg-white print:text-black',
                          isActive && 'border-ub-orange/80 bg-ub-orange/20'
                        )}
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-base font-semibold text-white print:text-black">
                              {shortcut.description}
                            </p>
                            {shortcut.command && (
                              <p className="text-xs uppercase tracking-wide text-zinc-400 print:text-zinc-700">
                                {shortcut.command}
                              </p>
                            )}
                          </div>
                          <div className="grid gap-2 text-sm md:grid-cols-3">
                            {ORDERED_PLATFORMS.map((platformKey) => (
                              <div
                                key={platformKey}
                                className="flex flex-col rounded border border-white/10 bg-black/30 px-3 py-2 text-left font-mono text-sm text-zinc-100 print:border-zinc-300 print:bg-white print:text-black"
                              >
                                <span className="text-xs uppercase tracking-wide text-zinc-400 print:text-zinc-700">
                                  {PLATFORM_LABELS[platformKey]}
                                </span>
                                <span>
                                  {formatBindingForDisplay(
                                    shortcut.bindings[platformKey],
                                    platformKey
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ShortcutsOverlay;
