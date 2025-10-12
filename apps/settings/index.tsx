"use client";

import { useEffect, useRef, useState } from "react";
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
import KaliWallpaper from "../../components/util-components/kali-wallpaper";

type SectionId =
  | "appearance"
  | "background"
  | "accessibility"
  | "shortcuts"
  | "privacy";

const sections: { id: SectionId; label: string }[] = [
  { id: "appearance", label: "Appearance" },
  { id: "background", label: "Background" },
  { id: "accessibility", label: "Accessibility" },
  { id: "shortcuts", label: "Shortcuts" },
  { id: "privacy", label: "Privacy & Data" },
];

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
    haptics,
    setHaptics,
    theme,
    setTheme,
  } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showKeymap, setShowKeymap] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("appearance");

  const sectionRefs = useRef<Record<SectionId, HTMLElement | null>>({
    appearance: null,
    background: null,
    accessibility: null,
    shortcuts: null,
    privacy: null,
  });

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

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) {
          const id = visible[0].target.id as SectionId;
          setActiveSection(id);
        }
      },
      { threshold: 0.3 }
    );

    Object.values(sectionRefs.current).forEach((section) => {
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  const handleSectionClick = (id: SectionId) => {
    const section = sectionRefs.current[id];
    if (section) {
      setActiveSection(id);
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="mx-auto flex w-full max-w-6xl flex-col md:flex-row">
        <nav
          aria-label="Settings sections"
          className="md:w-64 md:border-r md:border-gray-900/60 bg-ub-cool-grey/60 md:bg-transparent"
        >
          <ul className="flex md:flex-col overflow-x-auto md:overflow-visible border-b border-gray-900/60 md:border-b-0">
            {sections.map((section) => (
              <li key={section.id} className="flex-1">
                <button
                  type="button"
                  onClick={() => handleSectionClick(section.id)}
                  className={`w-full px-4 py-3 text-sm font-medium transition-colors md:text-left ${
                    activeSection === section.id
                      ? "bg-ub-orange text-white"
                      : "text-ubt-grey hover:bg-ub-cool-grey/60"
                  }`}
                  aria-current={activeSection === section.id ? "true" : undefined}
                >
                  {section.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex-1 space-y-16 px-6 py-8">
          <section
            id="appearance"
            ref={(el) => {
              sectionRefs.current.appearance = el;
            }}
            className="scroll-mt-24"
          >
            <h2 className="text-xl font-semibold text-white">Appearance</h2>
            <p className="mt-2 text-sm text-ubt-grey/80">
              Choose a desktop theme and highlight color to personalize window chrome,
              panels, and focus states throughout the portfolio.
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-ubt-grey" htmlFor="theme-select">
                  Theme
                </label>
                <select
                  id="theme-select"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="mt-2 w-full rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-ubt-grey"
                >
                  <option value="default">Default</option>
                  <option value="dark">Dark</option>
                  <option value="neon">Neon</option>
                  <option value="matrix">Matrix</option>
                </select>
                <p className="mt-2 text-xs text-ubt-grey/70">
                  Themes adjust the global window chrome, dock styling, and system accents in one click.
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-ubt-grey">Accent color</span>
                <div
                  aria-label="Accent color picker"
                  role="radiogroup"
                  className="mt-3 flex flex-wrap gap-2"
                >
                  {ACCENT_OPTIONS.map((c) => (
                    <button
                      key={c}
                      aria-label={`select-accent-${c}`}
                      role="radio"
                      aria-checked={accent === c}
                      onClick={() => setAccent(c)}
                      className={`h-9 w-9 rounded-full border-2 transition ${
                        accent === c ? "border-white scale-105" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-xs text-ubt-grey/70">
                  The accent color highlights active buttons, selection outlines, and other focus indicators.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-ubt-grey" htmlFor="density-select">
                  Interface density
                </label>
                <select
                  id="density-select"
                  value={density}
                  onChange={(e) => setDensity(e.target.value as any)}
                  className="mt-2 w-full rounded border border-ubt-cool-grey bg-ub-cool-grey px-3 py-2 text-ubt-grey"
                >
                  <option value="regular">Regular</option>
                  <option value="compact">Compact</option>
                </select>
                <p className="mt-2 text-xs text-ubt-grey/70">
                  Density changes how much spacing appears between icons and window chrome for tighter or roomier layouts.
                </p>
              </div>
            </div>
          </section>

          <section
            id="background"
            ref={(el) => {
              sectionRefs.current.background = el;
            }}
            className="scroll-mt-24"
          >
            <h2 className="text-xl font-semibold text-white">Background</h2>
            <p className="mt-2 text-sm text-ubt-grey/80">
              Preview and swap wallpapers to refresh the desktop backdrop. All selections save instantly.
            </p>
            <div className="mt-6">
              <div className="relative m-auto my-4 h-52 overflow-hidden rounded-lg shadow-inner md:w-2/3 lg:w-1/2">
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
              <div className="flex flex-col items-center gap-2">
                <label className="flex items-center text-sm font-medium text-ubt-grey">
                  <input
                    type="checkbox"
                    checked={useKaliWallpaper}
                    onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                    className="mr-2"
                  />
                  Kali gradient wallpaper
                </label>
                <p className="text-xs text-ubt-grey/70">
                  Enable a live Kali-inspired gradient animation. Your manual wallpaper pick is remembered for later.
                </p>
              </div>
              <div className="mt-6 flex flex-col items-center gap-2">
                <label htmlFor="wallpaper-slider" className="text-sm font-medium text-ubt-grey">
                  Wallpaper browser
                </label>
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
                  className="ubuntu-slider"
                  aria-label="Wallpaper"
                />
                <p className="text-xs text-ubt-grey/70">
                  Slide to cycle through curated wallpapers without opening the selector grid.
                </p>
              </div>
              <div className="mt-8 flex justify-center">
                <BackgroundSlideshow />
              </div>
              <p className="mt-2 text-center text-xs text-ubt-grey/70">
                Launch the slideshow to automatically rotate through every wallpaper for inspiration.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
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
                    className={`h-28 rounded-lg border-4 border-opacity-80 bg-cover bg-center outline-none transition focus-visible:ring-2 focus-visible:ring-ub-orange ${
                      name === wallpaper ? "border-yellow-700" : "border-transparent"
                    }`}
                    style={{ backgroundImage: `url(/wallpapers/${name}.webp)` }}
                  />
                ))}
              </div>
            </div>
          </section>

          <section
            id="accessibility"
            ref={(el) => {
              sectionRefs.current.accessibility = el;
            }}
            className="scroll-mt-24"
          >
            <h2 className="text-xl font-semibold text-white">Accessibility</h2>
            <p className="mt-2 text-sm text-ubt-grey/80">
              Adjust interface scale and motion preferences so every window feels comfortable to use.
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <label htmlFor="font-scale" className="text-sm font-medium text-ubt-grey">
                  Icon size
                </label>
                <input
                  id="font-scale"
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={fontScale}
                  onChange={(e) => setFontScale(parseFloat(e.target.value))}
                  className="mt-3 w-full ubuntu-slider"
                  aria-label="Icon size"
                />
                <p className="mt-2 text-xs text-ubt-grey/70">
                  Scale desktop icons and text globally. Higher values make launchers easier to target.
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-ubt-grey">Reduced motion</span>
                <div className="mt-3 flex items-center gap-3">
                  <ToggleSwitch
                    checked={reducedMotion}
                    onChange={setReducedMotion}
                    ariaLabel="Reduced Motion"
                  />
                  <p className="text-xs text-ubt-grey/70">
                    Minimize animations for smoother performance and to support motion-sensitive users.
                  </p>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-ubt-grey">High contrast</span>
                <div className="mt-3 flex items-center gap-3">
                  <ToggleSwitch
                    checked={highContrast}
                    onChange={setHighContrast}
                    ariaLabel="High Contrast"
                  />
                  <p className="text-xs text-ubt-grey/70">
                    Boost contrast and outlines for improved legibility across windows and menus.
                  </p>
                </div>
              </div>
              <div>
                <span className="text-sm font-medium text-ubt-grey">Haptics</span>
                <div className="mt-3 flex items-center gap-3">
                  <ToggleSwitch
                    checked={haptics}
                    onChange={setHaptics}
                    ariaLabel="Haptics"
                  />
                  <p className="text-xs text-ubt-grey/70">
                    Toggle simulated vibration feedback for virtual touch controls and device previews.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section
            id="shortcuts"
            ref={(el) => {
              sectionRefs.current.shortcuts = el;
            }}
            className="scroll-mt-24"
          >
            <h2 className="text-xl font-semibold text-white">Shortcuts</h2>
            <p className="mt-2 text-sm text-ubt-grey/80">
              Customize keyboard shortcuts to match your workflow. Changes sync instantly with the desktop shell.
            </p>
            <div className="mt-6 flex flex-col items-start gap-3">
              <button
                onClick={() => setShowKeymap(true)}
                className="rounded bg-ub-orange px-4 py-2 text-white"
              >
                Edit Shortcuts
              </button>
              <p className="text-xs text-ubt-grey/70">
                Opens the shortcut editor overlay so you can remap launcher, window, and utility actions.
              </p>
            </div>
          </section>

          <section
            id="privacy"
            ref={(el) => {
              sectionRefs.current.privacy = el;
            }}
            className="scroll-mt-24"
          >
            <h2 className="text-xl font-semibold text-white">Privacy &amp; Data</h2>
            <p className="mt-2 text-sm text-ubt-grey/80">
              Manage backups of your desktop layout and restore defaults when you want a clean slate.
            </p>
            <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
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
            <p className="mt-2 text-xs text-ubt-grey/70">
              Export saves a JSON file containing your theme, wallpaper, and layout choices. Import restores a previous export.
            </p>
            <div className="mt-8 border-t border-gray-900/60 pt-6">
              <button
                onClick={handleReset}
                className="rounded bg-ub-orange px-4 py-2 text-white"
              >
                Reset Desktop
              </button>
              <p className="mt-2 text-xs text-ubt-grey/70">
                Reset clears saved preferences and window data, returning the desktop to its default state.
              </p>
            </div>
          </section>
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
