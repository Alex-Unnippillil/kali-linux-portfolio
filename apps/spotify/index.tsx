"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import usePersistentState from "../../hooks/usePersistentState";
import CrossfadePlayer from "./utils/crossfade";
import Visualizer from "./Visualizer";
import Lyrics from "./Lyrics";
import MediaIndicator from "./MediaIndicator";

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

type IndicatorState = {
  id: number;
  message: string;
};

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
  const playerRef = useRef<CrossfadePlayer | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(false);
  const indicatorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const indicatorId = useRef(0);
  const [indicator, setIndicator] = useState<IndicatorState | null>(null);
  const queueRef = useRef(queue);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const showIndicator = useCallback((message: string) => {
    indicatorId.current += 1;
    setIndicator({ id: indicatorId.current, message });
    if (indicatorTimeout.current) {
      clearTimeout(indicatorTimeout.current);
    }
    indicatorTimeout.current = setTimeout(() => {
      setIndicator(null);
      indicatorTimeout.current = null;
    }, 1200);
  }, []);

  useEffect(
    () => () => {
      if (indicatorTimeout.current) {
        clearTimeout(indicatorTimeout.current);
        indicatorTimeout.current = null;
      }
    },
    [],
  );

  const setPlayingState = useCallback(
    (value: boolean) => {
      isPlayingRef.current = value;
      setIsPlaying(value);
    },
    [],
  );

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

  const advance = useCallback(
    (direction: 1 | -1) => {
      const q = queueRef.current;
      const length = q.length;
      if (!length) return;
      setCurrent((i) => (i + (direction === 1 ? 1 : -1) + length) % length);
      showIndicator(direction === 1 ? "Next track" : "Previous track");
    },
    [setCurrent, showIndicator],
  );

  const next = useCallback(() => advance(1), [advance]);

  const previous = useCallback(() => advance(-1), [advance]);

  const togglePlay = useCallback(() => {
    const wasPlaying = isPlayingRef.current;
    playerRef.current?.toggle();
    const playing = !wasPlaying;
    setPlayingState(playing);
    showIndicator(playing ? "Playing" : "Paused");
  }, [setPlayingState, showIndicator]);

  const handleMediaKey = useCallback(
    (code: string) => {
      if (code === "MediaTrackNext") {
        next();
      } else if (code === "MediaTrackPrevious") {
        previous();
      } else if (code === "MediaPlayPause") {
        togglePlay();
      }
    },
    [next, previous, togglePlay],
  );

  const handleKey = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (
      e.code !== "MediaTrackNext" &&
      e.code !== "MediaTrackPrevious" &&
      e.code !== "MediaPlayPause"
    ) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    handleMediaKey(e.code);
  };

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (
        event.code !== "MediaTrackNext" &&
        event.code !== "MediaTrackPrevious" &&
        event.code !== "MediaPlayPause"
      ) {
        return;
      }

      const root = document.getElementById("spotify");
      let isFocused = false;
      if (root) {
        if (!root.classList.contains("notFocused")) {
          const active = document.activeElement;
          isFocused = !!active && (root === active || root.contains(active));
        }
      } else if (typeof document.hasFocus === "function") {
        isFocused = document.hasFocus();
      } else {
        isFocused = true;
      }

      if (!isFocused) return;

      event.preventDefault();
      event.stopPropagation();
      handleMediaKey(event.code);
    };

    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [handleMediaKey]);

  const currentTrack = queue[current];

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
            aria-label="Previous"
            disabled={!queue.length}
            className="w-9 h-9 flex items-center justify-center"
          >
            ⏮
          </button>
          <button
            onClick={togglePlay}
            title="Play/Pause"
            aria-label="Play/Pause"
            disabled={!queue.length}
            aria-pressed={isPlaying}
            className="w-9 h-9 flex items-center justify-center"
          >
            ⏯
          </button>
          <button
            onClick={next}
            title="Next"
            aria-label="Next"
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
              aria-label="Crossfade duration"
            />
          </label>
          <label className="flex items-center space-x-1">
            <input
              type="checkbox"
              checked={gapless}
              onChange={(e) => setGapless(e.target.checked)}
              aria-label="Enable gapless playback"
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
          aria-label="Playback position"
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
          <div className="hidden md:block">
            <h2 className="mb-2 text-lg">Playlist JSON</h2>
            <textarea
              className="w-full h-40 text-black p-1"
              value={playlistText}
              onChange={(e) => setPlaylistText(e.target.value)}
              aria-label="Playlist JSON"
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
        </div>
      )}
      <MediaIndicator action={indicator?.message ?? null} />
    </div>
  );
};

export default SpotifyApp;
