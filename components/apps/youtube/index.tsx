'use client';

import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import InlineExamples, {
  InlineExample,
  InlineExampleSet,
} from '../../common/InlineExamples';
import { useFieldHighlights } from '../../../hooks/useFieldHighlights';

interface Playlist {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  channelTitle?: string;
  channelName?: string;
  channelId?: string;
  itemCount?: number;
  updatedAt?: string;
}

interface Props {
  initialResults?: Playlist[];
}

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

const getTitleForSort = (value?: string) => value ?? '';

const SORT_OPTIONS = [
  {
    id: 'title-asc' as const,
    label: 'Title A → Z',
    compare: (a: Playlist, b: Playlist) =>
      getTitleForSort(a.title).localeCompare(getTitleForSort(b.title), undefined, {
        sensitivity: 'base',
      }),
  },
  {
    id: 'title-desc' as const,
    label: 'Title Z → A',
    compare: (a: Playlist, b: Playlist) =>
      getTitleForSort(b.title).localeCompare(getTitleForSort(a.title), undefined, {
        sensitivity: 'base',
      }),
  },
  {
    id: 'updated-desc' as const,
    label: 'Recently Updated',
    compare: (a: Playlist, b: Playlist) =>
      new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime(),
  },
  {
    id: 'size-desc' as const,
    label: 'Largest First',
    compare: (a: Playlist, b: Playlist) => (b.itemCount ?? 0) - (a.itemCount ?? 0),
  },
];

type SortId = (typeof SORT_OPTIONS)[number]['id'];
type LayoutId = 'grid' | 'channel-groups';

const SEARCH_EXAMPLE_SETS: InlineExampleSet[] = [
  {
    id: 'discoverability',
    title: 'Explore discovery angles',
    description:
      'Try a curated search with layout and sorting tuned for quick scanning across channels.',
    examples: [
      {
        id: 'incident-playbooks',
        label: 'Incident response playbooks',
        description:
          'Great when you want playlists that walk through blue team drills and tabletop exercises.',
        metadata: 'Sort: Recently updated · Layout: Channel groups',
        values: {
          query: 'incident response tabletop playlist',
          sortId: 'updated-desc',
          layout: 'channel-groups',
          selectedChannel: 'all',
        },
      },
      {
        id: 'purple-team',
        label: 'Purple team labs',
        description:
          'Highlights deep dives that blend offensive perspective with defensive instrumentation.',
        metadata: 'Sort: Largest first',
        values: {
          query: 'purple team simulation walkthrough',
          sortId: 'size-desc',
          layout: 'grid',
          selectedChannel: 'all',
        },
      },
    ],
  },
  {
    id: 'learning-tracks',
    title: 'Skill tracks',
    description:
      'Jump straight into playlists that help you level up in a specific focus area.',
    examples: [
      {
        id: 'malware-analyst',
        label: 'Malware analyst starter set',
        metadata: 'Sort: Title A → Z',
        values: {
          query: 'malware analysis lab playlist',
          sortId: 'title-asc',
          layout: 'grid',
          selectedChannel: 'all',
        },
      },
      {
        id: 'cloud-detection',
        label: 'Cloud detection engineering',
        description: 'Focus on AWS and Azure attack detection workflows.',
        metadata: 'Layout: Channel groups',
        values: {
          query: 'cloud detection engineering workshop',
          layout: 'channel-groups',
          selectedChannel: 'all',
        },
      },
    ],
  },
];

type FetchResult = {
  items: Playlist[];
  nextPageToken: string | null;
};

type YouTubeSearchResponse = {
  items?: Array<{
    id?: { playlistId?: string };
  }>;
  nextPageToken?: string;
  error?: { message?: string };
};

type YouTubePlaylistResponse = {
  items?: Array<{
    id: string;
    snippet?: {
      title?: string;
      description?: string;
      publishedAt?: string;
      channelTitle?: string;
      channelId?: string;
      thumbnails?: {
        maxres?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
    contentDetails?: {
      itemCount?: number;
    };
  }>;
  error?: { message?: string };
};

type PipedItem = {
  type?: string;
  playlistId?: string;
  id?: string;
  url?: string;
  title?: string;
  name?: string;
  description?: string;
  thumbnail?: string;
  thumbnails?: Array<{ url?: string }>;
  thumbnailUrl?: string;
  uploaderName?: string;
  channelName?: string;
  uploaderUrl?: string;
  channelUrl?: string;
  videos?: number;
  videoCount?: number;
  uploaded?: string;
  updated?: string;
};

function normalizePlaylist(playlist: Playlist): Playlist {
  const channelDisplay = playlist.channelTitle ?? playlist.channelName ?? 'Unknown channel';
  const channelIdentifier = playlist.channelId ?? playlist.channelName ?? channelDisplay;

  return {
    ...playlist,
    title: playlist.title || 'Untitled playlist',
    description: playlist.description ?? '',
    thumbnail: playlist.thumbnail ?? '',
    channelTitle: channelDisplay,
    channelId: channelIdentifier,
    itemCount: playlist.itemCount ?? 0,
    updatedAt: playlist.updatedAt ?? new Date().toISOString(),
  };
}

async function fetchPlaylistsFromYouTube(
  query: string,
  pageToken?: string,
): Promise<FetchResult> {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('key', YOUTUBE_API_KEY ?? '');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'playlist');
  searchUrl.searchParams.set('maxResults', '25');
  searchUrl.searchParams.set('q', query);
  if (pageToken) searchUrl.searchParams.set('pageToken', pageToken);

  const res = await fetch(searchUrl.toString());
  const data = (await res.json()) as YouTubeSearchResponse;
  if (!res.ok) {
    throw new Error(data.error?.message || 'YouTube search failed');
  }

  const ids = (data.items ?? [])
    .map((item) => item.id?.playlistId)
    .filter((id): id is string => Boolean(id));

  if (!ids.length) {
    return { items: [], nextPageToken: data.nextPageToken ?? null };
  }

  const detailsUrl = new URL('https://www.googleapis.com/youtube/v3/playlists');
  detailsUrl.searchParams.set('key', YOUTUBE_API_KEY ?? '');
  detailsUrl.searchParams.set('part', 'snippet,contentDetails');
  detailsUrl.searchParams.set('id', ids.join(','));

  const detailsRes = await fetch(detailsUrl.toString());
  const details = (await detailsRes.json()) as YouTubePlaylistResponse;
  if (!detailsRes.ok) {
    throw new Error(details.error?.message || 'Failed to load playlist details');
  }

  const items: Playlist[] = (details.items ?? [])
    .map((item) => ({
      id: item.id,
      title: item.snippet?.title ?? 'Untitled playlist',
      description: item.snippet?.description ?? '',
    thumbnail:
      item.snippet?.thumbnails?.maxres?.url ||
      item.snippet?.thumbnails?.medium?.url ||
      item.snippet?.thumbnails?.default?.url ||
      '',
    channelTitle: item.snippet?.channelTitle ?? 'Unknown channel',
    channelId: item.snippet?.channelId ?? '',
    itemCount: item.contentDetails?.itemCount ?? 0,
    updatedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
  }))
    .map(normalizePlaylist);

  return {
    items,
    nextPageToken: data.nextPageToken ?? null,
  };
}

async function fetchPlaylistsFromPiped(query: string): Promise<FetchResult> {
  const url = `https://piped.video/api/v1/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) {
    const message = typeof data?.error === 'string' ? data.error : 'Piped search failed';
    throw new Error(message);
  }

  const rawItems: PipedItem[] = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data)
    ? data
    : [];

  const items: Playlist[] = rawItems
    .filter((item) =>
      item?.type ? item.type === 'playlist' : Boolean(item?.playlistId || item?.url),
    )
    .map((item) => ({
      id:
        item?.playlistId ||
        item?.id ||
        item?.url?.split('list=')[1] ||
        `piped-${item?.url ?? Math.random()}`,
      title: item?.title || item?.name || 'Untitled playlist',
      description: item?.description || '',
      thumbnail:
        item?.thumbnail ||
        item?.thumbnails?.[0]?.url ||
        item?.thumbnailUrl ||
        '',
      channelTitle: item?.uploaderName || item?.channelName || 'Unknown channel',
      channelId:
        item?.uploaderUrl?.split('/')?.pop() ||
        item?.channelUrl?.split('/')?.pop() ||
        '',
      itemCount: item?.videos || item?.videoCount || 0,
      updatedAt: item?.uploaded || item?.updated || new Date().toISOString(),
    }))
    .map(normalizePlaylist);

  return { items, nextPageToken: null };
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

function getChannelDisplay(playlist: Playlist) {
  return playlist.channelTitle ?? playlist.channelName ?? 'Unknown channel';
}

function getChannelId(playlist: Playlist) {
  return playlist.channelId ?? playlist.channelName ?? getChannelDisplay(playlist);
}

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  const title = playlist.title || 'Untitled playlist';

  return (
    <article className="group flex flex-col overflow-hidden rounded-lg border border-white/10 bg-black/30 shadow-lg transition hover:-translate-y-1 hover:border-ubt-green/70 hover:shadow-2xl">
      <div className="relative">
        {playlist.thumbnail ? (
          <img
            src={playlist.thumbnail}
            alt={`Thumbnail for ${title}`}
            className="h-40 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center bg-ub-cool-grey text-sm text-ubt-grey">
            No preview
          </div>
        )}
        <span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-0.5 text-xs text-white">
          {playlist.itemCount ?? 0} videos
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-ubt-grey">
            by <span className="text-ubt-green">{getChannelDisplay(playlist)}</span>
          </p>
        </div>
        {playlist.description && (
          <p className="line-clamp-3 text-sm text-ubt-cool-grey/80">
            {playlist.description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between text-xs text-ubt-grey">
          <span>Updated {formatDate(playlist.updatedAt)}</span>
          <a
            href={`https://www.youtube.com/playlist?list=${playlist.id}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-ubt-green/10 px-3 py-1 font-semibold text-ubt-green transition hover:bg-ubt-green/20"
          >
            Open playlist
          </a>
        </div>
      </div>
    </article>
  );
}

export default function YouTubeApp({ initialResults = [] }: Props) {
  const searchInputId = useId();
  const [query, setQuery] = useState('');
  const normalizedInitial = useMemo(
    () => initialResults.map(normalizePlaylist),
    [initialResults],
  );
  const [playlists, setPlaylists] = useState<Playlist[]>(normalizedInitial);
  const [sortId, setSortId] = useState<SortId>('updated-desc');
  const [layout, setLayout] = useState<LayoutId>('grid');
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState<string>('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const { isHighlighted: isSearchHighlighted, triggerHighlight } = useFieldHighlights();

  useEffect(() => {
    setPlaylists(normalizedInitial);
  }, [normalizedInitial]);

  const channels = useMemo(() => {
    const map = new Map<string, { id: string; title: string; count: number }>();
    playlists.forEach((playlist) => {
      const id = getChannelId(playlist);
      const title = getChannelDisplay(playlist);
      const current = map.get(id);
      if (current) {
        map.set(id, {
          ...current,
          count: current.count + 1,
        });
      } else {
        map.set(id, {
          id,
          title,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      getTitleForSort(a.title).localeCompare(getTitleForSort(b.title), undefined, {
        sensitivity: 'base',
      }),
    );
  }, [playlists]);

  const filterAndSort = useCallback(
    (items: Playlist[]): Playlist[] => {
      let filtered = selectedChannel === 'all'
        ? items
        : items.filter((item) => getChannelId(item) === selectedChannel);

      const option = SORT_OPTIONS.find((opt) => opt.id === sortId) ?? SORT_OPTIONS[0];
      filtered = [...filtered].sort(option.compare);
      return filtered;
    },
    [selectedChannel, sortId],
  );

  const organizedPlaylists = useMemo(() => filterAndSort(playlists), [filterAndSort, playlists]);

  const groupedByChannel = useMemo(() => {
    if (layout !== 'channel-groups') return [];
    const groups = new Map<string, { title: string; items: Playlist[] }>();
    organizedPlaylists.forEach((playlist) => {
      const id = getChannelId(playlist);
      const title = getChannelDisplay(playlist);
      const group = groups.get(id);
      if (group) {
        group.items.push(playlist);
      } else {
        groups.set(id, {
          title,
          items: [playlist],
        });
      }
    });
    return Array.from(groups.values());
  }, [layout, organizedPlaylists]);

  const handleSearch = useCallback(
    async (append = false, token?: string) => {
      const rawQuery = append ? lastQuery : query;
      const effectiveQuery = rawQuery.trim();
      if (!effectiveQuery) {
        if (!append) {
          setError('Enter a topic, creator, or vibe to explore playlists.');
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = YOUTUBE_API_KEY
          ? await fetchPlaylistsFromYouTube(effectiveQuery, token)
          : await fetchPlaylistsFromPiped(effectiveQuery);

        setPlaylists((prev) => {
          const merged = append ? [...prev, ...result.items] : result.items;
          const deduped = new Map<string, Playlist>();
          merged.forEach((item) => {
            if (!deduped.has(item.id)) {
              deduped.set(item.id, item);
            }
          });
          return Array.from(deduped.values());
        });
        setNextPageToken(result.nextPageToken ?? null);
        setLastQuery(effectiveQuery);
        if (!append) {
          setSelectedChannel('all');
        }
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message || 'Unable to load playlists right now. Please try again.'
            : 'Unable to load playlists right now. Please try again.',
        );
      } finally {
        setLoading(false);
      }
    },
    [query, lastQuery],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      void handleSearch(false);
    },
    [handleSearch],
  );

  const handleLoadMore = useCallback(() => {
    if (!nextPageToken) return;
    void handleSearch(true, nextPageToken);
  }, [handleSearch, nextPageToken]);

  const handleApplySearchExample = useCallback(
    (example: InlineExample) => {
      const values = example.values;
      const changed: string[] = [];
      if (typeof values.query === 'string' && values.query !== query) {
        setQuery(values.query);
        setError(null);
        changed.push('query');
      }
      if (typeof values.sortId === 'string' && values.sortId !== sortId) {
        setSortId(values.sortId as SortId);
      }
      if (typeof values.layout === 'string' && values.layout !== layout) {
        setLayout(values.layout as LayoutId);
      }
      if (typeof values.selectedChannel === 'string') {
        setSelectedChannel(values.selectedChannel);
      }
      if (changed.length) {
        triggerHighlight(changed);
      }
    },
    [layout, query, sortId, triggerHighlight],
  );

  return (
    <div className="flex h-full flex-col bg-gradient-to-br from-[#10151c] via-[#0f1f2d] to-[#111827] text-white">
      <header className="border-b border-white/10 bg-black/20 px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-semibold text-white">YouTube Playlists Explorer</h1>
        <p className="mt-2 max-w-3xl text-sm text-ubt-grey">
          Discover playlists from across YouTube, organise them by channel, size, or freshness, and jump right into the collections that inspire you.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor={searchInputId}>
            Search for playlists
          </label>
          <div className="flex-1">
            <input
              id={searchInputId}
              aria-label="Search for playlists"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Search for playlists by topic, creator, or mood…"
              className={`w-full rounded-md border bg-black/40 px-4 py-3 text-sm text-white placeholder:text-ubt-grey transition-shadow focus:border-ubt-green focus:outline-none focus:ring-2 focus:ring-ubt-green/40 ${
                isSearchHighlighted('query')
                  ? 'border-ubt-green/80 ring-2 ring-ubt-green/60 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]'
                  : 'border-white/10'
              }`}
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-ubt-green px-5 py-3 text-sm font-semibold text-black transition hover:bg-ubt-green/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            {loading && !nextPageToken ? 'Searching…' : 'Search'}
          </button>
        </form>
        {error && <p className="mt-3 text-sm text-red-400" role="alert">{error}</p>}
        {!YOUTUBE_API_KEY && (
          <p className="mt-3 text-xs text-ubt-grey">
            Tip: Add a <code className="rounded bg-black/50 px-1">NEXT_PUBLIC_YOUTUBE_API_KEY</code> environment variable for richer metadata and pagination.
          </p>
        )}
        <div className="mt-6">
          <InlineExamples
            sets={SEARCH_EXAMPLE_SETS}
            onApply={handleApplySearchExample}
            storageKeyPrefix="youtube:inline-examples"
            defaultCollapsed
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 sm:hidden">
          <button
            type="button"
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-medium text-ubt-grey transition hover:border-ubt-green hover:text-white"
            onClick={() => setShowMobileFilters((value) => !value)}
            aria-expanded={showMobileFilters}
          >
            {showMobileFilters ? 'Hide filters' : 'Show filters'}
          </button>
        </div>
        {showMobileFilters && (
          <div className="mt-4 grid gap-4 rounded-lg border border-white/10 bg-black/30 p-4 text-xs text-ubt-grey sm:hidden">
            <label className="flex flex-col gap-2">
              <span className="font-semibold uppercase tracking-wide">Sort</span>
              <select
                value={sortId}
                onChange={(event) => setSortId(event.target.value as SortId)}
                className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold uppercase tracking-wide">Layout</span>
              <select
                value={layout}
                onChange={(event) => setLayout(event.target.value as LayoutId)}
                className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="grid">Grid view</option>
                <option value="channel-groups">Group by channel</option>
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="font-semibold uppercase tracking-wide">Channel</span>
              <select
                value={selectedChannel}
                onChange={(event) => setSelectedChannel(event.target.value)}
                className="rounded-md border border-white/10 bg-black/40 px-3 py-2 text-sm text-white"
              >
                <option value="all">All channels</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.title} ({channel.count})
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-black/20 px-5 py-6 text-sm sm:flex">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ubt-grey">Sort by</h2>
            <div className="mt-3 space-y-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSortId(option.id)}
                  className={`w-full rounded-md px-3 py-2 text-left transition ${
                    sortId === option.id
                      ? 'bg-ubt-green/20 text-ubt-green'
                      : 'bg-white/5 text-ubt-cool-grey hover:bg-white/10'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ubt-grey">Layout</h2>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setLayout('grid')}
                className={`w-full rounded-md px-3 py-2 text-left transition ${
                  layout === 'grid'
                    ? 'bg-ubt-green/20 text-ubt-green'
                    : 'bg-white/5 text-ubt-cool-grey hover:bg-white/10'
                }`}
              >
                Grid view
              </button>
              <button
                onClick={() => setLayout('channel-groups')}
                className={`w-full rounded-md px-3 py-2 text-left transition ${
                  layout === 'channel-groups'
                    ? 'bg-ubt-green/20 text-ubt-green'
                    : 'bg-white/5 text-ubt-cool-grey hover:bg-white/10'
                }`}
              >
                Group by channel
              </button>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ubt-grey">Filter by channel</h2>
            <div className="mt-3 space-y-2">
              <button
                onClick={() => setSelectedChannel('all')}
                className={`w-full rounded-md px-3 py-2 text-left transition ${
                  selectedChannel === 'all'
                    ? 'bg-ubt-green/20 text-ubt-green'
                    : 'bg-white/5 text-ubt-cool-grey hover:bg-white/10'
                }`}
              >
                All channels
              </button>
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel.id)}
                  className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition ${
                    selectedChannel === channel.id
                      ? 'bg-ubt-green/20 text-ubt-green'
                      : 'bg-white/5 text-ubt-cool-grey hover:bg-white/10'
                  }`}
                >
                  <span className="truncate">{channel.title}</span>
                  <span className="ml-2 rounded-full bg-black/30 px-2 text-xs">{channel.count}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto px-6 py-6">
          <section className="mb-6 flex flex-wrap items-center gap-3 text-xs text-ubt-grey">
            <span className="rounded-full bg-black/40 px-3 py-1">
              {organizedPlaylists.length} playlists
            </span>
            {selectedChannel !== 'all' && (
              <button
                onClick={() => setSelectedChannel('all')}
                className="rounded-full bg-white/10 px-3 py-1 font-medium text-white transition hover:bg-white/20"
              >
                Clear channel filter
              </button>
            )}
            {lastQuery && (
              <span className="rounded-full bg-white/5 px-3 py-1">Query: {lastQuery}</span>
            )}
            {loading && (
              <span className="flex items-center gap-2 rounded-full bg-ubt-green/10 px-3 py-1 text-ubt-green">
                <span className="h-2 w-2 animate-pulse rounded-full bg-ubt-green" aria-hidden />
                Loading playlists…
              </span>
            )}
          </section>

          {layout === 'grid' ? (
            organizedPlaylists.length ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {organizedPlaylists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            ) : (
              <p className="mt-20 text-center text-sm text-ubt-grey">
                {loading ? 'Fetching playlists…' : 'Search to explore playlists. Results will appear here.'}
              </p>
            )
          ) : groupedByChannel.length ? (
            <div className="space-y-8">
              {groupedByChannel.map((group) => (
                <div key={group.title}>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">{group.title}</h2>
                    <span className="rounded-full bg-black/30 px-3 py-1 text-xs text-ubt-grey">
                      {group.items.length} playlist{group.items.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.items.map((playlist) => (
                      <PlaylistCard key={playlist.id} playlist={playlist} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-20 text-center text-sm text-ubt-grey">
              {loading ? 'Fetching playlists…' : 'No playlists for this channel yet.'}
            </p>
          )}

          {nextPageToken && (
            <div className="mt-10 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="rounded-full border border-ubt-green/60 bg-black/30 px-6 py-2 text-sm font-medium text-ubt-green transition hover:bg-black/50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Loading…' : 'Load more playlists'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

