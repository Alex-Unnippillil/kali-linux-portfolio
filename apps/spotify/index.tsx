"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";
import CrossfadePlayer from "./utils/crossfade";
import Visualizer from "./Visualizer";
import Lyrics from "./Lyrics";
import useLibrary, {
  LibraryAlbum,
  LibraryPlaylist,
  LibraryTrack,
  LibraryFilter,
} from "./utils/useLibrary";

interface Track {
  title: string;
  url: string;
  cover?: string;
}

const DEFAULT_PLAYLIST = [
  {
    title: "Song 1",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    title: "Song 2",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    title: "Song 3",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
];

const serialize = (tracks: Track[]) => JSON.stringify(tracks, null, 2);

const isTrackArray = (v: unknown): v is Track[] =>
  Array.isArray(v) && v.every((t) => t && typeof t.url === "string");

const SpotifyApp = () => {
  const [playlistText, setPlaylistText] = usePersistentState(
    "spotify-playlist-text",
    () => serialize(DEFAULT_PLAYLIST),
  );
  const [queue, setQueue] = usePersistentState<Track[]>(
    "spotify-queue",
    () => DEFAULT_PLAYLIST,
    isTrackArray,
  );
  const [recent, setRecent] = usePersistentState<Track[]>(
    "spotify-recent",
    [],
    isTrackArray,
  );
  const [current, setCurrent] = usePersistentState<number>(
    "spotify-current-index",
    0,
    (v): v is number => typeof v === "number",
  );
  const [mini, setMini] = usePersistentState(
    "spotify-mini",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const [crossfade, setCrossfade] = usePersistentState<number>(
    "spotify-crossfade",
    0,
    (v): v is number => typeof v === "number",
  );
  const [gapless, setGapless] = usePersistentState(
    "spotify-gapless",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const {
    query: libraryQuery,
    setQuery: setLibraryQuery,
    category: libraryCategory,
    setCategory: setLibraryCategory,
    visible: visibleLibrary,
    counts: libraryCounts,
    getTrack: getLibraryTrack,
  } = useLibrary();
  const playerRef = useRef<CrossfadePlayer | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const loadPlaylist = () => {
    try {
      const parsed = JSON.parse(playlistText);
      if (isTrackArray(parsed)) {
        setQueue(parsed);
        setPlaylistText(serialize(parsed));
        setCurrent(0);
      }
    } catch {
      // ignore invalid JSON
    }
  };

  useEffect(() => {
    if (!queue.length) loadPlaylist();
    const player = new CrossfadePlayer();
    playerRef.current = player;
    setAnalyser(player.getAnalyser());
    return () => player.dispose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const track = queue[current];
    if (!track) return;
    setRecent((r) =>
      [track, ...r.filter((t) => t.url !== track.url)].slice(0, 10),
    );
    playerRef.current
      ?.play(track.url, crossfade)
      .then(() => {
        setDuration(playerRef.current?.getDuration() ?? 0);
        setProgress(0);
      });
  }, [current, queue, setRecent, crossfade]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      setProgress(playerRef.current?.getCurrentTime() ?? 0);
      raf = requestAnimationFrame(tick);
    };
      raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const queueLibraryTracks = (ids: string[]) => {
    setQueue((prev) => {
      const additions = ids
        .map((id) => getLibraryTrack(id))
        .filter((track): track is LibraryTrack => Boolean(track))
        .map((track) => ({
          title: track.title,
          url: track.url,
          cover: track.cover,
        }));

      if (!additions.length) {
        return prev;
      }

      const existing = new Set(prev.map((track) => track.url));
      const nextQueue = [...prev];
      let added = false;

      for (const track of additions) {
        if (existing.has(track.url)) continue;
        nextQueue.push(track);
        existing.add(track.url);
        added = true;
      }

      if (!added) {
        return prev;
      }

      setPlaylistText(serialize(nextQueue));
      if (!prev.length) {
        setCurrent(0);
      }

      return nextQueue;
    });
  };

  const queueCollection = (collection: LibraryAlbum | LibraryPlaylist) => {
    queueLibraryTracks(collection.tracks);
  };

  const next = () => {
    if (!queue.length) return;
    setCurrent((i) => (i + 1) % queue.length);
  };

  const previous = () => {
    if (!queue.length) return;
    setCurrent((i) => (i - 1 + queue.length) % queue.length);
  };

  const togglePlay = () => playerRef.current?.toggle();

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.code === "MediaTrackNext") {
      e.preventDefault();
      next();
    } else if (e.code === "MediaTrackPrevious") {
      e.preventDefault();
      previous();
    } else if (e.code === "MediaPlayPause") {
      e.preventDefault();
      togglePlay();
    }
  };

  const currentTrack = queue[current];

  const libraryFilters: { key: LibraryFilter; label: string }[] = useMemo(
    () => [
      { key: "all", label: `All (${libraryCounts.all})` },
      { key: "tracks", label: `Tracks (${libraryCounts.tracks})` },
      { key: "albums", label: `Albums (${libraryCounts.albums})` },
      { key: "playlists", label: `Playlists (${libraryCounts.playlists})` },
    ],
    [libraryCounts],
  );

  const hasVisibleLibraryResults =
    visibleLibrary.tracks.length +
      visibleLibrary.albums.length +
      visibleLibrary.playlists.length >
    0;

  return (
    <div
      className={`h-full w-full bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col ${
        mini ? "p-2" : "p-4"
      }`}
      tabIndex={0}
      onKeyDown={handleKey}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="space-x-1.5">
          <button
            onClick={previous}
            title="Previous"
            disabled={!queue.length}
            className="w-9 h-9 flex items-center justify-center"
          >
            ⏮
          </button>
          <button
            onClick={togglePlay}
            title="Play/Pause"
            disabled={!queue.length}
            className="w-9 h-9 flex items-center justify-center"
          >
            ⏯
          </button>
          <button
            onClick={next}
            title="Next"
            disabled={!queue.length}
            className="w-9 h-9 flex items-center justify-center"
          >
            ⏭
          </button>
        </div>
        <div className="space-x-4 text-sm flex items-center">
          <label className="flex items-center space-x-1">
            <span>Crossfade</span>
            <input
              type="range"
              min={0}
              max={12}
              value={crossfade}
              onChange={(e) => setCrossfade(Number(e.target.value))}
            />
          </label>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={gapless}
              onChange={(e) => setGapless(e.target.checked)}
            />
            <span>Gapless</span>
          </label>
          <button
            onClick={() => setMini(!mini)}
            className="border px-2 py-1 rounded"
          >
            {mini ? "Full" : "Mini"}
          </button>
        </div>
      </div>
      {duration > 0 && (
        <input
          type="range"
          min={0}
          max={duration}
          value={progress}
          onChange={(e) => {
            const t = Number(e.target.value);
            playerRef.current?.seek(t);
            setProgress(t);
          }}
          className="w-full h-1 mb-2"
          disabled={!queue.length}
        />
      )}
      {currentTrack && (
        <div className="mt-2">
          <div className="relative w-32 aspect-square mb-2 shadow-lg overflow-hidden">
            {currentTrack.cover ? (
              <img
                src={currentTrack.cover}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[var(--color-muted)]" />
            )}
            <div className="absolute inset-0 bg-black/40" />
          </div>
          <p className="mb-2">{currentTrack.title}</p>
          {analyser && <Visualizer analyser={analyser} />}
          <Lyrics title={currentTrack.title} player={playerRef.current} />
        </div>
      )}
      {!mini && (
        <div className="flex-1 overflow-auto mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="hidden md:block">
            <h2 className="mb-2 text-lg">Playlist JSON</h2>
            <textarea
              className="w-full h-40 text-black p-1"
              value={playlistText}
              onChange={(e) => setPlaylistText(e.target.value)}
            />
            <button
              onClick={loadPlaylist}
              className="mt-2 rounded bg-blue-600 px-2 py-1 text-sm"
            >
              Load Playlist
            </button>
            <h2 className="mt-4 mb-2 text-lg">Queue</h2>
            <ul className="max-h-40 overflow-auto border border-gray-700 rounded">
              {queue.map((t, i) => (
                <li key={t.url} className={i === current ? "bg-gray-700" : ""}>
                  <button
                    className="w-full text-left px-2 py-1 hover:bg-gray-600 focus:outline-none"
                    onClick={() => setCurrent(i)}
                  >
                    {t.title || t.url}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-lg">Recently Played</h2>
            <ul className="max-h-72 overflow-auto border border-gray-700 rounded">
              {recent.map((t) => (
                <li
                  key={t.url}
                  className="px-2 py-1 border-b border-gray-700 last:border-b-0"
                >
                  {t.title || t.url}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-lg">Library Search</h2>
            <div className="space-y-2">
              <input
                type="search"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Search tracks, albums, playlists"
                className="w-full rounded border border-gray-700 bg-[var(--color-bg)] px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-2 text-xs">
                {libraryFilters.map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => setLibraryCategory(filter.key)}
                    className={`rounded px-2 py-1 border ${
                      libraryCategory === filter.key
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-gray-700"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-3 max-h-72 overflow-auto border border-gray-700 rounded p-2">
              {libraryCounts.all === 0 ? (
                <p className="text-sm text-gray-300">No matches found.</p>
              ) : hasVisibleLibraryResults ? (
                <>
                  {visibleLibrary.tracks.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Tracks
                      </h3>
                      <ul className="mt-1 space-y-1">
                        {visibleLibrary.tracks.map((track) => (
                          <li
                            key={track.id}
                            className="flex items-center justify-between gap-2 rounded border border-gray-700 px-2 py-1"
                          >
                            <div>
                              <p className="text-sm font-medium">{track.title}</p>
                              <p className="text-xs text-gray-400">
                                {track.artist} · {track.album}
                              </p>
                            </div>
                            <button
                              className="rounded bg-blue-600 px-2 py-1 text-xs"
                              onClick={() => queueLibraryTracks([track.id])}
                            >
                              Add
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {visibleLibrary.albums.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Albums
                      </h3>
                      <ul className="mt-1 space-y-2">
                        {visibleLibrary.albums.map((album) => (
                          <li
                            key={album.id}
                            className="rounded border border-gray-700 p-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">{album.title}</p>
                                <p className="text-xs text-gray-400">
                                  {album.artist} · {album.year}
                                </p>
                              </div>
                              <button
                                className="rounded bg-blue-600 px-2 py-1 text-xs"
                                onClick={() => queueCollection(album)}
                              >
                                Queue Album
                              </button>
                            </div>
                            <ul className="mt-2 space-y-0.5 text-xs text-gray-400">
                              {album.tracks.map((trackId) => {
                                const track = getLibraryTrack(trackId);
                                return (
                                  <li key={trackId}>
                                    {track ? track.title : trackId}
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {visibleLibrary.playlists.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
                        Playlists
                      </h3>
                      <ul className="mt-1 space-y-2">
                        {visibleLibrary.playlists.map((playlist) => (
                          <li
                            key={playlist.id}
                            className="rounded border border-gray-700 p-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-sm font-medium">{playlist.title}</p>
                                <p className="text-xs text-gray-400">
                                  {playlist.description}
                                </p>
                              </div>
                              <button
                                className="rounded bg-blue-600 px-2 py-1 text-xs"
                                onClick={() => queueCollection(playlist)}
                              >
                                Queue Playlist
                              </button>
                            </div>
                            <ul className="mt-2 space-y-0.5 text-xs text-gray-400">
                              {playlist.tracks.map((trackId) => {
                                const track = getLibraryTrack(trackId);
                                return (
                                  <li key={trackId}>
                                    {track ? `${track.title} · ${track.artist}` : trackId}
                                  </li>
                                );
                              })}
                            </ul>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-300">
                  No matches for the selected filter.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyApp;
