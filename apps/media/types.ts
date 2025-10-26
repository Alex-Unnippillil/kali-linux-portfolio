export type MediaFormat = 'video' | 'audio' | 'livestream' | 'clip';

export interface MediaItem {
  id: string;
  title: string;
  description: string;
  duration: string;
  format: MediaFormat;
  url: string;
  tags: string[];
  published: string;
}

export interface PlaylistItem {
  mediaId: string;
  note?: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedPlaylistItem {
  entry: PlaylistItem;
  media?: MediaItem;
}

export const isPlaylistArray = (value: unknown): value is Playlist[] => {
  if (!Array.isArray(value)) return false;

  return value.every((playlist) => {
    if (!playlist || typeof playlist !== 'object') return false;
    const candidate = playlist as Partial<Playlist>;
    if (typeof candidate.id !== 'string' || typeof candidate.name !== 'string') return false;
    if (
      typeof candidate.createdAt !== 'string' ||
      typeof candidate.updatedAt !== 'string'
    ) {
      return false;
    }
    if (!Array.isArray(candidate.items)) return false;
    return candidate.items.every((item) => {
      if (!item || typeof item !== 'object') return false;
      const playlistItem = item as Partial<PlaylistItem>;
      if (typeof playlistItem.mediaId !== 'string') return false;
      if (
        playlistItem.note !== undefined &&
        typeof playlistItem.note !== 'string'
      ) {
        return false;
      }
      return true;
    });
  });
};
