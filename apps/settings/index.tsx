"use client";

import { useState } from "react";
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
import KaliWallpaper from "../../components/util-components/kali-wallpaper";
import {
  openFileDialog,
  FileDialogError,
  getFileDialogConstraint,
} from "../../utils/fileDialogs";

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
    haptics,
    setHaptics,
    theme,
    setTheme,
  } = useSettings();
  const settingsConstraint = getFileDialogConstraint("settings");
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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

  const importSettingsFromText = async (
    text: string,
    source: string,
    successMessage?: string,
  ) => {
    setImportError(null);
    setImportInfo(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      setImportError("Settings files must contain valid JSON data.");
      return false;
    }

    await importSettingsData(parsed);

    if (parsed.accent !== undefined) setAccent(parsed.accent as string);
    if (parsed.wallpaper !== undefined) setWallpaper(parsed.wallpaper as string);
    if ((parsed as { useKaliWallpaper?: boolean }).useKaliWallpaper !== undefined)
      setUseKaliWallpaper(Boolean((parsed as { useKaliWallpaper?: boolean }).useKaliWallpaper));
    if (parsed.density !== undefined) setDensity(parsed.density as any);
    if (parsed.reducedMotion !== undefined)
      setReducedMotion(Boolean(parsed.reducedMotion));
    if (parsed.fontScale !== undefined)
      setFontScale(Number(parsed.fontScale));
    if (parsed.highContrast !== undefined)
      setHighContrast(Boolean(parsed.highContrast));
    if ((parsed as { haptics?: boolean }).haptics !== undefined)
      setHaptics(Boolean((parsed as { haptics?: boolean }).haptics));
    if ((parsed as { theme?: string }).theme !== undefined)
      setTheme((parsed as { theme?: string }).theme ?? "default");

    setImportInfo(successMessage ?? `Imported settings from ${source}`);
    return true;
  };

  const applyImportedSettings = async (
    file: File,
    source: string,
    successMessage?: string,
  ) => {
    setImportError(null);
    setImportInfo(null);
    let text: string;
    try {
      text = await file.text();
    } catch {
      setImportError("Unable to read the selected settings file.");
      return false;
    }
    return importSettingsFromText(text, source, successMessage);
  };

  const handleImport = async () => {
    try {
      const handle = await openFileDialog("settings");
      if (!handle) return;
      const file = await handle.getFile();
      await applyImportedSettings(file, file.name);
    } catch (error) {
      if (error instanceof FileDialogError) {
        setImportError(error.message);
        setImportInfo(null);
        return;
      }
      console.error(error);
      setImportError("An unexpected error occurred while opening the file.");
    }
  };

  const handleSampleImport = async () => {
    if (!settingsConstraint.sampleData) return;
    const { getContent, fileName, label, successMessage } =
      settingsConstraint.sampleData;
    const text = await getContent();
    await importSettingsFromText(text, label ?? fileName, successMessage);
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
            <label className="mr-2 text-ubt-grey flex items-center">
              <input
                type="checkbox"
                checked={useKaliWallpaper}
                onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                className="mr-2"
              />
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
              onClick={handleExport}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              Export Settings
            </button>
            <button
              onClick={handleImport}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              Import Settings
            </button>
          </div>
          <div className="flex flex-col items-center space-y-2 text-sm text-ubt-grey">
            {settingsConstraint.sampleData && (
              <button
                type="button"
                onClick={handleSampleImport}
                className="text-xs underline hover:text-white"
              >
                {settingsConstraint.sampleData.label}
              </button>
            )}
            {importInfo && (
              <p className="text-green-300 text-center max-w-md">{importInfo}</p>
            )}
            {importError && (
              <p className="text-red-300 text-center max-w-md">{importError}</p>
            )}
          </div>
        </>
      )}
      <KeymapOverlay open={showKeymap} onClose={() => setShowKeymap(false)} />
    </div>
  );
}
