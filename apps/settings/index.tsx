"use client";

import { useRef, useState } from "react";
import {
  useSettings,
  ACCENT_OPTIONS,
} from "../../hooks/useSettings";
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

const WORKSPACE_FALLBACKS =
  defaults.workspaceNames ?? ["Desktop 1", "Desktop 2", "Desktop 3", "Desktop 4"];

const TABS = [
  { id: "appearance", label: "Appearance" },
  { id: "panel", label: "Panel" },
  { id: "workspaces", label: "Workspaces" },
  { id: "wallpaper", label: "Wallpaper" },
  { id: "accessibility", label: "Accessibility" },
] as const;

type TabId = (typeof TABS)[number]["id"];

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
    largeHitAreas,
    setLargeHitAreas,
    allowNetwork,
    setAllowNetwork,
    haptics,
    setHaptics,
    theme,
    setTheme,
    panelPosition,
    setPanelPosition,
    panelSize,
    setPanelSize,
    panelOpacity,
    setPanelOpacity,
    panelAutohide,
    setPanelAutohide,
    workspaceCount,
    setWorkspaceCount,
    workspaceNames,
    setWorkspaceNames,
  } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<TabId>(TABS[0].id);
  const [showKeymap, setShowKeymap] = useState(false);

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
      if (typeof parsed.accent === "string") setAccent(parsed.accent);
      if (typeof parsed.wallpaper === "string") setWallpaper(parsed.wallpaper);
      if (parsed.density === "regular" || parsed.density === "compact")
        setDensity(parsed.density);
      if (typeof parsed.reducedMotion === "boolean")
        setReducedMotion(parsed.reducedMotion);
      if (typeof parsed.fontScale === "number") setFontScale(parsed.fontScale);
      if (typeof parsed.highContrast === "boolean") setHighContrast(parsed.highContrast);
      if (typeof parsed.largeHitAreas === "boolean") setLargeHitAreas(parsed.largeHitAreas);
      if (typeof parsed.allowNetwork === "boolean") setAllowNetwork(parsed.allowNetwork);
      if (typeof parsed.haptics === "boolean") setHaptics(parsed.haptics);
      if (parsed.panelPosition === "top" || parsed.panelPosition === "bottom")
        setPanelPosition(parsed.panelPosition);
      if (typeof parsed.panelSize === "number") setPanelSize(parsed.panelSize);
      if (typeof parsed.panelOpacity === "number") setPanelOpacity(parsed.panelOpacity);
      if (typeof parsed.panelAutohide === "boolean") setPanelAutohide(parsed.panelAutohide);
      if (typeof parsed.workspaceCount === "number")
        setWorkspaceCount(parsed.workspaceCount);
      if (
        Array.isArray(parsed.workspaceNames) &&
        parsed.workspaceNames.every((name: unknown) => typeof name === "string")
      )
        setWorkspaceNames(parsed.workspaceNames);
      if (typeof parsed.theme === "string") setTheme(parsed.theme);
    } catch (err) {
      console.error("Invalid settings", err);
    }
  };

  const workspaceFallbackCount = defaults.workspaceCount ?? WORKSPACE_FALLBACKS.length;

  const handleReset = async () => {
    if (
      !window.confirm(
        "Reset desktop to default settings? This will clear all saved data.",
      )
    )
      return;
    await resetSettings();
    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setDensity(defaults.density as any);
    setReducedMotion(defaults.reducedMotion);
    setFontScale(defaults.fontScale);
    setHighContrast(defaults.highContrast);
    setLargeHitAreas(defaults.largeHitAreas);
    setAllowNetwork(defaults.allowNetwork);
    setHaptics(defaults.haptics);
    const fallbackPosition =
      defaults.panelPosition === "top" || defaults.panelPosition === "bottom"
        ? defaults.panelPosition
        : "bottom";
    setPanelPosition(fallbackPosition);
    setPanelSize(defaults.panelSize ?? 40);
    setPanelOpacity(defaults.panelOpacity ?? 0.5);
    setPanelAutohide(defaults.panelAutohide ?? false);
    setWorkspaceCount(workspaceFallbackCount);
    const fallbackNames = WORKSPACE_FALLBACKS.slice(0, workspaceFallbackCount);
    while (fallbackNames.length < workspaceFallbackCount) {
      fallbackNames.push(`Desktop ${fallbackNames.length + 1}`);
    }
    setWorkspaceNames(fallbackNames);
    setTheme("default");
  };

  const visibleWorkspaceNames = workspaceNames.slice(0, workspaceCount);

  const handleWorkspaceNameChange = (index: number, value: string) => {
    const next = [...workspaceNames];
    next[index] = value;
    setWorkspaceNames(next);
  };

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>

      {activeTab === "appearance" && (
        <div className="px-6 py-6 space-y-6 text-ubt-grey">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <label htmlFor="theme" className="font-medium text-white">
              Theme
            </label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-ubt-cool-grey"
            >
              <option value="default">Default</option>
              <option value="dark">Dark</option>
              <option value="neon">Neon</option>
              <option value="matrix">Matrix</option>
            </select>
          </div>

          <div>
            <p className="font-medium text-white mb-2">Accent color</p>
            <div
              aria-label="Accent color picker"
              role="radiogroup"
              className="flex flex-wrap gap-3"
            >
              {ACCENT_OPTIONS.map((c) => (
                <button
                  key={c}
                  aria-label={`select-accent-${c}`}
                  role="radio"
                  aria-checked={accent === c}
                  onClick={() => setAccent(c)}
                  className={`w-8 h-8 rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${accent === c ? "border-white scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <label htmlFor="density" className="font-medium text-white">
              Interface density
            </label>
            <select
              id="density"
              value={density}
              onChange={(e) => setDensity(e.target.value as any)}
              className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-ubt-cool-grey"
            >
              <option value="regular">Regular</option>
              <option value="compact">Compact</option>
            </select>
          </div>

          <div>
            <label htmlFor="font-scale" className="font-medium text-white flex justify-between">
              <span>Interface scale</span>
              <span className="text-ubt-grey">{fontScale.toFixed(2)}x</span>
            </label>
            <input
              id="font-scale"
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
              className="ubuntu-slider w-full"
              aria-label="Interface scale"
            />
          </div>
        </div>
      )}

      {activeTab === "panel" && (
        <div className="px-6 py-6 space-y-6 text-ubt-grey">
          <div className="flex flex-col gap-3">
            <p className="font-medium text-white">Dock position</p>
            <div className="flex gap-3">
              {[
                { id: "bottom", label: "Bottom" },
                { id: "top", label: "Top" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPanelPosition(id)}
                  className={`px-4 py-2 rounded border transition-colors ${panelPosition === id ? "bg-ub-orange text-black border-ub-orange" : "border-ubt-cool-grey bg-ub-cool-grey text-ubt-grey"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="panel-size" className="font-medium text-white flex justify-between">
              <span>Panel height</span>
              <span className="text-ubt-grey">{panelSize}px</span>
            </label>
            <input
              id="panel-size"
              type="range"
              min={32}
              max={128}
              value={panelSize}
              onChange={(e) => setPanelSize(Number(e.target.value))}
              className="ubuntu-slider w-full"
              aria-label="Panel height"
            />
          </div>

          <div>
            <label htmlFor="panel-opacity" className="font-medium text-white flex justify-between">
              <span>Panel opacity</span>
              <span className="text-ubt-grey">{Math.round(panelOpacity * 100)}%</span>
            </label>
            <input
              id="panel-opacity"
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={panelOpacity}
              onChange={(e) => setPanelOpacity(Number(e.target.value))}
              className="ubuntu-slider w-full"
              aria-label="Panel opacity"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-white">Auto-hide panel</span>
            <ToggleSwitch
              checked={panelAutohide}
              onChange={setPanelAutohide}
              ariaLabel="Auto-hide panel"
            />
          </div>
        </div>
      )}

      {activeTab === "workspaces" && (
        <div className="px-6 py-6 space-y-6 text-ubt-grey">
          <div>
            <label htmlFor="workspace-count" className="font-medium text-white flex justify-between">
              <span>Workspace count</span>
              <span className="text-ubt-grey">{workspaceCount}</span>
            </label>
            <input
              id="workspace-count"
              type="range"
              min={1}
              max={8}
              value={workspaceCount}
              onChange={(e) => setWorkspaceCount(Number(e.target.value))}
              className="ubuntu-slider w-full"
              aria-label="Workspace count"
            />
          </div>

          <div className="space-y-3">
            <p className="font-medium text-white">Workspace names</p>
            {visibleWorkspaceNames.map((name, index) => (
              <div key={index} className="flex items-center gap-3">
                <span className="w-28 text-sm text-ubt-grey">Workspace {index + 1}</span>
                <input
                  value={name}
                  onChange={(e) => handleWorkspaceNameChange(index, e.target.value)}
                  className="flex-1 bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-ubt-cool-grey"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "wallpaper" && (
        <div className="px-6 py-6 space-y-6 text-ubt-grey">
          <div
            className="md:w-2/5 w-full h-48 mx-auto rounded-lg border border-ubt-cool-grey shadow-lg"
            style={{
              backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
              backgroundSize: "cover",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center center",
            }}
          />

          <div>
            <label htmlFor="wallpaper-slider" className="font-medium text-white flex justify-between">
              <span>Wallpaper</span>
              <span className="text-ubt-grey">{wallpaper}</span>
            </label>
            <input
              id="wallpaper-slider"
              type="range"
              min="0"
              max={wallpapers.length - 1}
              step="1"
              value={wallpapers.indexOf(wallpaper)}
              onChange={(e) => changeBackground(wallpapers[parseInt(e.target.value, 10)])}
              className="ubuntu-slider w-full"
              aria-label="Wallpaper"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {wallpapers.map((name) => (
              <button
                key={name}
                type="button"
                aria-label={`Select ${name.replace("wall-", "wallpaper ")}`}
                aria-pressed={name === wallpaper}
                onClick={() => changeBackground(name)}
                className={`h-24 rounded-lg border-4 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${name === wallpaper ? "border-ub-orange scale-105" : "border-transparent"}`}
                style={{
                  backgroundImage: `url(/wallpapers/${name}.webp)`,
                  backgroundSize: "cover",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center center",
                }}
              />
            ))}
          </div>

          <BackgroundSlideshow />

          <div className="flex flex-wrap gap-3 justify-center pt-4 border-t border-gray-900">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded bg-ub-orange text-black font-medium"
            >
              Export settings
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded bg-ub-cool-grey border border-ubt-cool-grey text-ubt-grey"
            >
              Import settings
            </button>
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded bg-red-600 text-white font-medium"
            >
              Reset desktop
            </button>
          </div>
        </div>
      )}

      {activeTab === "accessibility" && (
        <div className="px-6 py-6 space-y-6 text-ubt-grey">
          <div className="flex items-center justify-between">
            <span className="font-medium text-white">Reduced motion</span>
            <ToggleSwitch
              checked={reducedMotion}
              onChange={setReducedMotion}
              ariaLabel="Reduced motion"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-white">High contrast</span>
            <ToggleSwitch
              checked={highContrast}
              onChange={setHighContrast}
              ariaLabel="High contrast"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-white">Large hit areas</span>
            <ToggleSwitch
              checked={largeHitAreas}
              onChange={setLargeHitAreas}
              ariaLabel="Large hit areas"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-white">Haptics</span>
            <ToggleSwitch
              checked={haptics}
              onChange={setHaptics}
              ariaLabel="Haptics"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="font-medium text-white">Allow network requests</span>
            <ToggleSwitch
              checked={allowNetwork}
              onChange={setAllowNetwork}
              ariaLabel="Allow network requests"
            />
          </div>

          <div className="border-t border-gray-900 pt-4 flex justify-center">
            <button
              onClick={() => setShowKeymap(true)}
              className="px-4 py-2 rounded bg-ub-orange text-black font-medium"
            >
              Edit shortcuts
            </button>
          </div>
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

