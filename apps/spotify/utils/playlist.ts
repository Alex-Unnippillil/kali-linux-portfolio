export type PlaylistMap = Record<string, string>;

export const DEFAULT_PLAYLISTS: PlaylistMap = {
  chill: "37i9dQZF1DX4WYpdgoIcn6",
  energize: "37i9dQZF1DX1g0iEXLFycr",
  focus: "37i9dQZF1DX8Uebhn9wzrS",
  happy: "37i9dQZF1DXdPec7aLTmlC",
  sad: "37i9dQZF1DWSqBruwoIXkA",
  sleep: "37i9dQZF1DWYppxIAzv8YB",
};

export const MAX_PLAYLISTS = 12;

const SPOTIFY_ID_REGEX = /^[A-Za-z0-9]{16,40}$/;

export const normalizePlaylistMap = (map: PlaylistMap): PlaylistMap => {
  const entries = Object.entries(map).map(([key, value]) => [
    key.trim(),
    value.trim(),
  ]) as [string, string][];
  entries.sort((a, b) => a[0].localeCompare(b[0]));
  return entries.reduce<PlaylistMap>((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {});
};

export const formatPlaylist = (map: PlaylistMap): string =>
  JSON.stringify(normalizePlaylistMap(map), null, 2);

export const DEFAULT_PLAYLIST_TEXT = formatPlaylist(DEFAULT_PLAYLISTS);

export interface ValidationResult {
  playlists: PlaylistMap | null;
  error: string | null;
  warnings: string[];
}

export const isPlaylistMap = (value: unknown): value is PlaylistMap => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  return Object.entries(value as Record<string, unknown>).every(
    ([key, val]) =>
      typeof key === "string" &&
      key.trim().length > 0 &&
      typeof val === "string" &&
      val.trim().length > 0,
  );
};

export const arePlaylistsEqual = (a: PlaylistMap, b: PlaylistMap) =>
  formatPlaylist(a) === formatPlaylist(b);

export const validatePlaylistText = (
  text: string,
  { limit = MAX_PLAYLISTS } = {},
): ValidationResult => {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      playlists: null,
      error: "Add at least one playlist mapping before saving.",
      warnings: [],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      playlists: null,
      error: error instanceof Error ? error.message : "Invalid JSON",
      warnings: [],
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {
      playlists: null,
      error: "Playlist JSON must be an object where each key maps to a playlist ID.",
      warnings: [],
    };
  }

  const entries = Object.entries(parsed as Record<string, unknown>);
  if (!entries.length) {
    return {
      playlists: null,
      error: "Add at least one playlist mapping before saving.",
      warnings: [],
    };
  }

  if (entries.length > limit) {
    return {
      playlists: null,
      error: `Limit playlists to ${limit} entries to keep the embed responsive.`,
      warnings: [],
    };
  }

  const normalized: [string, string][] = [];
  const seenLabels = new Set<string>();
  const seenIds = new Set<string>();
  const warnings: string[] = [];

  for (const [rawKey, rawValue] of entries) {
    const key = typeof rawKey === "string" ? rawKey.trim() : "";
    if (!key) {
      return {
        playlists: null,
        error: "Playlist names must be non-empty strings.",
        warnings: [],
      };
    }

    if (seenLabels.has(key.toLowerCase())) {
      return {
        playlists: null,
        error: `Duplicate playlist name: "${key}".`,
        warnings: [],
      };
    }

    if (typeof rawValue !== "string") {
      return {
        playlists: null,
        error: `Playlist "${key}" must map to a Spotify playlist ID string.`,
        warnings: [],
      };
    }

    const value = rawValue.trim();
    if (!SPOTIFY_ID_REGEX.test(value)) {
      return {
        playlists: null,
        error: `"${value}" is not a valid Spotify playlist ID.`,
        warnings: [],
      };
    }

    if (seenIds.has(value)) {
      warnings.push(
        `Playlist ID ${value} is used more than once. Duplicate IDs reuse the same embed.`,
      );
    }

    seenLabels.add(key.toLowerCase());
    seenIds.add(value);
    normalized.push([key, value]);
  }

  return {
    playlists: normalizePlaylistMap(Object.fromEntries(normalized)),
    error: null,
    warnings,
  };
};
