"use client";

import { useEffect } from "react";
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

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }

    let timer: number | undefined;

    const poll = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m&forecast_days=1`,
        );
        const json = await res.json();
        const temps: unknown = json?.hourly?.temperature_2m;
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
      } catch {
        // ignore errors
      }
    };

    const start = () => {
      poll();
      timer = window.setInterval(poll, 5 * 60 * 1000);
    };

    const stop = () => {
      if (timer) window.clearInterval(timer);
    };

    const handleFocus = () => start();
    const handleBlur = () => stop();

    if (typeof document !== "undefined" && document.hasFocus()) start();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      stop();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, high, low, latitude, longitude]);

  return (
    <div className="space-y-2 p-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            aria-label="Enable alerts"
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
              aria-label="Low temperature"
            />
          </label>
          <label className="flex items-center space-x-1">
            <span>High</span>
            <input
              type="number"
              value={high}
              onChange={(e) => setHigh(Number(e.target.value))}
              className="w-16 text-black"
              aria-label="High temperature"
            />
          </label>
        </div>
      </div>
  );
};

export default Alerts;
