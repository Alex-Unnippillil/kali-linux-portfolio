"use client";

import { useEffect, useState } from "react";
import apps from "../../../apps.config.js";
import Tabs from "../../../components/Tabs";
import ToggleSwitch from "../../../components/ToggleSwitch";

interface AppConfig {
  enabled: boolean;
  urgency: "low" | "normal" | "high";
}

type AppSettings = Record<string, AppConfig>;

const STORAGE_KEY = "app-notification-settings";

export default function NotificationSettings() {
  const [activeTab, setActiveTab] = useState("applications");
  const [settings, setSettings] = useState<AppSettings>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setSettings(JSON.parse(stored));
    } catch (err) {
      console.error("Failed to load notification settings", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggleApp = (id: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      [id]: {
        enabled,
        urgency: prev[id]?.urgency || "normal",
      },
    }));
  };

  const changeUrgency = (id: string, urgency: "low" | "normal" | "high") => {
    setSettings(prev => ({
      ...prev,
      [id]: {
        enabled: prev[id]?.enabled !== false,
        urgency,
      },
    }));
  };

  const sendTest = async (id: string) => {
    const cfg = settings[id];
    if (cfg && cfg.enabled === false) return; // disabled
    if (typeof window === "undefined" || !("Notification" in window)) return;
    let permission = Notification.permission;
    if (permission !== "granted") {
      permission = await Notification.requestPermission();
    }
    if (permission === "granted") {
      const urgency = cfg?.urgency || "normal";
      const app = (apps as any).find((a: any) => a.id === id);
      new Notification(app?.title || id, {
        body: `Test notification (${urgency})`,
      });
    }
  };

  return (
    <div className="p-4">
      <Tabs
        tabs={[{ id: "applications", label: "Applications" }]}
        active={activeTab}
        onChange={setActiveTab}
      />
      {activeTab === "applications" && (
        <ul className="mt-4 space-y-4">
          {(apps as any[]).map(app => (
            <li
              key={app.id}
              className="flex items-center gap-4 border-b border-gray-700 pb-2"
            >
              <span className="flex-1">{app.title || app.id}</span>
              <ToggleSwitch
                checked={settings[app.id]?.enabled !== false}
                onChange={checked => toggleApp(app.id, checked)}
                ariaLabel={`Enable notifications for ${app.title || app.id}`}
              />
              <select
                aria-label={`Default urgency for ${app.title || app.id}`}
                value={settings[app.id]?.urgency || "normal"}
                onChange={e =>
                  changeUrgency(app.id, e.target.value as "low" | "normal" | "high")
                }
                className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                disabled={settings[app.id]?.enabled === false}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
              <button
                onClick={() => sendTest(app.id)}
                disabled={settings[app.id]?.enabled === false}
                className="px-2 py-1 bg-ub-orange text-white rounded disabled:opacity-50"
              >
                Test
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

