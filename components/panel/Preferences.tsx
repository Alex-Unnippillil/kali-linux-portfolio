"use client";

import React, { useState, useEffect } from "react";
import Tabs from "../Tabs";
import ToggleSwitch from "../ToggleSwitch";
import { PANEL_PROFILES, type PanelProfile } from "./profiles";

const PANEL_PREFIX = "xfce.panel.";

export default function Preferences() {
  type TabId =
    | "profiles"
    | "display"
    | "measurements"
    | "appearance"
    | "opacity"
    | "items";
  const TABS: readonly { id: TabId; label: string }[] = [
    { id: "profiles", label: "Profiles" },
    { id: "display", label: "Display" },
    { id: "measurements", label: "Measurements" },
    { id: "appearance", label: "Appearance" },
    { id: "opacity", label: "Opacity" },
    { id: "items", label: "Items" },
  ];

  const [active, setActive] = useState<TabId>("display");

  const [profileId, setProfileId] = useState(() => {
    if (typeof window === "undefined") return PANEL_PROFILES[0].id;
    return (
      localStorage.getItem(`${PANEL_PREFIX}profile`) || PANEL_PROFILES[0].id
    );
  });

  const [confirming, setConfirming] = useState<PanelProfile | null>(null);

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
  const [orientation, setOrientation] = useState<"horizontal" | "vertical">(
    () => {
      if (typeof window === "undefined") return "horizontal";
      return (
        (localStorage.getItem(`${PANEL_PREFIX}orientation`) as
          | "horizontal"
          | "vertical"
          | null) || "horizontal"
      );
    },
  );
  const [autohide, setAutohide] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`${PANEL_PREFIX}autohide`) === "true";
  });
  const [tray, setTray] = useState<"status" | "legacy">(() => {
    if (typeof window === "undefined") return "status";
    return (
      (localStorage.getItem(`${PANEL_PREFIX}tray`) as
        | "status"
        | "legacy"
        | null) || "status"
    );
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
    localStorage.setItem(
      `${PANEL_PREFIX}autohide`,
      autohide ? "true" : "false",
    );
  }, [autohide]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${PANEL_PREFIX}tray`, tray);
  }, [tray]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(`${PANEL_PREFIX}profile`, profileId);
  }, [profileId]);

  const applyProfile = (profile: PanelProfile) => {
    setOrientation(profile.settings.orientation);
    setLength(profile.settings.length);
    setSize(profile.settings.size);
    setAutohide(profile.settings.autohide);
    setProfileId(profile.id);
  };

  return (
    <div>
      <Tabs tabs={TABS} active={active} onChange={setActive} />
      <div className="p-4">
        {active === "profiles" && (
          <div className="grid grid-cols-3 gap-4">
            {PANEL_PROFILES.map((p) => (
              <button
                key={p.id}
                className={`p-2 border rounded text-left ${
                  profileId === p.id ? "border-ub-orange" : "border-transparent"
                }`}
                onClick={() => setConfirming(p)}
              >
                <p.Preview className="w-16 h-10 mx-auto mb-2" />
                <div className="text-sm font-bold">{p.name}</div>
                <div className="text-xs text-ubt-grey">{p.description}</div>
              </button>
            ))}
          </div>
        )}
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
              <label htmlFor="tray" className="text-ubt-grey">
                System Tray
              </label>
              <select
                id="tray"
                value={tray}
                onChange={(e) => setTray(e.target.value as "status" | "legacy")}
                className="bg-ub-cool-grey text-white px-2 py-1 rounded"
              >
                <option value="status">Status Tray</option>
                <option value="legacy">Legacy Tray</option>
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
          <p className="text-ubt-grey">
            Opacity settings are not available yet.
          </p>
        )}
        {active === "items" && (
          <p className="text-ubt-grey">Item settings are not available yet.</p>
        )}
      </div>
      {confirming && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-ub-cool-grey p-4 rounded text-center w-64">
            <h2 className="mb-2">Apply {confirming.name}?</h2>
            <confirming.Preview className="w-24 h-16 mx-auto mb-2" />
            <div className="flex justify-center space-x-2">
              <button
                className="px-3 py-1 bg-ub-orange text-white rounded"
                onClick={() => {
                  applyProfile(confirming);
                  setConfirming(null);
                }}
              >
                Apply
              </button>
              <button
                className="px-3 py-1 bg-gray-600 text-white rounded"
                onClick={() => setConfirming(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
