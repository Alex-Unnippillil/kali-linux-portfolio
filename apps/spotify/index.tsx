"use client";

import { useEffect, useRef, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";
import MiniPlayer from "../media/MiniPlayer";
import CrossfadePlayer from "./utils/crossfade";
import Visualizer from "./Visualizer";
import Lyrics from "./Lyrics";

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
  const playerRef = useRef<CrossfadePlayer | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const playingRef = useRef(playing);
  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

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
    if (!track) {
      setDuration(0);
      setProgress(0);
      setPlaying(false);
      return;
    }
    setRecent((r) =>
      [track, ...r.filter((t) => t.url !== track.url)].slice(0, 10),
    );
    const result = playerRef.current?.play(track.url, crossfade);
    if (result) {
      setPlaying(true);
      result.then((state) => {
        setDuration(playerRef.current?.getDuration() ?? 0);
        setProgress(0);
        if (state) setPlaying(state === "running");
      });
    } else {
      setPlaying(false);
    }
  }, [current, queue, setRecent, crossfade]);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const player = playerRef.current;
      if (player) {
        setProgress(player.getCurrentTime() ?? 0);
        const state = player.getState();
        if (state) {
          const isRunning = state === "running";
          if (playingRef.current !== isRunning) {
            setPlaying(isRunning);
          }
        }
      } else {
        setProgress(0);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const next = () => {
    if (!queue.length) return;
    setCurrent((i) => (i + 1) % queue.length);
    setPlaying(true);
  };

  const previous = () => {
    if (!queue.length) return;
    setCurrent((i) => (i - 1 + queue.length) % queue.length);
    setPlaying(true);
  };

  const togglePlay = () => {
    const toggled = playerRef.current?.toggle();
    if (toggled) {
      toggled.then((state) => {
        if (state) setPlaying(state === "running");
      });
    }
  };

  const seekTo = (time: number) => {
    playerRef.current?.seek(time);
    setProgress(time);
  };

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
            title={playing ? "Pause" : "Play"}
            disabled={!queue.length}
            aria-pressed={playing}
            className="w-9 h-9 flex items-center justify-center"
          >
            {playing ? "⏸" : "▶"}
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
            aria-pressed={mini}
            aria-label={mini ? "Return to full player" : "Open mini player"}
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
          onChange={(e) => seekTo(Number(e.target.value))}
          className="w-full h-1 mb-2"
          disabled={!queue.length || duration === 0}
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
      <MiniPlayer
        visible={mini}
        title={currentTrack?.title}
        artwork={currentTrack?.cover}
        isPlaying={playing}
        progress={progress}
        duration={duration}
        disabled={!currentTrack}
        onTogglePlay={togglePlay}
        onNext={next}
        onPrevious={previous}
        onSeek={seekTo}
        onExit={() => setMini(false)}
      />
    </div>
  );
};

export default SpotifyApp;
