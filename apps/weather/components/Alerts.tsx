"use client";

import { useCallback, useEffect } from "react";
import PermissionPrompt from "../../../components/common/PermissionPrompt";
import {
  usePermissionPrompt,
  type PermissionPromptReason,
} from "../../../hooks/usePermissionPrompt";
import { getPermissionPreference } from "../../../utils/permissionPreferences";
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
  const { prompt, requestPermission, resolvePermission } = usePermissionPrompt();

  const notificationReasons: PermissionPromptReason[] = [
    {
      title: "Alert you about temperature swings",
      description:
        "Notifications let the weather app warn you when hourly forecasts exceed the high or drop below the low you set.",
    },
    {
      title: "Run entirely in your browser",
      description:
        "Temperature checks happen client-side every few minutes — no account or background service collects your data.",
    },
  ];

  const notificationPreview = (
    <div className="space-y-2 text-sm text-gray-200">
      <div className="font-semibold text-white">Notification preview</div>
      <div className="rounded border border-gray-700 bg-gray-800/70 p-3">
        <p className="font-semibold">High temperature forecast</p>
        <p className="text-gray-300">Tomorrow 96°</p>
      </div>
    </div>
  );

  const requestBrowserNotifications = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // ignore errors from native prompt
      }
    }
  }, []);

  const handleEnabledChange = (checked: boolean) => {
    if (!checked) {
      setEnabled(false);
      return;
    }

    const result = requestPermission({
      permission: "notifications",
      title: "Enable weather notifications?",
      summary:
        "We use browser notifications to let you know when the temperature crosses your custom thresholds.",
      reasons: notificationReasons,
      preview: notificationPreview,
      confirmLabel: "Enable alerts",
      declineLabel: "Not now",
      onAllow: async () => {
        setEnabled(true);
        await requestBrowserNotifications();
      },
      onDeny: () => {
        setEnabled(false);
      },
    });

    if (result.status === "blocked" || result.status === "denied") {
      setEnabled(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined" || !enabled) return;
    const pref = getPermissionPreference("notifications");
    if (pref?.remember && pref.decision === "denied") {
      setEnabled(false);
    }
  }, [enabled, setEnabled]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    void requestBrowserNotifications();

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

    if (document.hasFocus()) start();

    window.addEventListener("focus", handleFocus);
    window.addEventListener("blur", handleBlur);

    return () => {
      stop();
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("blur", handleBlur);
    };
  }, [enabled, high, low, latitude, longitude, requestBrowserNotifications]);

  return (
    <div className="space-y-2 p-2">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleEnabledChange(e.target.checked)}
            aria-label="Enable weather alerts"
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
              aria-label="Low temperature threshold"
            />
          </label>
          <label className="flex items-center space-x-1">
            <span>High</span>
            <input
              type="number"
              value={high}
              onChange={(e) => setHigh(Number(e.target.value))}
              className="w-16 text-black"
              aria-label="High temperature threshold"
            />
          </label>
        </div>
      {prompt && (
        <PermissionPrompt
          open
          permissionType={prompt.permission}
          title={prompt.title}
          summary={prompt.summary}
          reasons={prompt.reasons}
          preview={prompt.preview}
          confirmLabel={prompt.confirmLabel}
          declineLabel={prompt.declineLabel}
          onDecision={resolvePermission}
        />
      )}
    </div>
  );
};

export default Alerts;
