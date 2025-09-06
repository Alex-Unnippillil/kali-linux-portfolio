"use client";

import React, { useState, useEffect } from "react";
import Tabs from "../Tabs";
import ToggleSwitch from "../ToggleSwitch";

const PANEL_PREFIX = "xfce.panel.";
const PLUGIN_PREFIX = "xfce.panel.plugin.";

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
  const [actionButtonsPos, setActionButtonsPos] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = localStorage.getItem(`${PLUGIN_PREFIX}actionButtons`);
    return stored ? parseInt(stored, 10) : 0;
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(
      `${PLUGIN_PREFIX}actionButtons`,
      String(actionButtonsPos),
    );
  }, [actionButtonsPos]);

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
          <p className="text-ubt-grey">Appearance settings are not available yet.</p>
        )}
        {active === "opacity" && (
          <p className="text-ubt-grey">Opacity settings are not available yet.</p>
        )}
        {active === "items" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="action-buttons-pos"
                className="text-ubt-grey"
              >
                Action Buttons position
              </label>
              <input
                id="action-buttons-pos"
                type="number"
                min="0"
                max="20"
                value={actionButtonsPos}
                onChange={(e) =>
                  setActionButtonsPos(parseInt(e.target.value, 10))
                }
                className="bg-ub-cool-grey text-white px-2 py-1 rounded w-20"
                aria-label="Action Buttons position"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

