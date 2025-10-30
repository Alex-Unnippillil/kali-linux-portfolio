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
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,var(--kali-blue)_18%,var(--color-bg))_0%,_var(--color-bg)_45%,_var(--color-dark)_100%)] text-[var(--color-text)]">
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

      <div
        className="flex flex-1 min-h-0 flex-col overflow-y-auto"
        data-testid="youtube-scroll-region"
      >
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
                  ))
                ) : (
                  <li className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                    Your history is empty. Watch a video to add it here.
                  </li>
                )}
              </ul>
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
          {results.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {results.map((video) => {
                const isActive = selectedVideo?.id === video.id;
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => handleSelectVideo(video)}
                    className={`flex h-full flex-col overflow-hidden rounded-lg border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] text-left shadow-[0_8px_22px_rgba(8,15,26,0.4)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] hover:border-kali-control ${
                      isActive
                        ? 'border-kali-control shadow-[0_10px_30px_rgba(15,148,210,0.28)]'
                        : 'hover:shadow-[0_10px_35px_rgba(2,6,23,0.45)]'
                    }`}
                    aria-label={`Watch ${video.title}`}
                  >
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt=""
                        className="h-40 w-full object-cover"
                      />
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
          ) : (
            <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
              {loading
                ? 'Fetching results…'
                : 'No matches yet. Try a different search term or clear the search box to see featured videos.'}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
