'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EmbedFrame from '../../EmbedFrame';
import type {
  YouTubeChannelSection,
  YouTubeChannelSummary,
  YouTubePlaylistSummary,
  YouTubePlaylistVideo,
} from '../../../utils/youtube';
import {
  fetchYouTubeChannelSections,
  fetchYouTubeChannelSummary,
  fetchYouTubePlaylistItems,
  fetchYouTubePlaylistsByIds,
  parseYouTubeChannelId,
} from '../../../utils/youtube';

const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

type PlaylistListing = {
  sectionId: string;
  sectionTitle: string;
  playlists: YouTubePlaylistSummary[];
};

type PlaylistItemsState = {
  items: YouTubePlaylistVideo[];
  nextPageToken?: string;
  loading: boolean;
  error?: string;
};

interface Props {
  channelId?: string;
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

function playlistUrl(playlistId: string) {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

function channelUrl(channelId: string) {
  return `https://www.youtube.com/channel/${channelId}`;
}

function videoUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export default function YouTubeApp({ channelId }: Props) {
  const parsedChannelId = useMemo(() => {
    const envChannel = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
    return (
      parseYouTubeChannelId(channelId ?? '') ??
      (envChannel ? parseYouTubeChannelId(envChannel) : null)
    );
  }, [channelId]);

  const hasApiKey = Boolean(YOUTUBE_API_KEY);

  const [channelSummary, setChannelSummary] = useState<YouTubeChannelSummary | null>(
    null,
  );
  const [directory, setDirectory] = useState<PlaylistListing[]>([]);
  const [allSections, setAllSections] = useState<YouTubeChannelSection[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState<Map<string, YouTubePlaylistSummary>>(
    () => new Map(),
  );
  const [playlistItems, setPlaylistItems] = useState<Record<string, PlaylistItemsState>>(
    {},
  );

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortDirectoryRef = useRef<AbortController | null>(null);
  const abortPlaylistRef = useRef<AbortController | null>(null);

  const loadDirectory = useCallback(async () => {
    if (!hasApiKey) {
      setError(
        'Set NEXT_PUBLIC_YOUTUBE_API_KEY to load your playlists from the YouTube Data API.',
      );
      setLoadingDirectory(false);
      return;
    }
    if (!parsedChannelId) {
      setError('Missing or invalid YouTube channel id.');
      setLoadingDirectory(false);
      return;
    }

    setLoadingDirectory(true);
    setError(null);
    abortDirectoryRef.current?.abort();
    const controller = new AbortController();
    abortDirectoryRef.current = controller;

    try {
      const [summary, sections] = await Promise.all([
        fetchYouTubeChannelSummary(parsedChannelId, YOUTUBE_API_KEY ?? '', controller.signal),
        fetchYouTubeChannelSections(parsedChannelId, YOUTUBE_API_KEY ?? '', controller.signal),
      ]);

      setChannelSummary(summary);
      setAllSections(sections);

      const playlistIds = sections.flatMap((s) => s.playlistIds);
      const playlists = await fetchYouTubePlaylistsByIds(
        playlistIds,
        YOUTUBE_API_KEY ?? '',
        controller.signal,
      );

      const map = new Map<string, YouTubePlaylistSummary>(
        playlists.map((p) => [p.id, p]),
      );
      setPlaylistIndex(map);

      const listings: PlaylistListing[] = sections
        .map((section) => ({
          sectionId: section.id,
          sectionTitle: section.title,
          playlists: section.playlistIds
            .map((id) => map.get(id))
            .filter(Boolean) as YouTubePlaylistSummary[],
        }))
        .filter((entry) => entry.playlists.length > 0);

      setDirectory(listings);

      // Auto-select first playlist if nothing selected
      const firstPlaylist = listings[0]?.playlists[0]?.id;
      setSelectedPlaylistId((prev) => prev ?? firstPlaylist ?? null);
    } catch (err: unknown) {
      const e = err as Error;
      if (e.name === 'AbortError') return;
      console.error('YouTube directory load failed', e);
      setError(e.message || 'Failed to load YouTube playlists.');
    } finally {
      setLoadingDirectory(false);
      abortDirectoryRef.current = null;
    }
  }, [hasApiKey, parsedChannelId]);

  useEffect(() => {
    void loadDirectory();
    return () => {
      abortDirectoryRef.current?.abort();
      abortPlaylistRef.current?.abort();
    };
  }, [loadDirectory]);

  const loadPlaylistItems = useCallback(
    async (playlistId: string, mode: 'replace' | 'append') => {
      if (!hasApiKey || !playlistId) return;

      setPlaylistItems((prev) => ({
        ...prev,
        [playlistId]: {
          items: prev[playlistId]?.items ?? [],
          nextPageToken: prev[playlistId]?.nextPageToken,
          loading: true,
          error: undefined,
        },
      }));

      abortPlaylistRef.current?.abort();
      const controller = new AbortController();
      abortPlaylistRef.current = controller;

      try {
        const previous = playlistItems[playlistId];
        const pageToken = mode === 'append' ? previous?.nextPageToken : undefined;
        const response = await fetchYouTubePlaylistItems(playlistId, YOUTUBE_API_KEY ?? '', {
          pageToken,
          maxResults: 50,
          signal: controller.signal,
        });

        setPlaylistItems((prev) => {
          const existing = prev[playlistId]?.items ?? [];
          const merged = mode === 'append' ? [...existing, ...response.items] : response.items;
          return {
            ...prev,
            [playlistId]: {
              items: merged,
              nextPageToken: response.nextPageToken,
              loading: false,
              error: undefined,
            },
          };
        });

        // Auto-select first video if selection not set or selection not in list
        setSelectedVideoId((prev) => {
          const candidate = response.items[0]?.videoId;
          if (!candidate) return prev;
          if (!prev || mode === 'replace') return prev ?? candidate;
          return prev;
        });
      } catch (err: unknown) {
        const e = err as Error;
        if (e.name === 'AbortError') return;
        console.error('YouTube playlist items load failed', e);
        setPlaylistItems((prev) => ({
          ...prev,
          [playlistId]: {
            items: prev[playlistId]?.items ?? [],
            nextPageToken: prev[playlistId]?.nextPageToken,
            loading: false,
            error: e.message || 'Failed to load playlist videos.',
          },
        }));
      } finally {
        abortPlaylistRef.current = null;
      }
    },
    [hasApiKey, playlistItems],
  );

  useEffect(() => {
    if (!selectedPlaylistId) return;
    const current = playlistItems[selectedPlaylistId];
    if (current?.items?.length) return;
    void loadPlaylistItems(selectedPlaylistId, 'replace');
  }, [selectedPlaylistId, playlistItems, loadPlaylistItems]);

  const filteredDirectory = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return directory;

    return directory
      .map((entry) => ({
        ...entry,
        playlists: entry.playlists.filter((p) => p.title.toLowerCase().includes(term)),
      }))
      .filter((entry) => entry.playlists.length > 0);
  }, [directory, filter]);

  const selectedPlaylist = selectedPlaylistId
    ? playlistIndex.get(selectedPlaylistId) ?? null
    : null;

  const selectedPlaylistVideos = useMemo(() => {
    return selectedPlaylistId ? playlistItems[selectedPlaylistId]?.items ?? [] : [];
  }, [playlistItems, selectedPlaylistId]);

  const selectedVideo = useMemo(() => {
    if (!selectedVideoId) return null;
    return selectedPlaylistVideos.find((v) => v.videoId === selectedVideoId) ?? null;
  }, [selectedPlaylistVideos, selectedVideoId]);

  const playlistState = selectedPlaylistId ? playlistItems[selectedPlaylistId] : undefined;

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_top_left,_color-mix(in_srgb,var(--kali-blue)_18%,var(--color-bg))_0%,_var(--color-bg)_45%,_var(--color-dark)_100%)] text-[var(--color-text)]">
      <header className="border-b border-[var(--kali-panel-border)] bg-[var(--color-overlay-strong)] px-6 py-6 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {channelSummary?.thumbnail ? (
              <img
                src={channelSummary.thumbnail}
                alt=""
                className="h-12 w-12 rounded-lg border border-[var(--kali-panel-border)] object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-lg border border-[var(--kali-panel-border)] bg-[var(--kali-panel-highlight)]" />
            )}
            <div>
              <h1 className="text-2xl font-semibold">YouTube Playlists</h1>
              <p className="mt-1 text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                {channelSummary?.title
                  ? `Directory for ${channelSummary.title}`
                  : 'A directory of playlists, grouped by your channel categories.'}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {parsedChannelId && (
              <a
                href={channelUrl(parsedChannelId)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--color-text)_78%,transparent)] transition hover:border-kali-control hover:text-kali-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
              >
                Open channel
              </a>
            )}
            <button
              type="button"
              onClick={() => void loadDirectory()}
              className="rounded-md border border-[var(--kali-panel-border)] bg-kali-control px-4 py-2 text-xs font-semibold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.08)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loadingDirectory}
            >
              {loadingDirectory ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <label className="sr-only" htmlFor="youtube-playlist-filter">
              Filter playlists
            </label>
            <input
              id="youtube-playlist-filter"
              aria-label="Filter playlists"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter playlists…"
              className="w-full rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[color:var(--color-text)] placeholder:text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)] focus:border-[var(--color-focus-ring)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus-ring)]"
            />
          </div>
          <div className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
            {loadingDirectory
              ? 'Loading directory…'
              : `${filteredDirectory.reduce((sum, group) => sum + group.playlists.length, 0)} playlists in ${filteredDirectory.length} categories`}
          </div>
        </div>

        {!hasApiKey && (
          <p className="mt-3 text-sm text-amber-200/90" role="status">
            Configure{' '}
            <code className="rounded bg-[var(--kali-panel-highlight)] px-1">
              NEXT_PUBLIC_YOUTUBE_API_KEY
            </code>{' '}
            to load playlists from YouTube.
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-6 px-6 py-6 lg:flex-row">
        <aside className="lg:w-[420px]">
          <div className="rounded-lg border border-[var(--kali-panel-border)] bg-[var(--color-surface)] p-4 shadow-kali-panel">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
              Categories
            </h2>

            {loadingDirectory && !filteredDirectory.length ? (
              <div className="mt-4 rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                Loading playlists…
              </div>
            ) : filteredDirectory.length ? (
              <div className="mt-4 space-y-4">
                {filteredDirectory.map((group) => (
                  <div key={group.sectionId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-[var(--color-text)]">
                        {group.sectionTitle}
                      </h3>
                      <span className="text-[11px] text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                        {group.playlists.length}
                      </span>
                    </div>
                    <ul className="space-y-2" aria-label={`${group.sectionTitle} playlists`}>
                      {group.playlists.map((playlist) => {
                        const active = playlist.id === selectedPlaylistId;
                        return (
                          <li key={playlist.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPlaylistId(playlist.id);
                                setSelectedVideoId(null);
                              }}
                              className={`flex w-full items-center gap-3 rounded-md border bg-[var(--color-surface-muted)] p-3 text-left shadow-[0_6px_16px_rgba(8,15,26,0.32)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
                                active
                                  ? 'border-kali-control text-kali-control'
                                  : 'border-[var(--kali-panel-border)] hover:border-kali-control hover:text-kali-control'
                              }`}
                              aria-label={`Open playlist ${playlist.title}`}
                            >
                              {playlist.thumbnail ? (
                                <img
                                  src={playlist.thumbnail}
                                  alt=""
                                  className="h-12 w-20 rounded object-cover"
                                />
                              ) : (
                                <div className="flex h-12 w-20 items-center justify-center rounded bg-[var(--kali-panel-highlight)] text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                                  No preview
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-2">
                                  {playlist.title}
                                </p>
                                <p className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                                  {playlist.itemCount} videos
                                  {playlist.privacyStatus !== 'public'
                                    ? ` • ${playlist.privacyStatus}`
                                    : ''}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] p-4 text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                {hasApiKey && parsedChannelId
                  ? 'No playlists found yet. Check your channel sections or adjust your filter.'
                  : 'Enter a valid channel id and configure the YouTube API key to load playlists.'}
              </div>
            )}
          </div>
        </aside>

        <section className="flex-1 space-y-6">
          <div className="rounded-lg border border-[var(--kali-panel-border)] bg-[var(--color-surface)] p-5 shadow-kali-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
                  Playlist
                </h2>
                <h3 className="mt-2 text-xl font-semibold text-[var(--color-text)]">
                  {selectedPlaylist?.title ?? 'Select a playlist'}
                </h3>
                {selectedPlaylist?.publishedAt && (
                  <p className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                    Published {formatDate(selectedPlaylist.publishedAt)} •{' '}
                    {selectedPlaylist.itemCount} videos
                  </p>
                )}
              </div>
              {selectedPlaylist && (
                <a
                  href={playlistUrl(selectedPlaylist.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] px-4 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--color-text)_78%,transparent)] transition hover:border-kali-control hover:text-kali-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                >
                  Open playlist
                </a>
              )}
            </div>

            {selectedPlaylist?.description ? (
              <p className="mt-4 text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_72%,transparent)]">
                {selectedPlaylist.description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <div className="rounded-lg border border-[var(--kali-panel-border)] bg-[var(--color-surface)] p-5 shadow-kali-panel">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
                  Watch
                </h2>
                <div className="mt-3 aspect-video overflow-hidden rounded-lg bg-[var(--kali-panel-highlight)]">
                  {selectedVideo ? (
                    <EmbedFrame
                      key={selectedVideo.videoId}
                      title={`YouTube player for ${selectedVideo.title}`}
                      src={`https://www.youtube-nocookie.com/embed/${selectedVideo.videoId}`}
                      className="h-full w-full border-0"
                      containerClassName="relative h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      fallbackLabel="Open on YouTube"
                      openInNewTabLabel="Open on YouTube"
                      loadingLabel="Loading YouTube player…"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                      Choose a video from the playlist.
                    </div>
                  )}
                </div>

                {selectedVideo && (
                  <div className="mt-4 space-y-2 text-sm text-[color:color-mix(in_srgb,var(--color-text)_70%,transparent)]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">
                        {selectedVideo.title}
                      </h3>
                      <a
                        href={videoUrl(selectedVideo.videoId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs font-semibold text-[color:color-mix(in_srgb,var(--color-text)_78%,transparent)] transition hover:border-kali-control hover:text-kali-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                      >
                        Open video
                      </a>
                    </div>
                    <p className="text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                      Published {formatDate(selectedVideo.publishedAt)}
                    </p>
                    {selectedVideo.description ? (
                      <p className="text-sm leading-relaxed text-[color:color-mix(in_srgb,var(--color-text)_72%,transparent)]">
                        {selectedVideo.description}
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="rounded-lg border border-[var(--kali-panel-border)] bg-[var(--color-surface)] p-5 shadow-kali-panel">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-text)_60%,transparent)]">
                    Videos
                  </h2>
                  {playlistState?.loading && (
                    <span className="flex items-center gap-2 text-xs text-kali-control">
                      <span
                        className="h-2 w-2 animate-pulse rounded-full bg-kali-control"
                        aria-hidden
                      />
                      Loading…
                    </span>
                  )}
                </div>

                {!selectedPlaylistId ? (
                  <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                    Select a playlist to see videos.
                  </p>
                ) : playlistState?.error ? (
                  <div className="rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] p-4">
                    <p className="text-sm text-red-400" role="alert">
                      {playlistState.error}
                    </p>
                    <button
                      type="button"
                      onClick={() => void loadPlaylistItems(selectedPlaylistId, 'replace')}
                      className="mt-3 rounded-md border border-[var(--kali-panel-border)] bg-kali-control px-4 py-2 text-xs font-semibold text-black transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                    >
                      Retry
                    </button>
                  </div>
                ) : selectedPlaylistVideos.length ? (
                  <>
                    <ul className="space-y-2" aria-label="Playlist videos">
                      {selectedPlaylistVideos.map((video) => {
                        const active = video.videoId === selectedVideoId;
                        return (
                          <li key={video.videoId}>
                            <button
                              type="button"
                              onClick={() => setSelectedVideoId(video.videoId)}
                              className={`flex w-full items-start gap-3 rounded-md border bg-[var(--color-surface-muted)] p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] ${
                                active
                                  ? 'border-kali-control text-kali-control'
                                  : 'border-[var(--kali-panel-border)] hover:border-kali-control hover:text-kali-control'
                              }`}
                              aria-label={`Watch ${video.title}`}
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
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-2">
                                  {video.title}
                                </p>
                                <p className="mt-1 text-xs text-[color:color-mix(in_srgb,var(--color-text)_55%,transparent)]">
                                  {formatDate(video.publishedAt)}
                                </p>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>

                    {playlistState?.nextPageToken && (
                      <button
                        type="button"
                        onClick={() => void loadPlaylistItems(selectedPlaylistId, 'append')}
                        className="mt-4 w-full rounded-md border border-[var(--kali-panel-border)] bg-[var(--color-surface-muted)] px-4 py-3 text-xs font-semibold text-[color:color-mix(in_srgb,var(--color-text)_78%,transparent)] transition hover:border-kali-control hover:text-kali-control focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)] disabled:opacity-50"
                        disabled={playlistState.loading}
                      >
                        {playlistState.loading ? 'Loading…' : 'Load more'}
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-[color:color-mix(in_srgb,var(--color-text)_65%,transparent)]">
                    {playlistState?.loading ? 'Loading videos…' : 'No videos found.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
