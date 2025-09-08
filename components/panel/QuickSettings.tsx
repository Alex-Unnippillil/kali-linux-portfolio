"use client";

import React, { useState } from "react";
import ToggleSwitch from "../ToggleSwitch";
import { useQuickSettings } from "@/lib/settings-store";

export default function QuickSettings() {
  const { settings, update } = useQuickSettings();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        aria-label="Quick settings"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="p-1 rounded hover:bg-ubc-icon-hover focus:outline-none focus:ring-2 focus:ring-ub-orange"
      >
        <span aria-hidden>⚙️</span>
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Quick settings"
          className="absolute right-0 mt-2 w-48 bg-ub-grey text-white rounded shadow-lg p-3 transition-opacity motion-reduce:transition-none" 
        >
          <div className="flex items-center justify-between mb-2">
            <span>Wi-Fi</span>
            <ToggleSwitch
              checked={settings.wifi}
              onChange={(v) => update({ wifi: v })}
              ariaLabel="Wi-Fi"
            />
          </div>
          <div className="flex items-center justify-between mb-2">
            <span>Bluetooth</span>
            <ToggleSwitch
              checked={settings.bluetooth}
              onChange={(v) => update({ bluetooth: v })}
              ariaLabel="Bluetooth"
            />
          </div>
          <div className="mt-2">
            <label htmlFor="brightness" className="block text-xs mb-1">
              Brightness
            </label>
            <input
              id="brightness"
              type="range"
              min={0}
              max={100}
              value={settings.brightness}
              onChange={(e) => update({ brightness: Number(e.target.value) })}
              className="w-full"
              aria-label="Brightness"
            />
          </div>
        </div>
      )}
    </div>
  );
}

