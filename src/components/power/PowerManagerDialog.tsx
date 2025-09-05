"use client";

import { useEffect, useState } from "react";
import Tabs from "../../../components/Tabs";
import ToggleSwitch from "../../../components/ToggleSwitch";

interface PowerSettings {
  showNotifications: boolean;
  showTrayIcon: boolean;
}

const DEFAULT_SETTINGS: PowerSettings = {
  showNotifications: true,
  showTrayIcon: true,
};

const TAB_ITEMS = [
  { id: "general", label: "General" },
  { id: "display", label: "Display" },
  { id: "devices", label: "Devices" },
] as const;

type TabId = (typeof TAB_ITEMS)[number]["id"];

async function getFileHandle(create = false) {
  if (!(navigator.storage && navigator.storage.getDirectory)) return null;
  const root = await navigator.storage.getDirectory();
  let dir = root;
  for (const segment of [".config", "xfce4"]) {
    try {
      dir = await dir.getDirectoryHandle(segment, { create });
    } catch {
      if (!create) return null;
      dir = await dir.getDirectoryHandle(segment, { create: true });
    }
  }
  try {
    return await dir.getFileHandle("power.json", { create });
  } catch {
    if (!create) return null;
    return await dir.getFileHandle("power.json", { create: true });
  }
}

async function readSettings(): Promise<PowerSettings> {
  try {
    const handle = await getFileHandle();
    if (!handle) return DEFAULT_SETTINGS;
    const file = await handle.getFile();
    const text = await file.text();
    const parsed = JSON.parse(text);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

async function writeSettings(settings: PowerSettings) {
  try {
    const handle = await getFileHandle(true);
    if (!handle) return;
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(settings));
    await writable.close();
  } catch {
    /* ignore */
  }
}

export default function PowerManagerDialog() {
  const [tab, setTab] = useState<TabId>("general");
  const [settings, setSettings] = useState<PowerSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    let mounted = true;
    readSettings().then((s) => {
      if (mounted) setSettings(s);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const updateSetting = (key: keyof PowerSettings, value: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      writeSettings(next);
      const eventName =
        key === "showNotifications"
          ? "power-show-notifications-changed"
          : "power-tray-icon-changed";
      window.dispatchEvent(new CustomEvent(eventName, { detail: value }));
      return next;
    });
  };

  return (
    <div className="w-96 p-4 bg-ub-cool-grey text-ubt-white">
      <Tabs
        tabs={TAB_ITEMS}
        active={tab}
        onChange={setTab}
        className="mb-4 border-b border-ubt-grey"
      />
      {tab === "general" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>Show notifications</span>
            <ToggleSwitch
              checked={settings.showNotifications}
              onChange={(v) => updateSetting("showNotifications", v)}
              ariaLabel="show-notifications"
            />
          </div>
          <div className="flex items-center justify-between">
            <span>Show tray icon</span>
            <ToggleSwitch
              checked={settings.showTrayIcon}
              onChange={(v) => updateSetting("showTrayIcon", v)}
              ariaLabel="show-tray-icon"
            />
          </div>
        </div>
      )}
      {tab === "display" && (
        <div className="text-ubt-grey text-sm">Display settings are not available.</div>
      )}
      {tab === "devices" && (
        <div className="text-ubt-grey text-sm">No devices detected.</div>
      )}
    </div>
  );
}

