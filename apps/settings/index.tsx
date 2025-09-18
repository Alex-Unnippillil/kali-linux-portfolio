"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
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
import { useSectionSearch } from "./hooks/useSectionSearch";
import { navigation, SettingsSectionId } from "./navigation";
import { logSettingsSearchNavigation } from "../../utils/analytics";

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
  const [activeTab, setActiveTab] = useState<SettingsSectionId>("appearance");
  const search = useSectionSearch(activeTab);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);
  const controlRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  const registerControlRef = (slug: string) =>
    (element: HTMLDivElement | null) => {
      if (element) {
        controlRefs.current[slug] = element;
      } else {
        delete controlRefs.current[slug];
      }
    };

  const highlightClass = (slug: string) => {
    const classes = ["settings-search-target"];
    if (search.highlightSlugs.has(slug)) {
      classes.push("settings-search-highlight");
    }
    if (activeHighlight === slug) {
      classes.push("settings-search-active");
    }
    return classes.join(" ");
  };

  const focusControl = (slug: string) => {
    const element = controlRefs.current[slug];
    if (!element) return;
    if (typeof element.focus === "function") {
      element.focus({ preventScroll: true });
    }
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const navigateToResult = (slug: string, index: number) => {
    focusControl(slug);
    setActiveHighlight(slug);
    logSettingsSearchNavigation({
      query: search.query,
      sectionId: activeTab,
      controlSlug: slug,
      position: index,
      total: search.results.length,
    });
  };

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (search.results.length === 0) return;
    navigateToResult(search.results[0].slug, 0);
  };

  const handleClearSearch = () => {
    search.clear();
    setActiveHighlight(null);
  };

  useEffect(() => {
    if (activeHighlight && !search.highlightSlugs.has(activeHighlight)) {
      setActiveHighlight(null);
    }
  }, [activeHighlight, search.highlightSlugs]);

  useEffect(() => {
    setActiveHighlight(null);
  }, [activeTab]);

  useEffect(() => {
    if (!search.hasQuery) {
      setActiveHighlight(null);
    }
  }, [search.hasQuery]);

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={navigation} active={activeTab} onChange={setActiveTab} />
      </div>
      <div className="border-b border-gray-900 bg-ub-cool-grey px-4 py-3">
        <form
          onSubmit={handleSearchSubmit}
          className="space-y-2"
          role="search"
          aria-label="Search settings"
        >
          <div className="flex items-center gap-2">
            <label htmlFor="settings-search" className="sr-only">
              Search settings
            </label>
            <input
              id="settings-search"
              type="search"
              value={search.query}
              onChange={(e) => search.setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape" && search.query) {
                  e.preventDefault();
                  handleClearSearch();
                }
              }}
              placeholder={`Search ${search.section?.label ?? "settings"}`}
              autoComplete="off"
              className="flex-1 rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-ubt-grey focus:outline-none focus:ring-2 focus:ring-ub-orange"
            />
            {search.query && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="rounded border border-ubt-cool-grey px-3 py-2 text-sm text-ubt-grey hover:bg-ubt-cool-grey focus:outline-none focus:ring-2 focus:ring-ub-orange"
              >
                Clear
              </button>
            )}
            <button type="submit" className="sr-only">
              Submit search
            </button>
          </div>
          <div className="sr-only" aria-live="polite">
            {search.hasQuery
              ? search.results.length
                ? `${search.results.length} results in ${search.section?.label ?? "this section"}.`
                : `No settings match ${search.query}.`
              : ""}
          </div>
          {search.hasQuery && (
            <>
              {search.results.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-ubt-grey">
                    Matching controls
                  </p>
                  <ul className="settings-search-results" role="list">
                    {search.results.map((result, index) => (
                      <li key={result.slug}>
                        <button
                          type="button"
                          className="settings-search-result-button"
                          onClick={() => navigateToResult(result.slug, index)}
                        >
                          <span>{result.label}</span>
                          <span className="settings-search-result-meta">Jump</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="settings-search-empty text-sm text-ubt-grey">
                  No matches in {search.section?.label}.
                </p>
              )}
            </>
          )}
        </form>
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
          <div
            ref={registerControlRef("theme")}
            data-settings-control="theme"
            tabIndex={-1}
            className={`${highlightClass("theme")} flex justify-center my-4`}
          >
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
          <div
            ref={registerControlRef("accent")}
            data-settings-control="accent"
            tabIndex={-1}
            className={`${highlightClass("accent")} flex justify-center my-4`}
          >
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
          <div
            ref={registerControlRef("wallpaper-slider")}
            data-settings-control="wallpaper-slider"
            tabIndex={-1}
            className={`${highlightClass("wallpaper-slider")} flex justify-center my-4`}
          >
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
          <div
            ref={registerControlRef("wallpaper-slideshow")}
            data-settings-control="wallpaper-slideshow"
            tabIndex={-1}
            className={`${highlightClass("wallpaper-slideshow")} flex justify-center my-4`}
          >
            <BackgroundSlideshow />
          </div>
          <div
            ref={registerControlRef("wallpaper-gallery")}
            data-settings-control="wallpaper-gallery"
            tabIndex={-1}
            className={`${highlightClass("wallpaper-gallery")} border-t border-gray-900 mt-4 pt-4`}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
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
          </div>
          <div
            ref={registerControlRef("reset-desktop")}
            data-settings-control="reset-desktop"
            tabIndex={-1}
            className={`${highlightClass("reset-desktop")} border-t border-gray-900 mt-4 pt-4 px-4 flex justify-center`}
          >
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
          <div
            ref={registerControlRef("icon-size")}
            data-settings-control="icon-size"
            tabIndex={-1}
            className={`${highlightClass("icon-size")} flex justify-center my-4`}
          >
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
          <div
            ref={registerControlRef("density")}
            data-settings-control="density"
            tabIndex={-1}
            className={`${highlightClass("density")} flex justify-center my-4`}
          >
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
          <div
            ref={registerControlRef("reduced-motion")}
            data-settings-control="reduced-motion"
            tabIndex={-1}
            className={`${highlightClass("reduced-motion")} flex justify-center my-4 items-center`}
          >
            <span className="mr-2 text-ubt-grey">Reduced Motion:</span>
            <ToggleSwitch
              checked={reducedMotion}
              onChange={setReducedMotion}
              ariaLabel="Reduced Motion"
            />
          </div>
          <div
            ref={registerControlRef("high-contrast")}
            data-settings-control="high-contrast"
            tabIndex={-1}
            className={`${highlightClass("high-contrast")} flex justify-center my-4 items-center`}
          >
            <span className="mr-2 text-ubt-grey">High Contrast:</span>
            <ToggleSwitch
              checked={highContrast}
              onChange={setHighContrast}
              ariaLabel="High Contrast"
            />
          </div>
          <div
            ref={registerControlRef("haptics")}
            data-settings-control="haptics"
            tabIndex={-1}
            className={`${highlightClass("haptics")} flex justify-center my-4 items-center`}
          >
            <span className="mr-2 text-ubt-grey">Haptics:</span>
            <ToggleSwitch
              checked={haptics}
              onChange={setHaptics}
              ariaLabel="Haptics"
            />
          </div>
          <div
            ref={registerControlRef("keyboard-shortcuts")}
            data-settings-control="keyboard-shortcuts"
            tabIndex={-1}
            className={`${highlightClass("keyboard-shortcuts")} border-t border-gray-900 mt-4 pt-4 px-4 flex justify-center`}
          >
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
          <div className="flex flex-wrap justify-center gap-4 my-4">
            <div
              ref={registerControlRef("export-settings")}
              data-settings-control="export-settings"
              tabIndex={-1}
              className={`${highlightClass("export-settings")} inline-flex`}
            >
              <button
                onClick={handleExport}
                className="px-4 py-2 rounded bg-ub-orange text-white"
              >
                Export Settings
              </button>
            </div>
            <div
              ref={registerControlRef("import-settings")}
              data-settings-control="import-settings"
              tabIndex={-1}
              className={`${highlightClass("import-settings")} inline-flex`}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded bg-ub-orange text-white"
              >
                Import Settings
              </button>
            </div>
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
