import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

interface FilterContext {
  query: string;
  normalizedQuery: string;
  index: number;
}

export interface AppSearchResult<T> {
  item: T;
  /** Index of the item in the provided source array */
  index: number;
  /** Position of the item in the filtered results */
  position: number;
}

export interface AppSearchMetadata {
  total: number;
  matched: number;
  query: string;
  debouncedQuery: string;
  normalizedQuery: string;
  hasQuery: boolean;
  isSearching: boolean;
}

export interface UseAppSearchOptions<T> {
  /** Milliseconds to debounce raw query updates */
  debounceMs?: number;
  /** Initial query value */
  initialQuery?: string;
  /**
   * Extract a human-readable label from an item. Defaults to `String(item)`.
   * Used for default filtering and metadata.
   */
  getLabel?: (item: T) => string;
  /**
   * Custom filter predicate. Receives both the raw and normalized query along
   * with the item index. If omitted, a case-insensitive substring match is used.
   */
  filter?: (item: T, context: FilterContext) => boolean;
  /** Optional maximum number of results to return */
  limit?: number;
  /**
   * Override how highlighted output should be rendered. Receives the original
   * text plus both query variants.
   */
  highlight?: (text: string, query: string, normalizedQuery: string) => ReactNode;
}

const defaultGetLabel = <T,>(item: T) =>
  typeof item === 'string' ? item : String(item ?? '');

function defaultHighlight(text: string, query: string, normalizedQuery: string): ReactNode {
  if (!normalizedQuery) return text;
  const lower = text.toLowerCase();
  const pieces: Array<{ text: string; match: boolean }> = [];
  let cursor = 0;
  let index = lower.indexOf(normalizedQuery, cursor);

  while (index !== -1) {
    if (index > cursor) {
      pieces.push({ text: text.slice(cursor, index), match: false });
    }
    pieces.push({
      text: text.slice(index, index + normalizedQuery.length),
      match: true,
    });
    cursor = index + normalizedQuery.length;
    index = lower.indexOf(normalizedQuery, cursor);
  }

  if (cursor < text.length) {
    pieces.push({ text: text.slice(cursor), match: false });
  }

  if (pieces.length === 0) {
    return text;
  }

  return pieces.map((piece, idx) =>
    piece.match ? (
      <mark key={`match-${idx}`} className="bg-yellow-500/40 text-inherit">
        {piece.text}
      </mark>
    ) : (
      <Fragment key={`text-${idx}`}>{piece.text}</Fragment>
    ),
  );
}

export default function useAppSearch<T>(
  items: readonly T[],
  options: UseAppSearchOptions<T> = {},
) {
  const {
    debounceMs = 200,
    initialQuery = '',
    getLabel = defaultGetLabel,
    filter,
    limit,
    highlight: highlightOverride,
  } = options;

  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isDebouncing, setIsDebouncing] = useState(false);

  useEffect(() => {
    if (query === debouncedQuery) {
      setIsDebouncing(false);
      return;
    }
    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsDebouncing(false);
    }, debounceMs);
    return () => {
      clearTimeout(timer);
    };
  }, [debounceMs, debouncedQuery, query]);

  const normalizedQuery = debouncedQuery.trim().toLowerCase();

  const indexedItems = useMemo(
    () => items.map((item, index) => ({ item, index })),
    [items],
  );

  const filtered = useMemo(() => {
    if (!normalizedQuery) {
      return indexedItems;
    }
    return indexedItems.filter(({ item, index }) =>
      filter
        ? filter(item, { query: debouncedQuery, normalizedQuery, index })
        : getLabel(item).toLowerCase().includes(normalizedQuery),
    );
  }, [debouncedQuery, filter, getLabel, indexedItems, normalizedQuery]);

  const limited = useMemo(
    () => (typeof limit === 'number' ? filtered.slice(0, limit) : filtered),
    [filtered, limit],
  );

  const results: AppSearchResult<T>[] = useMemo(
    () => limited.map(({ item, index }, position) => ({ item, index, position })),
    [limited],
  );

  const highlight = useCallback(
    (text: string): ReactNode =>
      highlightOverride
        ? highlightOverride(text, debouncedQuery, normalizedQuery)
        : defaultHighlight(text, debouncedQuery, normalizedQuery),
    [debouncedQuery, highlightOverride, normalizedQuery],
  );

  const metadata: AppSearchMetadata = useMemo(
    () => ({
      total: items.length,
      matched: results.length,
      query,
      debouncedQuery,
      normalizedQuery,
      hasQuery: normalizedQuery.length > 0,
      isSearching: isDebouncing,
    }),
    [debouncedQuery, isDebouncing, items.length, normalizedQuery, query, results.length],
  );

  const reset = useCallback(() => {
    setQuery(initialQuery);
    setDebouncedQuery(initialQuery);
    setIsDebouncing(false);
  }, [initialQuery]);

  return {
    query,
    setQuery: setQuery as Dispatch<SetStateAction<string>>,
    debouncedQuery,
    results,
    highlight,
    metadata,
    reset,
  } as const;
}
