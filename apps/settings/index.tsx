"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import type { ReactNode } from "react";
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

const WALLPAPERS = [
  "wall-1",
  "wall-2",
  "wall-3",
  "wall-4",
  "wall-5",
  "wall-6",
  "wall-7",
  "wall-8",
] as const;

type FocusableRefCallback = (element: HTMLElement | null) => void;

type SectionConfig = {
  id: string;
  searchText: string;
  className?: string;
  useContainerForFocus?: boolean;
  render: (registerFocusable: FocusableRefCallback) => ReactNode;
};

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
    { id: "privacy", label: "Privacy" },
  ] as const;
  type TabId = (typeof tabs)[number]["id"];
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [searchTerm, setSearchTerm] = useState("");
  const [showKeymap, setShowKeymap] = useState(false);

  const changeBackground = useCallback(
    (name: string) => setWallpaper(name),
    [setWallpaper]
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
    },
    [
      setAccent,
      setWallpaper,
      setDensity,
      setReducedMotion,
      setFontScale,
      setHighContrast,
      setTheme,
    ]
  );

  const handleReset = useCallback(async () => {
    if (
      !window.confirm(
        "Reset desktop to default settings? This will clear all saved data."
      )
    ) {
      return;
    }
    await resetSettings();
    window.localStorage.clear();
    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setDensity(defaults.density as any);
    setReducedMotion(defaults.reducedMotion);
    setFontScale(defaults.fontScale);
    setHighContrast(defaults.highContrast);
    setTheme("default");
  }, [
    setAccent,
    setWallpaper,
    setDensity,
    setReducedMotion,
    setFontScale,
    setHighContrast,
    setTheme,
  ]);

  const focusRefs = useRef<Record<string, HTMLElement | null>>({});
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const registerFocusable = useCallback(
    (sectionId: string) => (element: HTMLElement | null) => {
      if (element) {
        focusRefs.current[sectionId] = element;
      } else {
        delete focusRefs.current[sectionId];
      }
    },
    []
  );

  const registerContainer = useCallback(
    (sectionId: string) => (element: HTMLDivElement | null) => {
      if (element) {
        containerRefs.current[sectionId] = element;
      } else {
        delete containerRefs.current[sectionId];
      }
    },
    []
  );

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const searchTokens = normalizedSearch
    ? normalizedSearch.split(/\s+/).filter(Boolean)
    : [];

  const wallpaperIndex = Math.max(0, WALLPAPERS.indexOf(wallpaper));

  const sectionsByTab: Record<TabId, SectionConfig[]> = {
    appearance: [
      {
        id: "theme",
        searchText: "theme appearance mode default dark neon matrix color",
        className: "flex justify-center my-4",
        render: (register) => (
          <>
            <label htmlFor="settings-theme" className="mr-2 text-ubt-grey">
              Theme:
            </label>
            <select
              id="settings-theme"
              ref={register}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              <option value="default">Default</option>
              <option value="dark">Dark</option>
              <option value="neon">Neon</option>
              <option value="matrix">Matrix</option>
            </select>
          </>
        ),
      },
      {
        id: "accent",
        searchText: "accent color highlight blue red orange green purple pink",
        className: "flex justify-center my-4",
        render: (register) => (
          <>
            <label className="mr-2 text-ubt-grey">Accent:</label>
            <div
              aria-label="Accent color picker"
              role="radiogroup"
              className="flex gap-2"
            >
              {ACCENT_OPTIONS.map((color, index) => (
                <button
                  key={color}
                  ref={index === 0 ? register : undefined}
                  aria-label={`select-accent-${color}`}
                  role="radio"
                  aria-checked={accent === color}
                  onClick={() => setAccent(color)}
                  className={`w-8 h-8 rounded-full border-2 ${
                    accent === color ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </>
        ),
      },
      {
        id: "wallpaper",
        searchText:
          "wallpaper background image slideshow rotate preview gallery",
        render: (register) => (
          <>
            <div
              className="md:w-2/5 w-2/3 h-1/3 m-auto my-4"
              style={{
                backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
              }}
              aria-hidden="true"
            />
            <div className="flex justify-center my-4">
              <label htmlFor="wallpaper-slider" className="mr-2 text-ubt-grey">
                Wallpaper:
              </label>
              <input
                id="wallpaper-slider"
                ref={register}
                type="range"
                min="0"
                max={WALLPAPERS.length - 1}
                step="1"
                value={wallpaperIndex}
                onChange={(e) =>
                  changeBackground(
                    WALLPAPERS[parseInt(e.target.value, 10)] ?? WALLPAPERS[0]
                  )
                }
                className="ubuntu-slider"
                aria-label="Wallpaper"
              />
            </div>
            <div className="flex justify-center my-4">
              <BackgroundSlideshow />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center border-t border-gray-900">
              {WALLPAPERS.map((name) => (
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
                />
              ))}
            </div>
          </>
        ),
      },
      {
        id: "reset",
        searchText: "reset defaults clear data restore desktop settings",
        className: "border-t border-gray-900 mt-4 pt-4 px-4 flex justify-center",
        render: (register) => (
          <button
            ref={register}
            onClick={handleReset}
            className="px-4 py-2 rounded bg-ub-orange text-white"
          >
            Reset Desktop
          </button>
        ),
      },
    ],
    accessibility: [
      {
        id: "icon-size",
        searchText: "icon size scale font accessibility",
        className: "flex justify-center my-4",
        render: (register) => (
          <>
            <label htmlFor="font-scale" className="mr-2 text-ubt-grey">
              Icon Size:
            </label>
            <input
              id="font-scale"
              ref={register}
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
              className="ubuntu-slider"
              aria-label="Icon size"
            />
          </>
        ),
      },
      {
        id: "density",
        searchText: "density spacing compact regular layout",
        className: "flex justify-center my-4",
        render: (register) => (
          <>
            <label htmlFor="density-select" className="mr-2 text-ubt-grey">
              Density:
            </label>
            <select
              id="density-select"
              ref={register}
              value={density}
              onChange={(e) => setDensity(e.target.value as typeof density)}
              className="bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
            >
              <option value="regular">Regular</option>
              <option value="compact">Compact</option>
            </select>
          </>
        ),
      },
      {
        id: "reduced-motion",
        searchText: "reduced motion animation accessibility",
        className: "flex justify-center my-4 items-center",
        render: (register) => (
          <>
            <span className="mr-2 text-ubt-grey">Reduced Motion:</span>
            <ToggleSwitch
              ref={register}
              checked={reducedMotion}
              onChange={setReducedMotion}
              ariaLabel="Reduced Motion"
            />
          </>
        ),
      },
      {
        id: "high-contrast",
        searchText: "high contrast visibility accessibility",
        className: "flex justify-center my-4 items-center",
        render: (register) => (
          <>
            <span className="mr-2 text-ubt-grey">High Contrast:</span>
            <ToggleSwitch
              ref={register}
              checked={highContrast}
              onChange={setHighContrast}
              ariaLabel="High Contrast"
            />
          </>
        ),
      },
      {
        id: "haptics",
        searchText: "haptics vibration feedback accessibility",
        className: "flex justify-center my-4 items-center",
        render: (register) => (
          <>
            <span className="mr-2 text-ubt-grey">Haptics:</span>
            <ToggleSwitch
              ref={register}
              checked={haptics}
              onChange={setHaptics}
              ariaLabel="Haptics"
            />
          </>
        ),
      },
      {
        id: "shortcuts",
        searchText: "shortcuts keymap keyboard hotkeys",
        className: "border-t border-gray-900 mt-4 pt-4 px-4 flex justify-center",
        render: (register) => (
          <button
            ref={register}
            onClick={() => setShowKeymap(true)}
            className="px-4 py-2 rounded bg-ub-orange text-white"
          >
            Edit Shortcuts
          </button>
        ),
      },
    ],
    privacy: [
      {
        id: "export-import",
        searchText:
          "privacy export import backup restore settings data upload download",
        className: "flex justify-center my-4 space-x-4",
        render: (register) => (
          <>
            <button
              ref={register}
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
          </>
        ),
      },
    ],
  };

  const activeSections = sectionsByTab[activeTab];
  const visibleSections =
    searchTokens.length === 0
      ? activeSections
      : activeSections.filter((section) =>
          searchTokens.every((token) => section.searchText.includes(token))
        );
  const visibleSectionIds = visibleSections.map((section) => section.id);

  const previousMatchesRef = useRef<string[]>([]);

  useEffect(() => {
    if (!normalizedSearch) {
      previousMatchesRef.current = visibleSectionIds;
      return;
    }

    if (visibleSectionIds.length === 0) {
      previousMatchesRef.current = visibleSectionIds;
      return;
    }

    const previous = previousMatchesRef.current;
    const hasNarrowed =
      previous.length === 0 ||
      visibleSectionIds.length < previous.length ||
      visibleSectionIds.some((id, index) => id !== previous[index]);

    if (hasNarrowed) {
      for (const id of visibleSectionIds) {
        const section = activeSections.find((item) => item.id === id);
        if (!section) continue;
        const focusTarget =
          focusRefs.current[id] ??
          (section.useContainerForFocus ? containerRefs.current[id] ?? null : null);
        if (focusTarget) {
          focusTarget.focus();
          break;
        }
      }
    }

    previousMatchesRef.current = visibleSectionIds;
  }, [activeSections, normalizedSearch, visibleSectionIds]);

  useEffect(() => {
    previousMatchesRef.current = [];
  }, [activeTab]);

  const renderSection = (section: SectionConfig) => {
    const register = registerFocusable(section.id);
    const setContainerRef = registerContainer(section.id);
    return (
      <div
        key={section.id}
        data-settings-section={section.id}
        className={section.className}
        ref={(element) => {
          setContainerRef(element);
          if (section.useContainerForFocus) {
            register(element);
          }
        }}
        tabIndex={section.useContainerForFocus ? -1 : undefined}
      >
        {section.render(register)}
      </div>
    );
  };

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="border-b border-gray-900 px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs
          tabs={tabs}
          active={activeTab}
          onChange={setActiveTab}
          className="justify-center md:justify-start"
        />
        <div className="flex justify-center md:justify-end">
          <label htmlFor="settings-search" className="w-full md:w-64">
            <span className="sr-only">Search settings</span>
            <input
              id="settings-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search settings"
              className="w-full px-3 py-2 rounded bg-ub-cool-grey text-ubt-grey border border-ubt-cool-grey focus:outline-none focus:border-ub-orange"
            />
          </label>
        </div>
      </div>
      {visibleSections.map(renderSection)}
      {normalizedSearch && visibleSections.length === 0 && (
        <p className="px-4 py-8 text-center text-ubt-grey" role="status">
          No settings match "{searchTerm}". Try a different search term.
        </p>
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
