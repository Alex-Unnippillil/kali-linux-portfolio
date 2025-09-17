"use client";

import { useCallback, useEffect, useState } from "react";
import {
  saveCalibration,
  loadCalibration,
  GAMEPAD_PRESETS,
  CalibrationData,
  AxisRange,
} from "../utils/gamepad";
import EmptyState from "../components/system/EmptyState";

export default function GamepadCalibration() {
  const [pad, setPad] = useState<Gamepad | null>(null);
  const [axes, setAxes] = useState<number[]>([]);
  const [ranges, setRanges] = useState<AxisRange[]>([]);
  const [vendor, setVendor] = useState<string>("");

  const rescanGamepads = useCallback(() => {
    if (typeof navigator === "undefined" || typeof navigator.getGamepads !== "function") {
      return;
    }
    const pads = navigator.getGamepads();
    const nextPad = (pads ? Array.from(pads).find((p): p is Gamepad => Boolean(p)) : null) ?? null;
    setPad(nextPad);
    if (!nextPad) {
      setAxes([]);
      setRanges([]);
      setVendor("");
    }
  }, []);

  useEffect(() => {
    const connect = () => rescanGamepads();
    const disconnect = () => rescanGamepads();
    window.addEventListener("gamepadconnected", connect);
    window.addEventListener("gamepaddisconnected", disconnect);
    rescanGamepads();
    return () => {
      window.removeEventListener("gamepadconnected", connect);
      window.removeEventListener("gamepaddisconnected", disconnect);
    };
  }, [rescanGamepads]);

  useEffect(() => {
    if (!pad) return;
    const existing = loadCalibration(pad.id);
    if (existing) {
      setRanges(existing.axes.map((r) => ({ ...r })));
      setVendor(existing.vendor || "");
    } else {
      setRanges(pad.axes.map((v) => ({ min: v, max: v })));
    }
    let raf: number;
    const read = () => {
      const list = navigator.getGamepads ? navigator.getGamepads() : [];
      const p = list[pad.index];
      if (!p) return;
      setAxes(Array.from(p.axes));
      setRanges((r) =>
        r.map((rng, i) => ({
          min: Math.min(rng.min, p.axes[i]),
          max: Math.max(rng.max, p.axes[i]),
        }))
      );
      raf = requestAnimationFrame(read);
    };
    raf = requestAnimationFrame(read);
    return () => cancelAnimationFrame(raf);
  }, [pad]);

  const handlePreset = (name: string) => {
    setVendor(name);
    const preset = GAMEPAD_PRESETS[name];
    if (preset) {
      setRanges(preset.axes.map((r) => ({ ...r })));
    }
  };

  const save = () => {
    if (!pad) return;
    const data: CalibrationData = { axes: ranges, vendor };
    saveCalibration(pad.id, data);
  };

  return (
    <div className="p-4">
      <h1 className="text-xl mb-4">Gamepad Calibration</h1>
      {!pad && (
        <EmptyState
          className="mx-auto"
          title="Connect a controller"
          helperText="Plug in or pair a gamepad to visualize live axes and capture calibration ranges."
          icon={
            <svg
              viewBox="0 0 24 24"
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5.5 9h13a2 2 0 0 1 1.93 2.52l-1.06 3.7A3 3 0 0 1 16.5 17h-9a3 3 0 0 1-2.87-1.78l-1.06-3.7A2 2 0 0 1 5.5 9z" />
              <path d="M9 13H7" />
              <path d="M8 12v2" />
              <circle cx="16.5" cy="12.5" r="0.9" />
              <circle cx="18" cy="14.5" r="0.9" />
            </svg>
          }
          iconLabel="Game controller"
          action={
            <button
              type="button"
              onClick={rescanGamepads}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-inverse)] transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]"
            >
              Rescan devices
            </button>
          }
        />
      )}
      {pad && (
        <>
          <div className="mb-2">Controller: {pad.id}</div>
          <label className="block mb-4">
            Preset:
            <select
              className="ml-2"
              value={vendor}
              onChange={(e) => handlePreset(e.target.value)}
            >
              <option value="">Custom</option>
              {Object.keys(GAMEPAD_PRESETS).map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {axes.map((val, i) => (
            <div key={i} className="mb-2">
              <div>
                Axis {i}: {val.toFixed(2)}
              </div>
              <div className="h-2 bg-gray-200">
                <div
                  className="h-2 bg-blue-500"
                  style={{ width: `${((val + 1) / 2) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs">
                Min: {ranges[i]?.min.toFixed(2)} Max: {ranges[i]?.max.toFixed(2)}
              </div>
            </div>
          ))}
          <button onClick={save} className="mt-4">
            Save Calibration
          </button>
        </>
      )}
    </div>
  );
}

