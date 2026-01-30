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
import {
  FALLBACK_YOUTUBE_CHANNEL,
  FALLBACK_YOUTUBE_DIRECTORY,
  FALLBACK_YOUTUBE_PLAYLIST_ITEMS,
} from '../../../data/youtubeFallback';
import styles from './youtube.module.css';

const YOUTUBE_CLIENT_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const DEFAULT_CHANNEL_ID = 'UCxPIJ3hw6AOwomUWh5B7SfQ';
const ALL_PLAYLIST_ID = 'all-videos';

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
  const [filter, setFilter] = useState('');

  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missingApiKeyHint, setMissingApiKeyHint] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const abortDirectoryRef = useRef<AbortController | null>(null);
  const abortPlaylistRef = useRef<AbortController | null>(null);

  const applyFallbackDirectory = useCallback(
    (reason: string) => {
      const fallbackDirectory = FALLBACK_YOUTUBE_DIRECTORY;
      const map = new Map<string, YouTubePlaylistSummary>(
        fallbackDirectory.playlists.map((playlist) => [playlist.id, playlist]),
      );
      const aggregatedCount = fallbackDirectory.playlists.reduce(
        (sum, playlist) => sum + (playlist.itemCount ?? 0),
        0,
      );
      const latestPublished = fallbackDirectory.playlists.reduce<Date | null>(
        (latest, playlist) => {
          const current = new Date(playlist.publishedAt ?? '');
          if (Number.isNaN(current.getTime())) return latest;
          if (!latest) return current;
          return current > latest ? current : latest;
        },
        null,
      );
      const fallbackThumbnail = fallbackDirectory.playlists.find((p) => p.thumbnail)?.thumbnail;

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

      const playlistListings: PlaylistListing[] = fallbackDirectory.sections.length
        ? fallbackDirectory.sections
        : fallbackDirectory.playlists.length
        ? [{ sectionId: 'all', sectionTitle: 'Playlists', playlists: fallbackDirectory.playlists }]
        : [];

      const listings: PlaylistListing[] = playlistListings.map((listing) =>
        listing.sectionId === 'all'
          ? {
              ...listing,
              playlists: [...listing.playlists, allVideosSummary],
            }
          : listing,
      );

      const fallbackPlaylistItems = Object.entries(FALLBACK_YOUTUBE_PLAYLIST_ITEMS).reduce(
        (acc, [playlistId, items]) => ({
          ...acc,
          [playlistId]: {
            items,
            nextPageToken: undefined,
            loading: false,
            error: undefined,
          },
        }),
        {} as Record<string, PlaylistItemsState>,
      );

      const allItems = sortVideosNewestFirst(
        Object.values(FALLBACK_YOUTUBE_PLAYLIST_ITEMS).flat(),
      );

      fallbackPlaylistItems[ALL_PLAYLIST_ID] = {
        items: allItems,
        nextPageToken: undefined,
        loading: false,
        error: undefined,
      };

      setPlaylistItems(fallbackPlaylistItems);
      setChannelSummary(FALLBACK_YOUTUBE_CHANNEL);
      setDirectory(listings);
      setError(null);
      setMissingApiKeyHint(false);
      setUsingFallback(true);
      setFallbackNotice(reason);

      const defaultPlaylist = ALL_PLAYLIST_ID;
      const firstPlaylist = listings[0]?.playlists[0]?.id;
      setSelectedPlaylistId((prev) => prev ?? defaultPlaylist ?? firstPlaylist ?? null);
    },
    [],
  );

  const loadDirectory = useCallback(async () => {
    const networkAllowed = allowNetwork || process.env.NODE_ENV === 'test';
    if (!allowNetwork) {
      setAllowNetwork(true);
      setError('Network requests were disabled. Enabling network to load YouTube playlists…');
      if (!networkAllowed) {
        applyFallbackDirectory('Network requests are disabled. Showing demo playlists instead.');
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
    setFallbackNotice(null);
    setUsingFallback(false);
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
      applyFallbackDirectory(
        e.message?.includes('Failed to fetch')
          ? 'Unable to reach the YouTube API. Showing demo playlists instead.'
          : 'YouTube API unavailable. Showing demo playlists instead.',
      );
      return;
    } finally {
      setLoadingDirectory(false);
      abortDirectoryRef.current = null;
    }
  }, [allowNetwork, applyFallbackDirectory, hasClientApiKey, resolvedChannelId, setAllowNetwork]);

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

      if (usingFallback) {
        const fallback = FALLBACK_YOUTUBE_PLAYLIST_ITEMS[playlistId];
        if (fallback?.length) {
          setPlaylistItems((prev) => ({
            ...prev,
            [playlistId]: {
              items: fallback,
              nextPageToken: undefined,
              loading: false,
              error: undefined,
            },
          }));
          setSelectedVideoId((prev) => prev ?? fallback[0]?.videoId ?? null);
          return;
        }
      }

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
    [hasClientApiKey, playlistIndex, playlistItems, usingFallback],
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

  const selectedPlaylist = selectedPlaylistId
    ? playlistIndex.get(selectedPlaylistId) ?? null
    : null;

  const selectedPlaylistVideos = useMemo(() => {
    if (!selectedPlaylistId) return [];
    const videos = playlistItems[selectedPlaylistId]?.items ?? [];
    return sortVideosNewestFirst(videos);
  }, [playlistItems, selectedPlaylistId]);

  const selectedVideo = useMemo(() => {
    if (!selectedVideoId) return null;
    return selectedPlaylistVideos.find((v) => v.videoId === selectedVideoId) ?? null;
  }, [selectedPlaylistVideos, selectedVideoId]);

  const playlistState = selectedPlaylistId ? playlistItems[selectedPlaylistId] : undefined;
  const playlistCount = filteredDirectory.reduce(
    (sum, group) => sum + group.playlists.length,
    0,
  );
  const hasSearchTerm = Boolean(filter.trim().length);

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

        {usingFallback && fallbackNotice && (
          <div className={styles.banner} role="status">
            <span>{fallbackNotice}</span>
          </div>
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
                              className={`${styles.playlistButton} ${
                                active ? styles.playlistButtonActive : ''
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
                  <p className={styles.metaText}>Published {formatDate(selectedVideo.publishedAt)}</p>
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
              ) : selectedPlaylistVideos.length ? (
                <>
                  <ul className={styles.videoList} aria-label="Playlist videos">
                    {selectedPlaylistVideos.map((video) => {
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
                  {playlistState?.loading ? 'Loading videos…' : 'No videos found.'}
                </p>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
