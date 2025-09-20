"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import ReactDOM from "react-dom";
import usePersistentState from "../../../hooks/usePersistentState";

interface TrackSummary {
  title?: string;
  cover?: string;
}

interface Position {
  x: number;
  y: number;
}

const isPosition = (value: unknown): value is Position => {
  if (typeof value !== "object" || value === null) return false;
  const maybe = value as Record<string, unknown>;
  return (
    typeof maybe.x === "number" &&
    Number.isFinite(maybe.x) &&
    typeof maybe.y === "number" &&
    Number.isFinite(maybe.y)
  );
};

const formatTime = (value: number) => {
  if (!Number.isFinite(value) || value < 0) return "0:00";
  const totalSeconds = Math.floor(value);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

interface MiniPlayerProps {
  track?: TrackSummary;
  progress: number;
  duration: number;
  canControl: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePlay: () => void;
  onExit?: () => void;
}

const MiniPlayer = ({
  track,
  progress,
  duration,
  canControl,
  onNext,
  onPrevious,
  onTogglePlay,
  onExit,
}: MiniPlayerProps) => {
  const [detached, setDetached] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const dragging = useRef(false);
  const pointerActive = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const [position, setPosition] = usePersistentState<Position>(
    "spotify-mini-player-position",
    () => ({ x: 24, y: 24 }),
    isPosition,
  );

  const portalContainer = useMemo(() => {
    if (!detached || typeof document === "undefined") return null;
    return document.createElement("div");
  }, [detached]);

  useEffect(() => {
    if (!portalContainer) return;
    portalContainer.style.position = "fixed";
    portalContainer.style.top = "0";
    portalContainer.style.left = "0";
    portalContainer.style.width = "0";
    portalContainer.style.height = "0";
    portalContainer.style.pointerEvents = "none";
    portalContainer.style.zIndex = "2000";
    document.body.appendChild(portalContainer);
    return () => {
      portalContainer.remove();
    };
  }, [portalContainer]);

  const clampToViewport = useCallback(
    (x: number, y: number): Position => {
      if (typeof window === "undefined") {
        return { x, y };
      }
      const el = containerRef.current;
      const width = el?.offsetWidth ?? 0;
      const height = el?.offsetHeight ?? 0;
      const maxX = Math.max(0, window.innerWidth - width);
      const maxY = Math.max(0, window.innerHeight - height);
      return {
        x: Math.min(Math.max(0, x), maxX),
        y: Math.min(Math.max(0, y), maxY),
      };
    },
    [containerRef],
  );

  const updatePosition = useCallback(
    (x: number, y: number) => {
      setPosition((prev) => {
        const clamped = clampToViewport(x, y);
        if (prev.x === clamped.x && prev.y === clamped.y) {
          return prev;
        }
        return clamped;
      });
    },
    [clampToViewport, setPosition],
  );

  useEffect(() => {
    if (!detached) return;
    setPosition((prev) => {
      const clamped = clampToViewport(prev.x, prev.y);
      if (prev.x === clamped.x && prev.y === clamped.y) {
        return prev;
      }
      return clamped;
    });
  }, [detached, clampToViewport, setPosition]);

  useEffect(() => {
    if (!detached || typeof window === "undefined") return;
    const handleResize = () => {
      setPosition((prev) => {
        const clamped = clampToViewport(prev.x, prev.y);
        if (prev.x === clamped.x && prev.y === clamped.y) {
          return prev;
        }
        return clamped;
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [detached, clampToViewport, setPosition]);

  useEffect(() => {
    if (!detached) {
      dragging.current = false;
      pointerActive.current = false;
      setIsDragging(false);
    }
  }, [detached]);

  const startDrag = useCallback(
    (clientX: number, clientY: number, source: "pointer" | "mouse", pointerId?: number) => {
      dragging.current = true;
      dragOffset.current = {
        x: clientX - position.x,
        y: clientY - position.y,
      };
      pointerActive.current = source === "pointer";
      if (source === "pointer" && pointerId !== undefined) {
        const target = handleRef.current;
        if (target?.setPointerCapture) {
          target.setPointerCapture(pointerId);
        }
      }
      setIsDragging(true);
    },
    [position],
  );

  const dragTo = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragging.current) return;
      updatePosition(clientX - dragOffset.current.x, clientY - dragOffset.current.y);
    },
    [updatePosition],
  );

  const stopDrag = useCallback(
    (clientX?: number, clientY?: number, pointerId?: number) => {
      if (!dragging.current) return;
      dragging.current = false;
      if (pointerActive.current && pointerId !== undefined) {
        const target = handleRef.current;
        if (target?.releasePointerCapture) {
          target.releasePointerCapture(pointerId);
        }
      }
      if (clientX !== undefined && clientY !== undefined) {
        updatePosition(clientX - dragOffset.current.x, clientY - dragOffset.current.y);
      }
      pointerActive.current = false;
      setIsDragging(false);
    },
    [updatePosition],
  );

  const cancelDrag = useCallback(
    (pointerId?: number) => {
      if (!dragging.current) return;
      dragging.current = false;
      if (pointerActive.current && pointerId !== undefined) {
        const target = handleRef.current;
        if (target?.releasePointerCapture) {
          target.releasePointerCapture(pointerId);
        }
      }
      pointerActive.current = false;
      setIsDragging(false);
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!detached || event.button !== 0) return;
      startDrag(event.clientX, event.clientY, "pointer", event.pointerId);
      event.preventDefault();
    },
    [detached, startDrag],
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      dragTo(event.clientX, event.clientY);
    },
    [dragTo],
  );

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      stopDrag(event.clientX, event.clientY, event.pointerId);
    },
    [stopDrag],
  );

  const handlePointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      cancelDrag(event.pointerId);
    },
    [cancelDrag],
  );

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!detached || event.button !== 0 || pointerActive.current) return;
      startDrag(event.clientX, event.clientY, "mouse");
      event.preventDefault();
    },
    [detached, startDrag],
  );

  const handleMouseMove = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (pointerActive.current) return;
      dragTo(event.clientX, event.clientY);
    },
    [dragTo],
  );

  const handleMouseUp = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (pointerActive.current) return;
      stopDrag(event.clientX, event.clientY);
    },
    [stopDrag],
  );

  const handleMouseLeave = useCallback(() => {
    if (pointerActive.current) return;
    cancelDrag();
  }, [cancelDrag]);

  useEffect(() => {
    if (!isDragging || typeof window === "undefined") return;
    const pointerMove = (event: PointerEvent) => {
      if (!pointerActive.current) return;
      dragTo(event.clientX, event.clientY);
    };
    const pointerUp = (event: PointerEvent) => {
      if (!pointerActive.current) return;
      stopDrag(event.clientX, event.clientY, event.pointerId);
    };
    const pointerCancelListener = (event: PointerEvent) => {
      if (!pointerActive.current) return;
      cancelDrag(event.pointerId);
    };
    const mouseMove = (event: MouseEvent) => {
      if (pointerActive.current) return;
      dragTo(event.clientX, event.clientY);
    };
    const mouseUp = (event: MouseEvent) => {
      if (pointerActive.current) return;
      stopDrag(event.clientX, event.clientY);
    };
    const mouseLeave = () => {
      if (pointerActive.current) return;
      cancelDrag();
    };
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointercancel", pointerCancelListener);
    window.addEventListener("mousemove", mouseMove);
    window.addEventListener("mouseup", mouseUp);
    window.addEventListener("mouseleave", mouseLeave);
    return () => {
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerCancelListener);
      window.removeEventListener("mousemove", mouseMove);
      window.removeEventListener("mouseup", mouseUp);
      window.removeEventListener("mouseleave", mouseLeave);
    };
  }, [isDragging, dragTo, stopDrag, cancelDrag]);

  const handleExit = useCallback(() => {
    setDetached(false);
    onExit?.();
  }, [onExit]);

  const toggleDetached = useCallback(() => {
    setDetached((value) => !value);
  }, []);

  const percent =
    duration > 0 && Number.isFinite(duration) && Number.isFinite(progress)
      ? Math.min(100, Math.max(0, (progress / duration) * 100))
      : 0;

  const card = (
    <div
      ref={containerRef}
      data-testid="spotify-mini-player"
      className="w-72 max-w-full rounded-lg border border-white/10 bg-[var(--color-bg)] text-[var(--color-text)] shadow-xl"
      style={
        detached
          ? {
              position: "fixed",
              left: position.x,
              top: position.y,
              zIndex: 2100,
              pointerEvents: "auto",
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-black/40 px-3 py-2 text-[10px] uppercase tracking-wider">
        <div
          ref={handleRef}
          data-testid="spotify-mini-player-handle"
          className="flex-1 cursor-move select-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          role="presentation"
        >
          Mini Player
        </div>
        <div className="flex items-center gap-1">
          {onExit && (
            <button
              type="button"
              onClick={handleExit}
              className="rounded border border-white/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
            >
              Full
            </button>
          )}
          <button
            type="button"
            onClick={toggleDetached}
            className="rounded border border-white/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider"
          >
            {detached ? "Attach" : "Detach"}
          </button>
        </div>
      </div>
      <div className="flex items-center gap-3 px-3 pt-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-[var(--color-muted)]">
          {track?.cover ? (
            <img
              src={track.cover}
              alt={track.title ?? "Album art"}
              className="h-full w-full object-cover"
            />
          ) : (
            <span aria-hidden className="text-lg opacity-60">
              ♪
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider opacity-70">Now Playing</p>
          <p className="truncate text-sm font-medium">
            {track?.title ?? "Nothing playing"}
          </p>
        </div>
      </div>
      {duration > 0 && (
        <div className="px-3">
          <div
            className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/20"
            aria-label="Playback progress"
          >
            <div
              className="h-full bg-green-400"
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] uppercase tracking-wider opacity-70">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-center gap-4 px-3 py-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canControl}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-lg disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Previous track"
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={!canControl}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/50 text-xl disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Play or pause"
        >
          ⏯
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!canControl}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40 text-lg disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Next track"
        >
          ⏭
        </button>
      </div>
    </div>
  );

  if (detached && portalContainer) {
    return ReactDOM.createPortal(card, portalContainer);
  }

  return card;
};

export default MiniPlayer;
