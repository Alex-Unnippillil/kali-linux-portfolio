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
  isOpen?: boolean;
  onToggle?: () => void;
}

const isValidVolume = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const VolumeControl: React.FC<VolumeControlProps> = ({ className = "", isOpen, onToggle }) => {
  const [volume, setVolume] = usePersistentState<number>(
    "system-volume",
    () => 0.7,
    isValidVolume,
  );
  const [muted, setMuted] = usePersistentState<boolean>(
    "system-volume-muted",
    false,
    (value): value is boolean => typeof value === "boolean",
  );
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = typeof isOpen === 'boolean';
  const open = isControlled ? isOpen : internalOpen;

  const setOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    if (isControlled) {
      const newValue = typeof value === 'function' ? value(open) : value;
      if (newValue !== open && onToggle) {
        onToggle();
      }
    } else {
      setInternalOpen(value);
    }
  }, [isControlled, open, onToggle]);
  const rootRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

  const level: VolumeLevel = useMemo(() => {
    if (muted || volume <= 0.001) return "muted";
    if (volume <= 0.33) return "low";
    if (volume <= 0.66) return "medium";
    return "high";
  }, [volume, muted]);

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

  const handleMuteToggle = () => {
    setMuted((prev) => !prev);
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

  const displayVolume = muted ? 0 : volume;

  return (
    <div
      ref={rootRef}
      className={`relative flex items-center ${className}`.trim()}
      onWheel={handleWheel}
    >
      <button
        type="button"
        className="flex h-full w-full items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        aria-label={`Volume ${muted ? "muted" : formatPercent(volume)}`}
        aria-haspopup="true"
        aria-expanded={open}
        title={`Volume ${muted ? "muted" : formatPercent(volume)}`}
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
          className="absolute top-full mt-2 right-0 z-[300] w-44 origin-top-right rounded-xl border border-white/10 bg-slate-950/95 p-3 text-xs text-white shadow-[0_16px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onWheel={handleWheel}
        >
          {/* Header with value */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Volume</span>
            <span className="text-sm font-medium tabular-nums">{muted ? "Muted" : formatPercent(volume)}</span>
          </div>

          {/* Slider */}
          <div className="relative mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-100 ${muted ? 'bg-slate-600' : 'bg-cyan-400'}`}
              style={{ width: `${displayVolume * 100}%` }}
            />
            <input
              ref={sliderRef}
              type="range"
              min={0}
              max={100}
              step={1}
              value={Math.round(displayVolume * 100)}
              onChange={handleRangeChange}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(displayVolume * 100)}
              aria-label="Volume level"
              disabled={muted}
            />
          </div>

          {/* Mute Toggle */}
          <button
            type="button"
            onClick={handleMuteToggle}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all ${muted
              ? 'bg-cyan-500/20 text-cyan-300'
              : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
              }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {muted ? (
                <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </>
              )}
            </svg>
            {muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VolumeControl;
