"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import usePersistentState from "../../hooks/usePersistentState";
import CrossfadePlayer from "./utils/crossfade";
import Visualizer from "./Visualizer";
import Lyrics from "./Lyrics";

interface Track {
  title: string;
  url: string;
  cover?: string;
}

interface MiniPosition {
  x: number;
  y: number;
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

const isMiniPosition = (value: unknown): value is MiniPosition =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { x?: unknown; y?: unknown }).x === "number" &&
  typeof (value as { x?: unknown; y?: unknown }).y === "number";

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
  const [miniDetached, setMiniDetached] = usePersistentState(
    "spotify-mini",
    false,
    (v): v is boolean => typeof v === "boolean",
  );
  const [miniPosition, setMiniPosition] = usePersistentState<MiniPosition>(
    "spotify-mini-position",
    () => ({ x: 96, y: 96 }),
    isMiniPosition,
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
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

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

  useEffect(() => {
    if (!dragging || typeof window === "undefined") return;
    const updatePosition = (clientX: number, clientY: number) => {
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
      setMiniPosition(() => ({
        x: clientX - dragOffsetRef.current.x,
        y: clientY - dragOffsetRef.current.y,
      }));
    };
    const handlePointerMove = (event: PointerEvent) => {
      updatePosition(event.clientX, event.clientY);
    };
    const handlePointerUp = () => setDragging(false);
    const handleMouseMove = (event: MouseEvent) => {
      updatePosition(event.clientX, event.clientY);
    };
    const handleMouseUp = () => setDragging(false);
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length > 0) {
        const touch = event.touches[0];
        updatePosition(touch.clientX, touch.clientY);
      }
    };
    const handleTouchEnd = () => setDragging(false);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("touchmove", handleTouchMove);
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [dragging, setMiniPosition]);

  const startDragging = (clientX: number, clientY: number) => {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return;
    dragOffsetRef.current = {
      x: clientX - miniPosition.x,
      y: clientY - miniPosition.y,
    };
    setDragging(true);
  };

  const handleMiniPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.preventDefault();
    startDragging(event.clientX, event.clientY);
  };

  const handleMiniMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    startDragging(event.clientX, event.clientY);
  };

  const handleMiniTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 0) return;
    const touch = event.touches[0];
    startDragging(touch.clientX, touch.clientY);
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
  const renderProgress = (className?: string) =>
    duration > 0 ? (
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
        className={className ?? "w-full h-1"}
        disabled={!queue.length}
        aria-label="Track progress"
      />
    ) : null;

  const miniWindow =
    miniDetached && typeof document !== "undefined"
      ? createPortal(
          <div
            role="dialog"
            aria-label="Spotify mini player"
            data-testid="spotify-mini-player"
            className="fixed z-[9999] w-72 max-w-[90vw] rounded-lg border border-black/40 bg-[var(--color-bg)] text-[var(--color-text)] shadow-xl"
            style={{
              left: `${miniPosition.x}px`,
              top: `${miniPosition.y}px`,
            }}
            tabIndex={-1}
          >
            <div
              className="flex items-center justify-between bg-black/50 px-3 py-2 cursor-move select-none"
              onPointerDown={handleMiniPointerDown}
              onMouseDown={handleMiniMouseDown}
              onTouchStart={handleMiniTouchStart}
              data-testid="spotify-mini-drag-handle"
            >
              <span className="text-xs font-semibold uppercase tracking-wide text-white/80">
                Mini player
              </span>
              <button
                onClick={() => setMiniDetached(false)}
                className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
                title="Return to full player"
                type="button"
              >
                Full
              </button>
            </div>
            <div className="p-3 space-y-3 text-sm">
              <div>
                <p className="font-medium" aria-live="polite">
                  {currentTrack ? currentTrack.title : "No track selected"}
                </p>
                <p className="text-xs text-[var(--color-muted)]">
                  {currentTrack ? "Now playing" : "Load a track to begin"}
                </p>
              </div>
              {renderProgress("w-full h-1")}
              <div className="flex items-center justify-center space-x-2">
                <button
                  onClick={previous}
                  title="Previous"
                  disabled={!queue.length}
                  className="w-9 h-9 flex items-center justify-center rounded bg-black/20 hover:bg-black/30 disabled:opacity-50"
                  type="button"
                >
                  ⏮
                </button>
                <button
                  onClick={togglePlay}
                  title="Play/Pause"
                  disabled={!queue.length}
                  className="w-9 h-9 flex items-center justify-center rounded bg-black/20 hover:bg-black/30 disabled:opacity-50"
                  type="button"
                >
                  ⏯
                </button>
                <button
                  onClick={next}
                  title="Next"
                  disabled={!queue.length}
                  className="w-9 h-9 flex items-center justify-center rounded bg-black/20 hover:bg-black/30 disabled:opacity-50"
                  type="button"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <div
        className="h-full w-full bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col p-4"
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
              onClick={() => setMiniDetached(!miniDetached)}
              className="border px-2 py-1 rounded"
            >
              {miniDetached ? "Full" : "Mini"}
            </button>
          </div>
        </div>
        {!miniDetached && renderProgress("w-full h-1 mb-2")}
        {!miniDetached && currentTrack && (
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
        {miniDetached ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-sm">
            <p className="mb-3 max-w-sm">
              Mini player detached. Use the floating controls to manage playback or bring it back here.
            </p>
            <button
              onClick={() => setMiniDetached(false)}
              className="border px-3 py-1 rounded"
            >
              Return to full player
            </button>
            {currentTrack && (
              <p className="mt-3 text-xs text-[var(--color-muted)]">
                Now playing: {currentTrack.title}
              </p>
            )}
          </div>
        ) : (
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
      </div>
      {miniWindow}
    </>
  );
};

export default SpotifyApp;
