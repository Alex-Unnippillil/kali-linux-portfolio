"use client";

import { useState, useRef } from "react";
import { useSettings, ACCENT_OPTIONS } from "../../hooks/useSettings";
import BackgroundSlideshow from "./components/BackgroundSlideshow";
import {
  resetSettings,
  defaults,
  exportSettings as exportSettingsData,
  importSettings as importSettingsData,
} from "../../utils/settingsStore";
import KeymapOverlay from "./components/KeymapOverlay";
import Tabs from "../../components/Tabs";
import ToggleSwitch from "../../components/ToggleSwitch";
import useDisplayConfig from "../../hooks/useDisplayConfig";

export default function Settings() {
  const {
    accent,
    setAccent,
    wallpaper,
    setWallpaper,
    density,
    setDensity,
    reducedMotion,
    setReducedMotion,
    fontScale,
    setFontScale,
    highContrast,
    setHighContrast,
    haptics,
    setHaptics,
    theme,
    setTheme,
  } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: "appearance", label: "Appearance" },
    { id: "accessibility", label: "Accessibility" },
    { id: "desktop", label: "Desktop" },
    { id: "privacy", label: "Privacy" },
  ] as const;
  type TabId = (typeof tabs)[number]["id"];
  const [activeTab, setActiveTab] = useState<TabId>("appearance");

  const [displayConfig, setDisplayConfig, resetDisplayConfig] =
    useDisplayConfig();

  const handleDisplayNameChange = (id: string, name: string) => {
    setDisplayConfig((current) => ({
      ...current,
      displays: current.displays.map((display) =>
        display.id === id ? { ...display, name } : display
      ),
    }));
  };

  const handleSetPrimaryDisplay = (id: string) => {
    setDisplayConfig((current) => ({
      ...current,
      primary: current.displays.some((display) => display.id === id)
        ? id
        : current.primary,
    }));
  };

  const handleRemoveDisplay = (id: string) => {
    setDisplayConfig((current) => {
      if (current.displays.length <= 1) {
        return current;
      }
      const displays = current.displays.filter((display) => display.id !== id);
      const primary =
        current.primary === id && displays.length
          ? displays[0].id
          : current.primary;
      return {
        displays,
        primary,
      };
    });
  };

  const handleAddDisplay = () => {
    setDisplayConfig((current) => {
      const id = `display-${Math.random().toString(36).slice(2, 8)}`;
      const nextIndex = current.displays.length + 1;
      const name = `Workspace ${nextIndex}`;
      return {
        displays: [
          ...current.displays,
          {
            id,
            name,
          },
        ],
        primary: current.primary || id,
      };
    });
  };

  const activeDisplayName =
    displayConfig.displays.find((display) => display.id === displayConfig.primary)
      ?.name || "Primary Workspace";

  const wallpapers = [
    "wall-1",
    "wall-2",
    "wall-3",
    "wall-4",
    "wall-5",
    "wall-6",
    "wall-7",
    "wall-8",
  ];

  const changeBackground = (name: string) => setWallpaper(name);

  const handleExport = async () => {
    const data = await exportSettingsData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    await importSettingsData(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed.accent !== undefined) setAccent(parsed.accent);
      if (parsed.wallpaper !== undefined) setWallpaper(parsed.wallpaper);
      if (parsed.density !== undefined) setDensity(parsed.density);
      if (parsed.reducedMotion !== undefined)
        setReducedMotion(parsed.reducedMotion);
      if (parsed.fontScale !== undefined) setFontScale(parsed.fontScale);
      if (parsed.highContrast !== undefined)
        setHighContrast(parsed.highContrast);
      if (parsed.theme !== undefined) setTheme(parsed.theme);
    } catch (err) {
      console.error("Invalid settings", err);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "Reset desktop to default settings? This will clear all saved data."
      )
    )
      return;
    await resetSettings();
    window.localStorage.clear();
    resetDisplayConfig();
    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setDensity(defaults.density as any);
    setReducedMotion(defaults.reducedMotion);
    setFontScale(defaults.fontScale);
    setHighContrast(defaults.highContrast);
    setTheme("default");
  };

  const [showKeymap, setShowKeymap] = useState(false);

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === "appearance" && (
        <>
          <div
            className="md:w-2/5 w-2/3 h-1/3 m-auto my-4"
            style={{
              backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center center",
            }}
          ></div>
          <div className="flex justify-center my-4">
            <label className="mr-2 text-ubt-grey">Theme:</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              <option value="default">Default</option>
              <option value="dark">Dark</option>
              <option value="neon">Neon</option>
              <option value="matrix">Matrix</option>
            </select>
          </div>
          <div className="flex justify-center my-4">
            <label className="mr-2 text-ubt-grey">Accent:</label>
            <div aria-label="Accent color picker" role="radiogroup" className="flex gap-2">
              {ACCENT_OPTIONS.map((c) => (
                <button
                  key={c}
                  aria-label={`select-accent-${c}`}
                  role="radio"
                  aria-checked={accent === c}
                  onClick={() => setAccent(c)}
                  className={`w-8 h-8 rounded-full border-2 ${accent === c ? 'border-white' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-center my-4">
            <label htmlFor="wallpaper-slider" className="mr-2 text-ubt-grey">Wallpaper:</label>
            <input
              id="wallpaper-slider"
              type="range"
              min="0"
              max={wallpapers.length - 1}
              step="1"
              value={wallpapers.indexOf(wallpaper)}
              onChange={(e) =>
                changeBackground(wallpapers[parseInt(e.target.value, 10)])
              }
              className="ubuntu-slider"
              aria-label="Wallpaper"
            />
          </div>
          <div className="flex justify-center my-4">
            <BackgroundSlideshow />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center border-t border-gray-900">
            {wallpapers.map((name) => (
              <div
                key={name}
                role="button"
                aria-label={`Select ${name.replace("wall-", "wallpaper ")}`}
                aria-pressed={name === wallpaper}
                tabIndex={0}
                onClick={() => changeBackground(name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    changeBackground(name);
                  }
                }}
                className={
                  (name === wallpaper
                    ? " border-yellow-700 "
                    : " border-transparent ") +
                  " md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80"
                }
                style={{
                  backgroundImage: `url(/wallpapers/${name}.webp)`,
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center center",
                }}
              ></div>
            ))}
          </div>
          <div className="border-t border-gray-900 mt-4 pt-4 px-4 flex justify-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              Reset Desktop
            </button>
          </div>
        </>
      )}
      {activeTab === "accessibility" && (
        <>
          <div className="flex justify-center my-4">
            <label htmlFor="font-scale" className="mr-2 text-ubt-grey">Icon Size:</label>
            <input
              id="font-scale"
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
              className="ubuntu-slider"
              aria-label="Icon size"
            />
          </div>
          <div className="flex justify-center my-4">
            <label className="mr-2 text-ubt-grey">Density:</label>
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value as any)}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              <option value="regular">Regular</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div className="flex justify-center my-4 items-center">
            <span className="mr-2 text-ubt-grey">Reduced Motion:</span>
            <ToggleSwitch
              checked={reducedMotion}
              onChange={setReducedMotion}
              ariaLabel="Reduced Motion"
            />
          </div>
          <div className="flex justify-center my-4 items-center">
            <span className="mr-2 text-ubt-grey">High Contrast:</span>
            <ToggleSwitch
              checked={highContrast}
              onChange={setHighContrast}
              ariaLabel="High Contrast"
            />
          </div>
          <div className="flex justify-center my-4 items-center">
            <span className="mr-2 text-ubt-grey">Haptics:</span>
            <ToggleSwitch
              checked={haptics}
              onChange={setHaptics}
              ariaLabel="Haptics"
            />
          </div>
          <div className="border-t border-gray-900 mt-4 pt-4 px-4 flex justify-center">
            <button
              onClick={() => setShowKeymap(true)}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              Edit Shortcuts
            </button>
          </div>
        </>
      )}
      {activeTab === "desktop" && (
        <div className="px-4 py-6 space-y-6 text-ubt-grey">
          <p className="text-center">
            Configure workspaces for each connected display. Every display keeps
            its own set of open windows. Switching the primary display swaps to
            the corresponding workspace and taskbar.
          </p>
          <div className="flex justify-center">
            <span className="px-3 py-1 rounded-full border border-gray-900 border-opacity-60 bg-black bg-opacity-30 text-sm">
              Active workspace: {activeDisplayName}
            </span>
          </div>
          <div className="space-y-4">
            {displayConfig.displays.map((display) => {
              const isPrimary = displayConfig.primary === display.id;
              return (
                <div
                  key={display.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border border-gray-900 border-opacity-60 rounded px-4 py-3 bg-black bg-opacity-30"
                >
                  <div className="flex-1">
                    <label
                      htmlFor={`display-name-${display.id}`}
                      className="block text-sm mb-1"
                    >
                      Display name
                    </label>
                    <input
                      id={`display-name-${display.id}`}
                      type="text"
                      value={display.name}
                      onChange={(event) =>
                        handleDisplayNameChange(display.id, event.target.value)
                      }
                      className="w-full px-3 py-2 rounded border border-gray-900 border-opacity-60 bg-ub-cool-grey text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                      aria-label={`Rename ${display.name}`}
                    />
                    <p className="mt-1 text-xs opacity-70 break-all">
                      ID: {display.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetPrimaryDisplay(display.id)}
                      className={`px-3 py-2 rounded border border-gray-900 border-opacity-60 ${
                        isPrimary
                          ? "bg-ub-orange text-white"
                          : "bg-ub-cool-grey text-ubt-grey hover:bg-ubt-grey hover:bg-opacity-20"
                      }`}
                      aria-pressed={isPrimary}
                    >
                      {isPrimary ? "Primary" : "Set Primary"}
                    </button>
                    {displayConfig.displays.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDisplay(display.id)}
                        className="px-3 py-2 rounded border border-gray-900 border-opacity-60 bg-ub-cool-grey text-ubt-grey hover:bg-ubt-grey hover:bg-opacity-20"
                        aria-label={`Remove ${display.name}`}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleAddDisplay}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              Add Display
            </button>
          </div>
        </div>
      )}
      {activeTab === "privacy" && (
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
        </>
      )}
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          aria-label="Import settings file"
          onChange={(e) => {
            const file = e.target.files && e.target.files[0];
            if (file) handleImport(file);
            e.target.value = "";
          }}
          className="hidden"
        />
      <KeymapOverlay open={showKeymap} onClose={() => setShowKeymap(false)} />
    </div>
  );
}
