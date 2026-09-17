import type { YouTubePlaylistSummary, YouTubePlaylistVideo } from './youtube';

export const ALL_PLAYLIST_ID = 'all-videos';
export type VideoSortMode = 'newest' | 'oldest' | 'title' | 'playlist';
export type PlaylistListing = {
  sectionId: string;
  sectionTitle: string;
  playlists: YouTubePlaylistSummary[];
};
export type PlaylistItemsState = {
  items: YouTubePlaylistVideo[];
  nextPageToken?: string;
  loading: boolean;
  loaded?: boolean;
  error?: string;
};

/** A video can belong to several playlists. Its YouTube ID is its identity. */
export function mergeUniqueVideos(...pages: YouTubePlaylistVideo[][]): YouTubePlaylistVideo[] {
  const videos = new Map<string, YouTubePlaylistVideo>();
  for (const page of pages) {
    for (const video of page) {
      if (!video?.videoId || !video.title || /^(private|deleted) video$/i.test(video.title.trim())) continue;
      if (!videos.has(video.videoId)) videos.set(video.videoId, video);
    }
  }
  return Array.from(videos.values());
}

export function sortPlaylistVideos(videos: YouTubePlaylistVideo[], mode: VideoSortMode) {
  const timestamp = (video: YouTubePlaylistVideo) => Date.parse(video.publishedAt || '') || 0;
  return [...videos].sort((a, b) => {
    if (mode === 'playlist') return a.position - b.position;
    if (mode === 'title') return a.title.localeCompare(b.title);
    return mode === 'oldest' ? timestamp(a) - timestamp(b) : timestamp(b) - timestamp(a);
  });
}

export function filterPlaylistVideos(videos: YouTubePlaylistVideo[], filter: string) {
  const term = filter.trim().toLowerCase();
  return term ? videos.filter((video) => `${video.title} ${video.description ?? ''}`.toLowerCase().includes(term)) : videos;
}

export function filterDirectoryBySearch(
  directory: PlaylistListing[], filter: string, playlistItems: Record<string, PlaylistItemsState>,
): PlaylistListing[] {
  const term = filter.trim().toLowerCase();
  if (!term) return directory;
  return directory.map((section) => ({
    ...section,
    playlists: section.playlists.filter((playlist) =>
      `${playlist.title} ${playlist.description ?? ''}`.toLowerCase().includes(term) ||
      filterPlaylistVideos(playlistItems[playlist.id]?.items ?? [], term).length > 0),
  })).filter((section) => section.playlists.length > 0);
}

/** A broken/repeated upstream cursor must not create an endless Load more loop. */
export function nextPlaylistCursor(next: unknown, previous?: string): string | undefined {
  return typeof next === 'string' && next.length > 0 && next !== previous ? next : undefined;
}

/** Bound fan-out across account playlists while retaining the input order. */
export async function mapConcurrent<T, R>(
  values: readonly T[], worker: (value: T) => Promise<R>, concurrency = 3,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new RangeError('Concurrency must be a positive integer.');
  const results: R[] = new Array(values.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (next < values.length) {
      const index = next++;
      results[index] = await worker(values[index]);
    }
  }));
  return results;
}
