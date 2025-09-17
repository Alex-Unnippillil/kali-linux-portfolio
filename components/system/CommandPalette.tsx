'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
} from 'react';

type TextDirection = 'ltr' | 'rtl';

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
}

export interface CommandPaletteSubmitEvent {
  query: string;
  item?: CommandPaletteItem;
}

export interface CommandPaletteProps {
  /** Controls whether the palette is mounted and visible */
  isOpen: boolean;
  /** Items to display and search */
  items: CommandPaletteItem[];
  /** Called when the palette should be dismissed */
  onClose: () => void;
  /** Called when the user confirms a selection or submits free text */
  onSubmit: (event: CommandPaletteSubmitEvent) => void;
  /** Optional callback fired when the search query changes */
  onQueryChange?: (value: string) => void;
  /** Placeholder text for the search input */
  placeholder?: string;
  /** Accessible label for the palette dialog */
  label?: string;
  /** Initial query to pre-populate when opening */
  initialQuery?: string;
  /** Optional override for text direction */
  dir?: TextDirection;
  /** Custom filter implementation */
  filterItems?: (items: CommandPaletteItem[], query: string) => CommandPaletteItem[];
  /** Message rendered when no results match */
  emptyState?: React.ReactNode;
  /** Automatically focus the input when opened */
  autoFocus?: boolean;
  /** Optional custom renderer for list rows */
  renderItem?: (item: CommandPaletteItem, active: boolean) => React.ReactNode;
}

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const defaultFilter = (items: CommandPaletteItem[], rawQuery: string): CommandPaletteItem[] => {
  const query = rawQuery.trim();
  if (!query) return items;
  const tokens = query
    .split(/\s+/)
    .map((token) => token.toLocaleLowerCase())
    .filter(Boolean);
  if (!tokens.length) return items;

  return items.filter((item) => {
    const haystack = [item.label, item.description, ...(item.keywords ?? [])]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
};

const resolveDirection = (
  explicit: TextDirection | undefined,
  element: HTMLElement | null,
): TextDirection => {
  if (explicit) return explicit;
  if (typeof document === 'undefined') return 'ltr';

  const ownerDocument = element?.ownerDocument ?? document;
  const docDir = ownerDocument.documentElement?.dir;
  if (docDir === 'rtl') return 'rtl';
  if (docDir === 'ltr') return 'ltr';

  let current: HTMLElement | null = element;
  while (current) {
    const dir = current.getAttribute('dir');
    if (dir === 'rtl' || dir === 'ltr') return dir;
    current = current.parentElement;
  }

  const computed = element
    ? ownerDocument.defaultView?.getComputedStyle(element).direction
    : ownerDocument.defaultView?.getComputedStyle(ownerDocument.body).direction;
  return computed === 'rtl' ? 'rtl' : 'ltr';
};

const collator = typeof Intl !== 'undefined' ? new Intl.Collator(undefined, { sensitivity: 'base' }) : undefined;

const sharedPrefixLength = (a: string, b: string): number => {
  if (!collator) {
    const simpleLength = Math.min(a.length, b.length);
    let index = 0;
    while (index < simpleLength && a[index] === b[index]) index += 1;
    return index;
  }

  const aParts = Array.from(a);
  const bParts = Array.from(b);
  const max = Math.min(aParts.length, bParts.length);
  let i = 0;
  for (; i < max; i += 1) {
    if (collator.compare(aParts[i], bParts[i]) !== 0) break;
  }
  return aParts.slice(0, i).join('').length;
};

const setSelection = (
  input: HTMLInputElement,
  start: number,
  end: number,
  direction: TextDirection,
) => {
  const selectionStart = Math.max(0, Math.min(start, input.value.length));
  const selectionEnd = Math.max(selectionStart, Math.min(end, input.value.length));
  const selectionDirection = direction === 'rtl' ? 'backward' : 'forward';
  try {
    input.setSelectionRange(selectionStart, selectionEnd, selectionDirection as any);
  } catch {
    input.setSelectionRange(selectionStart, selectionEnd);
  }
};

const getRowId = (baseId: string, index: number) => `${baseId}-item-${index}`;

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  items,
  onClose,
  onSubmit,
  onQueryChange,
  placeholder = 'Type a command…',
  label = 'Command palette',
  initialQuery = '',
  dir,
  filterItems = defaultFilter,
  emptyState = 'No matches',
  autoFocus = true,
  renderItem,
}) => {
  const paletteRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [activeIndex, setActiveIndex] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const [resolvedDir, setResolvedDir] = useState<TextDirection>(() =>
    resolveDirection(dir, typeof document !== 'undefined' ? document.body : null),
  );
  const listboxId = useId();

  useEffect(() => {
    if (!isOpen) return;
    setQuery(initialQuery);
    setActiveIndex(0);
    setPreviewing(false);
  }, [initialQuery, isOpen]);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;
    const element = paletteRef.current;
    setResolvedDir(resolveDirection(dir, element));
    if (dir || !element || typeof MutationObserver === 'undefined') return;
    if (process.env.NODE_ENV === 'test') return;

    const handleMutation = () => {
      setResolvedDir(resolveDirection(dir, paletteRef.current));
    };

    const observers: MutationObserver[] = [];
    const watch = (node: HTMLElement | null) => {
      if (!node) return;
      const observer = new MutationObserver(handleMutation);
      observer.observe(node, { attributes: true, attributeFilter: ['dir'] });
      observers.push(observer);
    };

    const docEl = element.ownerDocument?.documentElement;
    watch(docEl ?? null);
    let parent = element.parentElement;
    while (parent) {
      watch(parent);
      parent = parent.parentElement;
    }

    return () => observers.forEach((observer) => observer.disconnect());
  }, [dir, isOpen]);

  useIsomorphicLayoutEffect(() => {
    if (!isOpen || !autoFocus) return;
    const node = inputRef.current;
    node?.focus({ preventScroll: true });
  }, [isOpen, autoFocus]);

  const filteredItems = useMemo(
    () => filterItems(items, query),
    [filterItems, items, query],
  );

  useEffect(() => {
    if (!filteredItems.length) {
      setActiveIndex(0);
      setPreviewing(false);
    } else if (activeIndex >= filteredItems.length) {
      setActiveIndex(filteredItems.length - 1);
    }
  }, [activeIndex, filteredItems]);

  const highlightedItem = previewing ? filteredItems[activeIndex] : undefined;
  const inputValue = highlightedItem?.label ?? query;

  useIsomorphicLayoutEffect(() => {
    if (!isOpen) return;
    const input = inputRef.current;
    if (!input) return;

    if (previewing && highlightedItem) {
      const prefixLength = sharedPrefixLength(query, highlightedItem.label);
      setSelection(input, prefixLength, highlightedItem.label.length, resolvedDir);
    } else {
      const caret = inputValue.length;
      setSelection(input, caret, caret, resolvedDir);
    }
  }, [highlightedItem, inputValue, isOpen, previewing, query, resolvedDir]);

  useEffect(() => {
    if (!isOpen) return;
    const list = listRef.current;
    if (!list || !previewing) return;
    const active = list.querySelector<HTMLElement>(
      `[data-command-palette-active="true"]`,
    );
    if (active && typeof active.scrollIntoView === 'function') {
      active.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, isOpen, previewing, highlightedItem]);

  const handleClose = useCallback(() => {
    onClose();
    setPreviewing(false);
    setQuery(initialQuery);
    setActiveIndex(0);
  }, [initialQuery, onClose]);

  const moveActive = useCallback(
    (delta: number) => {
      if (!filteredItems.length) return;
      setPreviewing(true);
      setActiveIndex((index) => {
        if (!previewing) {
          return delta > 0 ? 0 : filteredItems.length - 1;
        }
        const next = (index + delta + filteredItems.length) % filteredItems.length;
        return next;
      });
    },
    [filteredItems.length, previewing],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setQuery(value);
      setPreviewing(false);
      onQueryChange?.(value);
    },
    [onQueryChange],
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        moveActive(1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        moveActive(-1);
      } else if (event.key === 'Tab') {
        if (filteredItems.length) {
          event.preventDefault();
          setPreviewing(true);
          setActiveIndex(0);
        }
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const item = previewing ? highlightedItem : undefined;
        const submission: CommandPaletteSubmitEvent = {
          query: item ? item.label : query,
          item,
        };
        onSubmit(submission);
        handleClose();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleClose();
      }
    },
    [filteredItems.length, handleClose, highlightedItem, moveActive, onSubmit, previewing, query],
  );

  const handleSelect = useCallback(
    (item: CommandPaletteItem) => {
      onSubmit({ query: item.label, item });
      handleClose();
    },
    [handleClose, onSubmit],
  );

  if (!isOpen) return null;

  const alignmentClass = resolvedDir === 'rtl' ? 'text-right' : 'text-left';
  const containerDir = resolvedDir;
  const activeId = filteredItems.length ? getRowId(listboxId, activeIndex) : undefined;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center bg-black/70 px-4 py-6 sm:px-6"
      role="presentation"
      onClick={handleClose}
    >
      <div
        ref={paletteRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="w-full max-w-xl rounded-lg bg-zinc-900/95 p-4 shadow-2xl ring-1 ring-white/10 backdrop-blur"
        dir={containerDir}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase text-white/40">⌘</span>
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={filteredItems.length > 0}
            aria-controls={listboxId}
            aria-activedescendant={previewing && activeId ? activeId : undefined}
            placeholder={placeholder}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`flex-1 rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/60 ${alignmentClass}`}
            dir={containerDir}
          />
        </div>
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="mt-3 max-h-60 overflow-y-auto rounded-md border border-white/10 bg-black/20"
        >
          {filteredItems.length === 0 ? (
            <li className="px-3 py-4 text-sm text-white/60" role="presentation">
              {emptyState}
            </li>
          ) : (
            filteredItems.map((item, index) => {
              const active = previewing && index === activeIndex;
              return (
                <li
                  key={item.id}
                  id={getRowId(listboxId, index)}
                  role="option"
                  aria-selected={active}
                  data-command-palette-active={active ? 'true' : 'false'}
                  className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                    active
                      ? 'bg-cyan-500/30 text-white'
                      : 'text-white/90 hover:bg-cyan-500/20 hover:text-white'
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelect(item)}
                >
                  {renderItem ? (
                    renderItem(item, active)
                  ) : (
                    <div className="space-y-1">
                      <div className="font-medium leading-none">{item.label}</div>
                      {item.description && (
                        <p className="text-xs text-white/60">{item.description}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

export default CommandPalette;
