"use client";

import { useEffect } from "react";
import usePersistentState from "../../../hooks/usePersistentState";
import usePermissions from "../../../hooks/usePermissions";

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
  const { requestPermission, getStatus } = usePermissions();
  const notificationsGranted = getStatus("notifications") === "granted";

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (!("Notification" in window)) return;

    let cancelled = false;

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

    const init = async () => {
      let granted = notificationsGranted;
      if (!granted) {
        granted = await requestPermission({
          permission: "notifications",
          appName: "Weather Alerts",
          title: "Weather alert notifications",
          message:
            "Allow Weather Alerts to notify you when forecast temperatures cross your thresholds.",
          details: [
            "Alerts trigger at most every five minutes while this window is open.",
            "You can revoke notification access from Settings at any time.",
          ],
          successMessage: "Weather alerts enabled.",
          failureMessage: "Weather alerts will stay disabled without notifications.",
          request: async () => {
            const res = await Notification.requestPermission();
            return res === "granted";
          },
        });
      }

      if (cancelled) return;
      if (!granted) {
        setEnabled(false);
        return;
      }

      if (document.hasFocus()) start();

      window.addEventListener("focus", handleFocus);
      window.addEventListener("blur", handleBlur);
    };

    init().catch(() => {
      if (!cancelled) setEnabled(false);
    });

    return () => {
      cancelled = true;
      stop();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [
    enabled,
    high,
    low,
    latitude,
    longitude,
    notificationsGranted,
    requestPermission,
    setEnabled,
  ]);

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
