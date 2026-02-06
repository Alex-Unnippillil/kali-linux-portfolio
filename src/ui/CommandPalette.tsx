import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  keywords?: string[];
  shortcut?: string | string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  commands: CommandPaletteItem[];
  onClose: () => void;
  onSelect?: (command: CommandPaletteItem) => void;
  title?: string;
  placeholder?: string;
  emptyMessage?: string;
  instructions?: string;
}

const DEFAULT_INSTRUCTIONS =
  'Type to filter results. Use the up and down arrows to move and press Enter to run the highlighted item.';

const CommandPalette = ({
  isOpen,
  commands,
  onClose,
  onSelect,
  title = 'Command palette',
  placeholder = 'Search commands…',
  emptyMessage = 'No matching commands.',
  instructions = DEFAULT_INSTRUCTIONS,
}: CommandPaletteProps) => {
  const headingId = useId();
  const inputId = useId();
  const instructionsId = useId();
  const listboxId = useId();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!normalizedQuery) return commands;
    return commands.filter((item) => {
      const text = [
        item.label,
        item.description,
        ...(item.keywords ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return text.includes(normalizedQuery);
    });
  }, [commands, normalizedQuery]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setActiveIndex(-1);
      return;
    }
    inputRef.current?.focus({ preventScroll: true });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex((prev) => {
      if (filtered.length === 0) return -1;
      if (prev < 0) return 0;
      if (prev >= filtered.length) return filtered.length - 1;
      return prev;
    });
  }, [filtered.length, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (activeIndex < 0) return;
    const option = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    option?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, filtered.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const handleSelect = useCallback(
    (item: CommandPaletteItem) => {
      onSelect?.(item);
      onClose();
    },
    [onClose, onSelect]
  );

  const moveActiveIndex = useCallback(
    (direction: 1 | -1) => {
      if (filtered.length === 0) return;
      setActiveIndex((prev) => {
        if (prev === -1) return direction === 1 ? 0 : filtered.length - 1;
        const next = prev + direction;
        if (next < 0) return filtered.length - 1;
        if (next >= filtered.length) return 0;
        return next;
      });
    },
    [filtered.length]
  );

  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveActiveIndex(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveActiveIndex(-1);
        break;
      case 'Home':
        if (filtered.length > 0) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (filtered.length > 0) {
          event.preventDefault();
          setActiveIndex(filtered.length - 1);
        }
        break;
      case 'Enter':
        if (activeIndex >= 0 && activeIndex < filtered.length) {
          event.preventDefault();
          handleSelect(filtered[activeIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      default:
        break;
    }
  };

  const activeOptionId =
    activeIndex >= 0 && activeIndex < filtered.length
      ? `${listboxId}-option-${activeIndex}`
      : undefined;

  const statusMessage = useMemo(() => {
    if (!isOpen) return '';
    if (filtered.length === 0) {
      return normalizedQuery ? 'No results match your search.' : 'No commands available.';
    }
    if (activeIndex >= 0 && activeIndex < filtered.length) {
      const item = filtered[activeIndex];
      const position = `${activeIndex + 1} of ${filtered.length}`;
      const shortcut = Array.isArray(item.shortcut)
        ? item.shortcut.join(' ')
        : item.shortcut;
      return [item.label, item.description, shortcut, position]
        .filter(Boolean)
        .join('. ');
    }
    return `${filtered.length} result${filtered.length === 1 ? '' : 's'} available.`;
  }, [activeIndex, filtered, filtered.length, isOpen, normalizedQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        aria-describedby={instructionsId}
        className="w-full max-w-xl overflow-hidden rounded-lg bg-slate-900 text-slate-100 shadow-xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-700 px-4 pb-3 pt-4">
          <h2 id={headingId} className="text-base font-semibold">
            {title}
          </h2>
          <p id={instructionsId} className="mt-1 text-sm text-slate-400">
            {instructions}
          </p>
          <div className="mt-3">
            <label htmlFor={inputId} className="sr-only">
              {title}
            </label>
            <input
              id={inputId}
              ref={inputRef}
              role="combobox"
              aria-expanded={filtered.length > 0}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              aria-labelledby={headingId}
              aria-describedby={instructionsId}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-base text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-500"
              placeholder={placeholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
            />
          </div>
        </div>
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={headingId}
          ref={listRef}
          className="max-h-72 overflow-y-auto py-2"
        >
          {filtered.map((item, index) => {
            const optionId = `${listboxId}-option-${index}`;
            const isActive = index === activeIndex;
            const shortcut = Array.isArray(item.shortcut)
              ? item.shortcut.join(' ')
              : item.shortcut;
            return (
              <li
                key={item.id}
                id={optionId}
                role="option"
                aria-selected={isActive}
                className={`cursor-pointer px-4 py-2 text-sm focus:outline-none ${
                  isActive
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-100 hover:bg-slate-800'
                }`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => handleSelect(item)}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium">{item.label}</span>
                  {shortcut && (
                    <span className="text-xs text-slate-300">{shortcut}</span>
                  )}
                </div>
                {item.description && (
                  <p className="mt-1 text-xs text-slate-300">{item.description}</p>
                )}
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-slate-400">
              {emptyMessage}
            </li>
          )}
        </ul>
        <div role="status" aria-live="polite" className="sr-only">
          {statusMessage}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
