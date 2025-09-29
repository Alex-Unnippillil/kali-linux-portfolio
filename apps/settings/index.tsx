"use client";

import { useState, useRef, useCallback, ChangeEvent } from "react";
import { useSettings, ACCENT_OPTIONS } from "../../hooks/useSettings";
import BackgroundSlideshow from "./components/BackgroundSlideshow";
import {
  resetSettings,
  defaults,
  exportSettings as exportSettingsData,
  parseSettings,
  applySettingsFromData,
} from "../../utils/settingsStore";
import KeymapOverlay from "./components/KeymapOverlay";
import Tabs from "../../components/Tabs";
import ToggleSwitch from "../../components/ToggleSwitch";
import KaliWallpaper from "../../components/util-components/kali-wallpaper";

export default function Settings() {
  const {
    accent,
    setAccent,
    wallpaper,
    setWallpaper,
    useKaliWallpaper,
    setUseKaliWallpaper,
    density,
    setDensity,
    reducedMotion,
    setReducedMotion,
    fontScale,
    setFontScale,
    highContrast,
    setHighContrast,
    largeHitAreas,
    setLargeHitAreas,
    pongSpin,
    setPongSpin,
    allowNetwork,
    setAllowNetwork,
    haptics,
    setHaptics,
    theme,
    setTheme,
  } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: "appearance", label: "Appearance" },
    { id: "accessibility", label: "Accessibility" },
    { id: "privacy", label: "Privacy" },
  ] as const;
  type TabId = (typeof tabs)[number]["id"];
  const [activeTab, setActiveTab] = useState<TabId>("appearance");


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
  const wallpaperIndex = Math.max(0, wallpapers.indexOf(wallpaper));

  const getCurrentSettings = useCallback(
    () => ({
      accent,
      wallpaper,
      useKaliWallpaper,
      density,
      reducedMotion,
      fontScale,
      highContrast,
      largeHitAreas,
      pongSpin,
      allowNetwork,
      haptics,
      theme,
    }),
    [
      accent,
      wallpaper,
      useKaliWallpaper,
      density,
      reducedMotion,
      fontScale,
      highContrast,
      largeHitAreas,
      pongSpin,
      allowNetwork,
      haptics,
      theme,
    ]
  );

  const syncState = useCallback(
    (next: Record<string, unknown>) => {
      if (next.accent !== undefined) setAccent(next.accent as string);
      if (next.wallpaper !== undefined) setWallpaper(next.wallpaper as string);
      if (next.useKaliWallpaper !== undefined)
        setUseKaliWallpaper(Boolean(next.useKaliWallpaper));
      if (next.density !== undefined) setDensity(next.density as any);
      if (next.reducedMotion !== undefined)
        setReducedMotion(Boolean(next.reducedMotion));
      if (next.fontScale !== undefined) setFontScale(Number(next.fontScale));
      if (next.highContrast !== undefined)
        setHighContrast(Boolean(next.highContrast));
      if (next.largeHitAreas !== undefined)
        setLargeHitAreas(Boolean(next.largeHitAreas));
      if (next.pongSpin !== undefined) setPongSpin(Boolean(next.pongSpin));
      if (next.allowNetwork !== undefined)
        setAllowNetwork(Boolean(next.allowNetwork));
      if (next.haptics !== undefined) setHaptics(Boolean(next.haptics));
      if (next.theme !== undefined) setTheme(next.theme as string);
    },
    [
      setAccent,
      setWallpaper,
      setUseKaliWallpaper,
      setDensity,
      setReducedMotion,
      setFontScale,
      setHighContrast,
      setLargeHitAreas,
      setPongSpin,
      setAllowNetwork,
      setHaptics,
      setTheme,
    ]
  );

  const handleExport = useCallback(async () => {
    const data = await exportSettingsData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settings.json";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(
    async (file: File) => {
      const text = await file.text();
      const result = parseSettings(text);
      if (!result?.success) {
        window.alert("The selected file is not a valid settings export.");
        return;
      }

      const nextSettings = result.data as Record<string, unknown>;
      const currentSettings = getCurrentSettings();
      const hasDifferences = (
        Object.keys(nextSettings) as Array<keyof typeof currentSettings>
      ).some(
        (key) =>
          nextSettings[key] !== undefined &&
          currentSettings[key] !== nextSettings[key]
      );

      if (hasDifferences) {
        const confirmed = window.confirm(
          "Importing will overwrite your current desktop preferences. Continue?"
        );
        if (!confirmed) return;
      }

      await applySettingsFromData(nextSettings);
      syncState(nextSettings);
      window.alert("Settings imported successfully.");
    },
    [getCurrentSettings, syncState]
  );

  const handleImportSelection = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      try {
        await handleImport(file);
      } catch (error) {
        console.error("Failed to import settings", error);
        window.alert("An unexpected error occurred while importing settings.");
      } finally {
        event.target.value = "";
      }
    },
    [handleImport]
  );

  const handleExportClick = useCallback(async () => {
    try {
      await handleExport();
    } catch (error) {
      console.error("Failed to export settings", error);
      window.alert("Unable to export settings. Please try again.");
    }
  }, [handleExport]);

  const handleReset = async () => {
    if (
      !window.confirm(
        "Reset desktop to default settings? This will clear all saved data."
      )
    )
      return;
    await resetSettings();
    window.localStorage.clear();
    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setDensity(defaults.density as any);
    setReducedMotion(defaults.reducedMotion);
    setUseKaliWallpaper(defaults.useKaliWallpaper);
    setFontScale(defaults.fontScale);
    setHighContrast(defaults.highContrast);
    setLargeHitAreas(defaults.largeHitAreas);
    setPongSpin(defaults.pongSpin);
    setAllowNetwork(defaults.allowNetwork);
    setHaptics(defaults.haptics);
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
          <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4 relative overflow-hidden rounded-lg shadow-inner">
            {useKaliWallpaper ? (
              <KaliWallpaper />
            ) : (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)` }}
                aria-hidden="true"
              />
            )}
          </div>
          <div className="flex justify-center my-4">
            <label htmlFor="settings-theme-select" className="mr-2 text-ubt-grey">Theme:</label>
            <select
              id="settings-theme-select"
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
          <div className="flex justify-center my-4 items-center">
            <input
              id="settings-use-kali-wallpaper"
              type="checkbox"
              checked={useKaliWallpaper}
              onChange={(e) => setUseKaliWallpaper(e.target.checked)}
              className="mr-2"
              aria-label="Kali gradient wallpaper"
            />
            <label
              htmlFor="settings-use-kali-wallpaper"
              className="text-ubt-grey cursor-pointer"
            >
              Kali Gradient Wallpaper
            </label>
          </div>
          {useKaliWallpaper && (
            <p className="text-center text-xs text-ubt-grey/70 px-6 -mt-2 mb-4">
              Your previous wallpaper selection is preserved for when you turn this off.
            </p>
          )}
          <div className="flex justify-center my-4">
            <label htmlFor="wallpaper-slider" className="mr-2 text-ubt-grey">Wallpaper:</label>
            <input
              id="wallpaper-slider"
              type="range"
              min="0"
              max={wallpapers.length - 1}
              step="1"
              value={wallpaperIndex}
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
      {activeTab === "privacy" && (
        <>
          <div className="flex justify-center my-4 space-x-4">
            <button
              onClick={handleExportClick}
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
          onChange={handleImportSelection}
          className="hidden"
        />
      <KeymapOverlay open={showKeymap} onClose={() => setShowKeymap(false)} />
    </div>
  );
}
