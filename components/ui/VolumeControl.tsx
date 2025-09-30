"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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

const STEP = 0.05;
const FINE_STEP = 0.02;

const VolumeControl: React.FC<VolumeControlProps> = ({ className = "" }) => {
  const [volume, setVolume] = usePersistentState<number>(
    "system-volume",
    () => 0.7,
    isValidVolume,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  const sliderStyles = useMemo<CSSProperties>(
    () => ({
      writingMode: "bt-lr",
      WebkitAppearance: "slider-vertical",
      width: "100%",
      height: "100%",
    }),
    [],
  );

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
    const delta = (event.shiftKey ? FINE_STEP : STEP) * direction;
    setClampedVolume((current) => current + delta);
  };

  const handleRangeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const next = Number(event.target.value) / 100;
    setClampedVolume(next);
  };

  const handleStepChange = useCallback(
    (direction: 1 | -1) => {
      setClampedVolume((current) => current + direction * STEP);
    },
    [setClampedVolume],
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
          className="absolute bottom-full right-0 z-50 mb-2 w-32 origin-bottom-right rounded-lg border border-black/30 bg-ub-cool-grey/95 px-3 py-3 text-xs text-white shadow-lg backdrop-blur"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={handleWheel}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="flex w-full items-center justify-between text-[11px] uppercase tracking-wide text-gray-200">
              <span>Volume</span>
              <span className="font-semibold text-white">{formatPercent(volume)}</span>
            </div>
            <div className="flex w-full items-end justify-center gap-3">
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-base font-semibold text-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue active:bg-white/20"
                aria-label="Increase volume"
                title="Increase volume"
                onClick={() => handleStepChange(1)}
              >
                +
              </button>
              <div className="relative flex h-28 w-8 touch-none items-center justify-center rounded-full bg-black/20 px-2 py-3">
                <input
                  ref={sliderRef}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(volume * 100)}
                  aria-orientation="vertical"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(volume * 100)}
                  aria-valuetext={`Volume ${formatPercent(volume)}`}
                  aria-label="Volume level"
                  className="absolute inset-0 h-full w-full cursor-pointer appearance-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ubt-blue"
                  style={sliderStyles}
                  orient="vertical"
                  onChange={handleRangeChange}
                />
                <div className="pointer-events-none absolute inset-1 rounded-full bg-gradient-to-b from-white/40 via-white/10 to-black/20" />
              </div>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 bg-white/10 text-base font-semibold text-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue active:bg-white/20"
                aria-label="Decrease volume"
                title="Decrease volume"
                onClick={() => handleStepChange(-1)}
              >
                −
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VolumeControl;
