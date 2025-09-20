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
  const [size, setSize] = useState(24);
  const [length, setLength] = useState(100);
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    "horizontal",
  );
  const [autohide, setAutohide] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedSize = window.localStorage.getItem(`${PANEL_PREFIX}size`);
    if (storedSize) {
      const parsed = parseInt(storedSize, 10);
      if (!Number.isNaN(parsed)) setSize(parsed);
    }

    const storedLength = window.localStorage.getItem(`${PANEL_PREFIX}length`);
    if (storedLength) {
      const parsed = parseInt(storedLength, 10);
      if (!Number.isNaN(parsed)) setLength(parsed);
    }

    const storedOrientation = window.localStorage.getItem(
      `${PANEL_PREFIX}orientation`,
    );
    if (storedOrientation === "horizontal" || storedOrientation === "vertical") {
      setOrientation(storedOrientation);
    }

    const storedAutohide = window.localStorage.getItem(
      `${PANEL_PREFIX}autohide`,
    );
    if (storedAutohide !== null) {
      setAutohide(storedAutohide === "true");
    }

    setHydrated(true);
  }, []);

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
      <div className="p-4" aria-busy={!hydrated}>
        {!hydrated ? (
          <div role="status" className="space-y-4 animate-pulse">
            <span className="sr-only">Loading saved panel preferences…</span>
            <div className="h-4 w-32 rounded bg-white/10" />
            <div className="h-10 w-full rounded bg-white/5" />
            <div className="h-10 w-full rounded bg-white/5" />
            <div className="h-10 w-full rounded bg-white/5" />
          </div>
        ) : (
          <>
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
              <p className="text-ubt-grey">
                Appearance settings are not available yet.
              </p>
            )}
            {active === "opacity" && (
              <p className="text-ubt-grey">Opacity settings are not available yet.</p>
            )}
            {active === "items" && (
              <p className="text-ubt-grey">Item settings are not available yet.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

