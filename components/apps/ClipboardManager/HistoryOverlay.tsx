import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ClipItem } from '../ClipboardManager';

interface HistoryOverlayProps {
  items: ClipItem[];
  warnings: string[];
  onClear: () => void;
  onCopy: (item: ClipItem) => void;
  onTogglePin: (item: ClipItem) => void;
}

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

const dateTimeFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightMatches(text: string, query: string) {
  if (!query) return text;
  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  const segments = text.split(regex);
  return segments.map((segment, index) =>
    index % 2 === 1 ? (
      <mark key={`${segment}-${index}`} className="rounded bg-ubt-blue/30 px-0.5">
        {segment}
      </mark>
    ) : (
      <React.Fragment key={`${segment}-${index}`}>{segment}</React.Fragment>
    ),
  );
}

function formatTimestamp(value: number) {
  const created = new Date(value);
  const now = new Date();
  const isSameDay =
    created.getFullYear() === now.getFullYear() &&
    created.getMonth() === now.getMonth() &&
    created.getDate() === now.getDate();

  return isSameDay ? timeFormatter.format(created) : dateTimeFormatter.format(created);
}

const HistoryOverlay: React.FC<HistoryOverlayProps> = ({
  items,
  warnings,
  onClear,
  onCopy,
  onTogglePin,
}) => {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  const { pinned, history } = useMemo(() => {
    const pinnedItems = items.filter((item) => item.pinned);
    const historyItems = items.filter((item) => !item.pinned);

    if (!normalizedQuery) {
      return { pinned: pinnedItems, history: historyItems };
    }

    const filter = (item: ClipItem) =>
      item.text.toLowerCase().includes(normalizedQuery);

    return {
      pinned: pinnedItems.filter(filter),
      history: historyItems.filter(filter),
    };
  }, [items, normalizedQuery]);

  const flatList = useMemo(() => [...pinned, ...history], [pinned, history]);

  useEffect(() => {
    if (!flatList.length) {
      setActiveIndex(-1);
    } else if (activeIndex < 0 || activeIndex >= flatList.length) {
      setActiveIndex(0);
    }
  }, [flatList, activeIndex]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!overlayRef.current || !overlayRef.current.contains(target)) {
        return;
      }

      if (!flatList.length) return;

      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((prev) => {
          const next = prev < 0 ? 0 : prev;
          const offset = event.key === 'ArrowDown' ? 1 : -1;
          const total = flatList.length;
          return (total + next + offset) % total;
        });
      } else if (event.key === 'Enter' && activeIndex >= 0 && activeIndex < flatList.length) {
        event.preventDefault();
        onCopy(flatList[activeIndex]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, flatList, onCopy]);

  const hasQuery = normalizedQuery.length > 0;
  const hasResults = flatList.length > 0;

  return (
    <div
      ref={overlayRef}
      className="flex h-full flex-col bg-ub-cool-grey/95 text-white"
      role="dialog"
      aria-label="Clipboard history"
    >
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold">Clipboard history</h2>
          <p className="text-xs text-white/70">Use Enter to paste the highlighted entry.</p>
        </div>
        <button
          type="button"
          className="rounded border border-white/20 px-3 py-1 text-sm text-white/80 transition hover:border-ubt-blue hover:text-ubt-blue disabled:cursor-not-allowed disabled:opacity-50"
          onClick={onClear}
          disabled={!items.length}
        >
          Clear history
        </button>
      </div>

      {warnings.length > 0 && (
        <div className="flex flex-wrap gap-2 px-4 py-2 text-xs" role="status">
          {warnings.map((warning, index) => (
            <span
              key={`${warning}-${index}`}
              className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-1 text-amber-200"
            >
              <span aria-hidden="true">⚠️</span>
              {warning}
            </span>
          ))}
        </div>
      )}

      <div className="px-4 py-3">
        <label className="flex items-center gap-2 rounded-md bg-black/40 px-3 py-2 focus-within:ring-2 focus-within:ring-ubt-blue">
          <span className="text-xs uppercase tracking-wide text-white/60">Search</span>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find text"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
            aria-label="Search clipboard history"
          />
        </label>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 pb-4">
        {pinned.length > 0 && (
          <section aria-label="Pinned clipboard entries" className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">Pinned</h3>
            <ul className="space-y-2">
              {pinned.map((item, index) => (
                <HistoryRow
                  key={item.id ?? `${item.created}-pinned`}
                  item={item}
                  isActive={index === activeIndex}
                  query={normalizedQuery}
                  onCopy={onCopy}
                  onTogglePin={onTogglePin}
                />
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Recent clipboard entries" className="space-y-2">
          {history.length > 0 && (
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">
              {pinned.length ? 'Recent' : 'History'}
            </h3>
          )}
          <ul className="space-y-2">
            {history.map((item, index) => (
              <HistoryRow
                key={item.id ?? `${item.created}-history`}
                item={item}
                isActive={index + pinned.length === activeIndex}
                query={normalizedQuery}
                onCopy={onCopy}
                onTogglePin={onTogglePin}
              />
            ))}
          </ul>

          {!items.length && !hasQuery && (
            <p className="text-sm text-white/60">Copy something to build your clipboard history.</p>
          )}

          {hasQuery && !hasResults && (
            <p className="text-sm text-white/60">No results for “{query}”.</p>
          )}
        </section>
      </div>
    </div>
  );
};

interface HistoryRowProps {
  item: ClipItem;
  isActive: boolean;
  query: string;
  onCopy: (item: ClipItem) => void;
  onTogglePin: (item: ClipItem) => void;
}

const HistoryRow: React.FC<HistoryRowProps> = ({ item, isActive, query, onCopy, onTogglePin }) => {
  const handleCopy = () => onCopy(item);
  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onTogglePin(item);
  };

  return (
    <li>
      <div
        className={
          'group relative flex items-start gap-3 rounded-md border border-transparent bg-white/5 px-3 py-2 transition hover:border-ubt-blue hover:bg-black/60' +
          (isActive ? ' border-ubt-blue bg-black/60' : '')
        }
        data-active={isActive}
      >
        <button
          type="button"
          className="flex-1 text-left text-sm leading-snug text-white"
          onClick={handleCopy}
        >
          <div className="break-words">{highlightMatches(item.text, query)}</div>
          <time
            dateTime={new Date(item.created).toISOString()}
            className="mt-1 block text-xs text-white/50"
          >
            {formatTimestamp(item.created)}
          </time>
        </button>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={handleToggle}
            className="rounded border border-white/20 px-2 py-1 text-xs text-white/70 transition hover:border-ubt-blue hover:text-ubt-blue"
            aria-pressed={Boolean(item.pinned)}
          >
            {item.pinned ? 'Unpin' : 'Pin'}
          </button>
        </div>
      </div>
    </li>
  );
};

export default HistoryOverlay;
