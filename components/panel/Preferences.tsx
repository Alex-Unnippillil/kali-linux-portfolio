"use client";

import React, { useState, useEffect } from "react";
import Tabs from "../Tabs";
import ToggleSwitch from "../ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";
import { SCALE_PRESETS } from "../../utils/scalePresets";

const PANEL_PREFIX = "xfce.panel.";

export default function Preferences() {
  type TabId = "display" | "measurements" | "appearance" | "opacity" | "items";
  const TABS: readonly { id: TabId; label: string }[] = [
    { id: "display", label: "Display" },
    { id: "measurements", label: "Measurements" },
    { id: "appearance", label: "Appearance" },
    { id: "opacity", label: "Opacity" },
    { id: "items", label: "Items" },
  ];

  const { scalePreset, setScalePreset } = useSettings();

  const [active, setActive] = useState<TabId>("display");

  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return 24;
    const stored = localStorage.getItem(`${PANEL_PREFIX}size`);
    return stored ? parseInt(stored, 10) : 24;
  });
  const [length, setLength] = useState(() => {
    if (typeof window === "undefined") return 100;
    const stored = localStorage.getItem(`${PANEL_PREFIX}length`);
    return stored ? parseInt(stored, 10) : 100;
  });
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(() => {
    if (typeof window === "undefined") return "horizontal";
    return (localStorage.getItem(`${PANEL_PREFIX}orientation`) as
      | "horizontal"
      | "vertical"
      | null) || "horizontal";
  });
  const [autohide, setAutohide] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`${PANEL_PREFIX}autohide`) === "true";
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${PANEL_PREFIX}size`, String(size));
  }, [size]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${PANEL_PREFIX}length`, String(length));
  }, [length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${PANEL_PREFIX}orientation`, orientation);
  }, [orientation]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${PANEL_PREFIX}autohide`, autohide ? "true" : "false");
  }, [autohide]);

  return (
    <div>
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      <div className="p-4">
        {active === "display" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="orientation" className="text-ubt-grey">
                Orientation
              </label>
              <select
                id="orientation"
                value={orientation}
                onChange={(e) =>
                  setOrientation(e.target.value as "horizontal" | "vertical")
                }
                className="bg-ub-cool-grey text-white px-2 py-1 rounded"
              >
                <option value="horizontal">Horizontal</option>
                <option value="vertical">Vertical</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ubt-grey">Autohide</span>
              <ToggleSwitch
                checked={autohide}
                onChange={setAutohide}
                ariaLabel="Autohide panel"
              />
            </div>
          </div>
        )}
        {active === "measurements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="panel-size" className="text-ubt-grey">
                Size: {size}px
              </label>
              <input
                id="panel-size"
                type="range"
                min="16"
                max="128"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value, 10))}
                className="ubuntu-slider"
                aria-label="Panel size"
              />
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="panel-length" className="text-ubt-grey">
                Length: {length}%
              </label>
              <input
                id="panel-length"
                type="range"
                min="10"
                max="100"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value, 10))}
                className="ubuntu-slider"
                aria-label="Panel length"
              />
            </div>
          </div>
        )}
        {active === "appearance" && (
          <div className="space-y-4">
            <p className="text-ubt-grey text-sm">
              Choose how large text and controls should appear across the desktop.
            </p>
            <div className="space-y-3">
              {SCALE_PRESETS.map((preset) => (
                <label
                  key={preset.id}
                  className={`flex items-start gap-3 rounded border px-3 py-2 transition-colors ${
                    scalePreset === preset.id
                      ? "border-ub-border-orange bg-ub-lite-abrgn"
                      : "border-transparent bg-ub-cool-grey"
                  }`}
                >
                  <input
                    type="radio"
                    name="panel-scale"
                    value={preset.id}
                    checked={scalePreset === preset.id}
                    onChange={() => setScalePreset(preset.id)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-white">{preset.label}</p>
                    <p className="text-xs text-ubt-grey">{preset.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}
        {active === "opacity" && (
          <p className="text-ubt-grey">Opacity settings are not available yet.</p>
        )}
        {active === "items" && (
          <p className="text-ubt-grey">Item settings are not available yet.</p>
        )}
      </div>
    </div>
  );
}

