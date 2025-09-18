"use client";

import { useState, useRef, useMemo } from "react";
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
import { useTranslation } from "next-i18next";
import { LOCALE_DEFINITIONS } from "../../utils/i18n";

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
    locale,
    setLocale,
  } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation("settings");

  type TabId = "appearance" | "accessibility" | "privacy";

  const tabs = useMemo(
    () =>
      [
        { id: "appearance", label: t("tabs.appearance") },
        { id: "accessibility", label: t("tabs.accessibility") },
        { id: "privacy", label: t("tabs.privacy") },
      ] as const,
    [t]
  );

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
      if (parsed.locale !== undefined) setLocale(parsed.locale);
    } catch (err) {
      console.error("Invalid settings", err);
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        t("reset.confirm")
      )
    )
      return;
    await resetSettings();
    try {
      window.localStorage?.clear?.();
    } catch (error) {
      console.warn('Unable to clear stored settings', error);
    }
    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setDensity(defaults.density as any);
    setReducedMotion(defaults.reducedMotion);
    setFontScale(defaults.fontScale);
    setHighContrast(defaults.highContrast);
    setTheme("default");
    setLocale(defaults.locale);
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
            <label className="mr-2 text-ubt-grey" htmlFor="language-select">
              {t("language.label")}:
            </label>
            <select
              id="language-select"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              {LOCALE_DEFINITIONS.map((definition) => (
                <option key={definition.code} value={definition.code}>
                  {definition.nativeName}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-center my-4">
            <label className="mr-2 text-ubt-grey" htmlFor="theme-select">
              {t("appearance.themeLabel")}:
            </label>
            <select
              id="theme-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              <option value="default">{t("appearance.themes.default")}</option>
              <option value="dark">{t("appearance.themes.dark")}</option>
              <option value="neon">{t("appearance.themes.neon")}</option>
              <option value="matrix">{t("appearance.themes.matrix")}</option>
            </select>
          </div>
          <div className="flex justify-center my-4">
            <label className="mr-2 text-ubt-grey">
              {t("appearance.accentLabel")}:
            </label>
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
            <label htmlFor="wallpaper-slider" className="mr-2 text-ubt-grey">
              {t("appearance.wallpaperLabel")}:
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
              aria-label={t("appearance.wallpaperAria")}
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
              {t("appearance.reset")}
            </button>
          </div>
        </>
      )}
      {activeTab === "accessibility" && (
        <>
          <div className="flex justify-center my-4">
            <label htmlFor="font-scale" className="mr-2 text-ubt-grey">
              {t("accessibility.iconSize")}:
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
              aria-label={t("accessibility.iconSize")}
            />
          </div>
          <div className="flex justify-center my-4">
            <label className="mr-2 text-ubt-grey" htmlFor="density-select">
              {t("accessibility.density")}:
            </label>
            <select
              id="density-select"
              value={density}
              onChange={(e) => setDensity(e.target.value as any)}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              <option value="regular">{t("accessibility.densityOptions.regular")}</option>
              <option value="compact">{t("accessibility.densityOptions.compact")}</option>
            </select>
          </div>
          <div className="flex justify-center my-4 items-center">
            <span className="mr-2 text-ubt-grey">{t("accessibility.reducedMotion")}:</span>
            <ToggleSwitch
              checked={reducedMotion}
              onChange={setReducedMotion}
              ariaLabel={t("accessibility.reducedMotion")}
            />
          </div>
          <div className="flex justify-center my-4 items-center">
            <span className="mr-2 text-ubt-grey">{t("accessibility.highContrast")}:</span>
            <ToggleSwitch
              checked={highContrast}
              onChange={setHighContrast}
              ariaLabel={t("accessibility.highContrast")}
            />
          </div>
          <div className="flex justify-center my-4 items-center">
            <span className="mr-2 text-ubt-grey">{t("accessibility.haptics")}:</span>
            <ToggleSwitch
              checked={haptics}
              onChange={setHaptics}
              ariaLabel={t("accessibility.haptics")}
            />
          </div>
          <div className="border-t border-gray-900 mt-4 pt-4 px-4 flex justify-center">
            <button
              onClick={() => setShowKeymap(true)}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              {t("accessibility.editShortcuts")}
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
              {t("privacy.export")}
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              {t("privacy.import")}
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
