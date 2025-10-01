"use client";

import React, { useState, useEffect, useCallback } from "react";
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

  const isCoarsePointer = useCallback(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch {
      return false;
    }
  }, []);

  const resolveNumberSetting = useCallback(
    (key: string, touchDefault: number, desktopDefault: number) => {
      if (typeof window === "undefined") return desktopDefault;
      const stored = localStorage.getItem(`${PANEL_PREFIX}${key}`);
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        return Number.isNaN(parsed) ? desktopDefault : parsed;
      }
      return isCoarsePointer() ? touchDefault : desktopDefault;
    },
    [isCoarsePointer],
  );

  const resolveBooleanSetting = useCallback(
    (key: string, touchDefault: boolean, desktopDefault: boolean) => {
      if (typeof window === "undefined") return desktopDefault;
      const stored = localStorage.getItem(`${PANEL_PREFIX}${key}`);
      if (stored !== null) {
        return stored === "true";
      }
      return isCoarsePointer() ? touchDefault : desktopDefault;
    },
    [isCoarsePointer],
  );

  const resolveOrientationSetting = useCallback(() => {
    if (typeof window === "undefined") {
      return isCoarsePointer() ? "horizontal" : "horizontal";
    }
    const stored = localStorage.getItem(`${PANEL_PREFIX}orientation`);
    if (stored === "horizontal" || stored === "vertical") {
      return stored;
    }
    return isCoarsePointer() ? "horizontal" : "horizontal";
  }, [isCoarsePointer]);

  const [size, setSize] = useState(() => resolveNumberSetting("size", 40, 24));
  const [length, setLength] = useState(() => resolveNumberSetting("length", 100, 100));
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    resolveOrientationSetting,
  );
  const [autohide, setAutohide] = useState(() => resolveBooleanSetting("autohide", true, false));

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
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(pointer: coarse)");
    const handleChange = () => {
      if (!localStorage.getItem(`${PANEL_PREFIX}size`)) {
        setSize(resolveNumberSetting("size", 40, 24));
      }
      if (!localStorage.getItem(`${PANEL_PREFIX}autohide`)) {
        setAutohide(resolveBooleanSetting("autohide", true, false));
      }
      if (!localStorage.getItem(`${PANEL_PREFIX}orientation`)) {
        setOrientation(resolveOrientationSetting());
      }
    };
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", handleChange);
    } else if (typeof media.addListener === "function") {
      media.addListener(handleChange);
    }
    return () => {
      if (typeof media.removeEventListener === "function") {
        media.removeEventListener("change", handleChange);
      } else if (typeof media.removeListener === "function") {
        media.removeListener(handleChange);
      }
    };
  }, [
    resolveBooleanSetting,
    resolveNumberSetting,
    resolveOrientationSetting,
  ]);

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
                offLabel="Off"
                onLabel="On"
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
          <p className="text-ubt-grey">Item settings are not available yet.</p>
        )}
      </div>
    </div>
  );
}

