'use client';

import React, {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { demoYouTubeVideos } from '../../../data/youtube/demoVideos';
import usePersistentState from '../../../hooks/usePersistentState';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

export type VideoResult = {
  id: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  thumbnail: string;
};

interface Props {
  initialResults?: VideoResult[];
}

const HISTORY_STORAGE_KEY = 'youtube:recently-watched';
const SEARCH_DEBOUNCE_MS = 500;
const MAX_HISTORY_ITEMS = 10;

const hasOwnText = (value?: string) => Boolean(value && value.trim().length);

type FilterId = 'all' | 'recent' | 'tutorials' | 'tools' | 'ctf';

type FilterOption = {
  id: FilterId;
  label: string;
  predicate: (video: VideoResult) => boolean;
};

const keywordMatcher = (keywords: string[]) => {
  const loweredKeywords = keywords.map((keyword) => keyword.toLowerCase());
  return (video: VideoResult) => {
    const haystack = `${video.title} ${video.description}`.toLowerCase();
    return loweredKeywords.some((keyword) => haystack.includes(keyword));
  };
};

const isWithinYears = (value: string, years: number) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const diffMs = Date.now() - parsed.getTime();
  const yearsMs = years * 365 * 24 * 60 * 60 * 1000;
  return diffMs <= yearsMs;
};

const filterOptions: FilterOption[] = [
  {
    id: 'all',
    label: 'All videos',
    predicate: () => true,
  },
  {
    id: 'recent',
    label: 'Latest uploads',
    predicate: (video) => isWithinYears(video.publishedAt, 2),
  },
  {
    id: 'tutorials',
    label: 'Tutorials & Guides',
    predicate: keywordMatcher(['tutorial', 'guide', 'walkthrough', 'how to']),
  },
  {
    id: 'tools',
    label: 'Tooling deep dives',
    predicate: keywordMatcher(['metasploit', 'wireshark', 'tool', 'automation', 'workflow']),
  },
  {
    id: 'ctf',
    label: 'CTF & Challenges',
    predicate: keywordMatcher(['ctf', 'challenge', 'forensic', 'capture the flag']),
  },
];

function normalizeVideo(video: VideoResult): VideoResult {
  return {
    id: video.id,
    title: hasOwnText(video.title) ? video.title : 'Untitled video',
    description: video.description ?? '',
    channelTitle: hasOwnText(video.channelTitle)
      ? video.channelTitle
      : 'Unknown channel',
    publishedAt: video.publishedAt ?? new Date().toISOString(),
    thumbnail: video.thumbnail ?? '',
  };
}

const demoResults = demoYouTubeVideos.map((video) => normalizeVideo(video));

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
  error?: { message?: string };
};

function isVideoList(value: unknown): value is VideoResult[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.description === 'string' &&
        typeof item.channelTitle === 'string' &&
        typeof item.publishedAt === 'string' &&
        typeof item.thumbnail === 'string',
    )
  );
}

async function fetchVideosFromYouTube(
  query: string,
  signal?: AbortSignal,
): Promise<VideoResult[]> {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('key', YOUTUBE_API_KEY ?? '');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', '12');
  searchUrl.searchParams.set('q', query);

  const response = await fetch(searchUrl.toString(), { signal });
  const data = (await response.json()) as YouTubeSearchResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || 'YouTube search failed');
  }

  return (data.items ?? [])
    .map((item) => ({
      id: item.id?.videoId ?? '',
      title: item.snippet?.title ?? 'Untitled video',
      description: item.snippet?.description ?? '',
      channelTitle: item.snippet?.channelTitle ?? 'Unknown channel',
      publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
      thumbnail:
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '',
    }))
    .filter((item): item is VideoResult => Boolean(item.id));
}

function filterDemoVideos(query: string): VideoResult[] {
  const term = query.toLowerCase();
  const seen = new Set<string>();

  return demoResults.filter((video) => {
    if (seen.has(video.id)) {
      return false;
    }

    const haystack = `${video.title} ${video.description} ${video.channelTitle}`.toLowerCase();
    const match = haystack.includes(term);

    if (match) {
      seen.add(video.id);
    }

    return match;
  });
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export default function YouTubeApp({ initialResults }: Props) {
  const fallbackInitial = useMemo(() => {
    if (initialResults?.length) {
      return initialResults.map((video) => normalizeVideo(video));
    }
    return demoResults;
  }, [initialResults]);

  const [results, setResults] = useState<VideoResult[]>(() => fallbackInitial);
  const [query, setQuery] = useState('');
  const [selectedVideo, setSelectedVideo] = useState<VideoResult | null>(
    fallbackInitial[0] ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSearchSource, setLastSearchSource] = useState<'api' | 'demo' | null>(
    null,
  );
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [rawHistory, setHistoryState, , clearHistoryState] =
    usePersistentState<VideoResult[]>(HISTORY_STORAGE_KEY, [], isVideoList);

  const history = useMemo(
    () => rawHistory.map((item) => normalizeVideo(item)),
    [rawHistory],
  );

  const visibleResults = useMemo(() => {
    const filter = filterOptions.find((option) => option.id === activeFilter);
    if (!filter) {
      return results;
    }
    return results.filter((item) => {
      try {
        return filter.predicate(item);
      } catch (error_) {
        console.error('Failed to evaluate filter predicate', error_);
        return true;
      }
    });
  }, [activeFilter, results]);

  const hasApiKey = Boolean(YOUTUBE_API_KEY);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setResults(fallbackInitial);
    setSelectedVideo((previous) => previous ?? fallbackInitial[0] ?? null);
  }, [fallbackInitial]);

  const setHistory = useCallback(
    (updater: React.SetStateAction<VideoResult[]>) => {
      setHistoryState((prev) => {
        const normalizedPrev = prev.map((item) => normalizeVideo(item));
        const next =
          typeof updater === 'function'
            ? (updater as (value: VideoResult[]) => VideoResult[])(
                normalizedPrev,
              )
            : updater;
        return next.map((item) => normalizeVideo(item));
      });
    },
    [setHistoryState],
  );

  const handleSelectVideo = useCallback(
    (video: VideoResult) => {
      const normalized = normalizeVideo(video);
      setSelectedVideo(normalized);
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.id !== normalized.id);
        return [normalized, ...filtered].slice(0, MAX_HISTORY_ITEMS);
      });
    },
    [setHistory],
  );

  const executeSearch = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      if (!trimmed) {
        setResults(fallbackInitial);
        setSelectedVideo((prev) => prev ?? fallbackInitial[0] ?? null);
        setError(null);
        setLastSearchSource(null);
        setLoading(false);
        return;
      }

      if (trimmed.length < 2) {
        setError('Type at least two characters to search.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      let items: VideoResult[] = [];
      let source: 'api' | 'demo' = 'demo';

      if (hasApiKey) {
        abortControllerRef.current?.abort();
        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
          const apiItems = await fetchVideosFromYouTube(trimmed, controller.signal);
          items = apiItems.map((item) => normalizeVideo(item));
          source = 'api';
        } catch (error_: unknown) {
          const err = error_ as Error;
          if (err.name === 'AbortError') {
            setLoading(false);
            return;
          }
          console.error(
            'YouTube API search failed, using demo data instead.',
            err,
          );
          setError(
            'Falling back to demo results while the YouTube API is unavailable.',
          );
          items = filterDemoVideos(trimmed).map((item) => normalizeVideo(item));
          source = 'demo';
        } finally {
          abortControllerRef.current = null;
        }
      } else {
        items = filterDemoVideos(trimmed).map((item) => normalizeVideo(item));
        source = 'demo';
      }

      if (requestIdRef.current !== requestId) {
        setLoading(false);
        return;
      }

      setResults(items);
      setLastSearchSource(source);
      if (!items.length) {
        setSelectedVideo((prev) => (prev && prev.id ? prev : null));
      } else {
        setSelectedVideo((prev) => prev ?? items[0]);
      }
      setLoading(false);
    },
    [fallbackInitial, hasApiKey],
  );

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      void executeSearch(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [query, executeSearch]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      void executeSearch(query);
    },
    [query, executeSearch],
  );

  const handleClearHistory = useCallback(() => {
    clearHistoryState();
  }, [clearHistoryState]);

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#020617] text-white">
      <header className="border-b border-white/10 bg-black/30 px-6 py-6 shadow-sm">
        <h1 className="text-2xl font-semibold">YouTube Explorer</h1>
        <p className="mt-2 max-w-3xl text-sm text-ubt-grey">
          Search for security walkthroughs, development tutorials, and capture the flag recaps. Click any result to watch it and it will be remembered in your history.
        </p>
        <form
          onSubmit={handleSubmit}
          className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <label className="sr-only" htmlFor="youtube-search">
            Search videos
          </label>
          <input
            id="youtube-search"
            aria-label="Search videos"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={'Try "Wireshark", "OSINT workflow", or "Metasploit demo"'}
            className="w-full rounded-md border border-white/10 bg-black/50 px-4 py-3 text-sm text-white placeholder:text-ubt-grey focus:border-ubt-green focus:outline-none focus:ring-2 focus:ring-ubt-green/40"
          />
          <button
            type="submit"
            className="rounded-md bg-ubt-green px-5 py-3 text-sm font-semibold text-black transition hover:bg-ubt-green/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
        {!hasApiKey && (
          <p className="mt-3 text-xs text-ubt-grey">
            Using the built-in demo library because
            {' '}
            <code className="rounded bg-black/60 px-1">NEXT_PUBLIC_YOUTUBE_API_KEY</code>
            {' '}
            is not configured.
          </p>
        )}
        {lastSearchSource === 'demo' && hasApiKey && !error && (
          <p className="mt-3 text-xs text-ubt-grey" role="status">
            Showing demo results while the YouTube API request completes.
          </p>
        )}
        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 py-6 lg:flex-row">
        <section className="flex-1 rounded-2xl border border-white/10 bg-black/40 p-6 shadow-lg shadow-black/20">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
            Watch
          </h2>
          <div className="mt-4 overflow-hidden rounded-xl border border-white/5 bg-black/60 shadow-inner">
            <div className="aspect-video">
              {selectedVideo ? (
                <iframe
                  key={selectedVideo.id}
                  title={`YouTube player for ${selectedVideo.title}`}
                  src={`https://www.youtube-nocookie.com/embed/${selectedVideo.id}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-ubt-grey">
                  Search and choose a video to start watching.
                </div>
              )}
            </div>
          </div>
          {selectedVideo && (
            <div className="mt-5 space-y-3 text-sm text-ubt-grey">
              <h3 className="text-xl font-semibold text-white">
                {selectedVideo.title}
              </h3>
              <p className="text-xs uppercase tracking-wide text-ubt-cool-grey">
                {selectedVideo.channelTitle} • Published {formatDate(selectedVideo.publishedAt)}
              </p>
              {selectedVideo.description && (
                <p className="text-sm leading-relaxed text-ubt-cool-grey/90">
                  {selectedVideo.description}
                </p>
              )}
            </div>
          )}
        </section>

        <aside className="lg:w-80">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-lg shadow-black/20">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
                Recently watched
              </h2>
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs font-semibold text-ubt-green transition hover:text-ubt-green/80 disabled:opacity-40"
                disabled={!history.length}
              >
                Clear history
              </button>
            </div>
            <ul className="mt-4 space-y-3" data-testid="recently-watched">
              {history.length ? (
                history.map((video) => (
                  <li key={video.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectVideo(video)}
                      className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-black/50 p-3 text-left transition hover:border-ubt-green/60 hover:text-ubt-green focus:outline-none focus:ring-2 focus:ring-ubt-green/60"
                      aria-label={`Watch ${video.title} again`}
                    >
                      {video.thumbnail ? (
                        <div className="relative aspect-video w-24 overflow-hidden rounded-lg border border-white/10">
                          <img
                            src={video.thumbnail}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-12 w-24 items-center justify-center rounded-lg bg-black/60 text-xs text-ubt-grey">
                          No preview
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-white line-clamp-2">
                          {video.title}
                        </p>
                        <p className="text-xs text-ubt-grey">
                          {video.channelTitle}
                        </p>
                      </div>
                    </button>
                  </li>
                ))
              ) : (
                <li className="text-xs text-ubt-grey">
                  Your history is empty. Watch a video to add it here.
                </li>
              )}
            </ul>
          </div>
        </aside>
      </main>

      <section className="border-t border-white/5 bg-black/40 px-6 py-6">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
              Search results
            </h2>
            {loading && (
              <span className="mt-2 flex items-center gap-2 text-xs text-ubt-green">
                <span className="h-2 w-2 animate-pulse rounded-full bg-ubt-green" aria-hidden />
                Loading results…
              </span>
            )}
          </div>
          <div className="flex max-w-full flex-wrap items-center gap-2 overflow-x-auto pb-1 text-xs">
            {filterOptions.map((option) => {
              const isActive = option.id === activeFilter;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setActiveFilter(option.id)}
                  aria-pressed={isActive}
                  className={`rounded-full px-4 py-2 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ubt-green/70 ${
                    isActive
                      ? 'bg-ubt-green/20 text-ubt-green ring-1 ring-ubt-green'
                      : 'bg-white/5 text-ubt-grey hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
        {visibleResults.length ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleResults.map((video) => {
              const isActive = selectedVideo?.id === video.id;
              return (
                <button
                  key={video.id}
                  type="button"
                  onClick={() => handleSelectVideo(video)}
                  className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-black/40 text-left transition focus:outline-none focus:ring-2 focus:ring-ubt-green/60 ${
                    isActive
                      ? 'border-ubt-green/80 shadow-lg shadow-ubt-green/20'
                      : 'border-white/10 hover:border-ubt-green/50 hover:shadow-lg hover:shadow-black/40'
                  }`}
                  aria-label={`Watch ${video.title}`}
                >
                  <div className="relative aspect-video w-full overflow-hidden border-b border-white/5">
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt=""
                        className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-black/60 text-xs text-ubt-grey">
                        No preview available
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <h3 className="text-base font-semibold text-white line-clamp-2">
                      {video.title}
                    </h3>
                    <p className="text-xs uppercase tracking-wide text-ubt-grey">
                      {video.channelTitle}
                    </p>
                    <p className="line-clamp-3 text-xs text-ubt-cool-grey/90">
                      {video.description || 'No description available.'}
                    </p>
                    <p className="mt-auto text-[11px] uppercase tracking-wide text-ubt-grey">
                      {formatDate(video.publishedAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-ubt-grey">
            {loading
              ? 'Fetching results…'
              : 'No matches for this filter. Try a different chip or clear the search box to see featured videos.'}
          </p>
        )}
      </section>
    </div>
  );
}
