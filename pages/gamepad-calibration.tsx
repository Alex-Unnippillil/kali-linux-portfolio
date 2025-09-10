"use client";

import { useEffect, useState } from "react";
import {
  saveCalibration,
  loadCalibration,
  GAMEPAD_PRESETS,
  CalibrationData,
  AxisRange,
} from "../utils/gamepad";

export default function GamepadCalibration() {
  const [pad, setPad] = useState<Gamepad | null>(null);
  const [axes, setAxes] = useState<number[]>([]);
  const [ranges, setRanges] = useState<AxisRange[]>([]);
  const [vendor, setVendor] = useState<string>("");

  useEffect(() => {
    const connect = (e: GamepadEvent) => setPad(e.gamepad);
    const disconnect = () => setPad(null);
    window.addEventListener("gamepadconnected", connect);
    window.addEventListener("gamepaddisconnected", disconnect);
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (p) {
        setPad(p);
        break;
      }
    }
    return () => {
      window.removeEventListener("gamepadconnected", connect);
      window.removeEventListener("gamepaddisconnected", disconnect);
    };
  }, []);

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
        r.map((rng, i) => {
          const val = p.axes[i] ?? 0;
          return {
            min: Math.min(rng.min, val),
            max: Math.max(rng.max, val),
          };
        })
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
      {!pad && <p>No controller connected.</p>}
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

