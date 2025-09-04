"use client";

import { useEffect } from "react";
import useSWR from "swr";
import usePersistentState from "../../../hooks/usePersistentState";

interface AlertsProps {
  latitude: number;
  longitude: number;
}

const isNumber = (v: unknown): v is number => typeof v === "number";
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";

const Alerts = ({ latitude, longitude }: AlertsProps) => {
  const [enabled, setEnabled] = usePersistentState<boolean>(
    "weather-alerts-enabled",
    false,
    isBoolean,
  );
  const [high, setHigh] = usePersistentState<number>(
    "weather-alerts-high",
    30,
    isNumber,
  );
  const [low, setLow] = usePersistentState<number>(
    "weather-alerts-low",
    0,
    isNumber,
  );

  const { data } = useSWR(
    enabled ? ["alerts", latitude, longitude] : null,
    ([, lat, lon]) =>
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&forecast_days=1`,
      ).then((res) => res.json()),
    {
      refreshInterval: enabled ? 5 * 60 * 1000 : 0,
      revalidateOnFocus: enabled,
    },
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !data) return;
    const temps: unknown = data?.hourly?.temperature_2m;
    if (!Array.isArray(temps)) return;
    const numbers = temps.filter((t): t is number => typeof t === "number");
    if (numbers.some((t) => t >= high)) {
      const max = Math.max(...numbers);
      new Notification("High temperature forecast", {
        body: `${max}\u00B0`,
      });
    } else if (numbers.some((t) => t <= low)) {
      const min = Math.min(...numbers);
      new Notification("Low temperature forecast", {
        body: `${min}\u00B0`,
      });
    }
  }, [data, enabled, high, low]);

  return (
    <div className="space-y-2 p-2">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        <span>Enable alerts</span>
      </label>
      <div className="flex space-x-4">
        <label className="flex items-center space-x-1">
          <span>Low</span>
          <input
            type="number"
            value={low}
            onChange={(e) => setLow(Number(e.target.value))}
            className="w-16 text-black"
          />
        </label>
        <label className="flex items-center space-x-1">
          <span>High</span>
          <input
            type="number"
            value={high}
            onChange={(e) => setHigh(Number(e.target.value))}
            className="w-16 text-black"
          />
        </label>
      </div>
    </div>
  );
};

export default Alerts;
