"use client";

import {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import type { KeyboardEvent } from "react";
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
import type {
  SettingsSectionMeta,
  SettingsSearchIndexEntry,
  SettingsTabId,
} from "./searchIndex";
import {
  buildSettingsSearchIndex,
  filterSettingsSections,
  sortSettingsMatches,
} from "./searchIndex";
import { logSettingsSearch } from "./analytics";

const SETTINGS_TABS: ReadonlyArray<{ id: SettingsTabId; label: string }> = [
  { id: "appearance", label: "Appearance" },
  { id: "accessibility", label: "Accessibility" },
  { id: "privacy", label: "Privacy" },
];

const SETTINGS_SECTIONS: SettingsSectionMeta[] = [
  {
    id: "wallpaper-preview",
    tabId: "appearance",
    label: "Wallpaper Preview",
    keywords: ["background", "wallpaper", "image", "appearance"],
  },
  {
    id: "theme",
    tabId: "appearance",
    label: "Theme",
    keywords: ["theme", "mode", "appearance"],
  },
  {
    id: "accent",
    tabId: "appearance",
    label: "Accent Color",
    keywords: ["accent", "color", "highlight"],
  },
  {
    id: "wallpaper-slider",
    tabId: "appearance",
    label: "Wallpaper Selector",
    keywords: ["wallpaper", "slider", "background"],
  },
  {
    id: "wallpaper-slideshow",
    tabId: "appearance",
    label: "Wallpaper Slideshow",
    keywords: ["slideshow", "background", "rotate"],
  },
  {
    id: "wallpaper-gallery",
    tabId: "appearance",
    label: "Wallpaper Gallery",
    keywords: ["wallpaper", "grid", "background", "preview"],
  },
  {
    id: "reset-desktop",
    tabId: "appearance",
    label: "Reset Desktop",
    keywords: ["reset", "defaults", "restore"],
  },
  {
    id: "icon-size",
    tabId: "accessibility",
    label: "Icon Size",
    keywords: ["icon", "size", "scale", "accessibility"],
  },
  {
    id: "density",
    tabId: "accessibility",
    label: "Interface Density",
    keywords: ["density", "layout", "compact"],
  },
  {
    id: "reduced-motion",
    tabId: "accessibility",
    label: "Reduced Motion",
    keywords: ["motion", "animation", "accessibility"],
  },
  {
    id: "high-contrast",
    tabId: "accessibility",
    label: "High Contrast",
    keywords: ["contrast", "visibility", "accessibility"],
  },
  {
    id: "haptics",
    tabId: "accessibility",
    label: "Haptics",
    keywords: ["feedback", "vibration", "controller"],
  },
  {
    id: "shortcuts",
    tabId: "accessibility",
    label: "Keyboard Shortcuts",
    keywords: ["shortcuts", "keymap", "keyboard"],
  },
  {
    id: "backup-restore",
    tabId: "privacy",
    label: "Backup & Restore",
    keywords: ["export", "import", "backup", "privacy"],
  },
];

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

const SECTIONS_BY_TAB: Record<SettingsTabId, SettingsSectionMeta[]> = {
  appearance: [],
  accessibility: [],
  privacy: [],
};

const SECTION_BY_ID: Record<SettingsSectionId, SettingsSectionMeta> = {} as Record<
  SettingsSectionId,
  SettingsSectionMeta
>;

for (const section of SETTINGS_SECTIONS) {
  SECTIONS_BY_TAB[section.tabId].push(section);
  SECTION_BY_ID[section.id] = section;
}

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

type WallpaperName = (typeof WALLPAPERS)[number];

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

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
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchStartedAtRef = useRef<number>(now());

  const [activeTab, setActiveTab] = useState<SettingsTabId>("appearance");
  const [showKeymap, setShowKeymap] = useState(false);
  const [query, setQuery] = useState("");

  const tabLabelMap = useMemo(
    () => Object.fromEntries(SETTINGS_TABS.map((tab) => [tab.id, tab.label] as const)),
    [],
  );

  const searchIndex = useMemo(
    () => buildSettingsSearchIndex(SETTINGS_SECTIONS),
    [],
  );

  const matches = useMemo(
    () => sortSettingsMatches(filterSettingsSections(searchIndex, query), query),
    [searchIndex, query],
  );

  const matchesByTab = useMemo(() => {
    const grouped: Record<SettingsTabId, SettingsSearchIndexEntry[]> = {
      appearance: [],
      accessibility: [],
      privacy: [],
    };
    matches.forEach((match) => {
      grouped[match.tabId].push(match);
    });
    return grouped;
  }, [matches]);

  const visibleSections = useMemo(() => {
    if (!query.trim()) {
      return new Set(
        SECTIONS_BY_TAB[activeTab].map((section) => section.id),
      );
    }

    return new Set(matchesByTab[activeTab].map((section) => section.id));
  }, [activeTab, matchesByTab, query]);

  const hasQuery = query.trim().length > 0;
  const hasMatches = matches.length > 0;
  const hasMatchesInActiveTab = matchesByTab[activeTab].length > 0;
  const noMatchesInActiveTab = hasQuery && !hasMatchesInActiveTab;
  const firstMatch = matches[0];
  const displayedResults = hasQuery ? matches.slice(0, 8) : [];

  const changeBackground = (name: WallpaperName) => setWallpaper(name);

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
        "Reset desktop to default settings? This will clear all saved data.",
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

  const handleQueryInput = (value: string) => {
    searchStartedAtRef.current = now();
    setQuery(value);
  };

  const openSection = useCallback(
    (match: SettingsSearchIndexEntry) => {
      const duration = now() - searchStartedAtRef.current;
      logSettingsSearch(query, matches.length, match.id, duration);
      setActiveTab(match.tabId);
      searchStartedAtRef.current = now();

      requestAnimationFrame(() => {
        const element = document.getElementById(`settings-${match.id}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", `#settings-${match.id}`);
        }
      });
    },
    [matches.length, query],
  );

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (firstMatch) {
        openSection(firstMatch);
        searchInputRef.current?.blur();
      }
    } else if (event.key === "Escape" && query) {
      event.preventDefault();
      setQuery("");
    }
  };

  const handleResultClick = (match: SettingsSearchIndexEntry) => {
    openSection(match);
    searchInputRef.current?.blur();
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (!hash.startsWith("settings-")) return;
    const sectionId = hash.replace("settings-", "") as SettingsSectionId;
    const section = SECTION_BY_ID[sectionId];
    if (!section) return;
    setActiveTab(section.tabId);
    requestAnimationFrame(() => {
      const element = document.getElementById(`settings-${sectionId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, []);

  const isSectionVisible = useCallback(
    (id: SettingsSectionId) => visibleSections.has(id),
    [visibleSections],
  );

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="px-4 py-3 border-b border-gray-900">
        <label htmlFor="settings-search" className="sr-only">
          Search settings
        </label>
        <input
          ref={searchInputRef}
          id="settings-search"
          type="search"
          value={query}
          onChange={(e) => handleQueryInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search settings"
          aria-autocomplete="list"
          aria-expanded={hasQuery}
          aria-controls={hasQuery ? "settings-search-results" : undefined}
          className="w-full px-3 py-2 rounded bg-black bg-opacity-30 text-white placeholder-ubt-grey border border-gray-800 focus:outline-none focus:ring-2 focus:ring-ubt-blue"
        />
        {hasQuery && (
          <div className="mt-3 rounded border border-gray-800 bg-black bg-opacity-30">
            <ul
              id="settings-search-results"
              role="listbox"
              aria-label="Settings search results"
              className="divide-y divide-gray-800"
            >
              {displayedResults.length > 0 ? (
                displayedResults.map((match) => (
                  <li key={match.id}>
                    <button
                      type="button"
                      role="option"
                      aria-label={`${match.label} in ${tabLabelMap[match.tabId]}`}
                      className="w-full px-3 py-2 text-left text-sm text-white hover:bg-ubt-grey hover:bg-opacity-20"
                      onClick={() => handleResultClick(match)}
                    >
                      <span>{match.label}</span>
                      <span className="ml-2 text-xs text-ubt-grey">
                        {tabLabelMap[match.tabId]}
                      </span>
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-3 py-2 text-sm text-ubt-grey">
                  No settings match "{query}"
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={SETTINGS_TABS} active={activeTab} onChange={setActiveTab} />
      </div>
      {noMatchesInActiveTab && (
        <div className="px-4 py-6 text-center text-ubt-grey border-b border-gray-900">
          <p className="mb-2">No matches in {tabLabelMap[activeTab]}.</p>
          {hasMatches && firstMatch ? (
            <p>
              Press Enter to jump to <span className="text-white">{firstMatch.label}</span> in {tabLabelMap[firstMatch.tabId]}.
            </p>
          ) : (
            <p>Try a different search term.</p>
          )}
        </div>
      )}
      {activeTab === "appearance" && (
        <>
          <SettingSection
            id="wallpaper-preview"
            title="Wallpaper Preview"
            hidden={!isSectionVisible("wallpaper-preview")}
            className="my-4"
          >
            <div
              className="md:w-2/5 w-2/3 h-1/3 m-auto"
              style={{
                backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
              }}
              role="img"
              aria-label={`Preview of ${wallpaper.replace("wall-", "wallpaper ")} background`}
            />
          </SettingSection>
          <SettingSection
            id="theme"
            title="Theme"
            hidden={!isSectionVisible("theme")}
            className="flex justify-center my-4"
          >
            <label className="mr-2 text-ubt-grey">
              Theme:
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="ml-2 bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
              >
                <option value="default">Default</option>
                <option value="dark">Dark</option>
                <option value="neon">Neon</option>
                <option value="matrix">Matrix</option>
              </select>
            </label>
          </SettingSection>
          <SettingSection
            id="accent"
            title="Accent Color"
            hidden={!isSectionVisible("accent")}
            className="flex justify-center my-4"
          >
            <div aria-label="Accent color picker" role="radiogroup" className="flex gap-2 items-center">
              <span className="mr-2 text-ubt-grey">Accent:</span>
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
          </SettingSection>
          <SettingSection
            id="wallpaper-slider"
            title="Wallpaper Selector"
            hidden={!isSectionVisible("wallpaper-slider")}
            className="flex justify-center my-4"
          >
            <label htmlFor="wallpaper-slider" className="mr-2 text-ubt-grey">
              Wallpaper:
            </label>
            <input
              id="wallpaper-slider"
              type="range"
              min="0"
              max={WALLPAPERS.length - 1}
              step="1"
              value={WALLPAPERS.indexOf(wallpaper)}
              onChange={(e) =>
                changeBackground(WALLPAPERS[parseInt(e.target.value, 10)])
              }
              className="ubuntu-slider"
              aria-label="Wallpaper"
            />
          </SettingSection>
          <SettingSection
            id="wallpaper-slideshow"
            title="Wallpaper Slideshow"
            hidden={!isSectionVisible("wallpaper-slideshow")}
            className="flex justify-center my-4"
          >
            <BackgroundSlideshow />
          </SettingSection>
          <SettingSection
            id="wallpaper-gallery"
            title="Wallpaper Gallery"
            hidden={!isSectionVisible("wallpaper-gallery")}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center border-t border-gray-900"
          >
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
          </SettingSection>
          <SettingSection
            id="reset-desktop"
            title="Reset Desktop"
            hidden={!isSectionVisible("reset-desktop")}
            className="border-t border-gray-900 mt-4 pt-4 px-4 flex justify-center"
          >
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              Reset Desktop
            </button>
          </SettingSection>
        </>
      )}
      {activeTab === "accessibility" && (
        <>
          <SettingSection
            id="icon-size"
            title="Icon Size"
            hidden={!isSectionVisible("icon-size")}
            className="flex justify-center my-4"
          >
            <label htmlFor="font-scale" className="mr-2 text-ubt-grey">
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
          </SettingSection>
          <SettingSection
            id="density"
            title="Interface Density"
            hidden={!isSectionVisible("density")}
            className="flex justify-center my-4"
          >
            <label className="mr-2 text-ubt-grey">
              Density:
              <select
                value={density}
                onChange={(e) => setDensity(e.target.value as any)}
                className="ml-2 bg-ub-cool-grey text-ubt-grey px-2 py-1 rounded border border-ubt-cool-grey"
              >
                <option value="regular">Regular</option>
                <option value="compact">Compact</option>
              </select>
            </label>
          </SettingSection>
          <SettingSection
            id="reduced-motion"
            title="Reduced Motion"
            hidden={!isSectionVisible("reduced-motion")}
            className="flex justify-center my-4 items-center"
          >
            <span className="mr-2 text-ubt-grey">Reduced Motion:</span>
            <ToggleSwitch
              checked={reducedMotion}
              onChange={setReducedMotion}
              ariaLabel="Reduced Motion"
            />
          </SettingSection>
          <SettingSection
            id="high-contrast"
            title="High Contrast"
            hidden={!isSectionVisible("high-contrast")}
            className="flex justify-center my-4 items-center"
          >
            <span className="mr-2 text-ubt-grey">High Contrast:</span>
            <ToggleSwitch
              checked={highContrast}
              onChange={setHighContrast}
              ariaLabel="High Contrast"
            />
          </SettingSection>
          <SettingSection
            id="haptics"
            title="Haptics"
            hidden={!isSectionVisible("haptics")}
            className="flex justify-center my-4 items-center"
          >
            <span className="mr-2 text-ubt-grey">Haptics:</span>
            <ToggleSwitch
              checked={haptics}
              onChange={setHaptics}
              ariaLabel="Haptics"
            />
          </SettingSection>
          <SettingSection
            id="shortcuts"
            title="Keyboard Shortcuts"
            hidden={!isSectionVisible("shortcuts")}
            className="border-t border-gray-900 mt-4 pt-4 px-4 flex justify-center"
          >
            <button
              onClick={() => setShowKeymap(true)}
              className="px-4 py-2 rounded bg-ub-orange text-white"
            >
              Edit Shortcuts
            </button>
          </SettingSection>
        </>
      )}
      {activeTab === "privacy" && (
        <SettingSection
          id="backup-restore"
          title="Backup & Restore"
          hidden={!isSectionVisible("backup-restore")}
          className="flex justify-center my-4 space-x-4"
        >
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
        </SettingSection>
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

type SettingSectionProps = {
  id: SettingsSectionId;
  title: string;
  hidden: boolean;
  className?: string;
  children: React.ReactNode;
};

function SettingSection({ id, title, hidden, className, children }: SettingSectionProps) {
  if (hidden) return null;

  const classes = [
    className,
    "focus:outline-none",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      id={`settings-${id}`}
      aria-labelledby={`settings-${id}-title`}
      className={classes}
      data-settings-section={id}
    >
      <span id={`settings-${id}-title`} className="sr-only">
        {title}
      </span>
      {children}
    </section>
  );
}
