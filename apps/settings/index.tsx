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
import ToggleSwitch from "../../components/ToggleSwitch";
import NavigationTree from "./components/NavigationTree";
import {
  SETTINGS_NAVIGATION,
  DEFAULT_SECTION_ID,
  getNavigationItem,
  getNavigationPath,
  isLeafId,
} from "./navigation";

interface SettingsProps {
  initialSectionId?: string;
}

type SettingsWindow = Window & { __settingsSectionTarget?: string };

const sanitizeSectionId = (value?: string | null): string | undefined =>
  value && isLeafId(value) ? value : undefined;

export default function Settings({ initialSectionId }: SettingsProps = {}) {
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

  const pickInitialSection = () => {
    const fromProp = sanitizeSectionId(initialSectionId);
    if (typeof window === "undefined") {
      return fromProp ?? DEFAULT_SECTION_ID;
    }
    const params = new URLSearchParams(window.location.search);
    const fromQuery = sanitizeSectionId(params.get("section"));
    const pending = sanitizeSectionId(
      (window as SettingsWindow).__settingsSectionTarget
    );
    return fromProp ?? fromQuery ?? pending ?? DEFAULT_SECTION_ID;
  };

  const [activeSection, setActiveSection] = useState<string>(pickInitialSection);

  useEffect(() => {
    if (typeof window === "undefined") return;
    delete (window as SettingsWindow).__settingsSectionTarget;
  }, []);

  useEffect(() => {
    const target = sanitizeSectionId(initialSectionId);
    if (target && target !== activeSection) {
      setActiveSection(target);
    }
  }, [initialSectionId, activeSection]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleNavigate = (event: Event) => {
      const detail = (event as CustomEvent<{ section?: string }>).detail;
      const next = sanitizeSectionId(detail?.section);
      if (next && next !== activeSection) {
        setActiveSection(next);
      }
    };
    window.addEventListener("settings:navigate", handleNavigate);
    return () => window.removeEventListener("settings:navigate", handleNavigate);
  }, [activeSection]);

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

  const activeItem = useMemo(
    () => getNavigationItem(activeSection),
    [activeSection]
  );
  const parentItem = useMemo(() => {
    const path = getNavigationPath(activeSection);
    const parentId = path.length > 1 ? path[path.length - 2] : undefined;
    return parentId ? getNavigationItem(parentId) : undefined;
  }, [activeSection]);

  const wallpaperPreview = (
    <div className="flex justify-center">
      <div
        role="img"
        aria-label={`Wallpaper preview ${wallpaper.replace("wall-", "").trim()}`}
        className="w-full max-w-xl aspect-video rounded-lg border border-gray-900 shadow-inner"
        style={{
          backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
        }}
      ></div>
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "appearance.theme":
        return (
          <section
            aria-labelledby="settings-section-title"
            className="space-y-6"
          >
            {wallpaperPreview}
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <label htmlFor="theme-select" className="text-ubt-grey">
                Theme:
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
            <div className="flex flex-col items-center gap-3">
              <span className="text-ubt-grey">Accent:</span>
              <div
                aria-label="Accent color picker"
                role="radiogroup"
                className="flex gap-2"
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
          </section>
        );
      case "appearance.wallpaper":
        return (
          <section
            aria-labelledby="settings-section-title"
            className="space-y-6"
          >
            {wallpaperPreview}
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <label htmlFor="wallpaper-slider" className="text-ubt-grey">
                Wallpaper:
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
            <div className="flex justify-center">
              <BackgroundSlideshow />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center border-t border-gray-900 pt-4">
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
                  className={`${
                    name === wallpaper ? "border-yellow-700" : "border-transparent"
                  } md:px-28 md:py-20 md:m-4 m-2 px-14 py-10 outline-none border-4 border-opacity-80`}
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
        );
      case "appearance.reset":
        return (
          <section
            aria-labelledby="settings-section-title"
            className="space-y-4 text-center"
          >
            <p className="text-sm text-ubt-grey">
              Resetting clears your saved theme, wallpaper, and layout
              preferences.
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded bg-ub-orange text-white"
              >
                Reset Desktop
              </button>
            </div>
          </section>
        );
      case "accessibility.display":
        return (
          <section
            aria-labelledby="settings-section-title"
            className="space-y-6"
          >
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <label htmlFor="font-scale" className="text-ubt-grey">
                Icon Size:
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
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <label htmlFor="density-select" className="text-ubt-grey">
                Density:
              </label>
              <select
                id="density-select"
                value={density}
                onChange={(e) => setDensity(e.target.value as any)}
                className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
              >
                <option value="regular">Regular</option>
                <option value="compact">Compact</option>
              </select>
            </div>
          </section>
        );
      case "accessibility.interaction":
        return (
          <section
            aria-labelledby="settings-section-title"
            className="space-y-4"
          >
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <span className="text-ubt-grey">Reduced Motion:</span>
              <ToggleSwitch
                checked={reducedMotion}
                onChange={setReducedMotion}
                ariaLabel="Reduced Motion"
              />
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <span className="text-ubt-grey">High Contrast:</span>
              <ToggleSwitch
                checked={highContrast}
                onChange={setHighContrast}
                ariaLabel="High Contrast"
              />
            </div>
            <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
              <span className="text-ubt-grey">Haptics:</span>
              <ToggleSwitch
                checked={haptics}
                onChange={setHaptics}
                ariaLabel="Haptics"
              />
            </div>
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setShowKeymap(true)}
                className="px-4 py-2 rounded bg-ub-orange text-white"
              >
                Edit Shortcuts
              </button>
            </div>
          </section>
        );
      case "privacy.data":
        return (
          <section
            aria-labelledby="settings-section-title"
            className="space-y-4 text-center"
          >
            <p className="text-sm text-ubt-grey">
              Export a backup of your desktop preferences or restore a saved
              configuration.
            </p>
            <div className="flex justify-center gap-4">
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
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full flex flex-col flex-grow z-20 max-h-full windowMainScreen select-none bg-ub-cool-grey">
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden border-b md:border-b-0 md:border-r-0">
        <aside className="md:w-64 border-b md:border-b-0 md:border-r border-gray-900 bg-ub-cool-grey/70 overflow-y-auto">
          <NavigationTree
            items={SETTINGS_NAVIGATION}
            activeId={activeSection}
            onSelect={(id) => {
              const next = sanitizeSectionId(id);
              if (next) setActiveSection(next);
            }}
            className="p-3"
          />
        </aside>
        <main className="flex-1 overflow-y-auto p-4 md:p-6 text-ubt-grey select-text">
          <header className="mb-6">
            {parentItem && (
              <p className="text-xs uppercase tracking-wide text-ubt-grey">
                {parentItem.label}
              </p>
            )}
            <h2
              id="settings-section-title"
              className="text-2xl font-semibold text-white"
            >
              {activeItem?.label ?? "Settings"}
            </h2>
            {activeItem?.description && (
              <p className="mt-1 text-sm text-ubt-grey">
                {activeItem.description}
              </p>
            )}
          </header>
          {renderSection()}
        </main>
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
