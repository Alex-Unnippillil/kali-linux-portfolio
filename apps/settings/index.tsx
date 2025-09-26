"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

const hexToRgb = (hex: string) => {
  const normalized = hex.replace("#", "");
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  };
};

const luminance = ({ r, g, b }: { r: number; g: number; b: number }) => {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : Math.pow((scaled + 0.055) / 1.055, 2.4);
  };
  const [lr, lg, lb] = [channel(r), channel(g), channel(b)];
  return lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
};

const contrastRatio = (foreground: string, background: string) => {
  const l1 = luminance(hexToRgb(foreground)) + 0.05;
  const l2 = luminance(hexToRgb(background)) + 0.05;
  return l1 > l2 ? l1 / l2 : l2 / l1;
};

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
  const liveRegionRef = useRef<HTMLSpanElement>(null);

  const tabs = [
    { id: "desktop", label: "Desktop" },
    { id: "accessibility", label: "Accessibility" },
    { id: "system", label: "System" },
  ] as const;
  type TabId = (typeof tabs)[number]["id"];
  const [activeTab, setActiveTab] = useState<TabId>("desktop");

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

  const accentTextColor = useMemo(() => {
    return contrastRatio(accent, "#000000") > contrastRatio(accent, "#ffffff")
      ? "#000000"
      : "#ffffff";
  }, [accent]);

  const contrast = useMemo(() => contrastRatio(accent, accentTextColor), [
    accent,
    accentTextColor,
  ]);

  useEffect(() => {
    if (!liveRegionRef.current) return;
    liveRegionRef.current.textContent = `Contrast ratio ${contrast.toFixed(
      2
    )}:1 ${contrast >= 4.5 ? "passes" : "fails"}`;
  }, [contrast]);

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
      if (parsed.largeHitAreas !== undefined)
        setLargeHitAreas(parsed.largeHitAreas);
      if (parsed.pongSpin !== undefined) setPongSpin(parsed.pongSpin);
      if (parsed.allowNetwork !== undefined)
        setAllowNetwork(parsed.allowNetwork);
      if (parsed.useKaliWallpaper !== undefined)
        setUseKaliWallpaper(parsed.useKaliWallpaper);
      if (parsed.haptics !== undefined) setHaptics(parsed.haptics);
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
    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setUseKaliWallpaper(defaults.useKaliWallpaper);
    setDensity(defaults.density as any);
    setReducedMotion(defaults.reducedMotion);
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
      {activeTab === "desktop" && (
        <div className="px-6 py-6 space-y-6 text-ubt-grey">
          <section aria-labelledby="desktop-theme" className="space-y-4">
            <div className="md:w-2/5 w-full md:min-w-[300px] h-48 m-auto relative overflow-hidden rounded-lg shadow-inner">
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2" aria-labelledby="desktop-theme">
                <h2 id="desktop-theme" className="text-lg font-semibold text-white">
                  Theme & Accent
                </h2>
                <div className="flex flex-wrap gap-4 items-center">
                  <label className="flex flex-col text-sm">
                    <span className="mb-1">Theme</span>
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
                  </label>
                  <div>
                    <span className="block text-sm mb-1">Accent</span>
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
                          className={`w-8 h-8 rounded-full border-2 ${
                            accent === c ? "border-white" : "border-transparent"
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded border border-ubt-cool-grey bg-ub-cool-grey/70 text-sm text-white">
                <p className="mb-2 text-center font-semibold">Accent Preview</p>
                <button
                  className="px-3 py-1 rounded"
                  style={{ backgroundColor: accent, color: accentTextColor }}
                  type="button"
                >
                  Accent
                </button>
                <p
                  className={`mt-3 text-center ${
                    contrast >= 4.5 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  Contrast {contrast.toFixed(2)}:1 {contrast >= 4.5 ? "Pass" : "Fail"}
                </p>
                <span ref={liveRegionRef} role="status" aria-live="polite" className="sr-only" />
              </div>
            </div>
          </section>

          <section aria-labelledby="desktop-wallpaper" className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 id="desktop-wallpaper" className="text-lg font-semibold text-white">
                  Wallpaper
                </h2>
                <p className="text-sm text-ubt-grey">
                  Choose a static wallpaper or let the slideshow rotate through your favorites.
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useKaliWallpaper}
                  onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                  aria-label="Use Kali gradient wallpaper"
                />
                Use Kali gradient wallpaper
              </label>
            </div>
            {useKaliWallpaper && (
              <p className="text-xs text-ubt-grey/70">
                Your previous wallpaper selection is preserved for when you turn this off.
              </p>
            )}
            <div className="flex flex-col gap-4">
              <label htmlFor="wallpaper-slider" className="flex items-center gap-3">
                <span className="text-sm">Browse wallpapers</span>
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
                  className="ubuntu-slider flex-1"
                  aria-label="Wallpaper"
                />
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {wallpapers.map((name) => (
                  <button
                    key={name}
                    type="button"
                    aria-label={`Select ${name.replace("wall-", "wallpaper ")}`}
                    aria-pressed={name === wallpaper}
                    onClick={() => changeBackground(name)}
                    className={`h-24 md:h-32 rounded border-4 border-opacity-80 bg-cover bg-center outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
                      name === wallpaper ? "border-yellow-700" : "border-transparent"
                    }`}
                    style={{ backgroundImage: `url(/wallpapers/${name}.webp)` }}
                  />
                ))}
              </div>
            </div>
            <div className="border border-gray-900/60 rounded">
              <BackgroundSlideshow />
            </div>
          </section>

          <section aria-labelledby="desktop-motion" className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 id="desktop-motion" className="text-lg font-semibold text-white">
                  Motion & Input
                </h2>
                <p className="text-sm text-ubt-grey">
                  Control animations, haptics, and shortcuts across the desktop.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex items-center gap-2">
                  <span>Reduced Motion</span>
                  <ToggleSwitch
                    checked={reducedMotion}
                    onChange={setReducedMotion}
                    ariaLabel="Reduced Motion"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span>Haptics</span>
                  <ToggleSwitch
                    checked={haptics}
                    onChange={setHaptics}
                    ariaLabel="Haptics"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setShowKeymap(true)}
                className="px-4 py-2 rounded bg-ub-orange text-white"
                type="button"
                aria-label="Open shortcut grab overlay"
              >
                Grab keyboard shortcuts
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded border border-ub-orange text-ub-orange hover:bg-ub-orange/20"
                type="button"
              >
                Reset desktop
              </button>
            </div>
          </section>
        </div>
      )}
      {activeTab === "accessibility" && (
        <div className="px-6 py-6 space-y-6 text-ubt-grey">
          <section aria-labelledby="access-visual" className="space-y-4">
            <h2 id="access-visual" className="text-lg font-semibold text-white">
              Layout & Legibility
            </h2>
            <div className="flex flex-col gap-4">
              <label htmlFor="font-scale" className="flex flex-col gap-2 text-sm">
                <span>Icon size</span>
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
              </label>
              <label className="flex flex-col gap-2 text-sm max-w-xs">
                <span>Density</span>
                <select
                  value={density}
                  onChange={(e) => setDensity(e.target.value as typeof density)}
                  className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
                >
                  <option value="regular">Regular</option>
                  <option value="compact">Compact</option>
                </select>
              </label>
            </div>
          </section>

          <section aria-labelledby="access-contrast" className="space-y-4">
            <h2 id="access-contrast" className="text-lg font-semibold text-white">
              Contrast & Targets
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <span>High contrast</span>
                <ToggleSwitch
                  checked={highContrast}
                  onChange={setHighContrast}
                  ariaLabel="High contrast"
                />
              </div>
              <div className="flex items-center gap-2">
                <span>Large hit areas</span>
                <ToggleSwitch
                  checked={largeHitAreas}
                  onChange={setLargeHitAreas}
                  ariaLabel="Large hit areas"
                />
              </div>
              <div className="flex items-center gap-2">
                <span>Pong spin</span>
                <ToggleSwitch
                  checked={pongSpin}
                  onChange={setPongSpin}
                  ariaLabel="Pong spin"
                />
              </div>
            </div>
          </section>
        </div>
      )}
      {activeTab === "system" && (
        <div className="px-6 py-6 space-y-6 text-ubt-grey">
          <section aria-labelledby="system-privacy" className="space-y-4">
            <h2 id="system-privacy" className="text-lg font-semibold text-white">
              System Preferences
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <span>Allow network requests</span>
                <ToggleSwitch
                  checked={allowNetwork}
                  onChange={setAllowNetwork}
                  ariaLabel="Allow network requests"
                />
              </div>
            </div>
          </section>

          <section aria-labelledby="system-backup" className="space-y-4">
            <h2 id="system-backup" className="text-lg font-semibold text-white">
              Backup & Restore
            </h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded bg-ub-orange text-white"
                type="button"
              >
                Export settings
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded border border-ub-orange text-ub-orange hover:bg-ub-orange/20"
                type="button"
              >
                Import settings
              </button>
            </div>
          </section>
        </div>
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
