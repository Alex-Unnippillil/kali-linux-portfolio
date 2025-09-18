"use client";

import { useState, useRef, useMemo, useEffect, useCallback } from "react";
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
import useRovingTabIndex from "../../hooks/useRovingTabIndex";

const TAB_DEFINITIONS = [
  { id: "appearance", label: "Appearance" },
  { id: "accessibility", label: "Accessibility" },
  { id: "privacy", label: "Privacy" },
] as const;

type TabId = (typeof TAB_DEFINITIONS)[number]["id"];

type CanonicalItem =
  | "theme"
  | "accent-color"
  | "wallpaper"
  | "wallpaper-gallery"
  | "reset-desktop"
  | "font-scale"
  | "density"
  | "reduced-motion"
  | "high-contrast"
  | "haptics"
  | "edit-shortcuts"
  | "export-settings"
  | "import-settings";

const SECTION_ITEMS: Record<TabId, { id: CanonicalItem; label: string }[]> = {
  appearance: [
    { id: "theme", label: "Theme" },
    { id: "accent-color", label: "Accent color" },
    { id: "wallpaper", label: "Wallpaper slider" },
    { id: "wallpaper-gallery", label: "Wallpaper gallery" },
    { id: "reset-desktop", label: "Reset desktop" },
  ],
  accessibility: [
    { id: "font-scale", label: "Icon size" },
    { id: "density", label: "Density" },
    { id: "reduced-motion", label: "Reduced motion" },
    { id: "high-contrast", label: "High contrast" },
    { id: "haptics", label: "Haptics" },
    { id: "edit-shortcuts", label: "Edit shortcuts" },
  ],
  privacy: [
    { id: "export-settings", label: "Export settings" },
    { id: "import-settings", label: "Import settings" },
  ],
};

const ITEM_ALIASES: Record<string, CanonicalItem> = {
  theme: "theme",
  "accent": "accent-color",
  "accent-color": "accent-color",
  "accentcolor": "accent-color",
  wallpaper: "wallpaper",
  "wallpaper-slider": "wallpaper",
  "wallpaper-gallery": "wallpaper-gallery",
  "wallpapergallery": "wallpaper-gallery",
  reset: "reset-desktop",
  "reset-desktop": "reset-desktop",
  "font-scale": "font-scale",
  "font-size": "font-scale",
  "icon-size": "font-scale",
  density: "density",
  "reduced-motion": "reduced-motion",
  "high-contrast": "high-contrast",
  haptics: "haptics",
  "edit-shortcuts": "edit-shortcuts",
  shortcuts: "edit-shortcuts",
  export: "export-settings",
  "export-settings": "export-settings",
  import: "import-settings",
  "import-settings": "import-settings",
};

const toCanonicalItem = (value?: string | CanonicalItem | null): CanonicalItem | null => {
  if (!value) return null;
  if (typeof value !== "string") return value;
  return ITEM_ALIASES[value.toLowerCase()] ?? null;
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

  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [showKeymap, setShowKeymap] = useState(false);
  const [currentItem, setCurrentItem] = useState<CanonicalItem | null>("theme");
  const [pendingFocus, setPendingFocus] = useState<CanonicalItem | null>(null);

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

  const navRef = useRef<HTMLDivElement>(null);
  const themeSelectRef = useRef<HTMLSelectElement>(null);
  const accentGroupRef = useRef<HTMLDivElement>(null);
  const wallpaperSliderRef = useRef<HTMLInputElement>(null);
  const wallpaperGridRef = useRef<HTMLDivElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const fontScaleRef = useRef<HTMLInputElement>(null);
  const densitySelectRef = useRef<HTMLSelectElement>(null);
  const reducedMotionRef = useRef<HTMLDivElement>(null);
  const highContrastRef = useRef<HTMLDivElement>(null);
  const hapticsRef = useRef<HTMLDivElement>(null);
  const keymapButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const importButtonRef = useRef<HTMLButtonElement>(null);

  useRovingTabIndex(navRef, true, "vertical", { selectors: '[role="treeitem"]' });
  useRovingTabIndex(accentGroupRef, activeTab === "appearance", "horizontal", {
    selectors: '[role="radio"]',
  });
  useRovingTabIndex(wallpaperGridRef, activeTab === "appearance", "horizontal", {
    selectors: '[data-wallpaper-option]',
  });

  const navSections = useMemo(
    () =>
      TAB_DEFINITIONS.map((tab) => ({
        ...tab,
        items: SECTION_ITEMS[tab.id],
      })),
    []
  );

  const sectionFirstItem = useMemo(() => {
    const map = new Map<TabId, CanonicalItem | null>();
    navSections.forEach((section) => {
      map.set(section.id, section.items[0]?.id ?? null);
    });
    return map;
  }, [navSections]);

  const findSectionForItem = useCallback(
    (value: CanonicalItem | string | null | undefined): TabId | null => {
      const canonical = toCanonicalItem(value);
      if (!canonical) return null;
      const match = navSections.find((section) =>
        section.items.some((item) => item.id === canonical)
      );
      return (match?.id as TabId | undefined) ?? null;
    },
    [navSections]
  );

  const focusControl = useCallback(
    (item: CanonicalItem | null) => {
      if (!item) return;
      const focusMap: Record<CanonicalItem, () => void> = {
        theme: () => themeSelectRef.current?.focus(),
        "accent-color": () => {
          const target =
            accentGroupRef.current?.querySelector<HTMLElement>(
              '[role="radio"][aria-checked="true"]'
            ) ?? accentGroupRef.current?.querySelector<HTMLElement>('[role="radio"]');
          target?.focus();
        },
        wallpaper: () => wallpaperSliderRef.current?.focus(),
        "wallpaper-gallery": () =>
          wallpaperGridRef.current
            ?.querySelector<HTMLElement>('[data-wallpaper-option]')
            ?.focus(),
        "reset-desktop": () => resetButtonRef.current?.focus(),
        "font-scale": () => fontScaleRef.current?.focus(),
        density: () => densitySelectRef.current?.focus(),
        "reduced-motion": () =>
          reducedMotionRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
        "high-contrast": () =>
          highContrastRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
        haptics: () =>
          hapticsRef.current?.querySelector<HTMLButtonElement>("button")?.focus(),
        "edit-shortcuts": () => keymapButtonRef.current?.focus(),
        "export-settings": () => exportButtonRef.current?.focus(),
        "import-settings": () => importButtonRef.current?.focus(),
      };
      const focusFn = focusMap[item];
      if (focusFn) focusFn();
    },
    []
  );

  const queueFocus = useCallback(
    (value?: string | CanonicalItem | null) => {
      const canonical = toCanonicalItem(value);
      if (!canonical) return;
      setCurrentItem(canonical);
      setPendingFocus(canonical);
    },
    []
  );

  useEffect(() => {
    if (!pendingFocus) return;
    const frame = window.requestAnimationFrame(() => {
      focusControl(pendingFocus);
      setPendingFocus(null);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pendingFocus, focusControl]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ section?: string; item?: string }>).detail ?? {};
      const canonicalItem = toCanonicalItem(detail.item ?? null);
      if (canonicalItem) {
        const owning = findSectionForItem(canonicalItem);
        if (owning) {
          setActiveTab(owning);
        }
        queueFocus(canonicalItem);
        return;
      }
      if (typeof detail.section === "string") {
        const normalized = detail.section.toLowerCase();
        const tab = TAB_DEFINITIONS.find((t) => t.id === normalized);
        if (tab) {
          setActiveTab(tab.id);
          const fallback = sectionFirstItem.get(tab.id);
          if (fallback) {
            queueFocus(fallback);
          }
        }
      }
    };
    window.addEventListener("settings-deeplink", handler as EventListener);
    return () => window.removeEventListener("settings-deeplink", handler as EventListener);
  }, [findSectionForItem, queueFocus, sectionFirstItem]);

  useEffect(() => {
    if (!currentItem) {
      const fallback = sectionFirstItem.get(activeTab);
      if (fallback) {
        setCurrentItem(fallback);
      }
      return;
    }
    const owning = findSectionForItem(currentItem);
    if (owning && owning !== activeTab) {
      const fallback = sectionFirstItem.get(activeTab);
      if (fallback) {
        setCurrentItem(fallback);
      } else {
        setCurrentItem(null);
      }
    }
  }, [activeTab, currentItem, findSectionForItem, sectionFirstItem]);

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
    <div className="w-full flex flex-col md:flex-row flex-grow z-20 max-h-full windowMainScreen select-none bg-ub-cool-grey">
      <aside
        ref={navRef}
        className="settings-sidebar md:w-72 w-full border-b md:border-b-0 md:border-r border-gray-900 p-4 overflow-y-auto"
      >
        <ul role="tree" aria-label="Settings sections" className="space-y-2">
          {navSections.map((section, index) => {
            const isActiveSection = activeTab === section.id;
            return (
              <li key={section.id}>
                <button
                  type="button"
                  role="treeitem"
                  aria-level={1}
                  aria-expanded={isActiveSection}
                  aria-selected={isActiveSection}
                  tabIndex={index === 0 ? 0 : -1}
                  data-tree-section={section.id}
                  className={`settings-tree-trigger ${
                    isActiveSection ? "settings-tree-trigger--active" : ""
                  }`}
                  onClick={() => {
                    setActiveTab(section.id);
                    const fallback = sectionFirstItem.get(section.id);
                    if (fallback) {
                      setCurrentItem(fallback);
                    }
                  }}
                >
                  {section.label}
                </button>
                <ul
                  role="group"
                  aria-label={`${section.label} settings`}
                  className="mt-2 space-y-1"
                  hidden={!isActiveSection}
                >
                  {section.items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="treeitem"
                        aria-level={2}
                        aria-selected={currentItem === item.id}
                        tabIndex={-1}
                        data-settings-item={item.id}
                        className={`settings-tree-link ${
                          currentItem === item.id ? "settings-tree-link--active" : ""
                        }`}
                        onClick={() => {
                          setActiveTab(section.id);
                          queueFocus(item.id);
                        }}
                      >
                        {item.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </aside>
      <div className="flex-1 overflow-y-auto">
        <div className="flex justify-center border-b border-gray-900">
          <Tabs tabs={TAB_DEFINITIONS} active={activeTab} onChange={setActiveTab} />
        </div>
        {activeTab === "appearance" && (
          <div className="px-6 py-6 space-y-6 text-ubt-grey">
            <div
              className="md:w-2/5 w-3/4 h-48 md:h-56 m-auto rounded-lg border border-ubt-cool-grey"
              style={{
                backgroundImage: `url(/wallpapers/${wallpaper}.webp)`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center center",
              }}
              aria-hidden="true"
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label className="text-ubt-grey" htmlFor="theme-select">
                Theme:
              </label>
              <select
                id="theme-select"
                ref={themeSelectRef}
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-ubt-cool-grey settings-control"
              >
                <option value="default">Default</option>
                <option value="dark">Dark</option>
                <option value="neon">Neon</option>
                <option value="matrix">Matrix</option>
              </select>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-ubt-grey">Accent:</span>
              <div
                ref={accentGroupRef}
                aria-label="Accent color picker"
                role="radiogroup"
                className="flex flex-wrap justify-center gap-2"
              >
                {ACCENT_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`select-accent-${c}`}
                    role="radio"
                    aria-checked={accent === c}
                    onClick={() => setAccent(c)}
                    className={`settings-accent-option settings-control ${
                      accent === c ? "settings-accent-option--active" : ""
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label htmlFor="wallpaper-slider" className="text-ubt-grey">
                Wallpaper:
              </label>
              <input
                id="wallpaper-slider"
                ref={wallpaperSliderRef}
                type="range"
                min="0"
                max={wallpapers.length - 1}
                step="1"
                value={wallpapers.indexOf(wallpaper)}
                onChange={(e) =>
                  changeBackground(wallpapers[parseInt(e.target.value, 10)])
                }
                className="ubuntu-slider settings-control"
                aria-label="Wallpaper"
              />
            </div>
            <div className="flex justify-center">
              <BackgroundSlideshow />
            </div>
            <div
              ref={wallpaperGridRef}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center border-t border-gray-900 pt-4"
            >
              {wallpapers.map((name) => (
                <button
                  key={name}
                  type="button"
                  data-wallpaper-option
                  aria-label={`Select ${name.replace("wall-", "wallpaper ")}`}
                  aria-pressed={name === wallpaper}
                  onClick={() => changeBackground(name)}
                  className={`settings-wallpaper-option ${
                    name === wallpaper ? "settings-wallpaper-option--active" : ""
                  }`}
                  style={{
                    backgroundImage: `url(/wallpapers/${name}.webp)`,
                    backgroundSize: "cover",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center center",
                  }}
                />
              ))}
            </div>
            <div className="border-t border-gray-900 pt-4 flex justify-center">
              <button
                ref={resetButtonRef}
                onClick={handleReset}
                className="px-4 py-2 rounded bg-ub-orange text-white settings-control"
              >
                Reset Desktop
              </button>
            </div>
          </div>
        )}
        {activeTab === "accessibility" && (
          <div className="px-6 py-6 space-y-6 text-ubt-grey">
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label htmlFor="font-scale" className="text-ubt-grey">
                Icon Size:
              </label>
              <input
                id="font-scale"
                ref={fontScaleRef}
                type="range"
                min="0.75"
                max="1.5"
                step="0.05"
                value={fontScale}
                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                className="ubuntu-slider settings-control"
                aria-label="Icon size"
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <label htmlFor="density-select" className="text-ubt-grey">
                Density:
              </label>
              <select
                id="density-select"
                ref={densitySelectRef}
                value={density}
                onChange={(e) => setDensity(e.target.value as any)}
                className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-ubt-cool-grey settings-control"
              >
                <option value="regular">Regular</option>
                <option value="compact">Compact</option>
              </select>
            </div>
            <div
              ref={reducedMotionRef}
              className="flex justify-center items-center gap-3"
            >
              <span className="text-ubt-grey">Reduced Motion:</span>
              <ToggleSwitch
                checked={reducedMotion}
                onChange={setReducedMotion}
                ariaLabel="Reduced Motion"
                className="settings-control"
              />
            </div>
            <div
              ref={highContrastRef}
              className="flex justify-center items-center gap-3"
            >
              <span className="text-ubt-grey">High Contrast:</span>
              <ToggleSwitch
                checked={highContrast}
                onChange={setHighContrast}
                ariaLabel="High Contrast"
                className="settings-control"
              />
            </div>
            <div ref={hapticsRef} className="flex justify-center items-center gap-3">
              <span className="text-ubt-grey">Haptics:</span>
              <ToggleSwitch
                checked={haptics}
                onChange={setHaptics}
                ariaLabel="Haptics"
                className="settings-control"
              />
            </div>
            <div className="border-t border-gray-900 pt-4 flex justify-center">
              <button
                ref={keymapButtonRef}
                onClick={() => setShowKeymap(true)}
                className="px-4 py-2 rounded bg-ub-orange text-white settings-control"
              >
                Edit Shortcuts
              </button>
            </div>
          </div>
        )}
        {activeTab === "privacy" && (
          <div className="px-6 py-6 space-y-6 text-ubt-grey">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                ref={exportButtonRef}
                onClick={handleExport}
                className="px-4 py-2 rounded bg-ub-orange text-white settings-control"
              >
                Export Settings
              </button>
              <button
                ref={importButtonRef}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded bg-ub-orange text-white settings-control"
              >
                Import Settings
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
    </div>
  );
}
