"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Breadcrumbs, { SettingsSection } from "./components/Breadcrumbs";
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

const SECTION_DEFINITIONS = [
  {
    id: "appearance",
    label: "Appearance",
    subsections: [
      { id: "theme", label: "Theme" },
      { id: "accent", label: "Accent" },
      { id: "wallpaper", label: "Wallpaper" },
      { id: "slideshow", label: "Background Slideshow" },
      { id: "reset", label: "Reset" },
    ],
  },
  {
    id: "accessibility",
    label: "Accessibility",
    subsections: [
      { id: "icon-size", label: "Icon Size" },
      { id: "density", label: "Density" },
      { id: "reduced-motion", label: "Reduced Motion" },
      { id: "high-contrast", label: "High Contrast" },
      { id: "haptics", label: "Haptics" },
      { id: "shortcuts", label: "Keyboard Shortcuts" },
    ],
  },
  {
    id: "privacy",
    label: "Privacy",
    subsections: [
      { id: "export", label: "Export" },
      { id: "import", label: "Import" },
    ],
  },
] as const satisfies readonly SettingsSection[];

type SectionDefinition = (typeof SECTION_DEFINITIONS)[number];
type SectionId = SectionDefinition["id"];
type NormalizedPath = { section: SectionId; subsection: string | null };

const DEFAULT_SECTION_ID: SectionId = SECTION_DEFINITIONS[0].id;
const SECTION_IDS = new Set<SectionId>(
  SECTION_DEFINITIONS.map((section) => section.id)
);
const SECTION_LOOKUP = SECTION_DEFINITIONS.reduce<Record<SectionId, SectionDefinition>>(
  (acc, section) => {
    acc[section.id] = section;
    return acc;
  },
  {} as Record<SectionId, SectionDefinition>
);

const TABS = SECTION_DEFINITIONS.map(({ id, label }) => ({ id, label })) as const;
type TabId = (typeof TABS)[number]["id"];

const normalisePath = (
  path: readonly string[] | null | undefined
): NormalizedPath => {
  const segments = Array.isArray(path)
    ? path
        .flatMap((segment) =>
          typeof segment === "string"
            ? segment
                .split("/")
                .map((part) => part.trim())
                .filter(Boolean)
            : []
        )
        .map((segment) => segment.toLowerCase())
    : [];

  const sectionFromPath = segments.find((segment): segment is SectionId =>
    SECTION_IDS.has(segment as SectionId)
  );

  const sectionId = sectionFromPath ?? DEFAULT_SECTION_ID;
  const sectionDefinition = SECTION_LOOKUP[sectionId];
  const sectionIndex = sectionFromPath ? segments.indexOf(sectionFromPath) : -1;
  const rawSubsection =
    sectionIndex >= 0 && sectionIndex + 1 < segments.length
      ? segments[sectionIndex + 1]
      : null;

  if (!rawSubsection) {
    return { section: sectionId, subsection: null };
  }

  const subsectionDefinition = sectionDefinition.subsections?.find(
    (entry) => entry.id === rawSubsection
  );

  return {
    section: sectionId,
    subsection: subsectionDefinition ? subsectionDefinition.id : rawSubsection,
  };
};

interface SettingsProps {
  initialPath?: readonly string[] | null;
}

export default function Settings({ initialPath }: SettingsProps) {
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

  const derivedPath = useMemo(() => normalisePath(initialPath), [initialPath]);
  const [activeTab, setActiveTab] = useState<TabId>(derivedPath.section);
  const [activeSubsection, setActiveSubsection] = useState<string | null>(
    derivedPath.subsection
  );
  const previousDerivedRef = useRef<NormalizedPath | null>(null);
  const [showKeymap, setShowKeymap] = useState(false);

  useEffect(() => {
    setActiveTab((prev) => (prev === derivedPath.section ? prev : derivedPath.section));
    setActiveSubsection((prev) =>
      prev === derivedPath.subsection ? prev : derivedPath.subsection
    );
  }, [derivedPath.section, derivedPath.subsection]);

  useEffect(() => {
    const previous = previousDerivedRef.current;
    if (
      derivedPath.section === "accessibility" &&
      derivedPath.subsection === "shortcuts"
    ) {
      setShowKeymap(true);
      setActiveSubsection("shortcuts");
    } else if (
      previous?.section === "accessibility" &&
      previous.subsection === "shortcuts"
    ) {
      setShowKeymap(false);
      setActiveSubsection((prev) => (prev === "shortcuts" ? null : prev));
    }
    previousDerivedRef.current = derivedPath;
  }, [derivedPath]);

  const handleTabChange = (id: TabId) => {
    setActiveTab(id);
    setActiveSubsection(null);
    setShowKeymap(false);
  };

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

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={TABS} active={activeTab} onChange={handleTabChange} />
      </div>
      <div className="border-b border-gray-900 px-4 py-2">
        <Breadcrumbs
          sections={SECTION_DEFINITIONS}
          activeSectionId={activeTab}
          activeSubsectionId={activeSubsection}
        />
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
              onClick={() => {
                setActiveSubsection("shortcuts");
                setShowKeymap(true);
              }}
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
      <KeymapOverlay
        open={showKeymap}
        onClose={() => {
          setShowKeymap(false);
          setActiveSubsection((prev) => (prev === "shortcuts" ? null : prev));
        }}
      />
    </div>
  );
}
