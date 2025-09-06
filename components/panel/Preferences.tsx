"use client";

import React, { useState, useEffect } from "react";
import Tabs from "../Tabs";
import ToggleSwitch from "../ToggleSwitch";

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

  const [active, setActive] = useState<TabId>("display");

  const [size, setSize] = useState(() => {
    if (typeof window === "undefined") return 40;
    const stored = localStorage.getItem(`${PANEL_PREFIX}size`);
    return stored ? parseInt(stored, 10) : 40;
  });
  const [rows, setRows] = useState(() => {
    if (typeof window === "undefined") return 1;
    const stored = localStorage.getItem(`${PANEL_PREFIX}rows`);
    return stored ? parseInt(stored, 10) : 1;
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
    window.dispatchEvent(new Event("storage"));
  }, [size]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${PANEL_PREFIX}rows`, String(rows));
    window.dispatchEvent(new Event("storage"));
  }, [rows]);

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
              <label htmlFor="panel-height" className="text-ubt-grey">
                Height
              </label>
              <select
                id="panel-height"
                value={size}
                onChange={(e) => setSize(parseInt(e.target.value, 10))}
                className="bg-ub-cool-grey text-white px-2 py-1 rounded"
              >
                {[24, 28, 32, 40].map((h) => (
                  <option key={h} value={h}>
                    {h}px
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between">
              <label htmlFor="panel-rows" className="text-ubt-grey">
                Rows
              </label>
              <select
                id="panel-rows"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value, 10))}
                className="bg-ub-cool-grey text-white px-2 py-1 rounded"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
              </select>
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
          <p className="text-ubt-grey">Appearance settings are not available yet.</p>
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

