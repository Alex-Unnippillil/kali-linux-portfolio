'use client';

import React, {
  FormEvent,
  Suspense,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { demoYouTubeVideos } from '../../../data/youtube/demoVideos';
import usePersistentState from '../../../hooks/usePersistentState';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';
import { darkenColor, lightenColor } from '../../../utils/colorMath';

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

type ThemeTokens = {
  surface: string;
  surfaceRaised: string;
  background: string;
  accent: string;
  text: string;
};

const DEFAULT_THEME_TOKENS: ThemeTokens = {
  surface: '#111b24',
  surfaceRaised: '#1a2533',
  background: '#0b121a',
  accent: '#0f94d2',
  text: '#f5faff',
};

const readThemeTokens = (): ThemeTokens => {
  if (typeof window === 'undefined') {
    return DEFAULT_THEME_TOKENS;
  }

  const styles = getComputedStyle(document.documentElement);

  const getVar = (name: string, fallback: string) => {
    const value = styles.getPropertyValue(name).trim();
    return value || fallback;
  };

  return {
    surface: getVar('--color-surface', DEFAULT_THEME_TOKENS.surface),
    surfaceRaised: getVar(
      '--color-surface-raised',
      DEFAULT_THEME_TOKENS.surfaceRaised,
    ),
    background: getVar('--color-bg', DEFAULT_THEME_TOKENS.background),
    accent: getVar('--color-control-accent', DEFAULT_THEME_TOKENS.accent),
    text: getVar('--color-text', DEFAULT_THEME_TOKENS.text),
  };
};

const hasOwnText = (value?: string) => Boolean(value && value.trim().length);

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
  const [themeTokens, setThemeTokens] = useState<ThemeTokens>(() => readThemeTokens());
  const [resultsResource, setResultsResource] = useState<Promise<VideoResult[]>>(
    () => Promise.resolve(fallbackInitial),
  );
  const prefersReducedMotion = usePrefersReducedMotion();
  const [rawHistory, setHistoryState, , clearHistoryState] =
    usePersistentState<VideoResult[]>(HISTORY_STORAGE_KEY, [], isVideoList);

  const history = useMemo(
    () => rawHistory.map((item) => normalizeVideo(item)),
    [rawHistory],
  );

  const hasApiKey = Boolean(YOUTUBE_API_KEY);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);
  const suspenseResolverRef =
    useRef<((value: VideoResult[]) => void) | null>(null);
  const latestResultsRef = useRef<VideoResult[]>(fallbackInitial);
  const historyContainerRef = useRef<HTMLDivElement | null>(null);

  const resolveSuspense = useCallback(
    (videos: VideoResult[]) => {
      suspenseResolverRef.current?.(videos);
      suspenseResolverRef.current = null;
      setResultsResource(Promise.resolve(videos));
    },
    [setResultsResource],
  );

  useEffect(() => {
    latestResultsRef.current = results;
  }, [results]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    const update = () => setThemeTokens(readThemeTokens());
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setResults(fallbackInitial);
    setSelectedVideo((previous) => previous ?? fallbackInitial[0] ?? null);
    resolveSuspense(fallbackInitial);
  }, [fallbackInitial, resolveSuspense]);

  useEffect(() => () => {
    suspenseResolverRef.current?.(latestResultsRef.current);
    suspenseResolverRef.current = null;
  }, []);

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
        setError(null);
        setLastSearchSource(null);
        setLoading(false);
        setResults(fallbackInitial);
        setSelectedVideo((prev) => prev ?? fallbackInitial[0] ?? null);
        resolveSuspense(fallbackInitial);
        return;
      }

      if (trimmed.length < 2) {
        setError('Type at least two characters to search.');
        setLoading(false);
        resolveSuspense(latestResultsRef.current);
        return;
      }

      setLoading(true);
      setError(null);
      setLastSearchSource(null);

      const pending = new Promise<VideoResult[]>((resolve) => {
        suspenseResolverRef.current = resolve;
      });
      setResultsResource(pending);

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
            resolveSuspense(latestResultsRef.current);
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
        await new Promise((resolve) => setTimeout(resolve, 32));
        items = filterDemoVideos(trimmed).map((item) => normalizeVideo(item));
        source = 'demo';
      }

      if (requestIdRef.current !== requestId) {
        resolveSuspense(latestResultsRef.current);
        setLoading(false);
        return;
      }

      setResults(items);
      setLastSearchSource(source);
      if (!items.length) {
        setSelectedVideo((prev) => (prev && prev.id ? prev : null));
      } else {
        setSelectedVideo((prev) => {
          if (prev && items.some((item) => item.id === prev.id)) {
            return prev;
          }
          return items[0];
        });
      }
      resolveSuspense(items);
      setLoading(false);
    },
    [fallbackInitial, hasApiKey, resolveSuspense],
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

  const historyVirtualizer = useVirtualizer({
    count: history.length,
    getScrollElement: () => historyContainerRef.current,
    estimateSize: () => 92,
    overscan: 4,
  });

  const gradientStyle = useMemo<React.CSSProperties>(() => {
    const accentGlow = lightenColor(themeTokens.accent, 0.36);
    const surfaceHighlight = lightenColor(themeTokens.surfaceRaised, 0.16);
    const surfaceMid = lightenColor(themeTokens.surface, 0.04);
    const surfaceShadow = darkenColor(themeTokens.surface, 0.24);
    return {
      backgroundColor: themeTokens.background,
      backgroundImage: `radial-gradient(circle at top left, ${accentGlow} 0%, ${surfaceHighlight} 32%, ${surfaceMid} 56%, ${surfaceShadow} 100%)`,
      color: themeTokens.text,
    };
  }, [themeTokens]);

  const skeletonPalette = useMemo(
    () => ({
      tile: lightenColor(themeTokens.surfaceRaised, 0.12),
      bar: lightenColor(themeTokens.surface, 0.2),
      shimmer: lightenColor(themeTokens.accent, 0.5),
    }),
    [themeTokens],
  );

  return (
    <div className="flex h-full flex-col" style={gradientStyle}>
      <header className="border-b border-[var(--kali-panel-border)] bg-[var(--color-overlay-strong)] px-6 py-6 shadow-sm backdrop-blur">
        <h1 className="text-2xl font-semibold">YouTube Explorer</h1>
        <p className="mt-2 max-w-3xl text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
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
            className="w-full rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[color:var(--color-text)] placeholder:text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)] focus:border-[var(--color-focus-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
          />
          <button
            type="submit"
            className="rounded-md border border-[var(--kali-panel-border)] bg-kali-control px-5 py-3 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
        {!hasApiKey && (
          <p className="mt-3 text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
            Using the built-in demo library because
            {' '}
            <code className="rounded bg-[var(--kali-panel-highlight)] px-1">NEXT_PUBLIC_YOUTUBE_API_KEY</code>
            {' '}
            is not configured.
          </p>
        )}
        {lastSearchSource === 'demo' && hasApiKey && !error && (
          <p className="mt-3 text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]" role="status">
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
        <section className="flex-1 rounded-lg border border-[var(--kali-panel-border)] bg-[var(--color-surface)] p-5 shadow-kali-panel">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
            Watch
          </h2>
          <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-[var(--kali-panel-highlight)]">
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
              <div className="flex h-full items-center justify-center text-sm text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                Search and choose a video to start watching.
              </div>
            )}
          </div>
          {selectedVideo && (
            <div className="mt-4 space-y-2 text-sm text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)]">
              <h3 className="text-lg font-semibold text-[var(--color-text)]">
                {selectedVideo.title}
              </h3>
              <p className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                {selectedVideo.channelTitle} • Published {formatDate(selectedVideo.publishedAt)}
              </p>
              {selectedVideo.description && (
                <p className="text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_72%,transparent)]">
                  {selectedVideo.description}
                </p>
              )}
            </div>
          )}
        </section>

        <aside className="lg:w-80">
          <div className="rounded-lg border border-[var(--kali-panel-border)] bg-[var(--color-surface)] p-5 shadow-kali-panel">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
                Recently watched
              </h2>
              <button
                type="button"
                onClick={handleClearHistory}
                className="text-xs font-semibold text-kali-control transition hover:text-kali-control/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:opacity-40"
                disabled={!history.length}
                data-testid="youtube-history-clear"
              >
                Clear history
              </button>
            </div>
            <div
              ref={historyContainerRef}
              className="mt-4 max-h-80 overflow-y-auto pr-1"
              data-testid="recently-watched"
            >
              {history.length ? (
                <ul
                  className="relative"
                  style={{ height: `${historyVirtualizer.getTotalSize()}px` }}
                >
                  {historyVirtualizer.getVirtualItems().map((virtualItem) => {
                    const video = history[virtualItem.index];
                    return (
                      <li
                        key={video.id}
                        className="absolute left-0 right-0 pb-3"
                        style={{
                          transform: `translateY(${virtualItem.start}px)`,
                          height: virtualItem.size,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectVideo(video)}
                          className="flex w-full items-center gap-3 rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] p-3 text-left shadow-[0_6px_16px_rgba(8,15,26,0.32)] transition-colors hover:border-kali-control hover:text-kali-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                          aria-label={`Watch ${video.title} again`}
                        >
                          {video.thumbnail ? (
                            <img
                              src={video.thumbnail}
                              alt=""
                              className="h-12 w-20 rounded object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-20 items-center justify-center rounded bg-[var(--kali-panel-highlight)] text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                              No preview
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-2">
                              {video.title}
                            </p>
                            <p className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                              {video.channelTitle}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                  Your history is empty. Watch a video to add it here.
                </p>
              )}
            </div>
          </div>
        </aside>
      </main>

      <section className="border-t border-[color:color-mix(in_srgb,var(--kali-panel-border)_65%,transparent)] bg-[var(--color-surface)] px-6 py-6 shadow-[0_-1px_0_rgba(15,148,210,0.08)]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
            Search results
          </h2>
          {loading && (
            <span className="flex items-center gap-2 text-xs text-kali-control">
              <span className="h-2 w-2 animate-pulse rounded-full bg-kali-control" aria-hidden />
              Loading results…
            </span>
          )}
        </div>
        <Suspense
          fallback={
            <ResultsSkeleton
              count={12}
              reducedMotion={prefersReducedMotion}
              palette={skeletonPalette}
            />
          }
        >
          <ResultsGrid
            resource={resultsResource}
            loading={loading}
            selectedVideoId={selectedVideo?.id ?? null}
            onSelect={handleSelectVideo}
          />
        </Suspense>
      </section>
    </div>
  );
}

type SkeletonPalette = {
  tile: string;
  bar: string;
  shimmer: string;
};

function ResultsSkeleton({
  count,
  reducedMotion,
  palette,
}: {
  count: number;
  reducedMotion: boolean;
  palette: SkeletonPalette;
}) {
  return (
    <div
      className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="status"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={`flex h-full flex-col overflow-hidden rounded-lg border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] shadow-[0_8px_22px_rgba(8,15,26,0.3)] ${
            reducedMotion ? '' : 'transition-opacity duration-500 ease-out'
          }`}
          style={{
            opacity: reducedMotion ? 1 : 0.85,
            willChange: reducedMotion ? undefined : 'opacity',
          }}
          data-testid="youtube-result-skeleton"
        >
          <div
            className={`h-40 w-full ${reducedMotion ? '' : 'animate-pulse'}`}
            style={{
              background: `linear-gradient(135deg, ${palette.tile} 0%, ${palette.shimmer} 50%, ${palette.tile} 100%)`,
            }}
          />
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div
              className={`${reducedMotion ? '' : 'animate-pulse'} h-4 w-3/4 rounded`}
              style={{ background: palette.bar, opacity: 0.75 }}
            />
            <div
              className={`${reducedMotion ? '' : 'animate-pulse'} h-3 w-1/2 rounded`}
              style={{ background: palette.bar, opacity: 0.65 }}
            />
            <div
              className={`${reducedMotion ? '' : 'animate-pulse'} h-3 w-full rounded`}
              style={{ background: palette.bar, opacity: 0.55 }}
            />
            <div
              className={`${reducedMotion ? '' : 'animate-pulse'} mt-auto h-3 w-1/3 rounded`}
              style={{ background: palette.bar, opacity: 0.5 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ResultsGrid({
  resource,
  loading,
  selectedVideoId,
  onSelect,
}: {
  resource: Promise<VideoResult[]>;
  loading: boolean;
  selectedVideoId: string | null;
  onSelect: (video: VideoResult) => void;
}) {
  const videos = use(resource);

  if (!videos.length) {
    return (
      <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
        {loading
          ? 'Fetching results…'
          : 'No matches yet. Try a different search term or clear the search box to see featured videos.'}
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {videos.map((video) => {
        const isActive = selectedVideoId === video.id;
        return (
          <button
            key={video.id}
            type="button"
            onClick={() => onSelect(video)}
            className={`flex h-full flex-col overflow-hidden rounded-lg border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] text-left shadow-[0_8px_22px_rgba(8,15,26,0.4)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] hover:border-kali-control ${
              isActive
                ? 'border-kali-control shadow-[0_10px_30px_rgba(15,148,210,0.28)]'
                : 'hover:shadow-[0_10px_35px_rgba(2,6,23,0.45)]'
            }`}
            aria-label={`Watch ${video.title}`}
            data-testid="youtube-result-card"
            data-video-id={video.id}
          >
            {video.thumbnail ? (
              <img src={video.thumbnail} alt="" className="h-40 w-full object-cover" />
            ) : (
              <div className="flex h-40 w-full items-center justify-center bg-[var(--kali-panel-highlight)] text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                No preview available
              </div>
            )}
            <div className="flex flex-1 flex-col gap-2 p-4">
              <h3 className="text-base font-semibold text-[var(--color-text)] line-clamp-2">
                {video.title}
              </h3>
              <p className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                {video.channelTitle}
              </p>
              <p className="line-clamp-3 text-xs text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)]">
                {video.description || 'No description available.'}
              </p>
              <p className="mt-auto text-[11px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                {formatDate(video.publishedAt)}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
