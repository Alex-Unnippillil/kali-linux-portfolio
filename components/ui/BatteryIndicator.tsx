"use client";

import type { ChangeEvent, FC, MouseEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import usePersistentState from "../../hooks/usePersistentState";

export const clampLevel = (value: number) => Math.min(1, Math.max(0, value));

const isValidLevel = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const isValidMode = (value: unknown): value is PowerMode =>
  value === "performance" || value === "balanced" || value === "power-saver";

type PowerMode = "performance" | "balanced" | "power-saver";

const POWER_MODE_LABEL: Record<PowerMode, string> = {
  performance: "Performance",
  balanced: "Balanced",
  "power-saver": "Power saver",
};

const getBatteryFillColor = (level: number, charging: boolean, saver: boolean) => {
  if (charging) return "#34d399"; // emerald
  if (saver) return "#22d3ee"; // cyan accent when saver enabled
  if (level <= 0.15) return "#f87171"; // red-400
  if (level <= 0.4) return "#facc15"; // amber-400
  return "#a3e635"; // lime-400
};

const BATTERY_BODY_WIDTH = 12;

const BatteryGlyph: FC<{ level: number; charging: boolean; saver: boolean }> = ({
  level,
  charging,
  saver,
}) => {
  const normalized = clampLevel(level);
  const fillWidth = Math.max(0, BATTERY_BODY_WIDTH * normalized);
  const fillColor = getBatteryFillColor(normalized, charging, saver);

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
    return charging ? "Fully charged" : "Battery depleted";
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (mins > 0 || hours === 0) parts.push(`${mins}m`);
  const suffix = charging ? "until full" : "remaining";
  return `${parts.join(" ")} ${suffix}`;
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
  const [powerMode, setPowerMode] = usePersistentState<PowerMode>(
    "status-power-mode",
    "balanced",
    isValidMode,
  );
  const [batterySaver, setBatterySaver] = usePersistentState<boolean>(
    "status-battery-saver",
    false,
    (value): value is boolean => typeof value === "boolean",
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLInputElement>(null);

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

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen((prev) => !prev);
  };

  const formattedLevel = useMemo(() => `${Math.round(clampLevel(level) * 100)}%`, [level]);

  const tooltipParts = [formattedLevel, charging ? "Charging" : "On battery"];
  if (batterySaver) {
    tooltipParts.push("Saver on");
  }
  const tooltip = tooltipParts.join(" • ");

  return (
    <div ref={rootRef} className={`relative flex items-center ${className}`.trim()}>
      <button
        type="button"
        className="touch-target touch-target-spacing rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ubt-blue"
        aria-label={tooltip}
        aria-haspopup="true"
        aria-expanded={open}
        title={tooltip}
        onClick={handleToggle}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <span className="relative inline-flex">
          <BatteryGlyph level={level} charging={charging} saver={batterySaver} />
        </span>
      </button>
      {open && (
        <div
          className="absolute bottom-full right-0 z-50 mb-2 min-w-[14rem] rounded-md border border-black border-opacity-30 bg-ub-cool-grey px-3 py-3 text-xs text-white shadow-lg"
          role="menu"
          aria-label="Battery menu"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="mb-3 text-[11px] uppercase tracking-wide text-gray-200">Battery</div>
          <div className="mb-3 rounded bg-black bg-opacity-20 p-3 text-[11px] text-gray-200">
            <div className="flex items-center justify-between text-white">
              <span className="text-base font-semibold">{formattedLevel}</span>
              <span className="uppercase">{charging ? "Charging" : "On battery"}</span>
            </div>
            <p className="mt-1 text-gray-300">{estimateBatteryTime(level, charging)}</p>
          </div>
          <div className="mb-3 text-[11px] uppercase tracking-wide text-gray-200">Adjust level</div>
          <input
            ref={sliderRef}
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(level * 100)}
            className="mb-3 h-1 w-full cursor-pointer accent-ubt-blue"
            aria-label="Simulated battery level"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setLevel(clampLevel(Number(event.target.value) / 100))
            }
          />
          <label className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-200">
            <span className="text-white normal-case">Charging</span>
            <input
              type="checkbox"
              checked={charging}
              onChange={() => setCharging((prev) => !prev)}
              aria-label={charging ? "Stop charging" : "Start charging"}
            />
          </label>
          <label className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-gray-200">
            <span className="text-white normal-case">Battery saver</span>
            <input
              type="checkbox"
              checked={batterySaver}
              onChange={() => setBatterySaver((prev) => !prev)}
              aria-label="Toggle battery saver"
            />
          </label>
          <div className="mb-2 text-[11px] uppercase tracking-wide text-gray-200">Power mode</div>
          <div className="space-y-1" role="group" aria-label="Power mode">
            {(Object.keys(POWER_MODE_LABEL) as PowerMode[]).map((mode) => (
              <label
                key={mode}
                className="flex items-center justify-between rounded px-2 py-2 text-sm transition hover:bg-white hover:bg-opacity-10"
              >
                <span className="font-medium text-white">{POWER_MODE_LABEL[mode]}</span>
                <input
                  type="radio"
                  name="power-mode"
                  value={mode}
                  checked={powerMode === mode}
                  onChange={() => setPowerMode(mode)}
                  aria-label={`Switch to ${POWER_MODE_LABEL[mode]} mode`}
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BatteryIndicator;
