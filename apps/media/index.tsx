"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ChangeEvent, PointerEvent } from "react";

interface Track {
  title: string;
  artist: string;
  src: string;
}

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

const SNAP_MARGIN = 16;

const PLAYLIST: Track[] = [
  {
    title: "Nocturne Sketch",
    artist: "CC Ensemble",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    title: "Midnight Drive",
    artist: "Open Waves",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    title: "Orbiting Lights",
    artist: "Aetherfield",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
];

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const MediaPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<HTMLDivElement | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const playerSizeRef = useRef({ width: 0, height: 0 });
  const pointerIdRef = useRef<number | null>(null);
  const positionRef = useRef({ x: SNAP_MARGIN, y: SNAP_MARGIN });

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState({ x: SNAP_MARGIN, y: SNAP_MARGIN });
  const [corner, setCorner] = useState<Corner>("top-left");
  const [dragging, setDragging] = useState(false);
  const timelineId = useId();

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  const updateMetrics = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const newDuration = Number.isFinite(audio.duration) ? audio.duration : 0;
    setDuration(newDuration);
    setProgress(audio.currentTime);
  }, []);

  const snapToCorner = useCallback(
    (preferred?: Corner) => {
      const container = containerRef.current;
      const player = playerRef.current;
      if (!container || !player) return;

      const containerRect = container.getBoundingClientRect();
      const playerRect = player.getBoundingClientRect();
      const { width, height } = playerRect;

      const maxX = Math.max(
        SNAP_MARGIN,
        containerRect.width - width - SNAP_MARGIN,
      );
      const maxY = Math.max(
        SNAP_MARGIN,
        containerRect.height - height - SNAP_MARGIN,
      );

      const options: Record<Corner, { x: number; y: number }> = {
        "top-left": { x: SNAP_MARGIN, y: SNAP_MARGIN },
        "top-right": { x: maxX, y: SNAP_MARGIN },
        "bottom-left": { x: SNAP_MARGIN, y: maxY },
        "bottom-right": { x: maxX, y: maxY },
      };

      let target: Corner = preferred ?? "top-left";
      if (!preferred) {
        const current = positionRef.current;
        const centerX = current.x + width / 2;
        const centerY = current.y + height / 2;
        target = (Object.keys(options) as Corner[]).reduce((closest, key) => {
          const option = options[key];
          const optionCenterX = option.x + width / 2;
          const optionCenterY = option.y + height / 2;
          const closestOption = options[closest];
          const closestDistance = Math.hypot(
            centerX - (closestOption.x + width / 2),
            centerY - (closestOption.y + height / 2),
          );
          const optionDistance = Math.hypot(
            centerX - optionCenterX,
            centerY - optionCenterY,
          );
          return optionDistance < closestDistance ? key : closest;
        }, "top-left" as Corner);
      }

      setPosition(options[target]);
      setCorner(target);
    },
    [],
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => snapToCorner("bottom-right"));
    return () => cancelAnimationFrame(id);
  }, [snapToCorner]);

  useEffect(() => {
    const handleResize = () => snapToCorner(corner);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [corner, snapToCorner]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoaded = () => updateMetrics();
    const handleTimeUpdate = () => setProgress(audio.currentTime);
    const handleEnded = () => setIndex((i) => (i + 1) % PLAYLIST.length);

    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("loadeddata", handleLoaded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);

    handleLoaded();

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("loadeddata", handleLoaded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [index, updateMetrics]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    setProgress(0);
  }, [index]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => setIsPlaying(false));
      }
    } else {
      audio.pause();
    }
  }, [isPlaying, index]);

  const handlePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const handleNext = useCallback(() => {
    setIndex((i) => (i + 1) % PLAYLIST.length);
  }, []);

  const handlePrevious = useCallback(() => {
    setIndex((i) => (i - 1 + PLAYLIST.length) % PLAYLIST.length);
  }, []);

  const handleSeek = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    const audio = audioRef.current;
    if (!audio || Number.isNaN(value)) return;
    audio.currentTime = value;
    setProgress(value);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const player = playerRef.current;
    const container = containerRef.current;
    if (!player || !container) return;

    const playerRect = player.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - playerRect.left,
      y: event.clientY - playerRect.top,
    };
    playerSizeRef.current = {
      width: playerRect.width,
      height: playerRect.height,
    };
    pointerIdRef.current = event.pointerId;
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    event.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const { width, height } = playerSizeRef.current;
    if (!width || !height) return;

    const rawX =
      event.clientX - containerRect.left - dragOffsetRef.current.x;
    const rawY = event.clientY - containerRect.top - dragOffsetRef.current.y;

    const maxX = Math.max(
      SNAP_MARGIN,
      containerRect.width - width - SNAP_MARGIN,
    );
    const maxY = Math.max(
      SNAP_MARGIN,
      containerRect.height - height - SNAP_MARGIN,
    );

    setPosition({
      x: clamp(rawX, SNAP_MARGIN, maxX),
      y: clamp(rawY, SNAP_MARGIN, maxY),
    });
  };

  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setDragging(false);
    if (pointerIdRef.current !== null) {
      event.currentTarget.releasePointerCapture(pointerIdRef.current);
      pointerIdRef.current = null;
    }
    snapToCorner();
  };

  const track = PLAYLIST[index];
  const progressLabel = `${formatTime(progress)} of ${formatTime(duration)}`;
  const sliderMax = duration > 0 ? duration : Math.max(progress, 0.1);

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center bg-[var(--color-bg)] text-[var(--color-text)]"
    >
      <div
        ref={playerRef}
        style={{ left: position.x, top: position.y }}
        className={`pointer-events-auto absolute w-72 rounded-xl border border-white/10 bg-black/70 p-4 text-white shadow-lg backdrop-blur ${
          dragging ? "cursor-grabbing" : "cursor-default"
        }`}
        data-corner={corner}
      >
        <div
          className={`flex cursor-grab items-center justify-between gap-2 text-sm ${
            dragging ? "cursor-grabbing" : ""
          }`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          data-drag-handle="true"
        >
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wide text-white/60">
              Now playing
            </span>
            <span className="font-medium" aria-live="polite">
              {track.title}
            </span>
            <span className="text-xs text-white/70">{track.artist}</span>
          </div>
          <span aria-hidden="true" className="text-lg text-white/50">
            ⠿
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrevious}
              className="rounded-full bg-white/10 p-2 transition hover:bg-white/20 focus:outline-none focus-visible:ring"
              aria-label="Play previous track"
              title="Previous"
            >
              <span aria-hidden="true">⏮</span>
            </button>
            <button
              type="button"
              onClick={handlePlayPause}
              className="rounded-full bg-emerald-500 p-3 text-black transition hover:bg-emerald-400 focus:outline-none focus-visible:ring"
              aria-pressed={isPlaying}
              aria-label={isPlaying ? "Pause" : "Play"}
              title={isPlaying ? "Pause" : "Play"}
            >
              <span aria-hidden="true">{isPlaying ? "⏸" : "▶"}</span>
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="rounded-full bg-white/10 p-2 transition hover:bg-white/20 focus:outline-none focus-visible:ring"
              aria-label="Play next track"
              title="Next"
            >
              <span aria-hidden="true">⏭</span>
            </button>
          </div>
          <div className="text-right text-xs leading-tight text-white/70">
            <div>{formatTime(progress)}</div>
            <div>{formatTime(duration)}</div>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs text-white/70" htmlFor={timelineId}>
            Timeline
          </label>
          <input
            id={timelineId}
            type="range"
            min={0}
            max={sliderMax}
            step={0.1}
            value={progress}
            onChange={handleSeek}
            className="mt-1 h-1 w-full cursor-pointer appearance-none rounded bg-white/20 accent-emerald-400"
            aria-label="Timeline"
            aria-valuemin={0}
            aria-valuemax={Math.round(sliderMax)}
            aria-valuenow={Math.round(progress)}
            aria-valuetext={progressLabel}
          />
        </div>

        <audio
          ref={audioRef}
          src={track.src}
          preload="metadata"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};

export default MediaPlayer;
