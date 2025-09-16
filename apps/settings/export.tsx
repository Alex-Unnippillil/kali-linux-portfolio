"use client";

import { ChangeEvent, useRef } from "react";
import { useSettings } from "../../hooks/useSettings";
import {
  exportSettings as exportSettingsData,
  importSettings as importSettingsData,
} from "../../utils/settingsStore";

type Density = "regular" | "compact";

interface SettingsPayload {
  accent?: unknown;
  wallpaper?: unknown;
  density?: unknown;
  reducedMotion?: unknown;
  fontScale?: unknown;
  highContrast?: unknown;
  largeHitAreas?: unknown;
  pongSpin?: unknown;
  allowNetwork?: unknown;
  haptics?: unknown;
  theme?: unknown;
}

const isDensity = (value: unknown): value is Density =>
  value === "regular" || value === "compact";

const download = (content: string, filename: string) => {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export default function ExportSettings() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    setAccent,
    setWallpaper,
    setDensity,
    setReducedMotion,
    setFontScale,
    setHighContrast,
    setLargeHitAreas,
    setPongSpin,
    setAllowNetwork,
    setHaptics,
    setTheme,
  } = useSettings();

  const applySettings = (settings: SettingsPayload) => {
    if (typeof settings.accent === "string") setAccent(settings.accent);
    if (typeof settings.wallpaper === "string") setWallpaper(settings.wallpaper);
    if (isDensity(settings.density)) setDensity(settings.density);
    if (typeof settings.reducedMotion === "boolean")
      setReducedMotion(settings.reducedMotion);
    if (typeof settings.fontScale === "number" && Number.isFinite(settings.fontScale))
      setFontScale(settings.fontScale);
    if (typeof settings.highContrast === "boolean")
      setHighContrast(settings.highContrast);
    if (typeof settings.largeHitAreas === "boolean")
      setLargeHitAreas(settings.largeHitAreas);
    if (typeof settings.pongSpin === "boolean") setPongSpin(settings.pongSpin);
    if (typeof settings.allowNetwork === "boolean")
      setAllowNetwork(settings.allowNetwork);
    if (typeof settings.haptics === "boolean") setHaptics(settings.haptics);
    if (typeof settings.theme === "string") setTheme(settings.theme);
  };

  const handleExport = async () => {
    const data = await exportSettingsData();
    download(data, "kali-settings.json");
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed: SettingsPayload = JSON.parse(text);
      await importSettingsData(parsed);
      applySettings(parsed);
    } catch (error) {
      console.error("Failed to import settings", error);
    } finally {
      event.target.value = "";
    }
  };

  return (
    <>
      <div className="flex justify-center my-4 space-x-4">
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded bg-ub-orange text-white"
        >
          Export Settings
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-4 py-2 rounded bg-ub-orange text-white"
        >
          Import Settings
        </button>
      </div>
      <input
        type="file"
        accept="application/json"
        ref={fileInputRef}
        aria-label="Import settings file"
        onChange={handleImport}
        className="hidden"
      />
    </>
  );
}
