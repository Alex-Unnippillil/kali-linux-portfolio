"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import usePersistentState from "../../hooks/usePersistentState";
import CrossfadePlayer from "./utils/crossfade";
import Visualizer from "./Visualizer";
import Lyrics from "./Lyrics";
import {
  filterLibrary,
  spotifyLibrary,
  toQueueTracks,
  type LibraryAlbum,
  type LibraryPlaylist,
  type LibraryTrack,
  type QueueTrack,
} from "./library";
const FALLBACK_PLAYLIST: QueueTrack[] = [
  {
    id: "fallback-neon-drive",
    title: "Neon Drive",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "/themes/Yaru/apps/spotify.svg",
    artist: "SoundHelix Ensemble",
    album: "Kali Nights",
  },
  {
    id: "fallback-midnight-terminal",
    title: "Midnight Terminal",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "/themes/Yaru/apps/spotify.svg",
    artist: "SoundHelix Ensemble",
    album: "Kali Nights",
  },
  {
    id: "fallback-cyan-aurora",
    title: "Cyan Aurora",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "/themes/Yaru/apps/spotify.svg",
    artist: "Echo Sector",
    album: "Polar Wave",
  },
];

const DEFAULT_PLAYLIST: QueueTrack[] =
  spotifyLibrary.playlists.length > 0
    ? toQueueTracks(spotifyLibrary.playlists[0].tracks)
    : FALLBACK_PLAYLIST;

const isTrackArray = (v: unknown): v is QueueTrack[] =>
  Array.isArray(v) && v.every((t) => t && typeof t.url === "string");

type FilterMode = "tracks" | "albums" | "playlists";

const cloneQueue = (tracks: QueueTrack[]) => tracks.map((track) => ({ ...track }));

const FILTER_ORDER: FilterMode[] = ["tracks", "albums", "playlists"];

const MODE_LABELS: Record<FilterMode, string> = {
  tracks: "Tracks",
  albums: "Albums",
  playlists: "Playlists",
};

const SpotifyApp = () => {
  const library = spotifyLibrary;
  const [queue, setQueue] = usePersistentState<QueueTrack[]>(
    "spotify-queue",
    () => cloneQueue(DEFAULT_PLAYLIST),
    isTrackArray,
  );
  const [recent, setRecent] = usePersistentState<QueueTrack[]>(
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
  const playerRef = useRef<CrossfadePlayer | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filterMode, setFilterMode] = useState<FilterMode>("tracks");

  const filteredLibrary = useMemo(
    () => filterLibrary(library, deferredSearch),
    [library, deferredSearch],
  );

  const resetToDefaultQueue = () => {
    setQueue(cloneQueue(DEFAULT_PLAYLIST));
    setCurrent(0);
  };

  const playTracks = (tracks: LibraryTrack[]) => {
    const queueTracks = toQueueTracks(tracks);
    if (!queueTracks.length) return;
    setQueue(queueTracks);
    setCurrent(0);
  };

  const enqueueTracks = (tracks: LibraryTrack[]) => {
    const additions = toQueueTracks(tracks);
    if (!additions.length) return;
    let shouldResetCurrent = false;
    setQueue((existing) => {
      const seen = new Set(existing.map((item) => item.url));
      const deduped: QueueTrack[] = [];
      additions.forEach((track) => {
        if (seen.has(track.url)) {
          return;
        }
        seen.add(track.url);
        deduped.push(track);
      });
      if (!deduped.length) {
        return existing;
      }
      if (!existing.length) {
        shouldResetCurrent = true;
      }
      return [...existing, ...deduped];
    });
    if (shouldResetCurrent) {
      setCurrent(0);
    }
  };

  const handlePlayTrack = (track: LibraryTrack) => playTracks([track]);
  const handleQueueTrack = (track: LibraryTrack) => enqueueTracks([track]);
  const handlePlayAlbum = (album: LibraryAlbum) => playTracks(album.tracks);
  const handleQueueAlbum = (album: LibraryAlbum) => enqueueTracks(album.tracks);
  const handlePlayPlaylist = (playlist: LibraryPlaylist) =>
    playTracks(playlist.tracks);
  const handleQueuePlaylist = (playlist: LibraryPlaylist) =>
    enqueueTracks(playlist.tracks);

  useEffect(() => {
    if (!queue.length) resetToDefaultQueue();
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

  const counts = {
    tracks: filteredLibrary.tracks.length,
    albums: filteredLibrary.albums.length,
    playlists: filteredLibrary.playlists.length,
  };
  const trimmedSearch = search.trim();
  const currentTrack = queue[current];

  const noResultsMessage = trimmedSearch
    ? `No ${MODE_LABELS[filterMode].toLowerCase()} match “${trimmedSearch}”.`
    : `No ${MODE_LABELS[filterMode].toLowerCase()} available.`;

  let libraryContent: ReactNode;
  if (filterMode === "tracks") {
    libraryContent = filteredLibrary.tracks.length ? (
      <ul className="divide-y divide-gray-700">
        {filteredLibrary.tracks.map((track) => {
          const meta = [track.artist, track.album]
            .filter(Boolean)
            .join(" • ");
          return (
            <li
              key={track.id}
              className="px-2 py-2 transition-colors hover:bg-gray-700/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium leading-snug">{track.title}</p>
                  {meta && (
                    <p className="text-xs text-[var(--color-muted)]">{meta}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    className="rounded border border-gray-600 px-2 py-1 text-xs transition-colors hover:border-blue-500"
                    onClick={() => handlePlayTrack(track)}
                  >
                    Play
                  </button>
                  <button
                    className="rounded border border-gray-600 px-2 py-1 text-xs transition-colors hover:border-blue-500"
                    onClick={() => handleQueueTrack(track)}
                  >
                    Queue
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="px-2 py-3 text-sm text-[var(--color-muted)]">{noResultsMessage}</p>
    );
  } else if (filterMode === "albums") {
    libraryContent = filteredLibrary.albums.length ? (
      <ul className="divide-y divide-gray-700">
        {filteredLibrary.albums.map((album) => (
          <li
            key={album.id}
            className="px-2 py-2 transition-colors hover:bg-gray-700/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium leading-snug">{album.title}</p>
                <p className="text-xs text-[var(--color-muted)]">
                  {album.artist} • {album.tracks.length} tracks
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  className="rounded border border-gray-600 px-2 py-1 text-xs transition-colors hover:border-blue-500"
                  onClick={() => handlePlayAlbum(album)}
                >
                  Play
                </button>
                <button
                  className="rounded border border-gray-600 px-2 py-1 text-xs transition-colors hover:border-blue-500"
                  onClick={() => handleQueueAlbum(album)}
                >
                  Queue
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="px-2 py-3 text-sm text-[var(--color-muted)]">{noResultsMessage}</p>
    );
  } else {
    libraryContent = filteredLibrary.playlists.length ? (
      <ul className="divide-y divide-gray-700">
        {filteredLibrary.playlists.map((playlist) => (
          <li
            key={playlist.id}
            className="px-2 py-2 transition-colors hover:bg-gray-700/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium leading-snug">{playlist.title}</p>
                {playlist.description && (
                  <p className="text-xs text-[var(--color-muted)]">
                    {playlist.description}
                  </p>
                )}
                <p className="text-xs text-[var(--color-muted)]">
                  {playlist.tracks.length} tracks
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  className="rounded border border-gray-600 px-2 py-1 text-xs transition-colors hover:border-blue-500"
                  onClick={() => handlePlayPlaylist(playlist)}
                >
                  Play
                </button>
                <button
                  className="rounded border border-gray-600 px-2 py-1 text-xs transition-colors hover:border-blue-500"
                  onClick={() => handleQueuePlaylist(playlist)}
                >
                  Queue
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="px-2 py-3 text-sm text-[var(--color-muted)]">{noResultsMessage}</p>
    );
  }

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
        <div className="flex-1 overflow-auto mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-lg">Library</h2>
                <button
                  onClick={resetToDefaultQueue}
                  className="rounded border border-gray-700 px-2 py-1 text-xs transition-colors hover:border-blue-500"
                >
                  Reset Queue
                </button>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tracks, albums, playlists"
                className="w-full rounded border border-gray-700 bg-[var(--color-bg)] px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
              />
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {FILTER_ORDER.map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilterMode(mode)}
                    className={`rounded border px-2 py-1 transition-colors ${
                      filterMode === mode
                        ? "border-blue-500 bg-blue-600 text-white"
                        : "border-gray-700 hover:border-blue-500"
                    }`}
                  >
                    {MODE_LABELS[mode]} ({counts[mode]})
                  </button>
                ))}
              </div>
              <div className="mt-3 max-h-64 overflow-auto rounded border border-gray-700">
                {libraryContent}
              </div>
            </div>
            <div>
              <h2 className="mt-4 mb-2 text-lg">Queue</h2>
              {queue.length ? (
                <ul className="max-h-40 overflow-auto rounded border border-gray-700 divide-y divide-gray-700">
                  {queue.map((t, i) => {
                    const meta = [t.artist, t.album]
                      .filter(Boolean)
                      .join(" • ");
                    return (
                      <li key={t.url} className={i === current ? "bg-gray-700/60" : ""}>
                        <button
                          className="w-full px-2 py-2 text-left hover:bg-gray-600 focus:outline-none"
                          onClick={() => setCurrent(i)}
                        >
                          <span className="block text-sm font-medium">
                            {t.title || t.url}
                          </span>
                          {meta && (
                            <span className="block text-xs text-[var(--color-muted)]">
                              {meta}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded border border-gray-700 px-2 py-2 text-sm text-[var(--color-muted)]">
                  Queue is empty. Choose something from the library to start.
                </p>
              )}
            </div>
          </div>
          <div>
            <h2 className="mb-2 text-lg">Recently Played</h2>
            {recent.length ? (
              <ul className="max-h-72 overflow-auto rounded border border-gray-700 divide-y divide-gray-700">
                {recent.map((t) => {
                  const meta = [t.artist, t.album]
                    .filter(Boolean)
                    .join(" • ");
                  return (
                    <li key={t.url} className="px-2 py-2">
                      <span className="block text-sm font-medium">
                        {t.title || t.url}
                      </span>
                      {meta && (
                        <span className="block text-xs text-[var(--color-muted)]">
                          {meta}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="rounded border border-gray-700 px-2 py-2 text-sm text-[var(--color-muted)]">
                Nothing here yet. Play a track to populate your history.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SpotifyApp;
