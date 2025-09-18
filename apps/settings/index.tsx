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
import SubsectionSidebar from "./components/SubsectionSidebar";
import { settingsTabs, type SettingsTabId } from "./navigation";

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
  const contentRef = useRef<HTMLDivElement | null>(null);

  const tabs = settingsTabs;
  const [activeTab, setActiveTab] = useState<SettingsTabId>("appearance");

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

  const headingClass =
    "text-sm font-semibold uppercase tracking-wide text-ubt-light";
  const labelClass = "text-ubt-grey";

  return (
    <div className="w-full flex flex-col flex-grow z-20 max-h-full overflow-hidden windowMainScreen select-none bg-ub-cool-grey">
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      <div className="flex flex-1 min-h-0">
        <SubsectionSidebar
          activeTab={activeTab}
          scrollContainerRef={contentRef}
        />
        <div
          ref={contentRef}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-10"
        >
          {activeTab === "appearance" && (
            <div className="space-y-10">
              <section aria-labelledby="appearance-preview" className="space-y-4">
                <h2 id="appearance-preview" className={headingClass}>
                  Preview
                </h2>
                <div
                  className="mx-auto h-48 w-full max-w-xl rounded border border-gray-900"
                  style={{
                    backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center center",
                  }}
                  aria-hidden="true"
                />
              </section>

              <section aria-labelledby="appearance-theme" className="space-y-4">
                <h2 id="appearance-theme" className={headingClass}>
                  Theme
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <label htmlFor="theme-select" className={labelClass}>
                    Theme
                  </label>
                  <select
                    id="theme-select"
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
              </section>

              <section aria-labelledby="appearance-accent" className="space-y-4">
                <h2 id="appearance-accent" className={headingClass}>
                  Accent
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <span className={labelClass}>Accent color</span>
                  <div
                    aria-label="Accent color picker"
                    role="radiogroup"
                    className="flex flex-wrap gap-2"
                  >
                    {ACCENT_OPTIONS.map((c) => (
                      <button
                        key={c}
                        aria-label={`select-accent-${c}`}
                        role="radio"
                        aria-checked={accent === c}
                        onClick={() => setAccent(c)}
                        className={`h-8 w-8 rounded-full border-2 ${
                          accent === c ? "border-white" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </section>

              <section aria-labelledby="appearance-wallpaper" className="space-y-4">
                <h2 id="appearance-wallpaper" className={headingClass}>
                  Wallpaper
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <label htmlFor="wallpaper-slider" className={labelClass}>
                    Wallpaper
                  </label>
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
              </section>

              <section
                aria-labelledby="appearance-slideshow"
                className="space-y-4"
              >
                <h2 id="appearance-slideshow" className={headingClass}>
                  Background Slideshow
                </h2>
                <div className="max-w-md">
                  <BackgroundSlideshow />
                </div>
              </section>

              <section aria-labelledby="appearance-library" className="space-y-4">
                <h2 id="appearance-library" className={headingClass}>
                  Wallpaper Gallery
                </h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
                        " aspect-video rounded border-4 border-opacity-80 outline-none"
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
              </section>

              <section aria-labelledby="appearance-reset" className="space-y-4">
                <h2 id="appearance-reset" className={headingClass}>
                  Reset
                </h2>
                <button
                  onClick={handleReset}
                  className="rounded bg-ub-orange px-4 py-2 text-white"
                >
                  Reset Desktop
                </button>
              </section>
            </div>
          )}

          {activeTab === "accessibility" && (
            <div className="space-y-10">
              <section
                aria-labelledby="accessibility-icon-size"
                className="space-y-4"
              >
                <h2 id="accessibility-icon-size" className={headingClass}>
                  Icon Size
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <label htmlFor="font-scale" className={labelClass}>
                    Icon Size
                  </label>
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
              </section>

              <section
                aria-labelledby="accessibility-density"
                className="space-y-4"
              >
                <h2 id="accessibility-density" className={headingClass}>
                  Interface Density
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <label className={labelClass}>Density</label>
                  <select
                    value={density}
                    onChange={(e) => setDensity(e.target.value as any)}
                    className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                  >
                    <option value="regular">Regular</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>
              </section>

              <section
                aria-labelledby="accessibility-reduced-motion"
                className="space-y-4"
              >
                <h2 id="accessibility-reduced-motion" className={headingClass}>
                  Reduced Motion
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <span className={labelClass}>Reduced Motion</span>
                  <ToggleSwitch
                    checked={reducedMotion}
                    onChange={setReducedMotion}
                    ariaLabel="Reduced Motion"
                  />
                </div>
              </section>

              <section
                aria-labelledby="accessibility-high-contrast"
                className="space-y-4"
              >
                <h2 id="accessibility-high-contrast" className={headingClass}>
                  High Contrast
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <span className={labelClass}>High Contrast</span>
                  <ToggleSwitch
                    checked={highContrast}
                    onChange={setHighContrast}
                    ariaLabel="High Contrast"
                  />
                </div>
              </section>

              <section
                aria-labelledby="accessibility-haptics"
                className="space-y-4"
              >
                <h2 id="accessibility-haptics" className={headingClass}>
                  Haptics
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <span className={labelClass}>Haptics</span>
                  <ToggleSwitch
                    checked={haptics}
                    onChange={setHaptics}
                    ariaLabel="Haptics"
                  />
                </div>
              </section>

              <section
                aria-labelledby="accessibility-shortcuts"
                className="space-y-4"
              >
                <h2 id="accessibility-shortcuts" className={headingClass}>
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={() => setShowKeymap(true)}
                  className="rounded bg-ub-orange px-4 py-2 text-white"
                >
                  Edit Shortcuts
                </button>
              </section>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-10">
              <section aria-labelledby="privacy-backup" className="space-y-4">
                <h2 id="privacy-backup" className={headingClass}>
                  Backup &amp; Restore
                </h2>
                <div className="flex flex-wrap items-center gap-4">
                  <button
                    onClick={handleExport}
                    className="rounded bg-ub-orange px-4 py-2 text-white"
                  >
                    Export Settings
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded bg-ub-orange px-4 py-2 text-white"
                  >
                    Import Settings
                  </button>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
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
