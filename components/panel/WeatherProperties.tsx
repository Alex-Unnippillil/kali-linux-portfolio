"use client";

import { useEffect } from "react";
import ToggleSwitch from "../ToggleSwitch";
import usePersistentState from "../../hooks/usePersistentState";

const PREFIX = "xfce.panel.weather.";

export default function WeatherProperties() {
  const [interval, setInterval] = usePersistentState<number>(
    `${PREFIX}interval`,
    30,
    (v): v is number => typeof v === "number" && v > 0,
  );
  const [showPanel, setShowPanel] = usePersistentState<boolean>(
    `${PREFIX}show-panel`,
    true,
    (v): v is boolean => typeof v === "boolean",
  );
  const [days, setDays] = usePersistentState<number>(
    `${PREFIX}days`,
    3,
    (v): v is number => typeof v === "number" && v >= 0 && v <= 7,
  );

  useEffect(() => {
    const density = showPanel ? days + 1 : 1;
    document.documentElement.style.setProperty(
      "--weather-panel-density",
      density.toString(),
    );
  }, [interval, showPanel, days]);

  return (
    <div className="space-y-4 p-4 text-ubt-grey">
      <div className="flex items-center justify-between">
        <label htmlFor="weather-interval">
          Update Interval: {interval}m
        </label>
        <input
          id="weather-interval"
          type="range"
          min="5"
          max="60"
          value={interval}
          onChange={(e) => setInterval(parseInt(e.target.value, 10))}
          className="ubuntu-slider"
          aria-label="Weather update interval"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>Show on panel</span>
        <ToggleSwitch
          checked={showPanel}
          onChange={setShowPanel}
          ariaLabel="Toggle weather panel display"
        />
      </div>
      <div className="flex items-center justify-between">
        <label htmlFor="weather-days">
          Forecast Days: {days}
        </label>
        <input
          id="weather-days"
          type="range"
          min="0"
          max="7"
          value={days}
          onChange={(e) => setDays(parseInt(e.target.value, 10))}
          className="ubuntu-slider"
          aria-label="Number of forecast days"
        />
      </div>
    </div>
  );
}

