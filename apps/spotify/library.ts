import rawLibrary from "../../data/spotify/library.json";

export interface QueueTrack {
  id: string;
  title: string;
  url: string;
  cover?: string;
  artist?: string;
  album?: string;
}

export interface LibraryTrack extends QueueTrack {
  searchText: string;
}

export interface LibraryAlbum {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  tracks: LibraryTrack[];
  searchText: string;
}

export interface LibraryPlaylist {
  id: string;
  title: string;
  description?: string;
  tracks: LibraryTrack[];
  searchText: string;
}

export interface SpotifyLibrary {
  tracks: LibraryTrack[];
  trackMap: Record<string, LibraryTrack>;
  albums: LibraryAlbum[];
  playlists: LibraryPlaylist[];
}

export interface RawLibraryTrack extends QueueTrack {}

export interface RawLibraryAlbum {
  id: string;
  title: string;
  artist: string;
  cover?: string;
  tracks: string[];
}

export interface RawLibraryPlaylist {
  id: string;
  title: string;
  description?: string;
  tracks: string[];
}

export interface RawSpotifyLibrary {
  tracks: RawLibraryTrack[];
  albums: RawLibraryAlbum[];
  playlists: RawLibraryPlaylist[];
}

const normalizeForSearch = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const toSearchText = (...values: Array<string | undefined>) =>
  normalizeForSearch(values.filter(Boolean).join(" "));

const tokenize = (query: string) =>
  query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => normalizeForSearch(token));

const mapToObject = (map: Map<string, LibraryTrack>): Record<string, LibraryTrack> => {
  const entries: Record<string, LibraryTrack> = {};
  map.forEach((value, key) => {
    entries[key] = value;
  });
  return entries;
};

export const createLibraryIndex = (raw: RawSpotifyLibrary): SpotifyLibrary => {
  const trackMap = new Map<string, LibraryTrack>();

  raw.tracks.forEach((track) => {
    if (!track.id || !track.url) {
      return;
    }
    const searchText = toSearchText(track.title, track.artist, track.album);
    const libraryTrack: LibraryTrack = {
      ...track,
      searchText,
    };
    trackMap.set(track.id, libraryTrack);
  });

  const resolveTracks = (ids: string[]) =>
    ids
      .map((id) => trackMap.get(id))
      .filter((track): track is LibraryTrack => Boolean(track));

  const albums: LibraryAlbum[] = raw.albums.map((album) => {
    const tracks = resolveTracks(album.tracks);
    const searchText = toSearchText(
      album.title,
      album.artist,
      ...tracks.map((track) => track.title),
    );
    return {
      id: album.id,
      title: album.title,
      artist: album.artist,
      cover: album.cover,
      tracks,
      searchText,
    };
  });

  const playlists: LibraryPlaylist[] = raw.playlists.map((playlist) => {
    const tracks = resolveTracks(playlist.tracks);
    const searchText = toSearchText(
      playlist.title,
      playlist.description,
      ...tracks.map((track) => track.title),
      ...tracks.map((track) => track.artist),
    );
    return {
      id: playlist.id,
      title: playlist.title,
      description: playlist.description,
      tracks,
      searchText,
    };
  });

  return {
    tracks: raw.tracks
      .map((track) => trackMap.get(track.id))
      .filter((track): track is LibraryTrack => Boolean(track)),
    trackMap: mapToObject(trackMap),
    albums,
    playlists,
  };
};

export type QueueTrackList = QueueTrack[];

export const toQueueTrack = (track: LibraryTrack): QueueTrack => {
  const { searchText: _searchText, ...rest } = track;
  return rest;
};

export const toQueueTracks = (tracks: LibraryTrack[]): QueueTrackList =>
  tracks.map((track) => toQueueTrack(track));

export interface FilteredLibrary {
  tracks: LibraryTrack[];
  albums: LibraryAlbum[];
  playlists: LibraryPlaylist[];
}

const matchesTokens = (searchText: string, tokens: string[]) =>
  tokens.every((token) => searchText.includes(token));

const filterCollection = <T extends { searchText: string }>(
  items: T[],
  tokens: string[],
) => {
  if (!tokens.length) {
    return items;
  }
  return items.filter((item) => matchesTokens(item.searchText, tokens));
};

export const filterLibrary = (
  library: SpotifyLibrary,
  query: string,
): FilteredLibrary => {
  const tokens = tokenize(query);
  return {
    tracks: filterCollection(library.tracks, tokens),
    albums: filterCollection(library.albums, tokens),
    playlists: filterCollection(library.playlists, tokens),
  };
};

const defaultLibrary = rawLibrary as RawSpotifyLibrary;

export const spotifyLibrary = createLibraryIndex(defaultLibrary);
