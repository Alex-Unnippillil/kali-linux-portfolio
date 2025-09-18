import { useCallback, useMemo, useState } from "react";
import rawLibrary from "./library.json";

export interface LibraryTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  tags: string[];
  url: string;
  cover?: string;
}

export interface LibraryAlbum {
  id: string;
  title: string;
  artist: string;
  year: number;
  tags: string[];
  tracks: string[];
}

export interface LibraryPlaylist {
  id: string;
  title: string;
  description: string;
  tags: string[];
  tracks: string[];
}

export type LibraryFilter = "all" | "tracks" | "albums" | "playlists";

interface LibraryData {
  tracks: LibraryTrack[];
  albums: LibraryAlbum[];
  playlists: LibraryPlaylist[];
}

interface LibraryCounts {
  all: number;
  tracks: number;
  albums: number;
  playlists: number;
}

export interface UseLibraryResult {
  query: string;
  setQuery: (value: string) => void;
  category: LibraryFilter;
  setCategory: (value: LibraryFilter) => void;
  results: LibraryData;
  visible: LibraryData;
  counts: LibraryCounts;
  getTrack: (id: string) => LibraryTrack | undefined;
}

const libraryData = rawLibrary as LibraryData;

const normalize = (value: string | number | undefined | null) =>
  (value ?? "").toString().toLowerCase();

const useLibrary = (
  initialQuery = "",
  initialCategory: LibraryFilter = "all",
): UseLibraryResult => {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState<LibraryFilter>(initialCategory);

  const trackIndex = useMemo(() => {
    const map = new Map<string, LibraryTrack>();
    for (const track of libraryData.tracks) {
      map.set(track.id, track);
    }
    return map;
  }, []);

  const tokens = useMemo(
    () =>
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean),
    [query],
  );

  const filtered = useMemo(() => {
    if (!tokens.length) {
      return libraryData;
    }

    const matchesQuery = (fields: string[]) =>
      tokens.every((token) =>
        fields.some((field) => field.includes(token)),
      );

    const tracks = libraryData.tracks.filter((track) =>
      matchesQuery([
        normalize(track.title),
        normalize(track.artist),
        normalize(track.album),
        normalize(track.duration),
        normalize(track.tags.join(" ")),
      ]),
    );

    const albums = libraryData.albums.filter((album) =>
      matchesQuery([
        normalize(album.title),
        normalize(album.artist),
        normalize(album.year),
        normalize(album.tags.join(" ")),
        ...album.tracks
          .map((id) => trackIndex.get(id))
          .filter(Boolean)
          .map((track) => normalize(track.title)),
      ]),
    );

    const playlists = libraryData.playlists.filter((playlist) =>
      matchesQuery([
        normalize(playlist.title),
        normalize(playlist.description),
        normalize(playlist.tags.join(" ")),
        ...playlist.tracks
          .map((id) => trackIndex.get(id))
          .filter(Boolean)
          .map((track) => normalize(track.title)),
      ]),
    );

    return { tracks, albums, playlists };
  }, [tokens, trackIndex]);

  const counts = useMemo(() => {
    const allCount =
      filtered.tracks.length +
      filtered.albums.length +
      filtered.playlists.length;

    return {
      all: allCount,
      tracks: filtered.tracks.length,
      albums: filtered.albums.length,
      playlists: filtered.playlists.length,
    };
  }, [filtered]);

  const visible = useMemo(() => {
    switch (category) {
      case "tracks":
        return { tracks: filtered.tracks, albums: [], playlists: [] };
      case "albums":
        return { tracks: [], albums: filtered.albums, playlists: [] };
      case "playlists":
        return { tracks: [], albums: [], playlists: filtered.playlists };
      case "all":
      default:
        return filtered;
    }
  }, [category, filtered]);

  const getTrack = useCallback(
    (id: string) => trackIndex.get(id),
    [trackIndex],
  );

  return {
    query,
    setQuery,
    category,
    setCategory,
    results: filtered,
    visible,
    counts,
    getTrack,
  };
};

export default useLibrary;
