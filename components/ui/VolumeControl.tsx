"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import usePersistentState from "../../hooks/usePersistentState";

const ICONS = {
  muted: "/themes/Yaru/status/audio-volume-muted-symbolic.svg",
  low: "/themes/Yaru/status/audio-volume-low-symbolic.svg",
  medium: "/themes/Yaru/status/audio-volume-medium-symbolic.svg",
  high: "/themes/Yaru/status/audio-volume-high-symbolic.svg",
} as const;

type VolumeLevel = keyof typeof ICONS;

const clamp = (value: number) => Math.min(1, Math.max(0, value));

interface VolumeControlProps {
  className?: string;
}

const isValidVolume = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const VolumeControl: React.FC<VolumeControlProps> = ({ className = "" }) => {
  const [volume, setVolume] = usePersistentState<number>(
    "system-volume",
    () => 0.7,
    isValidVolume,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const level: VolumeLevel = useMemo(() => {
    if (volume <= 0.001) return "muted";
    if (volume <= 0.33) return "low";
    if (volume <= 0.66) return "medium";
    return "high";
  }, [volume]);

  const setClampedVolume = useCallback(
    (value: number | ((current: number) => number)) => {
      setVolume((prev) => {
        const nextValue = typeof value === "function" ? value(prev) : value;
        return Number(clamp(nextValue).toFixed(2));
      });
    },
    [setVolume],
  );

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleWheel = (event: React.WheelEvent<HTMLButtonElement | HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY > 0 ? -1 : 1;
    const delta = (event.shiftKey ? 0.02 : 0.05) * direction;
    setClampedVolume((current) => current + delta);
  };

  const adjustVolume = useCallback(
    (delta: number) => {
      setClampedVolume((current) => current + delta);
    },
    [setClampedVolume],
  );

  const updateVolumeFromClientY = useCallback(
    (clientY: number) => {
      const slider = sliderRef.current;
      if (!slider) return;
      const rect = slider.getBoundingClientRect();
      if (rect.height === 0) return;
      const relative = (rect.bottom - clientY) / rect.height;
      setClampedVolume(relative);
    },
    [setClampedVolume],
  );

  const handleSliderPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const target = event.currentTarget;
      target.setPointerCapture?.(event.pointerId);
      setDragging(true);
      updateVolumeFromClientY(event.clientY);
    },
    [updateVolumeFromClientY],
  );

  const handleSliderPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragging) return;
      event.preventDefault();
      updateVolumeFromClientY(event.clientY);
    },
    [dragging, updateVolumeFromClientY],
  );

  const handleSliderPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      setDragging(false);
      updateVolumeFromClientY(event.clientY);
    },
    [updateVolumeFromClientY],
  );

  const handleSliderKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      switch (event.key) {
        case "ArrowUp":
        case "ArrowRight":
          event.preventDefault();
          adjustVolume(event.shiftKey ? 0.1 : 0.05);
          break;
        case "ArrowDown":
        case "ArrowLeft":
          event.preventDefault();
          adjustVolume(event.shiftKey ? -0.1 : -0.05);
          break;
        case "Home":
          event.preventDefault();
          setClampedVolume(0);
          break;
        case "End":
          event.preventDefault();
          setClampedVolume(1);
          break;
        case "PageUp":
          event.preventDefault();
          adjustVolume(0.2);
          break;
        case "PageDown":
          event.preventDefault();
          adjustVolume(-0.2);
          break;
        default:
          break;
      }
    },
    [adjustVolume, setClampedVolume],
  );

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      sliderRef.current?.focus({ preventScroll: true });
    }
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={`relative flex items-center ${className}`.trim()}
      onWheel={handleWheel}
    >
      <button
        type="button"
        className="flex h-6 w-6 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
        aria-label={`Volume ${formatPercent(volume)}`}
        aria-haspopup="true"
        aria-expanded={open}
        title={`Volume ${formatPercent(volume)}`}
        onClick={handleToggle}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <Image
          width={16}
          height={16}
          src={ICONS[level]}
          alt={`${level} volume`}
          className="status-symbol h-4 w-4"
          draggable={false}
          sizes="16px"
        />
      </button>
      {open && (
        <div
          className="absolute bottom-full left-1/2 z-50 mb-2 w-32 -translate-x-1/2 rounded-md border border-black border-opacity-30 bg-ub-cool-grey px-3 py-3 text-xs text-white shadow-lg sm:left-auto sm:right-0 sm:translate-x-0"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={handleWheel}
        >
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-200">
            <span>Volume</span>
            <span className="font-semibold text-white">{formatPercent(volume)}</span>
          </div>
          <div className="flex flex-col items-center gap-3">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-base font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
              aria-label="Increase volume"
              onClick={() => adjustVolume(0.05)}
              onPointerDown={(event) => event.stopPropagation()}
            >
              +
            </button>
            <div
              ref={sliderRef}
              role="slider"
              tabIndex={0}
              aria-label="Volume level"
              aria-orientation="vertical"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
              aria-valuetext={`Volume ${formatPercent(volume)}`}
              className="relative flex h-32 w-10 select-none flex-col items-center justify-center rounded-full bg-black/25 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ubt-blue focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1724] touch-none"
              onPointerDown={handleSliderPointerDown}
              onPointerMove={handleSliderPointerMove}
              onPointerUp={handleSliderPointerUp}
              onPointerCancel={handleSliderPointerUp}
              onKeyDown={handleSliderKeyDown}
            >
              <div className="relative h-full w-1.5 rounded-full bg-white/20">
                <div
                  className="absolute inset-x-0 bottom-0 rounded-full bg-ubt-blue transition-all duration-150 ease-out"
                  style={{ height: `${volume * 100}%` }}
                />
              </div>
              <div
                className="absolute left-1/2 top-0 flex h-full w-full -translate-x-1/2"
                aria-hidden="true"
              >
                <div
                  className="absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white shadow transition-transform duration-150 ease-out"
                  style={{ top: `${(1 - volume) * 100}%` }}
                />
              </div>
            </div>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-white/10 text-base font-semibold text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
              aria-label="Decrease volume"
              onClick={() => adjustVolume(-0.05)}
              onPointerDown={(event) => event.stopPropagation()}
            >
              -
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumeControl;
