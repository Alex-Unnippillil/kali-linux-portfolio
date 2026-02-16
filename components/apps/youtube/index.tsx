'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import EmbedFrame from '../../EmbedFrame';
import { useSettings } from '../../../hooks/useSettings';
import type {
  YouTubeChannelSummary,
  YouTubePlaylistDirectory,
  YouTubePlaylistSummary,
  YouTubePlaylistVideo,
} from '../../../utils/youtube';
import {
  fetchYouTubeChannelSummary,
  fetchYouTubePlaylistItems,
  fetchYouTubePlaylistDirectoryByChannelId,
  parseYouTubeChannelId,
} from '../../../utils/youtube';
import styles from './youtube.module.css';

const YOUTUBE_CLIENT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const DEFAULT_CHANNEL_ID = 'UCxPIJ3hw6AOwomUWh5B7SfQ';
const ALL_PLAYLIST_ID = 'all-videos';
const VIDEO_SORT_OPTIONS = ['newest', 'oldest', 'title'] as const;
type VideoSortMode = (typeof VIDEO_SORT_OPTIONS)[number];

export type PlaylistListing = {
  sectionId: string;
  sectionTitle: string;
  playlists: YouTubePlaylistSummary[];
};

export type PlaylistItemsState = {
  items: YouTubePlaylistVideo[];
  nextPageToken?: string;
  loading: boolean;
  error?: string;
};

export function filterDirectoryBySearch(
  directory: PlaylistListing[],
  filter: string,
  playlistItems: Record<string, PlaylistItemsState>,
): PlaylistListing[] {
  const term = filter.trim().toLowerCase();
  if (!term) return directory;

  const matchesSearch = (playlist: YouTubePlaylistSummary) => {
    const haystack = `${playlist.title} ${playlist.description ?? ''}`.toLowerCase();
    if (haystack.includes(term)) return true;

    const items = playlistItems[playlist.id]?.items ?? [];
    return items.some((video) => {
      const videoHaystack = `${video.title} ${video.description ?? ''}`.toLowerCase();
      return videoHaystack.includes(term);
    });
  };

  return directory
    .map((entry) => ({
      ...entry,
      playlists: entry.playlists.filter(matchesSearch),
    }))
    .filter((entry) => entry.playlists.length > 0);
}

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

function sortVideosNewestFirst(videos: YouTubePlaylistVideo[]) {
  return [...videos].sort((a, b) => {
    const aTime = new Date(a.publishedAt ?? '').getTime();
    const bTime = new Date(b.publishedAt ?? '').getTime();
    const safeATime = Number.isNaN(aTime) ? 0 : aTime;
    const safeBTime = Number.isNaN(bTime) ? 0 : bTime;

    if (safeATime === safeBTime) return 0;
    return safeBTime - safeATime;
  });
}

export function sortPlaylistVideos(videos: YouTubePlaylistVideo[], mode: VideoSortMode) {
  if (mode === 'newest') return sortVideosNewestFirst(videos);
  if (mode === 'oldest') return sortVideosNewestFirst(videos).reverse();

  return [...videos].sort((a, b) => a.title.localeCompare(b.title));
}

export function filterPlaylistVideos(videos: YouTubePlaylistVideo[], filter: string) {
  const term = filter.trim().toLowerCase();
  if (!term) return videos;

  return videos.filter((video) => {
    const haystack = `${video.title} ${video.description ?? ''}`.toLowerCase();
    return haystack.includes(term);
  });
}

export default function YouTubeApp({ channelId }: Props) {
  const { allowNetwork, setAllowNetwork } = useSettings();
  const parsedChannelId = useMemo(() => {
    const envChannel = process.env.NEXT_PUBLIC_YOUTUBE_CHANNEL_ID;
    return (
      parseYouTubeChannelId(channelId ?? '') ??
      (envChannel ? parseYouTubeChannelId(envChannel) : null)
    );
  }, [channelId]);

  const resolvedChannelId = parsedChannelId ?? DEFAULT_CHANNEL_ID;
  const hasClientApiKey = Boolean(YOUTUBE_CLIENT_API_KEY);

  const [channelSummary, setChannelSummary] = useState<YouTubeChannelSummary | null>(
    null,
  );
  const [directory, setDirectory] = useState<PlaylistListing[]>([]);
  const [playlistIndex, setPlaylistIndex] = useState<Map<string, YouTubePlaylistSummary>>(
    () => new Map(),
  );
  const [playlistItems, setPlaylistItems] = useState<Record<string, PlaylistItemsState>>(
    {},
  );

  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [filter, setFilter] = useState('');
  const [videoFilter, setVideoFilter] = useState('');
  const [videoSortMode, setVideoSortMode] = useState<VideoSortMode>('newest');

  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingApiKeyHint, setMissingApiKeyHint] = useState(false);

  const abortDirectoryRef = useRef<AbortController | null>(null);
  const abortPlaylistRef = useRef<AbortController | null>(null);

  const loadDirectory = useCallback(async () => {
    const networkAllowed = allowNetwork || process.env.NODE_ENV === 'test';
    if (!allowNetwork) {
      setAllowNetwork(true);
      setError('Network requests were disabled. Enabling network to load YouTube playlists…');
      if (!networkAllowed) {
        setLoadingDirectory(false);
        return;
      }
    }
    if (!resolvedChannelId) {
      setError(
        'Missing or invalid YouTube channel id. Set NEXT_PUBLIC_YOUTUBE_CHANNEL_ID or pass channelId prop.',
      );
      setLoadingDirectory(false);
      return;
    }

    setLoadingDirectory(true);
    setError(null);
    setMissingApiKeyHint(false);
    abortDirectoryRef.current?.abort();
    const controller = new AbortController();
    abortDirectoryRef.current = controller;

    try {
      const [summary, playlistDirectory] = await (async () => {
        try {
          const response = await fetch(
            `/api/youtube/directory?channelId=${encodeURIComponent(resolvedChannelId)}`,
            { signal: controller.signal },
          );
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(
              body?.error ||
              `YouTube directory request failed (${response.status} ${response.statusText})`,
            );
          }
          const payload = (await response.json()) as {
            summary: YouTubeChannelSummary | null;
            directory: YouTubePlaylistDirectory;
          };
          return [payload.summary, payload.directory] as const;
        } catch (proxyError) {
          if (!hasClientApiKey) throw proxyError;
          return Promise.all([
            fetchYouTubeChannelSummary(resolvedChannelId, YOUTUBE_CLIENT_API_KEY ?? '', controller.signal),
            fetchYouTubePlaylistDirectoryByChannelId(
              resolvedChannelId,
              YOUTUBE_CLIENT_API_KEY ?? '',
              controller.signal,
            ),
          ]);
        }
      })();

      setChannelSummary(summary);
      const map = new Map<string, YouTubePlaylistSummary>(
        playlistDirectory.playlists.map((p) => [p.id, p]),
      );
      const aggregatedCount = playlistDirectory.playlists.reduce(
        (sum, playlist) => sum + (playlist.itemCount ?? 0),
        0,
      );
      const latestPublished = playlistDirectory.playlists.reduce<Date | null>(
        (latest, playlist) => {
          const current = new Date(playlist.publishedAt ?? '');
          if (Number.isNaN(current.getTime())) return latest;
          if (!latest) return current;
          return current > latest ? current : latest;
        },
        null,
      );
      const fallbackThumbnail = playlistDirectory.playlists.find((p) => p.thumbnail)?.thumbnail;

      const allVideosSummary: YouTubePlaylistSummary = {
        id: ALL_PLAYLIST_ID,
        title: 'All videos',
        description: 'Combined feed of every playlist video.',
        thumbnail: fallbackThumbnail ?? '',
        itemCount: aggregatedCount,
        publishedAt: latestPublished?.toISOString() ?? '',
        privacyStatus: 'public',
      };

      map.set(ALL_PLAYLIST_ID, allVideosSummary);
      setPlaylistIndex(map);

      const playlistListings: PlaylistListing[] = playlistDirectory.sections.length
        ? playlistDirectory.sections
        : playlistDirectory.playlists.length
          ? [{ sectionId: 'all', sectionTitle: 'Playlists', playlists: playlistDirectory.playlists }]
          : [];

      const listings: PlaylistListing[] = playlistListings.map((listing) =>
        listing.sectionId === 'all'
          ? {
            ...listing,
            playlists: [...listing.playlists, allVideosSummary],
          }
          : listing,
      );

      setDirectory(listings);
      setError(null);

      const defaultPlaylist = ALL_PLAYLIST_ID;
      const firstPlaylist = listings[0]?.playlists[0]?.id;
      setSelectedPlaylistId((prev) => prev ?? defaultPlaylist ?? firstPlaylist ?? null);
    } catch (directoryError: unknown) {
      const e = directoryError as Error;
      if (e.name === 'AbortError') return;
      console.error('YouTube directory load failed', e);
      if (e.message?.toLowerCase().includes('api key')) {
        setMissingApiKeyHint(true);
      }
      setError(
        e.message?.includes('Failed to fetch')
          ? 'Unable to reach the YouTube API. Check your network connection and API key.'
          : e.message || 'Failed to load YouTube playlists.',
      );
      return;
    } finally {
      setLoadingDirectory(false);
      abortDirectoryRef.current = null;
    }
  }, [allowNetwork, hasClientApiKey, resolvedChannelId, setAllowNetwork]);

  useEffect(() => {
    void loadDirectory();
    return () => {
      abortDirectoryRef.current?.abort();
      abortPlaylistRef.current?.abort();
    };
  }, [loadDirectory]);

  const loadPlaylistItems = useCallback(
    async (playlistId: string, mode: 'replace' | 'append') => {
      if (!playlistId) return;

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

        const fetchPlaylistPage = async (id: string) => {
          const response = await (async () => {
            try {
              const query = new URLSearchParams({
                playlistId: id,
                maxResults: '50',
              });
              if (pageToken) query.set('pageToken', pageToken);
              const resp = await fetch(`/api/youtube/playlist-items?${query.toString()}`, {
                signal: controller.signal,
              });
              if (!resp.ok) {
                const body = await resp.json().catch(() => ({}));
                throw new Error(
                  body?.error || `YouTube playlist request failed (${resp.status} ${resp.statusText})`,
                );
              }
              return (await resp.json()) as Awaited<ReturnType<typeof fetchYouTubePlaylistItems>>;
            } catch (proxyError) {
              if (!hasClientApiKey) throw proxyError;
              return fetchYouTubePlaylistItems(id, YOUTUBE_CLIENT_API_KEY ?? '', {
                pageToken,
                maxResults: 50,
                signal: controller.signal,
              });
            }
          })();

          return response;
        };

        if (playlistId === ALL_PLAYLIST_ID) {
          const availablePlaylists = Array.from(playlistIndex.keys()).filter(
            (id) => id !== ALL_PLAYLIST_ID,
          );
          if (!availablePlaylists.length) {
            throw new Error('No playlists available to build the combined feed.');
          }

          const results = await Promise.allSettled(
            availablePlaylists.map((id) => fetchPlaylistPage(id)),
          );
          const successfulItems = results
            .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof fetchPlaylistPage>>> =>
              result.status === 'fulfilled',
            )
            .flatMap((result) => result.value.items);

          if (!successfulItems.length) {
            const errorMessage = results.find((result) => result.status === 'rejected');
            throw new Error(
              errorMessage && 'reason' in errorMessage
                ? (errorMessage.reason as Error)?.message || 'Failed to load any playlist videos.'
                : 'Failed to load any playlist videos.',
            );
          }

          const merged = sortVideosNewestFirst(successfulItems);
          setPlaylistItems((prev) => ({
            ...prev,
            [playlistId]: {
              items: merged,
              nextPageToken: undefined,
              loading: false,
              error: undefined,
            },
          }));

          setSelectedVideoId((prev) => {
            const candidate = merged[0]?.videoId;
            if (!candidate) return prev;
            if (!prev || mode === 'replace') return prev ?? candidate;
            return prev;
          });

          return;
        }

        const response = await fetchPlaylistPage(playlistId);

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

        setSelectedVideoId((prev) => {
          const candidate = response.items[0]?.videoId;
          if (!candidate) return prev;
          if (!prev || mode === 'replace') return prev ?? candidate;
          return prev;
        });
      } catch (err: unknown) {
        const e = err as Error;
        if (e.name === 'AbortError') {
          setPlaylistItems((prev) => ({
            ...prev,
            [playlistId]: {
              items: prev[playlistId]?.items ?? [],
              nextPageToken: prev[playlistId]?.nextPageToken,
              loading: false,
              error: undefined,
            },
          }));
          return;
        }
        console.error('YouTube playlist items load failed', e);
        if (e.message?.toLowerCase().includes('api key')) {
          setMissingApiKeyHint(true);
        }
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
    [hasClientApiKey, playlistIndex, playlistItems],
  );

  useEffect(() => {
    if (!selectedPlaylistId) return;
    const current = playlistItems[selectedPlaylistId];
    if (current?.items?.length || current?.loading) return;
    void loadPlaylistItems(selectedPlaylistId, 'replace');
  }, [selectedPlaylistId, playlistItems, loadPlaylistItems]);

  const filteredDirectory = useMemo(
    () => filterDirectoryBySearch(directory, filter, playlistItems),
    [directory, filter, playlistItems],
  );

  useEffect(() => {
    if (!filteredDirectory.length) {
      setSelectedPlaylistId(null);
      setSelectedVideoId(null);
      return;
    }

    const selectedPlaylistStillVisible = selectedPlaylistId
      ? filteredDirectory.some((group) =>
        group.playlists.some((playlist) => playlist.id === selectedPlaylistId),
      )
      : false;

    if (selectedPlaylistStillVisible) return;

    const firstMatch = filteredDirectory[0]?.playlists[0];
    setSelectedPlaylistId(firstMatch?.id ?? null);
    setSelectedVideoId(null);
  }, [filteredDirectory, selectedPlaylistId]);

  // Reset expanded description when video changes
  useEffect(() => {
    setShowFullDescription(false);
  }, [selectedVideoId]);

  const selectedPlaylist = selectedPlaylistId
    ? playlistIndex.get(selectedPlaylistId) ?? null
    : null;

  const selectedPlaylistVideos = useMemo(() => {
    if (!selectedPlaylistId) return [];
    const videos = playlistItems[selectedPlaylistId]?.items ?? [];
    return sortPlaylistVideos(videos, videoSortMode);
  }, [playlistItems, selectedPlaylistId, videoSortMode]);

  const visiblePlaylistVideos = useMemo(
    () => filterPlaylistVideos(selectedPlaylistVideos, videoFilter),
    [selectedPlaylistVideos, videoFilter],
  );

  const selectedVideo = useMemo(() => {
    if (!selectedVideoId) return null;
    return selectedPlaylistVideos.find((v) => v.videoId === selectedVideoId) ?? null;
  }, [selectedPlaylistVideos, selectedVideoId]);

  const activeVideoIndex = useMemo(
    () => visiblePlaylistVideos.findIndex((video) => video.videoId === selectedVideoId),
    [visiblePlaylistVideos, selectedVideoId],
  );

  const playlistState = selectedPlaylistId ? playlistItems[selectedPlaylistId] : undefined;
  const playlistCount = filteredDirectory.reduce(
    (sum, group) => sum + group.playlists.length,
    0,
  );
  const hasSearchTerm = Boolean(filter.trim().length);
  const hasVideoSearchTerm = Boolean(videoFilter.trim().length);

  const selectVisibleVideoByOffset = (offset: number) => {
    if (!visiblePlaylistVideos.length) return;

    if (activeVideoIndex < 0) {
      setSelectedVideoId(visiblePlaylistVideos[0].videoId);
      return;
    }

    const nextIndex = Math.min(
      Math.max(activeVideoIndex + offset, 0),
      visiblePlaylistVideos.length - 1,
    );
    setSelectedVideoId(visiblePlaylistVideos[nextIndex].videoId);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.brand}>
            {channelSummary?.thumbnail ? (
              <img src={channelSummary.thumbnail} alt="" className={styles.avatar} />
            ) : (
              <div className={styles.avatarPlaceholder} aria-hidden />
            )}
            <div>
              <p className={styles.kicker}>YouTube hub</p>
              <h1 className={styles.title}>Channel playlists</h1>
              <p className={styles.subtle}>
                {channelSummary?.title
                  ? `Curated playlists from ${channelSummary.title}`
                  : 'Browse a clean, distraction-free set of playlists.'}
              </p>
            </div>
          </div>

          <div className={styles.actions}>
            {resolvedChannelId && (
              <a
                href={channelUrl(resolvedChannelId)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.button} ${styles.ghostButton}`}
              >
                Open channel
              </a>
            )}
            <button
              type="button"
              onClick={() => void loadDirectory()}
              className={styles.button}
              disabled={loadingDirectory}
            >
              {loadingDirectory ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        <div className={styles.filterRow}>
          <div className={styles.searchGroup}>
            <label className="sr-only" htmlFor="youtube-playlist-filter">
              Filter playlists
            </label>
            <input
              id="youtube-playlist-filter"
              type="search"
              aria-label="Search playlists or videos"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Search playlists or videos"
              className={styles.input}
            />
          </div>
          <div className={styles.miniStat}>
            {loadingDirectory
              ? 'Loading directory…'
              : `${playlistCount} playlists • ${filteredDirectory.length} categories`}
          </div>
        </div>

        {missingApiKeyHint && (
          <p className={styles.hint} role="status">
            Configure <code className={styles.code}>YOUTUBE_API_KEY</code> on the server or{' '}
            <code className={styles.code}>NEXT_PUBLIC_YOUTUBE_API_KEY</code> for client fallback.
          </p>
        )}

        {!allowNetwork && (
          <div className={styles.banner} role="status">
            <span>Network requests are disabled. Enable them to load playlists.</span>
            <button
              type="button"
              onClick={() => setAllowNetwork(true)}
              className={`${styles.button} ${styles.smallButton}`}
            >
              Enable network
            </button>
          </div>
        )}

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </header>

      <main className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2 className={styles.sectionTitle}>Playlists</h2>
              <span className={styles.pill}>{playlistCount}</span>
            </div>

            {loadingDirectory && !filteredDirectory.length ? (
              <div className={styles.placeholderCard}>Loading playlists…</div>
            ) : filteredDirectory.length ? (
              <div className={styles.playlistGroups}>
                <h2 className={styles.sectionTitle}>Categories</h2>
                {filteredDirectory.map((group) => (
                  <div key={group.sectionId} className={styles.playlistGroup}>
                    <div className={styles.groupHeader}>
                      <h3 className={styles.groupTitle}>{group.sectionTitle}</h3>
                      <span className={styles.groupCount}>{group.playlists.length}</span>
                    </div>
                    <ul className={styles.playlistList} aria-label={`${group.sectionTitle} playlists`}>
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
                              className={`${styles.playlistButton} ${active ? styles.playlistButtonActive : ''
                                }`}
                              aria-label={`Open playlist ${playlist.title}`}
                            >
                              {playlist.thumbnail ? (
                                <img
                                  src={playlist.thumbnail}
                                  alt=""
                                  className={styles.playlistThumb}
                                />
                              ) : (
                                <div className={styles.thumbPlaceholder}>No preview</div>
                              )}
                              <div className={styles.playlistMeta}>
                                <p className={styles.playlistTitle}>{playlist.title}</p>
                                <p className={styles.metaText}>
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
            ) : hasSearchTerm ? (
              <div className={styles.placeholderCard}>
                <p style={{ margin: 0 }}>No playlists match your search.</p>
                <button
                  type="button"
                  onClick={() => setFilter('')}
                  className={`${styles.button} ${styles.smallButton}`}
                  style={{ marginTop: '10px' }}
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className={styles.placeholderCard}>
                {missingApiKeyHint
                  ? 'Configure a YouTube API key to load playlists.'
                  : resolvedChannelId
                    ? 'No public playlists found for this channel.'
                    : 'Enter a valid channel id to load playlists.'}
              </div>
            )}
          </div>
        </aside>

        <section className={styles.contentArea}>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>Playlist</p>
                <h3 className={styles.heading}>{selectedPlaylist?.title ?? 'Select a playlist'}</h3>
                {selectedPlaylist?.publishedAt && (
                  <p className={styles.metaText}>
                    Published {formatDate(selectedPlaylist.publishedAt)} • {selectedPlaylist.itemCount} videos
                  </p>
                )}
              </div>
              {selectedPlaylist && (
                <a
                  href={playlistUrl(selectedPlaylist.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.button} ${styles.ghostButton}`}
                >
                  Open playlist
                </a>
              )}
            </div>
          </div>

          <div className={styles.contentGrid}>
            <div className={`${styles.panel} ${styles.playerPanel}`}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kicker}>Watch</p>
                  <h3 className={styles.subHeading}>{selectedVideo ? 'Now playing' : 'Choose a video'}</h3>
                </div>
                {selectedVideo && (
                  <a
                    href={videoUrl(selectedVideo.videoId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles.button} ${styles.ghostButton}`}
                  >
                    Open video
                  </a>
                )}
              </div>

              <div className={styles.playerShell}>
                {selectedVideo ? (
                  <EmbedFrame
                    key={selectedVideo.videoId}
                    title={`YouTube player for ${selectedVideo.title}`}
                    src={`https://www.youtube-nocookie.com/embed/${selectedVideo.videoId}`}
                    className={styles.embedFrame}
                    containerClassName={styles.embedContainer}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    fallbackLabel="Open on YouTube"
                    openInNewTabLabel="Open on YouTube"
                    loadingLabel="Loading YouTube player…"
                  />
                ) : (
                  <div className={styles.playerPlaceholder}>Select a video from the list.</div>
                )}
              </div>

              {selectedVideo && (
                <div className={styles.videoDetails}>
                  <div className={styles.panelHeader}>
                    <h3 className={styles.videoTitle}>{selectedVideo.title}</h3>
                  </div>
                  <p className={styles.metaText} style={{ marginBottom: 4 }}>
                    Published {formatDate(selectedVideo.publishedAt)}
                  </p>
                  {selectedVideo.description && (
                    <>
                      <p className={styles.descriptionText}>
                        {showFullDescription
                          ? selectedVideo.description
                          : selectedVideo.description.slice(0, 150) +
                          (selectedVideo.description.length > 150 ? '...' : '')}
                      </p>
                      {selectedVideo.description.length > 150 && (
                        <button
                          type="button"
                          className={styles.descriptionToggle}
                          onClick={() => setShowFullDescription(!showFullDescription)}
                        >
                          {showFullDescription ? 'Show less' : 'Show more'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.kicker}>Playlist videos</p>
                  <h3 className={styles.subHeading}>Queue</h3>
                </div>
                {playlistState?.loading && <span className={styles.loading}>Loading…</span>}
              </div>

              <div className={styles.queueControls}>
                <label className="sr-only" htmlFor="youtube-video-filter">
                  Search current playlist videos
                </label>
                <input
                  id="youtube-video-filter"
                  type="search"
                  aria-label="Search videos in the selected playlist"
                  value={videoFilter}
                  onChange={(event) => setVideoFilter(event.target.value)}
                  placeholder="Search this playlist"
                  className={styles.input}
                />

                <label className="sr-only" htmlFor="youtube-video-sort">
                  Sort videos
                </label>
                <select
                  id="youtube-video-sort"
                  className={styles.select}
                  value={videoSortMode}
                  onChange={(event) => setVideoSortMode(event.target.value as VideoSortMode)}
                  aria-label="Sort videos"
                >
                  <option value="newest">Newest first</option>
                  <option value="oldest">Oldest first</option>
                  <option value="title">Title A-Z</option>
                </select>
              </div>

              {!!visiblePlaylistVideos.length && (
                <div className={styles.queueMetaRow}>
                  <p className={styles.metaText}>
                    {activeVideoIndex >= 0
                      ? `Video ${activeVideoIndex + 1} of ${visiblePlaylistVideos.length}`
                      : `${visiblePlaylistVideos.length} videos in queue`}
                  </p>
                  <div className={styles.inlineActions}>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.smallButton} ${styles.ghostButton}`}
                      onClick={() => selectVisibleVideoByOffset(-1)}
                      disabled={activeVideoIndex <= 0}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className={`${styles.button} ${styles.smallButton} ${styles.ghostButton}`}
                      onClick={() => selectVisibleVideoByOffset(1)}
                      disabled={activeVideoIndex < 0 || activeVideoIndex >= visiblePlaylistVideos.length - 1}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {!selectedPlaylistId ? (
                <p className={styles.placeholderText}>Select a playlist to see videos.</p>
              ) : playlistState?.error ? (
                <div className={styles.placeholderCard}>
                  <p className={styles.error}>{playlistState.error}</p>
                  <button
                    type="button"
                    onClick={() => void loadPlaylistItems(selectedPlaylistId, 'replace')}
                    className={`${styles.button} ${styles.smallButton}`}
                  >
                    Retry
                  </button>
                </div>
              ) : visiblePlaylistVideos.length ? (
                <>
                  <ul className={styles.videoList} aria-label="Playlist videos">
                    {visiblePlaylistVideos.map((video) => {
                      const active = video.videoId === selectedVideoId;
                      return (
                        <li key={video.videoId}>
                          <button
                            type="button"
                            onClick={() => setSelectedVideoId(video.videoId)}
                            className={`${styles.videoButton} ${active ? styles.videoButtonActive : ''}`}
                            aria-label={`Watch ${video.title}`}
                          >
                            {video.thumbnail ? (
                              <img src={video.thumbnail} alt="" className={styles.videoThumb} />
                            ) : (
                              <div className={styles.thumbPlaceholder}>No preview</div>
                            )}
                            <div className={styles.videoMeta}>
                              <p className={styles.videoName}>{video.title}</p>
                              <p className={styles.metaText}>{formatDate(video.publishedAt)}</p>
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
                      className={`${styles.button} ${styles.ghostButton} ${styles.fullWidth}`}
                      disabled={playlistState.loading}
                    >
                      {playlistState.loading ? 'Loading…' : 'Load more'}
                    </button>
                  )}
                </>
              ) : (
                <p className={styles.placeholderText}>
                  {playlistState?.loading
                    ? 'Loading videos…'
                    : hasVideoSearchTerm
                      ? 'No videos match this playlist search.'
                      : 'No videos found.'}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
