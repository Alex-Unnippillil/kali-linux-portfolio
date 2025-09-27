'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import useKeymap, { type Shortcut } from '../../apps/settings/keymapRegistry';
import {
  SHORTCUT_CATEGORIES,
} from '../../data/shortcuts';
import Modal from '../base/Modal';
import { shortcutMatchesEvent } from '../../utils/keyboard';

type FocusTarget = 'search' | 'list';

const isEditableElement = (target: EventTarget | null) => {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    target.isContentEditable ||
    target.getAttribute('role') === 'textbox'
  );
};

const ShortcutOverlay: React.FC = () => {
  const { shortcuts } = useKeymap();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const focusIntentRef = useRef<FocusTarget>();

  const titleId = useId();
  const descriptionId = useId();
  const instructionsId = useId();
  const statusId = useId();
  const listboxId = useId();
  const searchId = useId();

  const showShortcut = useMemo(
    () =>
      shortcuts.find(
        (shortcut) => shortcut.description === 'Show keyboard shortcuts'
      )?.keys || '?',
    [shortcuts]
  );

  const openOverlay = useCallback(() => {
    setQuery('');
    setActiveIndex(0);
    focusIntentRef.current = 'search';
    setOpen(true);
  }, []);

  const closeOverlay = useCallback(() => {
    focusIntentRef.current = undefined;
    setOpen(false);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target;
      if (isEditableElement(target)) return;

      if (shortcutMatchesEvent(showShortcut, event)) {
        event.preventDefault();
        if (open) {
          closeOverlay();
        } else {
          openOverlay();
        }
        return;
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault();
        closeOverlay();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeOverlay, open, openOverlay, showShortcut]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      if (focusIntentRef.current === 'search') {
        const input = searchInputRef.current;
        input?.focus();
        input?.select();
        focusIntentRef.current = undefined;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (focusIntentRef.current !== 'list') return;
    const node = itemRefs.current[activeIndex];
    if (node) {
      node.focus();
      focusIntentRef.current = undefined;
    }
  }, [activeIndex, open]);

  const normalizedQuery = query.trim().toLowerCase();

  const filteredShortcuts = useMemo(() => {
    if (!normalizedQuery) return shortcuts;
    return shortcuts.filter((shortcut) => {
      const haystack = [
        shortcut.description,
        shortcut.keys,
        shortcut.category,
        ...(shortcut.tags ?? []),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, shortcuts]);

  const annotatedShortcuts = useMemo(
    () => filteredShortcuts.map((shortcut, index) => ({ shortcut, index })),
    [filteredShortcuts]
  );

  const groupedShortcuts = useMemo(() => {
    const map = new Map<string, { shortcut: Shortcut; index: number }[]>();
    annotatedShortcuts.forEach((entry) => {
      const category = entry.shortcut.category || 'Other';
      const existing = map.get(category);
      if (existing) {
        existing.push(entry);
      } else {
        map.set(category, [entry]);
      }
    });

    const ordered: { category: string; items: { shortcut: Shortcut; index: number }[] }[] = [];
    SHORTCUT_CATEGORIES.forEach((category) => {
      const items = map.get(category);
      if (items && items.length) {
        ordered.push({ category, items });
        map.delete(category);
      }
    });

    Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([category, items]) => {
        ordered.push({ category, items });
      });

    return ordered;
  }, [annotatedShortcuts]);

  const conflicts = useMemo(() => {
    const counts = shortcuts.reduce<Map<string, number>>((acc, shortcut) => {
      acc.set(shortcut.keys, (acc.get(shortcut.keys) ?? 0) + 1);
      return acc;
    }, new Map());

    return new Set(
      Array.from(counts.entries())
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
    );
  }, [shortcuts]);

  const resultsLabel = useMemo(() => {
    const count = filteredShortcuts.length;
    if (count === 0) return 'No shortcuts found';
    return `${count} shortcut${count === 1 ? '' : 's'} shown`;
  }, [filteredShortcuts.length]);

  useEffect(() => {
    if (!filteredShortcuts.length) {
      setActiveIndex(0);
      return;
    }
    if (activeIndex >= filteredShortcuts.length) {
      setActiveIndex(filteredShortcuts.length - 1);
    }
  }, [activeIndex, filteredShortcuts.length]);

  itemRefs.current.length = filteredShortcuts.length;

  const handleExport = useCallback(() => {
    const data = JSON.stringify(shortcuts, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'shortcuts.json';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [shortcuts]);

  const handlePrint = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }, []);

  const handleQueryChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
      setActiveIndex(0);
    },
    []
  );

  const focusListItem = useCallback(
    (index: number) => {
      if (!filteredShortcuts.length) return;
      focusIntentRef.current = 'list';
      setActiveIndex((prev) => {
        if (prev === index) {
          const node = itemRefs.current[index];
          if (node) {
            requestAnimationFrame(() => {
              node.focus();
              focusIntentRef.current = undefined;
            });
          }
          return prev;
        }
        return index;
      });
    },
    [filteredShortcuts.length]
  );

  const handleQueryKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!filteredShortcuts.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusListItem(0);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusListItem(filteredShortcuts.length - 1);
      }
    },
    [filteredShortcuts.length, focusListItem]
  );

  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, index: number) => {
      if (!filteredShortcuts.length) return;
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        focusListItem((index + 1) % filteredShortcuts.length);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        focusListItem((index - 1 + filteredShortcuts.length) % filteredShortcuts.length);
      } else if (event.key === 'Home') {
        event.preventDefault();
        focusListItem(0);
      } else if (event.key === 'End') {
        event.preventDefault();
        focusListItem(filteredShortcuts.length - 1);
      } else if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
      }
    },
    [closeOverlay, filteredShortcuts.length, focusListItem]
  );

  const handleListClick = useCallback(
    (index: number) => {
      focusListItem(index);
    },
    [focusListItem]
  );

  

  return (
    <Modal
      isOpen={open}
      onClose={closeOverlay}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/80 p-4 text-white print:relative print:bg-white print:p-8 print:text-black"
      aria-labelledby={titleId}
      aria-describedby={`${descriptionId} ${instructionsId} ${statusId}`.trim()}
    >
      <div className="w-full max-w-4xl rounded-2xl border border-white/15 bg-slate-900/90 text-white shadow-2xl backdrop-blur print:border-black/10 print:bg-white print:text-black print:shadow-none">
        <header className="flex flex-col gap-3 border-b border-white/10 p-6 sm:flex-row sm:items-center sm:justify-between print:border-black/10">
          <div className="space-y-2">
            <h2 id={titleId} className="text-2xl font-semibold tracking-wide print:text-black">
              Keyboard shortcuts
            </h2>
            <p
              id={descriptionId}
              className="text-sm text-slate-200 print:text-slate-700"
            >
              Type to filter the list. Use the arrow keys to explore shortcuts and
              press Escape to close this window.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white print:border-black/30 print:text-black"
            >
              Print
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white print:border-black/30 print:text-black"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={closeOverlay}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm font-medium hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white print:border-black/30 print:text-black"
            >
              Close
            </button>
          </div>
        </header>
        <div className="space-y-6 p-6">
          <div className="space-y-2">
            <label
              htmlFor={searchId}
              className="text-sm font-medium text-slate-100 print:text-black"
            >
              Filter shortcuts
            </label>
            <input
              id={searchId}
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={handleQueryChange}
              onKeyDown={handleQueryKeyDown}
              aria-controls={listboxId}
              className="w-full rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-base text-white placeholder:text-slate-400 focus:border-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 print:border-black/20 print:bg-white print:text-black"
              placeholder="Search by action, key, or workspace"
              enterKeyHint="search"
            />
            <p
              id={instructionsId}
              className="text-xs text-slate-300 print:text-slate-600"
            >
              Use the up and down arrows to move through the results.
            </p>
          </div>
          <p
            id={statusId}
            role="status"
            aria-live="polite"
            className="text-sm text-slate-200 print:text-slate-700"
          >
            {resultsLabel}
          </p>
          <div className="space-y-6 print:space-y-4">
            {groupedShortcuts.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/20 bg-black/20 p-6 text-center text-sm text-slate-200 print:border-black/20 print:bg-transparent print:text-black">
                No shortcuts match “{query}”. Try a different search term.
              </p>
            ) : (
              <ul
                id={listboxId}
                role="listbox"
                className="grid gap-3 sm:grid-cols-2"
              >
                {groupedShortcuts.map(({ category, items }) => (
                  <React.Fragment key={category}>
                    <li className="list-none sm:col-span-2" role="presentation">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300 print:text-black">
                        {category}
                      </h3>
                    </li>
                    {items.map(({ shortcut, index }) => (
                      <li
                        key={`${shortcut.description}-${shortcut.keys}-${index}`}
                        className="list-none"
                      >
                        <div
                          id={`shortcut-${index}`}
                          ref={(node) => {
                            itemRefs.current[index] = node;
                          }}
                          role="option"
                          tabIndex={-1}
                          aria-selected={index === activeIndex}
                          aria-setsize={filteredShortcuts.length}
                          aria-posinset={index + 1}
                          onClick={() => handleListClick(index)}
                          onKeyDown={(event) => handleListKeyDown(event, index)}
                          className={`flex h-full flex-col justify-between gap-2 rounded-lg border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                            index === activeIndex
                              ? 'border-ubt-grey bg-white/15 focus-visible:outline-white'
                              : 'border-white/10 bg-white/5 hover:bg-white/10 focus-visible:outline-white'
                          } ${
                            conflicts.has(shortcut.keys)
                              ? 'ring-2 ring-red-500/70'
                              : ''
                          } print:border-black/20 print:bg-white print:text-black`}
                        >
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-300 print:text-slate-700">
                            {shortcut.category}
                          </span>
                          <span className="font-mono text-lg font-semibold tracking-wider text-white print:text-black">
                            {shortcut.keys}
                          </span>
                          <span className="text-sm text-slate-100 print:text-slate-700">
                            {shortcut.description}
                          </span>
                          {conflicts.has(shortcut.keys) && (
                            <span className="text-xs font-semibold text-red-300 print:text-red-600">
                              In conflict with another shortcut
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </React.Fragment>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ShortcutOverlay;
