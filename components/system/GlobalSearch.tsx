'use client';

import Image from 'next/image';
import React, {
  KeyboardEvent,
  ReactNode,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface GlobalSearchAction {
  id: string;
  label: string;
  icon?: ReactNode;
  description?: string;
  primary?: boolean;
  disabled?: boolean;
  onSelect: (item: GlobalSearchResult) => void;
}

export interface GlobalSearchResult {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string;
  kind?: string;
  tags?: string[];
  meta?: string[];
  preview?: ReactNode;
  previewText?: string;
  actions?: GlobalSearchAction[];
}

export interface GlobalSearchProps {
  open: boolean;
  results: GlobalSearchResult[];
  query?: string;
  placeholder?: string;
  loading?: boolean;
  emptyState?: ReactNode;
  onClose: () => void;
  onQueryChange?: (value: string) => void;
  onSelectResult?: (item: GlobalSearchResult) => void;
  onHighlightChange?: (item: GlobalSearchResult | null) => void;
}

const focusableSelector =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const ensureVisible = (node: HTMLElement | null) => {
  if (!node) return;
  const container = node.parentElement;
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const nodeRect = node.getBoundingClientRect();
  if (nodeRect.top < containerRect.top) {
    node.scrollIntoView({ block: 'nearest' });
  } else if (nodeRect.bottom > containerRect.bottom) {
    node.scrollIntoView({ block: 'nearest' });
  }
};

const getDefaultAction = (
  item: GlobalSearchResult,
): GlobalSearchAction | undefined => {
  if (!item.actions?.length) return undefined;
  return item.actions.find((action) => action.primary) ?? item.actions[0];
};

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  open,
  results,
  query,
  placeholder = 'Search apps, tools, and documents',
  loading = false,
  emptyState,
  onClose,
  onQueryChange,
  onSelectResult,
  onHighlightChange,
}) => {
  const [internalQuery, setInternalQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const listId = useId();

  const searchTerm = query ?? internalQuery;
  const highlighted =
    highlightIndex >= 0 && highlightIndex < results.length
      ? results[highlightIndex]
      : null;

  useEffect(() => {
    if (!open) {
      setHighlightIndex(-1);
      if (previousFocusRef.current) {
        const previous = previousFocusRef.current;
        previousFocusRef.current = null;
        if (typeof previous.focus === 'function') {
          previous.focus();
        }
      }
      return;
    }

    if (typeof window === 'undefined') return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const handleFocusIn = (event: FocusEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        inputRef.current?.focus();
      }
    };

    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!results.length) {
      setHighlightIndex(-1);
      return;
    }
    setHighlightIndex((prev) => {
      if (prev < 0 || prev >= results.length) return 0;
      return prev;
    });
  }, [open, results]);

  useEffect(() => {
    if (!open) return;
    if (highlightIndex < 0) return;
    ensureVisible(itemRefs.current[highlightIndex]);
  }, [highlightIndex, open]);

  useEffect(() => {
    onHighlightChange?.(highlighted);
  }, [highlighted, onHighlightChange]);

  const handleQueryChange = (value: string) => {
    if (query === undefined) {
      setInternalQuery(value);
    }
    onQueryChange?.(value);
  };

  const handleAction = useCallback(
    (action: GlobalSearchAction, item: GlobalSearchResult) => {
      if (action.disabled) return;
      action.onSelect(item);
    },
    [],
  );

  const moveHighlight = useCallback(
    (direction: 1 | -1) => {
      if (!results.length) return;
      setHighlightIndex((prev) => {
        if (prev === -1) {
          return direction === 1 ? 0 : results.length - 1;
        }
        const next = prev + direction;
        if (next < 0) return results.length - 1;
        if (next >= results.length) return 0;
        return next;
      });
    },
    [results],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) return;
    if (event.key === 'Tab') {
      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((el) => !el.hasAttribute('data-focus-guard'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement as HTMLElement | null;
      if (event.shiftKey) {
        if (current === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (current === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveHighlight(-1);
        break;
      case 'Home':
        event.preventDefault();
        if (results.length) setHighlightIndex(0);
        break;
      case 'End':
        event.preventDefault();
        if (results.length) setHighlightIndex(results.length - 1);
        break;
      case 'Enter': {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-search-action]')) return;
        if (highlighted) {
          event.preventDefault();
          onSelectResult?.(highlighted);
          const defaultAction = getDefaultAction(highlighted);
          if (defaultAction) {
            handleAction(defaultAction, highlighted);
          }
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  const renderResults = useMemo(() => {
    if (!results.length) {
      if (loading) {
        return (
          <div className="px-4 py-6 text-sm text-white/70">Searching...</div>
        );
      }
      return (
        <div className="px-4 py-6 text-sm text-white/60">
          {emptyState ?? 'No results found'}
        </div>
      );
    }

    return results.map((item, index) => {
      const selected = index === highlightIndex;
      return (
        <button
          key={item.id}
          type="button"
          role="option"
          id={`${listId}-option-${item.id}`}
          aria-selected={selected}
          tabIndex={-1}
          ref={(el) => {
            itemRefs.current[index] = el;
          }}
          onMouseEnter={() => setHighlightIndex(index)}
          onFocus={() => setHighlightIndex(index)}
          onMouseDown={(e) => {
            // Prevent the button from stealing focus from the search field
            e.preventDefault();
            inputRef.current?.focus();
          }}
          onDoubleClick={() => {
            onSelectResult?.(item);
            const defaultAction = getDefaultAction(item);
            if (defaultAction) handleAction(defaultAction, item);
          }}
          className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left transition
            ${selected ? 'bg-white/10 ring-1 ring-ub-orange' : 'hover:bg-white/5'}`}
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
            <span className="h-8 w-8 flex-shrink-0 rounded bg-black/30" aria-hidden="true" />
          )}
          <span className="flex-1 min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-medium leading-tight">{item.title}</span>
              {item.kind ? (
                <span className="rounded border border-white/20 px-1 text-[10px] uppercase tracking-wide text-white/70">
                  {item.kind}
                </span>
              ) : null}
            </span>
            {item.subtitle ? (
              <span className="mt-0.5 block text-sm text-white/70">
                {item.subtitle}
              </span>
            ) : null}
            {item.meta?.length ? (
              <span className="mt-1 block text-xs text-white/50">
                {item.meta.join(' • ')}
              </span>
            ) : null}
          </span>
        </button>
      );
    });
  }, [results, highlightIndex, listId, handleAction, onSelectResult, loading, emptyState]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 sm:p-8"
      onKeyDown={handleKeyDown}
    >
      <div
        ref={containerRef}
        className="w-full max-w-5xl rounded-xl border border-white/10 bg-ub-grey/95 text-white shadow-xl"
      >
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onChange={(event) => handleQueryChange(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-md bg-black/30 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
              aria-autocomplete="list"
              aria-controls={`${listId}-results`}
              aria-activedescendant={
                highlighted ? `${listId}-option-${highlighted.id}` : undefined
              }
            />
            {loading ? (
              <span className="absolute inset-y-0 right-3 flex items-center text-xs text-white/70">
                Searching…
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm text-white/70 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange"
          >
            Esc to close
          </button>
        </div>
        <div className="grid gap-4 px-4 py-4 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div
            id={`${listId}-results`}
            ref={listRef}
            role="listbox"
            aria-label="Search results"
            aria-activedescendant={
              highlighted ? `${listId}-option-${highlighted.id}` : undefined
            }
            className="max-h-[24rem] overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2 focus:outline-none"
          >
            {renderResults}
          </div>
          <aside
            role="region"
            aria-label="Result details"
            className="min-h-[16rem] rounded-lg border border-white/10 bg-black/30 p-4"
          >
            {highlighted ? (
              <div className="flex h-full flex-col">
                <header className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{highlighted.title}</h2>
                    {highlighted.kind ? (
                      <span className="rounded border border-white/20 px-1 text-[10px] uppercase tracking-wide text-white/70">
                        {highlighted.kind}
                      </span>
                    ) : null}
                  </div>
                  {highlighted.subtitle ? (
                    <p className="text-sm text-white/70">{highlighted.subtitle}</p>
                  ) : null}
                </header>
                {highlighted.preview ? (
                  <div className="mt-4 flex-1 overflow-hidden rounded-md border border-white/10 bg-black/40 p-3 text-sm text-white/80">
                    {highlighted.preview}
                  </div>
                ) : highlighted.previewText ? (
                  <p className="mt-4 flex-1 overflow-y-auto whitespace-pre-line text-sm text-white/80">
                    {highlighted.previewText}
                  </p>
                ) : highlighted.description ? (
                  <p className="mt-4 flex-1 overflow-y-auto whitespace-pre-line text-sm text-white/75">
                    {highlighted.description}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-white/60">
                    No additional information available for this item.
                  </p>
                )}
                {highlighted.tags?.length ? (
                  <ul className="mt-4 flex flex-wrap gap-2 text-xs text-white/70">
                    {highlighted.tags.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-full bg-white/10 px-2 py-0.5"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {highlighted.actions?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {highlighted.actions.map((action) => (
                      <button
                        key={action.id}
                        type="button"
                        data-search-action
                        onClick={() => handleAction(action, highlighted)}
                        disabled={action.disabled}
                        className={`flex items-center gap-2 rounded px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange
                          ${
                            action.disabled
                              ? 'cursor-not-allowed bg-white/10 text-white/40'
                              : action.primary
                                ? 'bg-ub-orange text-black hover:bg-ub-orange/90'
                                : 'bg-white/10 text-white hover:bg-white/20'
                          }
                        `}
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-white/50">
                    No quick actions available.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-white/60">
                Select a result to preview its details.
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
