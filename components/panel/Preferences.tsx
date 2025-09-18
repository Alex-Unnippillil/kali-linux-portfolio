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

  const panelIdFor = (id: TabId) => `preferences-panel-${id}`;

  return (
    <div>
      <Tabs
        tabs={TABS}
        active={active}
        onChange={setActive}
        idPrefix="preferences-tab"
        getPanelId={(id) => panelIdFor(id)}
      />
      <div className="p-4">
        <section
          id={panelIdFor("display")}
          role="tabpanel"
          aria-labelledby="preferences-tab-display"
          hidden={active !== "display"}
          aria-hidden={active !== "display"}
        >
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
        </section>
        <section
          id={panelIdFor("measurements")}
          role="tabpanel"
          aria-labelledby="preferences-tab-measurements"
          hidden={active !== "measurements"}
          aria-hidden={active !== "measurements"}
        >
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
        </section>
        <section
          id={panelIdFor("appearance")}
          role="tabpanel"
          aria-labelledby="preferences-tab-appearance"
          hidden={active !== "appearance"}
          aria-hidden={active !== "appearance"}
        >
          <p className="text-ubt-grey">Appearance settings are not available yet.</p>
        </section>
        <section
          id={panelIdFor("opacity")}
          role="tabpanel"
          aria-labelledby="preferences-tab-opacity"
          hidden={active !== "opacity"}
          aria-hidden={active !== "opacity"}
        >
          <p className="text-ubt-grey">Opacity settings are not available yet.</p>
        </section>
        <section
          id={panelIdFor("items")}
          role="tabpanel"
          aria-labelledby="preferences-tab-items"
          hidden={active !== "items"}
          aria-hidden={active !== "items"}
        >
          <p className="text-ubt-grey">Item settings are not available yet.</p>
        </section>
      </div>
    </div>
  );
}

