export type YouTubePlaylistKind = 'playlist' | 'uploads';

export type YouTubePlaylist = {
  id: string;
  title: string;
  kind: YouTubePlaylistKind;
  locked?: boolean;
  addedAt: string;
};

const PLAYLIST_ID_RE = /^[a-zA-Z0-9_-]{10,128}$/;
const CHANNEL_ID_RE = /^UC[a-zA-Z0-9_-]{10,128}$/;

export type YouTubeChannelSummary = {
  id: string;
  title: string;
  thumbnail: string;
};

export type YouTubeChannelSection = {
  id: string;
  title: string;
  playlistIds: string[];
};

export type YouTubePlaylistSummary = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  itemCount: number;
  publishedAt: string;
  privacyStatus: string;
};

export type YouTubePlaylistDirectory = {
  playlists: YouTubePlaylistSummary[];
  sections: Array<{
    sectionId: string;
    sectionTitle: string;
    playlists: YouTubePlaylistSummary[];
  }>;
};

export type YouTubePlaylistVideo = {
  videoId: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  position: number;
};

export function uploadsPlaylistIdFromChannelId(channelId: string) {
  const trimmed = channelId.trim();
  if (!CHANNEL_ID_RE.test(trimmed)) return null;
  return `UU${trimmed.slice(2)}`;
}

export function parseYouTubePlaylistId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Raw playlist id
  if (PLAYLIST_ID_RE.test(trimmed)) return trimmed;

  // URL parsing
  try {
    const url = new URL(trimmed);
    const list = url.searchParams.get('list');
    if (list && PLAYLIST_ID_RE.test(list)) return list;
  } catch {
    // ignore
  }

  // Fallback: extract list=... from arbitrary text
  const listMatch = trimmed.match(/[?&]list=([^&\s#]+)/i);
  if (listMatch?.[1] && PLAYLIST_ID_RE.test(listMatch[1])) return listMatch[1];

  return null;
}

export function parseYouTubeChannelId(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (CHANNEL_ID_RE.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    // Some YouTube URLs include channel id directly in the pathname.
    // Example: https://www.youtube.com/channel/UCxxxx
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'channel');
    const candidate = idx >= 0 ? parts[idx + 1] : null;
    if (candidate && CHANNEL_ID_RE.test(candidate)) return candidate;
  } catch {
    // ignore
  }

  const channelMatch = trimmed.match(/UC[a-zA-Z0-9_-]{10,128}/);
  if (channelMatch?.[0] && CHANNEL_ID_RE.test(channelMatch[0])) return channelMatch[0];

  return null;
}

export function createDefaultPlaylists(channelId: string): YouTubePlaylist[] {
  const uploadsId = uploadsPlaylistIdFromChannelId(channelId);
  const now = new Date().toISOString();
  return uploadsId
    ? [
        {
          id: uploadsId,
          title: 'Uploads',
          kind: 'uploads',
          locked: true,
          addedAt: now,
        },
      ]
    : [];
}

export function isPlaylistList(value: unknown): value is YouTubePlaylist[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        typeof item.title === 'string' &&
        typeof item.kind === 'string' &&
        (item.kind === 'playlist' || item.kind === 'uploads') &&
        (item.locked === undefined || typeof item.locked === 'boolean') &&
        typeof item.addedAt === 'string',
    )
  );
}

type YouTubeApiErrorResponse = {
  error?: { message?: string };
};

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

function toInt(value: unknown, fallback = 0) {
  const n = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function fetchYouTubeApi<T>(
  endpoint: string,
  params: Record<string, string | undefined>,
  apiKey: string,
  signal?: AbortSignal,
): Promise<T> {
  const url = new URL(`${YOUTUBE_API_BASE}/${endpoint}`);
  url.searchParams.set('key', apiKey);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && `${v}`.length) url.searchParams.set(k, `${v}`);
  });

  const response = await fetch(url.toString(), { signal });
  const data = (await response.json()) as T & YouTubeApiErrorResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `YouTube API request failed: ${endpoint}`);
  }

  return data as T;
}

export async function fetchYouTubeChannelSummary(
  channelId: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<YouTubeChannelSummary | null> {
  type ChannelsResponse = {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        thumbnails?: {
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
    }>;
  };

  const data = await fetchYouTubeApi<ChannelsResponse>(
    'channels',
    { part: 'snippet', id: channelId, maxResults: '1' },
    apiKey,
    signal,
  );

  const item = data.items?.[0];
  if (!item?.id) return null;

  const thumb =
    item.snippet?.thumbnails?.high?.url ||
    item.snippet?.thumbnails?.medium?.url ||
    item.snippet?.thumbnails?.default?.url ||
    '';

  return {
    id: item.id,
    title: item.snippet?.title?.trim() || 'YouTube channel',
    thumbnail: thumb,
  };
}

export async function fetchYouTubeChannelSections(
  channelId: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<YouTubeChannelSection[]> {
  type SectionsResponse = {
    items?: Array<{
      id?: string;
      snippet?: { title?: string };
      contentDetails?: { playlists?: string[] };
    }>;
  };

  const data = await fetchYouTubeApi<SectionsResponse>(
    'channelSections',
    { part: 'snippet,contentDetails', channelId, maxResults: '50' },
    apiKey,
    signal,
  );

  return (data.items ?? [])
    .map((item) => {
      const playlistIds = (item.contentDetails?.playlists ?? []).filter(Boolean);
      return {
        id: item.id ?? '',
        title: item.snippet?.title?.trim() || 'Untitled section',
        playlistIds,
      } satisfies YouTubeChannelSection;
    })
    .filter((section) => Boolean(section.id) && section.playlistIds.length > 0);
}

export async function fetchYouTubePlaylistsByIds(
  playlistIds: string[],
  apiKey: string,
  signal?: AbortSignal,
): Promise<YouTubePlaylistSummary[]> {
  type PlaylistResponse = {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        thumbnails?: {
          maxres?: { url?: string };
          standard?: { url?: string };
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
      contentDetails?: { itemCount?: number };
      status?: { privacyStatus?: string };
    }>;
  };

  const uniqueIds = Array.from(new Set(playlistIds.map((id) => id.trim()).filter(Boolean)));
  if (!uniqueIds.length) return [];

  const batches = chunk(uniqueIds, 50);
  const results: YouTubePlaylistSummary[] = [];

  for (const batch of batches) {
    const data = await fetchYouTubeApi<PlaylistResponse>(
      'playlists',
      {
        part: 'snippet,contentDetails,status',
        id: batch.join(','),
        maxResults: '50',
      },
      apiKey,
      signal,
    );

    for (const item of data.items ?? []) {
      const id = item.id ?? '';
      if (!id) continue;
      const thumb =
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.standard?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '';

      results.push({
        id,
        title: item.snippet?.title?.trim() || 'Untitled playlist',
        description: item.snippet?.description ?? '',
        thumbnail: thumb,
        itemCount: toInt(item.contentDetails?.itemCount, 0),
        publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
        privacyStatus: item.status?.privacyStatus ?? 'public',
      });
    }
  }

  const index = new Map(results.map((p) => [p.id, p]));
  return uniqueIds.map((id) => index.get(id)).filter(Boolean) as YouTubePlaylistSummary[];
}

export async function fetchYouTubePlaylistsByChannelIdAll(
  channelId: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<YouTubePlaylistSummary[]> {
  type PlaylistsListResponse = {
    nextPageToken?: string;
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        thumbnails?: {
          maxres?: { url?: string };
          standard?: { url?: string };
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
      contentDetails?: { itemCount?: number };
      status?: { privacyStatus?: string };
    }>;
  };

  const results: YouTubePlaylistSummary[] = [];
  let pageToken: string | undefined;

  // Safety net to avoid accidental infinite loops.
  let safety = 0;
  do {
    safety += 1;
    if (safety > 200) break;

    const data = await fetchYouTubeApi<PlaylistsListResponse>(
      'playlists',
      {
        part: 'snippet,contentDetails,status',
        channelId,
        maxResults: '50',
        pageToken,
      },
      apiKey,
      signal,
    );

    for (const item of data.items ?? []) {
      const id = item.id ?? '';
      if (!id) continue;

      const thumb =
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.standard?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '';

      results.push({
        id,
        title: item.snippet?.title?.trim() || 'Untitled playlist',
        description: item.snippet?.description ?? '',
        thumbnail: thumb,
        itemCount: toInt(item.contentDetails?.itemCount, 0),
        publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
        privacyStatus: item.status?.privacyStatus ?? 'public',
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  const visible = results.filter(
    (playlist) =>
      playlist.privacyStatus === 'public' ||
      playlist.privacyStatus === 'unlisted' ||
      playlist.privacyStatus === undefined,
  );

  // Stable sort: newest first, then title.
  return visible.sort((a, b) => {
    const da = Date.parse(a.publishedAt);
    const db = Date.parse(b.publishedAt);
    if (Number.isFinite(da) && Number.isFinite(db) && da !== db) return db - da;
    return a.title.localeCompare(b.title);
  });
}

export async function fetchYouTubePlaylistDirectoryByChannelId(
  channelId: string,
  apiKey: string,
  signal?: AbortSignal,
): Promise<YouTubePlaylistDirectory> {
  const [sections, playlists] = await Promise.all([
    fetchYouTubeChannelSections(channelId, apiKey, signal).catch(() => []),
    fetchYouTubePlaylistsByChannelIdAll(channelId, apiKey, signal),
  ]);

  const playlistIndex = new Map<string, YouTubePlaylistSummary>(
    playlists.map((playlist) => [playlist.id, playlist]),
  );

  const missingIds = Array.from(
    new Set(
      sections.flatMap((section) => section.playlistIds).filter((id) => !playlistIndex.has(id)),
    ),
  );

  if (missingIds.length) {
    const missing = await fetchYouTubePlaylistsByIds(missingIds, apiKey, signal);
    for (const playlist of missing) {
      if (!playlistIndex.has(playlist.id)) {
        playlistIndex.set(playlist.id, playlist);
        playlists.push(playlist);
      }
    }
  }

  const sectionListings: YouTubePlaylistDirectory['sections'] = sections
    .map((section) => {
      const ordered = section.playlistIds
        .map((id) => playlistIndex.get(id))
        .filter(Boolean) as YouTubePlaylistSummary[];
      if (!ordered.length) return null;
      return {
        sectionId: section.id,
        sectionTitle: section.title,
        playlists: ordered,
      };
    })
    .filter(Boolean) as YouTubePlaylistDirectory['sections'];

  if (playlistIndex.size && !sectionListings.find((section) => section.sectionId === 'all')) {
    sectionListings.push({
      sectionId: 'all',
      sectionTitle: 'Playlists',
      playlists: Array.from(playlistIndex.values()),
    });
  }

  return {
    playlists: Array.from(playlistIndex.values()),
    sections: sectionListings,
  };
}

export async function fetchYouTubePlaylistItems(
  playlistId: string,
  apiKey: string,
  options?: { pageToken?: string; maxResults?: number; signal?: AbortSignal },
): Promise<{ items: YouTubePlaylistVideo[]; nextPageToken?: string }> {
  type PlaylistItemsResponse = {
    nextPageToken?: string;
    items?: Array<{
      snippet?: {
        title?: string;
        description?: string;
        publishedAt?: string;
        position?: number;
        resourceId?: { videoId?: string };
        thumbnails?: {
          maxres?: { url?: string };
          standard?: { url?: string };
          high?: { url?: string };
          medium?: { url?: string };
          default?: { url?: string };
        };
      };
    }>;
  };

  const data = await fetchYouTubeApi<PlaylistItemsResponse>(
    'playlistItems',
    {
      part: 'snippet',
      playlistId,
      maxResults: `${Math.min(options?.maxResults ?? 50, 50)}`,
      pageToken: options?.pageToken,
    },
    apiKey,
    options?.signal,
  );

  const items: YouTubePlaylistVideo[] = (data.items ?? [])
    .map((item) => {
      const videoId = item.snippet?.resourceId?.videoId ?? '';
      if (!videoId) return null;
      const thumb =
        item.snippet?.thumbnails?.maxres?.url ||
        item.snippet?.thumbnails?.standard?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.default?.url ||
        '';
      return {
        videoId,
        title: item.snippet?.title?.trim() || 'Untitled video',
        description: item.snippet?.description ?? '',
        thumbnail: thumb,
        publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
        position: toInt(item.snippet?.position, 0),
      } satisfies YouTubePlaylistVideo;
    })
    .filter(Boolean) as YouTubePlaylistVideo[];

  return { items, nextPageToken: data.nextPageToken };
}
