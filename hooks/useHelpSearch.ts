import { useCallback, useEffect, useMemo, useState } from 'react';
import { safeLocalStorage } from '@/utils/safeStorage';

export interface HelpIndexEntry {
  slug: string;
  title: string;
  categories: string[];
  excerpt: string;
  markdown: string;
  searchText: string;
}

interface UseHelpSearchOptions {
  storageKey?: string;
  storage?: Storage | undefined;
  initialIndex?: HelpIndexEntry[];
  fetcher?: () => Promise<HelpIndexEntry[]>;
  recentLimit?: number;
}

const DEFAULT_STORAGE_KEY = 'helpRecentDocs';

const defaultFetcher = async (): Promise<HelpIndexEntry[]> => {
  const response = await fetch('/help-index.json');
  if (!response.ok) {
    throw new Error(`Failed to load help index (${response.status})`);
  }
  const payload = await response.json();
  if (Array.isArray(payload)) {
    return payload as HelpIndexEntry[];
  }
  if (payload?.docs && Array.isArray(payload.docs)) {
    return payload.docs as HelpIndexEntry[];
  }
  throw new Error('Help index response is malformed');
};

export function useHelpSearch(options: UseHelpSearchOptions = {}) {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    storage = safeLocalStorage,
    initialIndex,
    fetcher = defaultFetcher,
    recentLimit = 5,
  } = options;

  const [index, setIndex] = useState<HelpIndexEntry[]>(initialIndex ?? []);
  const [isLoading, setIsLoading] = useState(!initialIndex);
  const [error, setError] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [recents, setRecents] = useState<HelpIndexEntry[]>([]);

  useEffect(() => {
    if (initialIndex) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      try {
        const docs = await fetcher();
        if (cancelled) return;
        setIndex(docs);
        setError(undefined);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Unable to load help index');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [fetcher, initialIndex]);

  const docMap = useMemo(() => {
    const map = new Map<string, HelpIndexEntry>();
    for (const doc of index) {
      map.set(doc.slug, doc);
    }
    return map;
  }, [index]);

  useEffect(() => {
    if (!storage) return;
    try {
      const raw = storage.getItem(storageKey);
      if (!raw) {
        setRecents([]);
        return;
      }
      const slugs = JSON.parse(raw);
      if (!Array.isArray(slugs)) {
        setRecents([]);
        return;
      }
      const resolved = slugs
        .map((slug: unknown) => (typeof slug === 'string' ? docMap.get(slug) : undefined))
        .filter((doc): doc is HelpIndexEntry => Boolean(doc));
      setRecents(resolved);
      if (!activeSlug && resolved.length > 0) {
        setActiveSlug(resolved[0].slug);
      }
    } catch {
      setRecents([]);
    }
  }, [storage, storageKey, docMap, activeSlug]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    for (const doc of index) {
      for (const category of doc.categories ?? []) {
        if (category && category !== 'All') {
          values.add(category);
        }
      }
    }
    const sorted = Array.from(values).sort((a, b) => a.localeCompare(b));
    return ['All', ...sorted];
  }, [index]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const queryTerms = useMemo(
    () => (normalizedSearch ? normalizedSearch.split(/\s+/).filter(Boolean) : []),
    [normalizedSearch]
  );

  const results = useMemo(() => {
    const matchesCategory = (doc: HelpIndexEntry) =>
      selectedCategory === 'All' || doc.categories?.includes(selectedCategory);

    const base = index.filter(matchesCategory).sort((a, b) => a.title.localeCompare(b.title));
    if (queryTerms.length === 0) {
      return base;
    }

    return base
      .map((doc) => {
        const titleLower = doc.title.toLowerCase();
        const excerptLower = doc.excerpt.toLowerCase();
        const text = doc.searchText ?? '';
        let score = 0;
        for (const term of queryTerms) {
          let found = false;
          if (titleLower.includes(term)) {
            score += 6;
            found = true;
          }
          if (excerptLower.includes(term)) {
            score += 3;
            found = true;
          }
          if (text.includes(term)) {
            score += 1;
            found = true;
          }
          if (!found) {
            return null;
          }
        }
        return { doc, score };
      })
      .filter((entry): entry is { doc: HelpIndexEntry; score: number } => Boolean(entry))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return a.doc.title.localeCompare(b.doc.title);
      })
      .map((entry) => entry.doc);
  }, [index, queryTerms, selectedCategory]);

  useEffect(() => {
    if (results.length === 0) {
      setActiveSlug(null);
      return;
    }
    if (!activeSlug || !results.some((doc) => doc.slug === activeSlug)) {
      setActiveSlug(results[0].slug);
    }
  }, [results, activeSlug]);

  const activeDoc = activeSlug ? docMap.get(activeSlug) ?? null : null;

  const selectDoc = useCallback(
    (input: string | HelpIndexEntry) => {
      const slug = typeof input === 'string' ? input : input.slug;
      const doc = docMap.get(slug);
      if (!doc) return null;
      setActiveSlug(slug);
      setRecents((prev) => {
        const next = [doc, ...prev.filter((item) => item.slug !== slug)].slice(0, recentLimit);
        if (storage) {
          try {
            storage.setItem(storageKey, JSON.stringify(next.map((item) => item.slug)));
          } catch {
            // Ignore storage write errors
          }
        }
        return next;
      });
      return doc;
    },
    [docMap, recentLimit, storage, storageKey]
  );

  const clearRecents = useCallback(() => {
    setRecents([]);
    if (storage) {
      try {
        storage.removeItem(storageKey);
      } catch {
        // ignore storage errors
      }
    }
  }, [storage, storageKey]);

  return {
    index,
    results,
    categories,
    searchTerm,
    setSearchTerm,
    selectedCategory,
    setSelectedCategory,
    isLoading,
    error,
    activeDoc,
    selectDoc,
    recents,
    clearRecents,
  } as const;
}
