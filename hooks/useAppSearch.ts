import { useEffect, useMemo, useState } from 'react';
import Fuse from 'fuse.js';

const DEFAULT_FUSE_OPTIONS: Fuse.IFuseOptions<any> = {
  includeMatches: true,
  threshold: 0.3,
  ignoreLocation: true,
  minMatchCharLength: 2,
  keys: ['title', 'description', 'tags', 'keywords', 'id'],
};

type UseAppSearchOptions<T> = {
  fuseOptions?: Fuse.IFuseOptions<T>;
  debounceMs?: number;
};

type SearchResult<T> = {
  item: T;
  matches?: readonly Fuse.FuseResultMatch[];
};

const useDebouncedValue = <T,>(value: T, delay: number): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (delay <= 0) {
      setDebounced(value);
      return;
    }
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

const buildOptionsKey = (options: Fuse.IFuseOptions<any> | undefined) =>
  JSON.stringify(options ?? {});

export const getHighlightedSegments = (
  text: string,
  matches: readonly Fuse.FuseResultMatch[] | undefined,
  key: string,
): Array<{ text: string; match: boolean }> => {
  if (!matches || matches.length === 0) {
    return [{ text, match: false }];
  }
  const matchForKey = matches.find((match) => match.key === key);
  if (!matchForKey || !matchForKey.indices || matchForKey.indices.length === 0) {
    return [{ text, match: false }];
  }

  const segments: Array<{ text: string; match: boolean }> = [];
  let lastIndex = 0;
  matchForKey.indices.forEach(([start, end]) => {
    if (start > lastIndex) {
      segments.push({ text: text.slice(lastIndex, start), match: false });
    }
    segments.push({ text: text.slice(start, end + 1), match: true });
    lastIndex = end + 1;
  });
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), match: false });
  }
  return segments;
};

export const useAppSearch = <T extends { id: string }>(
  items: readonly T[],
  options: UseAppSearchOptions<T> = {},
) => {
  const { fuseOptions, debounceMs = 150 } = options;
  const optionsKey = useMemo(() => buildOptionsKey(fuseOptions), [fuseOptions]);
  const fuse = useMemo(() => {
    if (!items || items.length === 0) {
      return null;
    }
    const resolvedOptions = {
      ...DEFAULT_FUSE_OPTIONS,
      ...fuseOptions,
    } satisfies Fuse.IFuseOptions<T>;
    return new Fuse(items, resolvedOptions);
  }, [items, optionsKey]);

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const results: SearchResult<T>[] = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return items.map((item) => ({ item }));
    }
    if (!fuse) {
      return [];
    }
    return fuse.search(debouncedQuery.trim()).map(({ item, matches }) => ({
      item,
      matches,
    }));
  }, [debouncedQuery, fuse, items]);

  const filtered = useMemo(() => results.map((result) => result.item), [results]);

  return {
    query,
    setQuery,
    results,
    filtered,
    isFiltering: Boolean(debouncedQuery.trim()),
  };
};

export type { SearchResult };
