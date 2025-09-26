"use client";

import React, { useState } from "react";
import Tabs from "../Tabs";
import ToggleSwitch from "../ToggleSwitch";
import { useSettings } from "../../hooks/useSettings";

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
  const {
    panelPosition,
    setPanelPosition,
    panelSize,
    setPanelSize,
    panelOpacity,
    setPanelOpacity,
    panelAutohide,
    setPanelAutohide,
  } = useSettings();

  return (
    <div>
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      <div className="p-4">
        {active === "display" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="orientation" className="text-ubt-grey">
                Dock position
              </label>
              <select
                id="orientation"
                value={panelPosition}
                onChange={(e) =>
                  setPanelPosition(e.target.value as "top" | "bottom")
                }
                className="bg-ub-cool-grey text-white px-2 py-1 rounded"
              >
                <option value="bottom">Bottom</option>
                <option value="top">Top</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ubt-grey">Autohide</span>
              <ToggleSwitch
                checked={panelAutohide}
                onChange={setPanelAutohide}
                ariaLabel="Autohide panel"
              />
            </div>
          </div>
        )}
        {active === "measurements" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="panel-size" className="text-ubt-grey">
                Size: {panelSize}px
              </label>
              <input
                id="panel-size"
                type="range"
                min="16"
                max="128"
                value={panelSize}
                onChange={(e) => setPanelSize(parseInt(e.target.value, 10))}
                className="ubuntu-slider"
                aria-label="Panel size"
              />
            </div>
          </div>
        )}
        {active === "appearance" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="panel-opacity" className="text-ubt-grey">
                Opacity: {Math.round(panelOpacity * 100)}%
              </label>
              <input
                id="panel-opacity"
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={panelOpacity}
                onChange={(e) => setPanelOpacity(parseFloat(e.target.value))}
                className="ubuntu-slider"
                aria-label="Panel opacity"
              />
            </div>
          </div>
        )}
        {active === "opacity" && (
          <p className="text-ubt-grey">
            Additional opacity controls are managed from the main Settings app.
          </p>
        )}
        {active === "items" && (
          <p className="text-ubt-grey">
            Item management is coming soon. Use the desktop favorites menu to
            pin or remove applications.
          </p>
        )}
      </div>
    </div>
  );
}

