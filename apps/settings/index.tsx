"use client";

import { useState, useRef, ReactNode } from "react";
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

type SectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

const Section = ({ title, description, children }: SectionProps) => (
  <section className="border border-gray-900/80 rounded-xl overflow-hidden bg-ub-cool-grey/50 backdrop-blur-sm">
    <header className="px-4 py-3 border-b border-gray-900/60 bg-ub-cool-grey/60">
      <h2 className="text-xs font-semibold uppercase tracking-[0.25em] text-ubt-grey/80">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-xs text-ubt-grey/60 leading-relaxed">{description}</p>
      )}
    </header>
    <div className="divide-y divide-gray-900/60">{children}</div>
  </section>
);

type SettingRowProps = {
  label: string;
  labelFor?: string;
  children: ReactNode;
  helperText?: string;
  align?: "start" | "end" | "between";
};

const SettingRow = ({ label, labelFor, children, helperText, align = "start" }: SettingRowProps) => {
  const alignmentClass =
    align === "between"
      ? "md:justify-between"
      : align === "end"
      ? "md:justify-end"
      : "md:justify-start";

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {labelFor ? (
          <label htmlFor={labelFor} className="text-sm font-medium text-ubt-grey md:w-56">
            {label}
          </label>
        ) : (
          <span className="text-sm font-medium text-ubt-grey md:w-56">{label}</span>
        )}
        <div className={`flex flex-1 items-center gap-3 justify-start ${alignmentClass}`}>
          {children}
        </div>
      </div>
      {helperText && (
        <p className="mt-2 text-xs text-ubt-grey/70 leading-relaxed md:ml-56">{helperText}</p>
      )}
    </div>
  );
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

  const [showKeymap, setShowKeymap] = useState(false);

  return (
    <div className="w-full flex-col flex-grow z-20 max-h-full overflow-y-auto windowMainScreen select-none bg-ub-cool-grey">
      <div className="flex justify-center border-b border-gray-900 bg-ub-cool-grey/80 backdrop-blur-sm">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      <div className="px-4 pb-10">
        {activeTab === "appearance" && (
          <div className="mx-auto mt-6 flex max-w-5xl flex-col gap-6">
            <Section
              title="Preview"
              description="Check how your desktop updates as you tweak the appearance controls."
            >
              <div className="px-4 py-6">
                <div className="relative mx-auto h-40 w-full max-w-xl overflow-hidden rounded-lg border border-gray-900/70 shadow-inner">
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
              </div>
            </Section>

            <Section title="Appearance" description="Choose colors and density that match your workflow.">
              <SettingRow label="Theme">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-ubt-cool-grey focus:border-ubt-grey focus:outline-none"
                >
                  <option value="default">Default</option>
                  <option value="dark">Dark</option>
                  <option value="neon">Neon</option>
                  <option value="matrix">Matrix</option>
                </select>
              </SettingRow>

              <SettingRow label="Accent">
                <div aria-label="Accent color picker" role="radiogroup" className="flex flex-wrap gap-2">
                  {ACCENT_OPTIONS.map((c) => (
                    <button
                      key={c}
                      aria-label={`select-accent-${c}`}
                      role="radio"
                      aria-checked={accent === c}
                      onClick={() => setAccent(c)}
                      className={`h-8 w-8 rounded-full border-2 transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                        accent === c ? "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.35)]" : "border-transparent"
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </SettingRow>

              <SettingRow
                label="Interface Density"
                helperText="Compact mode tightens window padding for smaller displays or multitasking."
              >
                <select
                  value={density}
                  onChange={(e) => setDensity(e.target.value as any)}
                  className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-ubt-cool-grey focus:border-ubt-grey focus:outline-none"
                >
                  <option value="regular">Regular</option>
                  <option value="compact">Compact</option>
                </select>
              </SettingRow>
            </Section>

            <Section title="Wallpaper" description="Pick a static wallpaper or let the Kali gradient take over.">
              <SettingRow label="Kali Gradient" helperText="Your previous wallpaper is saved when the gradient is active.">
                <label className="inline-flex items-center gap-3 text-ubt-grey">
                  <input
                    type="checkbox"
                    checked={useKaliWallpaper}
                    onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                    className="h-4 w-4 accent-ub-orange"
                    aria-label="Enable gradient wallpaper"
                  />
                  Enable gradient wallpaper
                </label>
              </SettingRow>

              <SettingRow label="Wallpaper" labelFor="wallpaper-slider">
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
                  className="kali-slider flex-1"
                  aria-label="Wallpaper"
                />
              </SettingRow>

              <SettingRow
                label="Background Slideshow"
                helperText="Launch a relaxing wallpaper loop directly from the desktop."
              >
                <BackgroundSlideshow />
              </SettingRow>
            </Section>

            <Section title="Wallpaper Gallery">
              <div className="grid grid-cols-2 gap-4 px-4 py-4 md:grid-cols-4">
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
                      name === wallpaper
                        ? "border-yellow-700 shadow-[0_0_0_2px_rgba(255,214,0,0.35)]"
                        : "border-transparent"
                    } relative flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border-4 border-opacity-80 outline-none transition-transform focus-visible:scale-[1.02] focus-visible:border-white`}
                    style={{
                      backgroundImage: `url(/wallpapers/${name}.webp)`,
                      backgroundSize: "cover",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center center",
                    }}
                  />
                ))}
              </div>
            </Section>

            <Section title="Desktop Actions">
              <div className="px-4 py-4">
                <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-ubt-grey/80">
                    Restore the default wallpaper, theme, and layout preferences.
                  </p>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center justify-center rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  >
                    Reset Desktop
                  </button>
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "accessibility" && (
          <div className="mx-auto mt-6 flex max-w-3xl flex-col gap-6">
            <Section title="Display" description="Tune how icons and motion behave across the desktop.">
              <SettingRow label="Icon Size" labelFor="font-scale">
                <input
                  id="font-scale"
                  type="range"
                  min="0.75"
                  max="1.5"
                  step="0.05"
                  value={fontScale}
                  onChange={(e) => setFontScale(parseFloat(e.target.value))}
                  className="kali-slider flex-1"
                  aria-label="Icon size"
                />
              </SettingRow>

              <SettingRow label="Reduced Motion" helperText="Minimizes animations for sensitive users.">
                <ToggleSwitch
                  checked={reducedMotion}
                  onChange={setReducedMotion}
                  ariaLabel="Reduced Motion"
                />
              </SettingRow>

              <SettingRow label="High Contrast" helperText="Boosts contrast for legibility across windows.">
                <ToggleSwitch
                  checked={highContrast}
                  onChange={setHighContrast}
                  ariaLabel="High Contrast"
                />
              </SettingRow>

              <SettingRow label="Haptics" helperText="Toggle click feedback for supported devices.">
                <ToggleSwitch
                  checked={haptics}
                  onChange={setHaptics}
                  ariaLabel="Haptics"
                />
              </SettingRow>
            </Section>

            <Section title="Keyboard Shortcuts" description="Customize or review the desktop keymap.">
              <div className="px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-ubt-grey/80">
                    Quickly open the keymap overlay to remap or review shortcuts.
                  </p>
                  <button
                    onClick={() => setShowKeymap(true)}
                    className="inline-flex items-center justify-center rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                  >
                    Edit Shortcuts
                  </button>
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="mx-auto mt-6 flex max-w-xl flex-col gap-6">
            <Section title="Data">
              <div className="px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-ubt-grey/80">
                    Export a backup of your settings or import one you saved earlier.
                  </p>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center">
                    <button
                      onClick={handleExport}
                      className="inline-flex items-center justify-center rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    >
                      Export Settings
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center justify-center rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white shadow transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                    >
                      Import Settings
                    </button>
                  </div>
                </div>
              </div>
            </Section>
          </div>
        )}
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
