"use client";

import {
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import usePersistentState from "../../hooks/usePersistentState";
import {
  getNearestCorner,
  isMiniPlayerCorner,
  MiniPlayerCorner,
} from "./position";

const CORNER_KEY = "media:mini-corner";
const DRAG_MARGIN = 16;

const safeOffset = (side: "top" | "bottom" | "left" | "right") =>
  `calc(env(safe-area-inset-${side}, 0px) + ${DRAG_MARGIN}px)`;

const cornerStyles: Record<MiniPlayerCorner, CSSProperties> = {
  "top-left": { top: safeOffset("top"), left: safeOffset("left") },
  "top-right": { top: safeOffset("top"), right: safeOffset("right") },
  "bottom-left": {
    bottom: safeOffset("bottom"),
    left: safeOffset("left"),
  },
  "bottom-right": {
    bottom: safeOffset("bottom"),
    right: safeOffset("right"),
  },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
};

const moveCornerWithKey = (
  corner: MiniPlayerCorner,
  key: string,
): MiniPlayerCorner => {
  const [vertical, horizontal] = corner.split("-") as [
    "top" | "bottom",
    "left" | "right",
  ];
  switch (key) {
    case "ArrowUp":
      return (vertical === "top"
        ? corner
        : ("top-" + horizontal)) as MiniPlayerCorner;
    case "ArrowDown":
      return (vertical === "bottom"
        ? corner
        : ("bottom-" + horizontal)) as MiniPlayerCorner;
    case "ArrowLeft":
      return (horizontal === "left"
        ? corner
        : (`${vertical}-left` as MiniPlayerCorner));
    case "ArrowRight":
      return (horizontal === "right"
        ? corner
        : (`${vertical}-right` as MiniPlayerCorner));
    default:
      return corner;
  }
};

interface MiniPlayerProps {
  visible: boolean;
  title?: string;
  artwork?: string;
  isPlaying: boolean;
  progress: number;
  duration: number;
  disabled?: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (time: number) => void;
  onExit?: () => void;
}

const MiniPlayer = ({
  visible,
  title,
  artwork,
  isPlaying,
  progress,
  duration,
  disabled,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onExit,
}: MiniPlayerProps) => {
  const [corner, setCorner] = usePersistentState<MiniPlayerCorner>(
    CORNER_KEY,
    "bottom-right",
    isMiniPlayerCorner,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef<{
    dx: number;
    dy: number;
    width: number;
    height: number;
  } | null>(null);
  const [dragPosition, setDragPosition] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const dragPositionRef = useRef<typeof dragPosition>(dragPosition);
  useEffect(() => {
    dragPositionRef.current = dragPosition;
  }, [dragPosition]);

  const moveHandlerRef = useRef<((event: PointerEvent) => void) | null>(null);
  const upHandlerRef = useRef<((event: PointerEvent) => void) | null>(null);

  const cleanupListeners = useCallback(() => {
    if (moveHandlerRef.current) {
      document.removeEventListener("pointermove", moveHandlerRef.current);
      moveHandlerRef.current = null;
    }
    if (upHandlerRef.current) {
      document.removeEventListener("pointerup", upHandlerRef.current);
      document.removeEventListener("pointercancel", upHandlerRef.current);
      upHandlerRef.current = null;
    }
  }, []);

  useEffect(() => cleanupListeners, [cleanupListeners]);

  const startDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      if (typeof window === "undefined") return;
      event.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width ?? 280;
      const height = rect?.height ?? 140;
      offsetRef.current = {
        dx: event.clientX - (rect?.left ?? event.clientX),
        dy: event.clientY - (rect?.top ?? event.clientY),
        width,
        height,
      };
      setDragPosition({
        left: rect?.left ?? event.clientX - width / 2,
        top: rect?.top ?? event.clientY - height / 2,
      });
      setCorner((current) => current); // ensure state hydration before drag
      setTimeout(() => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }, 0);
      const handleMove = (e: PointerEvent) => {
        if (!offsetRef.current) return;
        const { dx, dy, width: w, height: h } = offsetRef.current;
        const maxLeft = Math.max(
          DRAG_MARGIN,
          window.innerWidth - w - DRAG_MARGIN,
        );
        const maxTop = Math.max(
          DRAG_MARGIN,
          window.innerHeight - h - DRAG_MARGIN,
        );
        const left = clamp(e.clientX - dx, DRAG_MARGIN, maxLeft);
        const top = clamp(e.clientY - dy, DRAG_MARGIN, maxTop);
        setDragPosition({ left, top });
      };
      const handleUp = (e: PointerEvent) => {
        const info = offsetRef.current;
        const pos = dragPositionRef.current;
        if (info && pos && typeof window !== "undefined") {
          const centerX = pos.left + info.width / 2;
          const centerY = pos.top + info.height / 2;
          const next = getNearestCorner(
            centerX,
            centerY,
            window.innerWidth,
            window.innerHeight,
          );
          setCorner(next);
        }
        offsetRef.current = null;
        setDragPosition(null);
        cleanupListeners();
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      };
      moveHandlerRef.current = handleMove;
      upHandlerRef.current = handleUp;
      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
      document.addEventListener("pointercancel", handleUp);
    },
    [cleanupListeners, setCorner],
  );

  const handleHeaderKey = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const next = moveCornerWithKey(corner, event.key);
    if (next !== corner) {
      event.preventDefault();
      setCorner(next);
    }
  };

  const style = useMemo(() => {
    const base: CSSProperties = {
      position: "fixed",
      zIndex: 60,
      width: "min(320px, calc(100vw - 2rem))",
    };
    if (dragPosition) {
      return {
        ...base,
        top: `${dragPosition.top}px`,
        left: `${dragPosition.left}px`,
      };
    }
    const placement = cornerStyles[corner];
    return { ...base, ...placement };
  }, [corner, dragPosition]);

  if (!visible) return null;

  const hasTrack = Boolean(title);
  const disable = disabled || !hasTrack;
  const safeDuration = duration > 0 ? duration : 0;
  const sliderMax = safeDuration > 0 ? safeDuration : 1;
  const sliderValue = safeDuration > 0 ? clamp(progress, 0, safeDuration) : 0;
  const progressLabel = formatTime(sliderValue);
  const durationLabel = safeDuration > 0 ? formatTime(safeDuration) : "0:00";

  return (
    <div
      ref={containerRef}
      style={style}
      className={`pointer-events-auto select-none rounded-xl border border-white/10 bg-[var(--color-bg,#111827)]/95 text-[var(--color-text,#f9fafb)] shadow-2xl backdrop-blur-sm transition-shadow ${dragPosition ? "ring-2 ring-blue-500" : ""}`}
      role="group"
      aria-label="Mini player"
    >
      <div
        className={`flex items-center gap-3 border-b border-white/10 px-4 py-3 ${dragPosition ? "cursor-grabbing" : "cursor-grab"}`}
        onPointerDown={startDrag}
        onKeyDown={handleHeaderKey}
        tabIndex={0}
        aria-label="Mini player handle. Drag to move or use arrow keys to snap to corners."
      >
        {artwork ? (
          <img
            src={artwork}
            alt=""
            className="h-12 w-12 flex-none rounded object-cover"
            aria-hidden
          />
        ) : (
          <div
            className="h-12 w-12 flex-none rounded bg-[var(--color-muted,#1f2937)]"
            aria-hidden
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" aria-live="polite">
            {hasTrack ? title : "Nothing playing"}
          </p>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="mt-1 text-xs text-[var(--color-accent,#38bdf8)] underline decoration-dotted transition hover:decoration-solid focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black/0"
            >
              Return to full player
            </button>
          )}
        </div>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrevious}
              disabled={disable}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40"
              aria-label="Previous track"
            >
              ⏮
            </button>
            <button
              type="button"
              onClick={onTogglePlay}
              disabled={disable}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-lg transition hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40"
              aria-label={isPlaying ? "Pause" : "Play"}
              aria-pressed={isPlaying}
            >
              {isPlaying ? "⏸" : "▶"}
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={disable}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-lg transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40"
              aria-label="Next track"
            >
              ⏭
            </button>
          </div>
          <span className="text-xs text-white/70" aria-live="polite">
            {progressLabel} / {durationLabel}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={sliderMax}
          step={0.01}
          value={sliderValue}
          onChange={(event) => onSeek(Number(event.target.value))}
          disabled={disable || safeDuration === 0}
          className="mt-3 w-full accent-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-40"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={safeDuration}
          aria-valuenow={sliderValue}
          aria-valuetext={`${progressLabel} of ${durationLabel}`}
        />
      </div>
    </div>
  );
};

export default MiniPlayer;
