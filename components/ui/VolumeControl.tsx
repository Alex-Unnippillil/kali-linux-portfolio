"use client";

import Image from "next/image";
import type {
  ChangeEvent,
  FC,
  KeyboardEvent,
  MouseEvent,
  WheelEvent,
} from "react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import usePersistentState from "../../hooks/usePersistentState";
import DelayedTooltip from "./DelayedTooltip";

const ICONS = {
  muted: "/themes/Yaru/status/audio-volume-muted-symbolic.svg",
  low: "/themes/Yaru/status/audio-volume-low-symbolic.svg",
  medium: "/themes/Yaru/status/audio-volume-medium-symbolic.svg",
  high: "/themes/Yaru/status/audio-volume-high-symbolic.svg",
} as const;

type VolumeLevel = keyof typeof ICONS;

const clamp = (value: number) => Math.min(1, Math.max(0, value));
const STEP = 0.05;
const EVENT_NAME = "kali:player-volume";

type VolumeChangeSource = "control" | "external";

type VolumeEventDetail = {
  volume: number;
  source?: VolumeChangeSource;
};

interface VolumeControlProps {
  className?: string;
}

const isValidVolume = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const VolumeControl: FC<VolumeControlProps> = ({ className = "" }) => {
  const [volume, setVolume] = usePersistentState<number>(
    "system-volume",
    () => 0.7,
    isValidVolume,
  );
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);
  const programmaticUpdateRef = useRef(false);
  const programmaticResetTimerRef = useRef<number | null>(null);
  const lastChangeSourceRef = useRef<VolumeChangeSource>("control");

  const level: VolumeLevel = useMemo(() => {
    if (volume <= 0.001) return "muted";
    if (volume <= 0.33) return "low";
    if (volume <= 0.66) return "medium";
    return "high";
  }, [volume]);

  const setClampedVolume = useCallback(
    (
      value: number | ((current: number) => number),
      source: VolumeChangeSource = "control",
    ) => {
      lastChangeSourceRef.current = source;
      setVolume((prev) => {
        const nextValue = typeof value === "function" ? value(prev) : value;
        const clampedValue = clamp(nextValue);
        const snapped = Math.round(clampedValue / STEP) * STEP;
        const normalized = Number(snapped.toFixed(2));
        return normalized === prev ? prev : normalized;
      });
    },
    [setVolume],
  );

  const emitVolumeChange = useCallback(
    (value: number, source: VolumeChangeSource) => {
      if (typeof window === "undefined") return;
      window.dispatchEvent(
        new CustomEvent<VolumeEventDetail>(EVENT_NAME, {
          detail: { volume: value, source },
        }),
      );
    },
    [],
  );

  const syncMediaElements = useCallback(
    (value: number) => {
      if (typeof document === "undefined") return;
      const mediaElements = document.querySelectorAll<HTMLMediaElement>(
        "audio, video",
      );
      if (mediaElements.length === 0) {
        programmaticUpdateRef.current = false;
        return;
      }

      programmaticUpdateRef.current = true;
      mediaElements.forEach((element) => {
        if (element.dataset.ignoreSystemVolume === "true") {
          return;
        }
        if (Math.abs(element.volume - value) > 0.001) {
          element.volume = value;
        }
      });

      if (typeof window !== "undefined") {
        if (programmaticResetTimerRef.current !== null) {
          window.clearTimeout(programmaticResetTimerRef.current);
        }
        programmaticResetTimerRef.current = window.setTimeout(() => {
          programmaticUpdateRef.current = false;
          programmaticResetTimerRef.current = null;
        }, 0);
      } else {
        programmaticUpdateRef.current = false;
      }
    },
    [],
  );

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen((prev) => !prev);
  };

  const handleWheel = (
    event: WheelEvent<HTMLButtonElement | HTMLDivElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    const direction = event.deltaY > 0 ? -1 : 1;
    const delta = (event.shiftKey ? STEP / 2 : STEP) * direction;
    setClampedVolume((current) => current + delta, "control");
  };

  const handleRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    const next = Number.parseFloat(event.target.value);
    if (Number.isNaN(next)) return;
    setClampedVolume(next, "control");
  };

  const handleSliderKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault();
        setClampedVolume((current) => current - STEP, "control");
        break;
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault();
        setClampedVolume((current) => current + STEP, "control");
        break;
      case "Home":
        event.preventDefault();
        setClampedVolume(0, "control");
        break;
      case "End":
        event.preventDefault();
        setClampedVolume(1, "control");
        break;
      default:
    }
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

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleVolumeEvent = (event: Event) => {
      const detail = (event as CustomEvent<VolumeEventDetail>).detail;
      if (!detail) return;
      if (detail.source === "control") return;
      const next = detail.volume;
      if (typeof next !== "number" || Number.isNaN(next)) return;
      setClampedVolume(next, "external");
    };

    window.addEventListener(EVENT_NAME, handleVolumeEvent as EventListener);
    return () => {
      window.removeEventListener(
        EVENT_NAME,
        handleVolumeEvent as EventListener,
      );
    };
  }, [setClampedVolume]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const handleMediaVolumeChange = (event: Event) => {
      const media = event.target as HTMLMediaElement | null;
      if (!media || programmaticUpdateRef.current) return;
      if (media.dataset.ignoreSystemVolume === "true") return;
      const next = clamp(media.volume);
      setClampedVolume(next, "external");
      emitVolumeChange(next, "external");
    };

    document.addEventListener("volumechange", handleMediaVolumeChange, true);
    return () => {
      document.removeEventListener(
        "volumechange",
        handleMediaVolumeChange,
        true,
      );
    };
  }, [emitVolumeChange, setClampedVolume]);

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        programmaticResetTimerRef.current !== null
      ) {
        window.clearTimeout(programmaticResetTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    syncMediaElements(volume);
    if (lastChangeSourceRef.current === "control") {
      emitVolumeChange(volume, "control");
    }
    lastChangeSourceRef.current = "external";
  }, [emitVolumeChange, syncMediaElements, volume]);

  return (
    <div
      ref={rootRef}
      className={`relative flex items-center ${className}`.trim()}
      onWheel={handleWheel}
    >
      <DelayedTooltip
        content={
          <span aria-hidden="true">{`Volume ${formatPercent(volume)}`}</span>
        }
      >
        {({ ref, onMouseEnter, onMouseLeave, onFocus, onBlur }) => (
          <button
            type="button"
            ref={(node) => {
              ref(node);
            }}
            className="flex h-6 w-6 items-center justify-center rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
            aria-label={`Volume ${formatPercent(volume)}`}
            aria-haspopup="true"
            aria-expanded={open}
            onClick={handleToggle}
            onPointerDown={(event) => event.stopPropagation()}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onFocus={onFocus}
            onBlur={onBlur}
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
        )}
      </DelayedTooltip>
      {open && (
        <div
          className="absolute bottom-full right-0 z-50 mb-2 min-w-[9rem] rounded-md border border-black border-opacity-30 bg-ub-cool-grey px-3 py-2 text-xs text-white shadow-lg"
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
            max={1}
            step={STEP}
            value={Number(volume.toFixed(2))}
            aria-valuemin={0}
            aria-valuemax={1}
            aria-valuenow={Number(volume.toFixed(2))}
            aria-valuetext={`Volume ${formatPercent(volume)}`}
            aria-label="Volume level"
            className="h-1 w-full cursor-pointer accent-ubt-blue"
            onChange={handleRangeChange}
            onKeyDown={handleSliderKeyDown}
          />
        </div>
      )}
    </div>
  );
};

export default VolumeControl;
