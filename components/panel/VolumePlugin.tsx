import React, { useEffect, useState } from "react";

const PANEL_KEY = "xfce.panel.volume-plugin";

export default function VolumePlugin() {
  const [enabled, setEnabled] = useState(true);
  const [level, setLevel] = useState(50);
  const [visible, setVisible] = useState(false);

  // Sync enabled state with localStorage and storage events
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(PANEL_KEY);
    setEnabled(stored !== "false");
    const handleStorage = (e: StorageEvent) => {
      if (e.key === PANEL_KEY) {
        setEnabled(e.newValue !== "false");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Register media-key listeners when enabled
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.code) {
        case "AudioVolumeUp":
          setLevel((l) => Math.min(l + 5, 100));
          break;
        case "AudioVolumeDown":
          setLevel((l) => Math.max(l - 5, 0));
          break;
        case "AudioVolumeMute":
          setLevel(0);
          break;
        default:
          return;
      }
      setVisible(true);
      setTimeout(() => setVisible(false), 1000);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled]);

  if (!enabled || !visible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-[1000]">
      <div className="bg-black bg-opacity-75 text-white px-4 py-2 rounded">
        Volume: {level}
      </div>
    </div>
  );
}
