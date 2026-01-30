"use client";

import type { FC, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";

export const clampLevel = (value: number) => Math.min(1, Math.max(0, value));

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

const PlugIcon: FC = () => (
  <svg
    className="status-symbol h-4 w-4"
    width={16}
    height={16}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    role="img"
    aria-hidden="true"
  >
    <path d="M12 2v4" />
    <path d="M12 18v4" />
    <path d="M8.5 2H8a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2h-.5" />
    <path d="M6 12h12" />
  </svg>
);

export const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds === 0) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

interface BatteryIndicatorProps {
  className?: string;
  isOpen?: boolean;
  onToggle?: () => void;
}

const BatteryIndicator: FC<BatteryIndicatorProps> = ({ className = "", isOpen, onToggle }) => {
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

  // Battery State
  const [level, setLevel] = useState(1);
  const [charging, setCharging] = useState(true);
  const [chargingTime, setChargingTime] = useState(0);
  const [dischargingTime, setDischargingTime] = useState(Infinity);
  const [supported, setSupported] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let battery: any;

    const updateBattery = () => {
      setLevel(battery.level);
      setCharging(battery.charging);
      setChargingTime(battery.chargingTime);
      setDischargingTime(battery.dischargingTime);
      setSupported(true);
      setLoaded(true);
    };

    if (typeof navigator !== "undefined" && (navigator as any).getBattery) {
      (navigator as any).getBattery().then((b: any) => {
        battery = b;
        updateBattery();
        b.addEventListener("levelchange", updateBattery);
        b.addEventListener("chargingchange", updateBattery);
        b.addEventListener("chargingtimechange", updateBattery);
        b.addEventListener("dischargingtimechange", updateBattery);
      }).catch(() => {
        setSupported(false);
        setLoaded(true);
      });
    } else {
      setSupported(false);
      setLoaded(true);
    }

    return () => {
      if (battery) {
        battery.removeEventListener("levelchange", updateBattery);
        battery.removeEventListener("chargingchange", updateBattery);
        battery.removeEventListener("chargingtimechange", updateBattery);
        battery.removeEventListener("dischargingtimechange", updateBattery);
      }
    };
  }, []);

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

  // If unsupported or fully charged and plugged in (charging && level >= 1), show plug
  // Actually, mostly desktops show charging=true, level=1.
  // Laptops plugged in and full also show charging=true, level=1.
  const showPlug = !loaded || !supported || (charging && level >= 0.99);

  const tooltip = loaded
    ? `${formattedLevel} • ${charging ? "Charging" : "On battery"}`
    : "Power Status";

  const timeText = useMemo(() => {
    if (charging) {
      if (level >= 1) return "Fully charged";
      const time = formatTime(chargingTime);
      return time ? `${time} until full` : "Charging";
    }
    const time = formatTime(dischargingTime);
    return time ? `${time} remaining` : "On Battery";
  }, [charging, level, chargingTime, dischargingTime]);

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
        <span className="relative inline-flex items-center justify-center text-slate-200">
          {showPlug ? <PlugIcon /> : <BatteryGlyph level={level} charging={charging} />}
        </span>
      </button>

      {open && (
        <div
          className="absolute top-full mt-2 right-0 z-[300] w-52 origin-top-right rounded-xl border border-white/10 bg-slate-950/95 p-3 text-xs text-white shadow-[0_16px_32px_-8px_rgba(0,0,0,0.5)] backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200"
          role="menu"
          aria-label="Battery menu"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Power</span>
            <div className="flex items-center gap-1.5">
              {charging && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
              )}
              <span className="text-sm font-medium tabular-nums">{supported ? formattedLevel : "AC"}</span>
            </div>
          </div>

          {/* Battery Bar - Only show if supported */}
          {supported && (
            <div className="relative mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                style={{
                  width: `${level * 100}%`,
                  backgroundColor: getBatteryFillColor(level, charging)
                }}
              />
            </div>
          )}

          {/* Status */}
          <div className="text-center text-[10px] text-slate-400 mb-1">
            {supported ? timeText : "Plugged in • No battery detected"}
          </div>

          {/* Detailed State */}
          <div className="mt-3 flex flex-col gap-1 border-t border-white/5 pt-2 text-[10px] text-slate-500">
            <div className="flex justify-between">
              <span>Status</span>
              <span className="text-slate-300">{charging ? "Plugged In" : "Discharging"}</span>
            </div>
            {supported && (
              <div className="flex justify-between">
                <span>Health</span>
                <span className="text-slate-300">Good</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatteryIndicator;
