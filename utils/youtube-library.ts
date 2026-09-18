import type {
  YouTubePlaylistSummary,
  YouTubePlaylistVideo,
  YouTubePlaylistDirectory,
} from "./youtube";

export const ALL_PLAYLIST_ID = "all-videos";
export type VideoSortMode = "newest" | "oldest" | "title" | "playlist";
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
export function mergeUniqueVideos(
  ...pages: YouTubePlaylistVideo[][]
): YouTubePlaylistVideo[] {
  const videos = new Map<string, YouTubePlaylistVideo>();
  for (const page of pages) {
    for (const video of page) {
      if (
        typeof video?.videoId !== "string" ||
        !video.videoId ||
        typeof video.title !== "string" ||
        !video.title.trim() ||
        /^(private|deleted) video$/i.test(video.title.trim())
      )
        continue;
      if (!videos.has(video.videoId))
        videos.set(video.videoId, {
          ...video,
          description:
            typeof video.description === "string" ? video.description : "",
          thumbnail: typeof video.thumbnail === "string" ? video.thumbnail : "",
          publishedAt:
            typeof video.publishedAt === "string" ? video.publishedAt : "",
          position: Number.isFinite(video.position) ? video.position : 0,
        });
    }
  }
  return Array.from(videos.values());
}

export function sortPlaylistVideos(
  videos: YouTubePlaylistVideo[],
  mode: VideoSortMode,
) {
  const timestamp = (video: YouTubePlaylistVideo) =>
    Date.parse(video.publishedAt || "") || 0;
  return [...videos].sort((a, b) => {
    if (mode === "playlist") return a.position - b.position;
    if (mode === "title") return a.title.localeCompare(b.title);
    return mode === "oldest"
      ? timestamp(a) - timestamp(b)
      : timestamp(b) - timestamp(a);
  });
}

export function filterPlaylistVideos(
  videos: YouTubePlaylistVideo[],
  filter: string,
) {
  const term = filter.trim().toLowerCase();
  return term
    ? videos.filter((video) =>
        `${video.title} ${video.description ?? ""}`
          .toLowerCase()
          .includes(term),
      )
    : videos;
}

export function filterDirectoryBySearch(
  directory: PlaylistListing[],
  filter: string,
  playlistItems: Record<string, PlaylistItemsState>,
): PlaylistListing[] {
  const term = filter.trim().toLowerCase();
  if (!term) return directory;
  return directory
    .map((section) => ({
      ...section,
      playlists: section.playlists.filter(
        (playlist) =>
          `${playlist.title} ${playlist.description ?? ""}`
            .toLowerCase()
            .includes(term) ||
          filterPlaylistVideos(playlistItems[playlist.id]?.items ?? [], term)
            .length > 0,
      ),
    }))
    .filter((section) => section.playlists.length > 0);
}

/** A broken/repeated upstream cursor must not create an endless Load more loop. */
export function nextPlaylistCursor(
  next: unknown,
  previous?: string,
): string | undefined {
  return typeof next === "string" && next.length > 0 && next !== previous
    ? next
    : undefined;
}

/** Bound fan-out across account playlists while retaining the input order. */
export async function mapConcurrent<T, R>(
  values: readonly T[],
  worker: (value: T) => Promise<R>,
  concurrency = 3,
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1)
    throw new RangeError("Concurrency must be a positive integer.");
  const results: R[] = new Array(values.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (next < values.length) {
        const index = next++;
        results[index] = await worker(values[index]);
      }
    }),
  );
  return results;
}

/** Select deterministically in the curator's playlist order, not response-arrival order. */
export function firstAvailableVideo(
  playlists: readonly YouTubePlaylistSummary[],
  pages: Record<string, PlaylistItemsState>,
): YouTubePlaylistVideo | undefined {
  for (const playlist of playlists) {
    const page = pages[playlist.id];
    if (!page || (!page.loaded && !page.error)) return undefined;
    if (page.items.length) return page.items[0];
  }
  return undefined;
}

/** Treat remote JSON as untrusted data before rendering React children or mapping sections. */
export function normalizePlaylistDirectory(
  value: unknown,
): YouTubePlaylistDirectory {
  const record = (item: unknown): Record<string, unknown> =>
    item !== null && typeof item === "object"
      ? (item as Record<string, unknown>)
      : {};
  const text = (item: unknown) => (typeof item === "string" ? item : "");
  const source = record(value);
  if (!Array.isArray(source.playlists))
    throw new Error("The playlist directory is unavailable. Please refresh.");
  const playlists = new Map<string, YouTubePlaylistSummary>();
  for (const item of source.playlists) {
    const entry = record(item);
    const id = text(entry.id).trim();
    const title = text(entry.title).trim();
    if (!id || !title || playlists.has(id)) continue;
    const privacy = text(entry.privacyStatus);
    if (privacy && privacy !== "public") continue;
    playlists.set(id, {
      id,
      title,
      description: text(entry.description),
      thumbnail: text(entry.thumbnail),
      publishedAt: text(entry.publishedAt),
      itemCount:
        typeof entry.itemCount === "number" && Number.isFinite(entry.itemCount)
          ? Math.max(0, Math.floor(entry.itemCount))
          : 0,
      privacyStatus: "public",
    });
  }
  const sections: YouTubePlaylistDirectory["sections"] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(source.sections) ? source.sections : []) {
    const entry = record(item);
    const sectionId = text(entry.sectionId).trim();
    if (!sectionId || seen.has(sectionId) || !Array.isArray(entry.playlists))
      continue;
    const ids = new Set(
      entry.playlists.map((playlist) => text(record(playlist).id)),
    );
    const members = Array.from(ids).flatMap((id) => {
      const playlist = playlists.get(id);
      return playlist ? [playlist] : [];
    });
    if (!members.length) continue;
    seen.add(sectionId);
    sections.push({
      sectionId,
      sectionTitle: text(entry.sectionTitle).trim() || "Collections",
      playlists: members,
    });
  }
  return { playlists: Array.from(playlists.values()), sections };
}
