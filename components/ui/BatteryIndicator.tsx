"use client";

import type { FC, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import usePersistentState from "../../hooks/usePersistentState";

export const clampLevel = (value: number) => Math.min(1, Math.max(0, value));

const isValidLevel = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const getBatteryFillColor = (level: number, charging: boolean) => {
  if (charging) return "#34d399"; // emerald
  if (level <= 0.15) return "#f87171"; // red-400
  if (level <= 0.4) return "#facc15"; // amber-400
  return "#a3e635"; // lime-400
};

const BATTERY_BODY_WIDTH = 12;

const BatteryGlyph: FC<{ level: number; charging: boolean }> = ({
  level,
  charging,
}) => {
  const normalized = clampLevel(level);
  const fillWidth = Math.max(0, BATTERY_BODY_WIDTH * normalized);
  const fillColor = getBatteryFillColor(normalized, charging);

  return (
    <svg
      className="status-symbol h-4 w-4"
      width={16}
      height={16}
      viewBox="0 0 20 12"
      role="img"
      aria-hidden="true"
    >
      <rect
        x="1"
        y="1"
        width="16"
        height="10"
        rx="2"
        ry="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.85"
      />
      <rect x="17" y="4" width="2.5" height="4" rx="1.2" fill="currentColor" opacity="0.85" />
      <rect
        x="2.5"
        y="2.5"
        width={fillWidth}
        height="7"
        rx="1.5"
        fill={fillColor}
        style={{ transition: "width 150ms ease" }}
      />
      {charging && (
        <path
          d="M10 2.8 7.2 7.6h2.1L8.7 10l3-4.8H9.8L10 2.8Z"
          fill="#0ea5e9"
          stroke="#0ea5e9"
          strokeWidth="0.4"
          opacity="0.95"
        />
      )}
    </svg>
  );
};

export const estimateBatteryTime = (level: number, charging: boolean) => {
  const normalized = clampLevel(level);
  const remaining = charging ? 1 - normalized : normalized;
  const minutes = Math.max(0, Math.round((charging ? 120 : 180) * remaining));

  if (minutes === 0) {
    return charging ? "Fully charged" : "Depleted";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || hours === 0) parts.push(`${mins}m`);
  return parts.join(" ");
};

interface BatteryIndicatorProps {
  className?: string;
}


const BatteryIndicator: FC<BatteryIndicatorProps> = ({ className = "" }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = usePersistentState<number>(
    "status-battery-level",
    () => 0.76,
    isValidLevel,
  );
  const [charging, setCharging] = usePersistentState<boolean>(
    "status-battery-charging",
    true,
    (value): value is boolean => typeof value === "boolean",
  );
  const rootRef = useRef<HTMLDivElement>(null);

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

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen((prev) => !prev);
  };

  const formattedLevel = useMemo(() => `${Math.round(clampLevel(level) * 100)}%`, [level]);
  const tooltip = `${formattedLevel} • ${charging ? "Charging" : "On battery"}`;

  return (
    <div ref={rootRef} className={`relative flex items-center ${className}`.trim()}>
      <button
        type="button"
        className="flex h-full w-full items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
        aria-label={tooltip}
        aria-haspopup="true"
        aria-expanded={open}
        title={tooltip}
        onClick={handleToggle}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="relative inline-flex">
          <BatteryGlyph level={level} charging={charging} />
        </span>
      </button>
      {open && (
        <div
          className="absolute top-full mt-2 right-0 z-[300] w-44 origin-top-right rounded-xl border border-white/10 bg-slate-950/95 p-3 text-xs text-white shadow-[0_16px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
          role="menu"
          aria-label="Battery menu"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Battery</span>
            <div className="flex items-center gap-1.5">
              {charging && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              )}
              <span className="text-sm font-medium tabular-nums">{formattedLevel}</span>
            </div>
          </div>

          {/* Battery Bar */}
          <div className="relative mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
              style={{
                width: `${level * 100}%`,
                backgroundColor: getBatteryFillColor(level, charging)
              }}
            />
          </div>

          {/* Status */}
          <div className="mb-3 text-center text-[10px] text-slate-400">
            {charging ? `⚡ ${estimateBatteryTime(level, charging)} until full` : `${estimateBatteryTime(level, charging)} remaining`}
          </div>

          {/* Charging Toggle */}
          <button
            type="button"
            onClick={() => setCharging((prev) => !prev)}
            className={`flex w-full items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition-all ${charging
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-white/[0.06] text-slate-300 hover:bg-white/[0.1]'
              }`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            {charging ? 'Charging' : 'Not Charging'}
          </button>
        </div>
      )}
    </div>
  );
};

export default BatteryIndicator;
