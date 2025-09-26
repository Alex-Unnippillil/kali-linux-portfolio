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
  const sliderRef = useRef<HTMLInputElement>(null);

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

  const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const next = Number(event.target.value) / 100;
    setClampedVolume(next);
  };

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
          className="absolute bottom-full right-0 z-popover mb-2 min-w-[9rem] rounded-md border border-black border-opacity-30 bg-ub-cool-grey px-3 py-2 text-xs text-white shadow-lg"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={handleWheel}
        >
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-200">
            <span>Volume</span>
            <span className="font-semibold text-white">{formatPercent(volume)}</span>
          </div>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(volume * 100)}
            aria-label="Volume level"
            className="h-1 w-full cursor-pointer accent-ubt-blue"
            onChange={handleRangeChange}
          />
        </div>
      )}
    </div>
  );
};

export default VolumeControl;
