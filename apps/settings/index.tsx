"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
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
  className?: string;
};

const Section = ({ title, description, children, className }: SectionProps) => (
  <section
    className={`relative overflow-hidden rounded-2xl border border-[var(--kali-panel-border)]/70 bg-[var(--kali-panel)]/75 shadow-[0_24px_70px_-50px_rgba(10,18,40,0.9)] backdrop-blur-md ${
      className ?? ""
    }`}
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-70"
    />
    <div className="relative">
      <header className="border-b border-[var(--kali-panel-border)]/80 bg-[var(--kali-panel)]/90 px-5 py-4">
        <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--color-text)]/75">
        {title}
        </h2>
        {description && (
          <p className="mt-2 text-xs leading-relaxed text-[var(--color-text)]/70">
            {description}
          </p>
        )}
      </header>
      <div className="divide-y divide-[var(--kali-panel-border)]/80">{children}</div>
    </div>
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
    <div className="group/row px-5 py-3 transition-colors duration-200 hover:bg-white/5">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:gap-6">
        <div className="flex flex-col gap-1">
          {labelFor ? (
            <label
              htmlFor={labelFor}
              className="text-sm font-semibold text-[var(--color-text)]/85"
            >
              {label}
            </label>
          ) : (
            <span className="text-sm font-semibold text-[var(--color-text)]/85">{label}</span>
          )}
          {helperText && (
            <p className="text-xs leading-relaxed text-[var(--color-text)]/65">{helperText}</p>
          )}
        </div>
        <div
          className={`flex flex-wrap items-center gap-3 ${alignmentClass}`}
        >
          {children}
        </div>
      </div>
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
    largeHitAreas,
    setLargeHitAreas,
    pongSpin,
    setPongSpin,
    allowNetwork,
    setAllowNetwork,
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
    { id: "system", label: "System Info" },
  ] as const;
  type TabId = (typeof tabs)[number]["id"];
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [isTabTransitioning, setIsTabTransitioning] = useState(false);

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
  const [lastUpdateAt, setLastUpdateAt] = useState<string>("");

  useEffect(() => {
    if (reducedMotion) {
      setIsTabTransitioning(false);
      return;
    }
    setIsTabTransitioning(true);
    const timeout = window.setTimeout(() => setIsTabTransitioning(false), 220);
    return () => window.clearTimeout(timeout);
  }, [activeTab, reducedMotion]);

  useEffect(() => {
    const timestamp = new Date();
    setLastUpdateAt(timestamp.toLocaleString());
  }, []);

  return (
    <div className="windowMainScreen z-20 flex max-h-full w-full flex-grow select-none flex-col overflow-y-auto bg-[var(--kali-panel)]">
      <div className="flex justify-center border-b border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/90 backdrop-blur-sm">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      <div
        className={`px-4 pb-10 transition-all duration-300 ease-out ${
          reducedMotion
            ? "opacity-100"
            : isTabTransitioning
            ? "opacity-0 translate-y-2"
            : "opacity-100 translate-y-0"
        }`}
      >
        {activeTab === "appearance" && (
          <div className="mx-auto mt-6 grid w-full max-w-5xl gap-6 lg:grid-cols-2">
            <Section
              title="Preview"
              description="Check how your desktop updates as you tweak the appearance controls."
              className="lg:col-span-2"
            >
              <div className="px-5 py-6">
                <div className="relative mx-auto h-40 w-full max-w-xl overflow-hidden rounded-xl border border-[var(--kali-panel-border)]/80 shadow-inner">
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

            <Section
              title="Appearance"
              description="Choose colors and density that match your workflow."
            >
              <SettingRow label="Theme">
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="rounded-lg border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-kali-control focus:outline-none"
                >
                  <option value="default">Default</option>
                  <option value="dark">Dark</option>
                  <option value="neon">Neon</option>
                  <option value="matrix">Matrix</option>
                </select>
              </SettingRow>

              <SettingRow label="Accent">
                <div
                  aria-label="Accent color picker"
                  role="radiogroup"
                  className="flex flex-wrap gap-2"
                >
                  {ACCENT_OPTIONS.map((c) => (
                    <button
                      key={c}
                      aria-label={`select-accent-${c}`}
                      role="radio"
                      aria-checked={accent === c}
                      onClick={() => setAccent(c)}
                      className={`h-8 w-8 rounded-full border-2 transition-transform transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 ${
                        accent === c
                          ? "border-kali-control shadow-[0_0_0_3px_rgba(15,148,210,0.35)] scale-[1.08]"
                          : "border-transparent hover:scale-[1.05]"
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
                  className="rounded-lg border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-kali-control focus:outline-none"
                >
                  <option value="regular">Regular</option>
                  <option value="compact">Compact</option>
                </select>
              </SettingRow>
            </Section>

            <Section
              title="Wallpaper"
              description="Pick a static wallpaper or let the Kali gradient take over."
            >
              <SettingRow
                label="Kali Gradient"
                helperText="Your previous wallpaper is saved when the gradient is active."
              >
                <label className="inline-flex items-center gap-3 text-sm text-[var(--color-text)]/80">
                  <input
                    type="checkbox"
                    checked={useKaliWallpaper}
                    onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                    className="h-4 w-4 accent-[var(--kali-control)]"
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

            <Section title="Wallpaper Gallery" className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-4 px-5 py-4 md:grid-cols-4">
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
                    className={`relative flex h-32 w-full items-center justify-center overflow-hidden rounded-lg border-4 border-opacity-80 outline-none transition-transform focus-visible:scale-[1.02] focus-visible:border-kali-control ${
                      name === wallpaper
                        ? "border-kali-control shadow-[0_0_0_4px_rgba(15,148,210,0.28)]"
                        : "border-transparent"
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
            </Section>

            <Section title="Desktop Actions" className="lg:col-span-2">
              <SettingRow
                label="Reset Preferences"
                helperText="Restore the default wallpaper, theme, and layout preferences."
                align="end"
              >
                <button
                  onClick={handleReset}
                  className="inline-flex items-center justify-center rounded border border-[var(--kali-panel-border)] bg-kali-control px-4 py-2 text-sm font-semibold text-black shadow transition hover:bg-kali-control/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                >
                  Reset Desktop
                </button>
              </SettingRow>
            </Section>
          </div>
        )}

        {activeTab === "accessibility" && (
          <div className="mx-auto mt-6 grid w-full max-w-4xl gap-6 lg:grid-cols-2">
            <Section
              title="Display"
              description="Tune how icons and motion behave across the desktop."
              className="lg:col-span-2"
            >
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

              <SettingRow
                label="Large Hit Areas"
                helperText="Expands clickable regions for easier navigation."
              >
                <ToggleSwitch
                  checked={largeHitAreas}
                  onChange={setLargeHitAreas}
                  ariaLabel="Large Hit Areas"
                />
              </SettingRow>
            </Section>

            <Section
              title="Interaction"
              description="Fine-tune feedback when interacting with windows and apps."
              className="lg:col-span-2"
            >
              <SettingRow
                label="Haptics"
                helperText="Toggle click feedback for supported devices."
              >
                <ToggleSwitch
                  checked={haptics}
                  onChange={setHaptics}
                  ariaLabel="Haptics"
                />
              </SettingRow>

              <SettingRow
                label="Pong Spin"
                helperText="Enable spin physics in the Pong simulation for advanced rallies."
              >
                <ToggleSwitch
                  checked={pongSpin}
                  onChange={setPongSpin}
                  ariaLabel="Pong Spin"
                />
              </SettingRow>
            </Section>

            <Section
              title="Keyboard Shortcuts"
              description="Customize or review the desktop keymap."
              className="lg:col-span-2"
            >
              <SettingRow
                label="Keymap Overlay"
                helperText="Quickly open the overlay to remap or review shortcuts."
                align="end"
              >
                <button
                  onClick={() => setShowKeymap(true)}
                  className="inline-flex items-center justify-center rounded border border-[var(--kali-panel-border)] bg-kali-control px-4 py-2 text-sm font-semibold text-black shadow transition hover:bg-kali-control/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                >
                  Edit Shortcuts
                </button>
              </SettingRow>
            </Section>
          </div>
        )}

        {activeTab === "privacy" && (
          <div className="mx-auto mt-6 grid w-full max-w-3xl gap-6">
            <Section title="Data">
              <SettingRow
                label="Backup Settings"
                helperText="Export a backup of your settings or import one you saved earlier."
                align="end"
              >
                <div className="flex flex-col gap-3 md:flex-row">
                  <button
                    onClick={handleExport}
                    className="inline-flex items-center justify-center rounded border border-[var(--kali-panel-border)] bg-kali-control px-4 py-2 text-sm font-semibold text-black shadow transition hover:bg-kali-control/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                  >
                    Export Settings
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center rounded border border-[var(--kali-panel-border)] bg-kali-control px-4 py-2 text-sm font-semibold text-black shadow transition hover:bg-kali-control/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--kali-bg)]"
                  >
                    Import Settings
                  </button>
                </div>
              </SettingRow>
            </Section>

            <Section
              title="Permissions"
              description="Control which external resources the desktop may contact."
            >
              <SettingRow
                label="External Requests"
                helperText="Block outbound network calls while keeping local functionality intact."
              >
                <ToggleSwitch
                  checked={allowNetwork}
                  onChange={setAllowNetwork}
                  ariaLabel="Allow Network Requests"
                />
              </SettingRow>
            </Section>
          </div>
        )}

        {activeTab === "system" && (
          <div className="mx-auto mt-6 grid w-full max-w-4xl gap-6 lg:grid-cols-2">
            <Section
              title="System Snapshot"
              description="Quick diagnostics for the simulated desktop environment."
              className="lg:col-span-2"
            >
              <div className="grid gap-4 px-5 py-5 md:grid-cols-2">
                {[
                  { label: "Session State", value: "Active" },
                  { label: "Window Manager", value: "Kali Shell v2" },
                  { label: "Theme", value: theme },
                  { label: "Accent", value: accent },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-lg border border-[var(--kali-panel-border)]/70 bg-[var(--kali-panel)]/70 px-4 py-3"
                  >
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-text)]/60">
                      {item.label}
                    </span>
                    <span className="text-sm font-semibold text-[var(--color-text)]/85">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="Device" description="Details pulled from your current browser session.">
              <SettingRow label="Platform">
                <span className="text-sm text-[var(--color-text)]/80">
                  {navigator.platform || "Web"}
                </span>
              </SettingRow>
              <SettingRow label="Language">
                <span className="text-sm text-[var(--color-text)]/80">
                  {navigator.language || "en-US"}
                </span>
              </SettingRow>
              <SettingRow label="Time Zone">
                <span className="text-sm text-[var(--color-text)]/80">
                  {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              </SettingRow>
              <SettingRow label="Last Settings Update">
                <span className="text-sm text-[var(--color-text)]/80">{lastUpdateAt}</span>
              </SettingRow>
            </Section>

            <Section title="Security Posture" description="Simulated compliance for the desktop shell.">
              <SettingRow label="Network Guard">
                <span className="text-sm text-[var(--color-text)]/80">
                  {allowNetwork ? "External requests allowed" : "External requests blocked"}
                </span>
              </SettingRow>
              <SettingRow label="Storage">
                <span className="text-sm text-[var(--color-text)]/80">
                  Local preferences encrypted at rest (simulation).
                </span>
              </SettingRow>
              <SettingRow label="Update Channel">
                <span className="text-sm text-[var(--color-text)]/80">Stable (auto)</span>
              </SettingRow>
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
