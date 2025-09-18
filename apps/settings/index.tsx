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
import {
  useAccessibilityPrefs,
  HOVER_ZOOM_MIN,
  HOVER_ZOOM_MAX,
  FULLSCREEN_ZOOM_MIN,
  FULLSCREEN_ZOOM_MAX,
  type ColorFilter,
} from "../../hooks/useAccessibilityPrefs";

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
  const {
    hoverLensEnabled,
    fullScreenMagnifierEnabled,
    hoverZoom,
    fullscreenZoom,
    filterStyle,
    toggleHoverLens,
    toggleFullscreenMagnifier,
    setHoverZoom,
    setFullscreenZoom,
    toggleFilter,
    isFilterActive,
    reset: resetVisualAssist,
    shortcuts: accessibilityShortcuts,
  } = useAccessibilityPrefs();
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
          <div className="border-t border-gray-900 mt-6 pt-6 px-4 space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-ubt-grey">
                Visual Assist
              </h3>
              <p className="text-sm text-ubt-grey/80">
                Magnify content and apply color filters for additional clarity.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-ubt-grey">Hover lens</span>
                  <ToggleSwitch
                    checked={hoverLensEnabled}
                    onChange={toggleHoverLens}
                    ariaLabel="Hover lens"
                  />
                </div>
                <label className="block text-left text-sm text-ubt-grey">
                  Lens zoom
                  <input
                    type="range"
                    min={HOVER_ZOOM_MIN}
                    max={HOVER_ZOOM_MAX}
                    step={0.1}
                    value={hoverZoom}
                    onChange={(event) =>
                      setHoverZoom(parseFloat(event.target.value))
                    }
                    className="mt-1 w-full ubuntu-slider"
                    aria-label="Hover lens zoom"
                    disabled={!hoverLensEnabled}
                  />
                  <span className="text-xs text-ubt-grey/70">
                    {hoverZoom.toFixed(1)}x magnification
                  </span>
                </label>
                <div className="flex items-center justify-between pt-2">
                  <span className="text-ubt-grey">Full-screen magnifier</span>
                  <ToggleSwitch
                    checked={fullScreenMagnifierEnabled}
                    onChange={toggleFullscreenMagnifier}
                    ariaLabel="Full-screen magnifier"
                  />
                </div>
                <label className="block text-left text-sm text-ubt-grey">
                  Magnifier zoom
                  <input
                    type="range"
                    min={FULLSCREEN_ZOOM_MIN}
                    max={FULLSCREEN_ZOOM_MAX}
                    step={0.1}
                    value={fullscreenZoom}
                    onChange={(event) =>
                      setFullscreenZoom(parseFloat(event.target.value))
                    }
                    className="mt-1 w-full ubuntu-slider"
                    aria-label="Full-screen magnifier zoom"
                    disabled={!fullScreenMagnifierEnabled}
                  />
                  <span className="text-xs text-ubt-grey/70">
                    {fullscreenZoom.toFixed(1)}x magnification
                  </span>
                </label>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="block text-sm text-ubt-grey mb-2">
                    Color filters
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { key: "protanopia", label: "Protanopia" },
                        { key: "deuteranopia", label: "Deuteranopia" },
                        { key: "tritanopia", label: "Tritanopia" },
                        { key: "grayscale", label: "Grayscale" },
                      ] as { key: ColorFilter; label: string }[]
                    ).map((option) => (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => toggleFilter(option.key)}
                        className={`px-3 py-2 rounded border transition-colors ${
                          isFilterActive(option.key)
                            ? "bg-ub-orange text-white border-ub-orange"
                            : "bg-ub-cool-grey text-ubt-grey border-gray-700"
                        }`}
                        aria-pressed={isFilterActive(option.key)}
                        aria-label={`Toggle ${option.label} filter`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className="rounded border border-gray-700 bg-black/40 p-4 text-left"
                  style={{
                    filter: filterStyle === "none" ? undefined : filterStyle,
                  }}
                  aria-label="Color filter preview"
                >
                  <p className="text-base font-semibold text-white">
                    Visual Assist preview
                  </p>
                  <p className="mt-1 text-sm text-ubt-grey">
                    Explore the interface with your selected filters to ensure
                    comfortable contrast.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                onClick={resetVisualAssist}
                className="rounded bg-gray-800 px-3 py-2 text-sm text-white hover:bg-gray-700"
                type="button"
              >
                Reset Visual Assist
              </button>
              <ul className="flex flex-wrap gap-3 text-xs text-ubt-grey/80">
                {accessibilityShortcuts.map((shortcut) => (
                  <li key={shortcut.id} className="flex items-center gap-1">
                    <span>{shortcut.description}:</span>
                    <kbd className="rounded bg-gray-800 px-2 py-1 font-mono text-white">
                      {shortcut.combo}
                    </kbd>
                  </li>
                ))}
              </ul>
            </div>
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
