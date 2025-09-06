"use client";

import React, { useState, useEffect } from "react";
import ToggleSwitch from "../ToggleSwitch";

const SENSORS_PREFIX = "xfce.panel.sensors.";

type Layout = "text" | "bars" | "both";

export default function SensorsProperties() {
  const [useFahrenheit, setUseFahrenheit] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(`${SENSORS_PREFIX}unit`) === "f";
  });

  const [layout, setLayout] = useState<Layout>(() => {
    if (typeof window === "undefined") return "both";
    return (
      (localStorage.getItem(`${SENSORS_PREFIX}layout`) as Layout | null) || "both"
    );
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const unit = useFahrenheit ? "f" : "c";
    localStorage.setItem(`${SENSORS_PREFIX}unit`, unit);
    localStorage.setItem(`${SENSORS_PREFIX}layout`, layout);
    window.dispatchEvent(
      new CustomEvent("sensors:settingsChanged", { detail: { unit, layout } })
    );
  }, [useFahrenheit, layout]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-ubt-grey">Display Fahrenheit</span>
        <ToggleSwitch
          checked={useFahrenheit}
          onChange={setUseFahrenheit}
          ariaLabel="Toggle temperature unit"
        />
      </div>
      <div className="flex items-center justify-between">
        <label htmlFor="sensors-layout" className="text-ubt-grey">
          Layout
        </label>
        <select
          id="sensors-layout"
          value={layout}
          onChange={(e) => setLayout(e.target.value as Layout)}
          className="bg-ub-cool-grey text-white px-2 py-1 rounded"
        >
          <option value="text">Text only</option>
          <option value="bars">Bars</option>
          <option value="both">Both</option>
        </select>
      </div>
    </div>
  );
}

