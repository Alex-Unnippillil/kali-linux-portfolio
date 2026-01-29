"use client";

import { useState, useRef, ReactNode } from "react";
import { useSettings, ACCENT_OPTIONS } from "../../hooks/useSettings";
import BackgroundSlideshow from "./components/BackgroundSlideshow";
import SystemInfo from "./components/SystemInfo";
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
    className={`rounded-2xl border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/80 shadow-kali-panel backdrop-blur-sm ${className ?? ""
      }`}
  >
    <header className="border-b border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/90 px-5 py-4">
      <h2 className="text-[0.7rem] font-semibold uppercase tracking-[0.3em] text-[var(--color-text)]/70">
        {title}
      </h2>
      {description && (
        <p className="mt-2 text-xs leading-relaxed text-[var(--color-text)]/70">
          {description}
        </p>
      )}
    </header>
    <div className="divide-y divide-[var(--kali-panel-border)]/80">{children}</div>
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
    <div className="px-5 py-3">
      <div className="flex flex-col gap-3 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:items-center md:gap-6">
        <div className="flex flex-col gap-1">
          {labelFor ? (
            <label
              htmlFor={labelFor}
              className="text-sm font-semibold text-[var(--color-text)]/80"
            >
              {label}
            </label>
          ) : (
            <span className="text-sm font-semibold text-[var(--color-text)]/80">{label}</span>
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
    { id: "appearance", label: "Appearance", icon: "paint-brush" },
    { id: "accessibility", label: "Accessibility", icon: "universal-access" },
    { id: "privacy", label: "Privacy", icon: "shield" },
    { id: "system", label: "System Info", icon: "circle-info" },
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Icon mapping helper (using simple unicode/css or you can import icons if available. 
  // For now using simple text/ascii or existing pattern. detailed polish next step)
  const getIcon = (iconName: string) => {
    // Placeholder for actual icons, potentially using Lucide or FontAwesome later if available
    return null;
  }

  return (
    <div className="windowMainScreen z-20 flex h-full w-full select-none overflow-hidden bg-[var(--kali-panel)] text-[var(--color-text)] font-sans">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/95 backdrop-blur-xl transition-transform duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text)]">Settings</h1>
          <p className="text-xs text-[var(--color-text)]/60 mt-1">Kali Linux Portfolio</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMobileMenuOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                ? "bg-[var(--kali-control)] text-[var(--kali-bg)] shadow-md"
                : "text-[var(--color-text)]/80 hover:bg-[var(--kali-panel-border)]/50 hover:text-[var(--color-text)]"
                }`}
            >
              <span className="capitalize">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-[var(--kali-panel-border)]">
          <div className="text-[10px] text-center opacity-40">
            v2024.1.0-release
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto scroll-smooth p-8 bg-[var(--kali-bg)]/30">
        <div className="mx-auto max-w-4xl space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <header className="mb-6 flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-md p-2 text-[var(--color-text)] hover:bg-[var(--kali-panel-border)] md:hidden"
              aria-label="Toggle navigation menu"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </button>
            <div>
              <h2 className="text-2xl font-semibold text-[var(--color-text)]">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-sm text-[var(--color-text)]/60">
                Manage your {activeTab} preferences
              </p>
            </div>
          </header>

          {activeTab === "appearance" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Section
                title="Preview"
                description="Check how your desktop updates as you tweak the appearance controls."
              >
                <div className="px-5 py-6">
                  <div className="relative mx-auto h-48 w-full max-w-lg overflow-hidden rounded-xl border border-[var(--kali-panel-border)]/80 shadow-2xl transition-all hover:scale-[1.01]">
                    {useKaliWallpaper ? (
                      <KaliWallpaper />
                    ) : (
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                        style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)` }}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              </Section>

              <Section
                title="Theme & Colors"
                description="Choose colors and density that match your workflow."
              >
                <SettingRow label="Theme">
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="rounded-lg border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-3 py-2 text-sm text-[var(--color-text)] focus:border-kali-control focus:outline-none focus:ring-2 focus:ring-kali-control/50"
                  >
                    <option value="default">Default</option>
                    <option value="dark">Dark</option>
                    <option value="neon">Neon</option>
                    <option value="matrix">Matrix</option>
                  </select>
                </SettingRow>

                <SettingRow label="Accent Color">
                  <div
                    aria-label="Accent color picker"
                    role="radiogroup"
                    className="flex flex-wrap gap-3"
                  >
                    {ACCENT_OPTIONS.map((c) => (
                      <button
                        key={c}
                        aria-label={`select-accent-${c}`}
                        role="radio"
                        aria-checked={accent === c}
                        onClick={() => setAccent(c)}
                        className={`h-8 w-8 rounded-full border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-kali-control/70 ${accent === c
                          ? "border-kali-control shadow-[0_0_0_3px_rgba(var(--kali-control-rgb),0.35)] scale-110"
                          : "border-transparent hover:scale-110 hover:shadow-lg"
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
                  <div className="flex rounded-lg bg-[var(--kali-panel-border)]/30 p-1">
                    {['regular', 'compact'].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setDensity(opt as any)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${density === opt
                          ? "bg-[var(--kali-control)] text-[var(--kali-bg)] shadow-sm"
                          : "text-[var(--color-text)]/70 hover:text-[var(--color-text)]"
                          }`}
                      >
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
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
                  <label className="inline-flex cursor-pointer items-center gap-3 text-sm text-[var(--color-text)]/80">
                    <input
                      type="checkbox"
                      checked={useKaliWallpaper}
                      onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-600 bg-transparent text-[var(--kali-control)] focus:ring-[var(--kali-control)]/50"
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
                    className="kali-slider flex-1 cursor-pointer"
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

              <Section title="Gallery">
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
                      className={`group relative flex h-24 w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 transition-all duration-200 focus-visible:scale-[1.02] focus-visible:border-kali-control ${name === wallpaper
                        ? "border-kali-control ring-2 ring-kali-control/30 scale-[1.02]"
                        : "border-transparent opacity-70 hover:opacity-100 hover:scale-[1.02]"
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

              <Section title="Desktop Actions">
                <SettingRow
                  label="Reset Preferences"
                  helperText="Restore the default wallpaper, theme, and layout preferences."
                  align="end"
                >
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 shadow-sm transition-all hover:bg-red-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  >
                    Reset Desktop
                  </button>
                </SettingRow>
              </Section>
            </div>
          )}

          {activeTab === "accessibility" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Section
                title="Display"
                description="Tune how icons and motion behave across the desktop."
              >
                <SettingRow label="Icon Size" labelFor="font-scale">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-xs text-[var(--color-text)]/50">Small</span>
                    <input
                      id="font-scale"
                      type="range"
                      min="0.75"
                      max="1.5"
                      step="0.05"
                      value={fontScale}
                      onChange={(e) => setFontScale(parseFloat(e.target.value))}
                      className="kali-slider flex-1 cursor-pointer"
                      aria-label="Icon size"
                    />
                    <span className="text-xs text-[var(--color-text)]/50">Large</span>
                  </div>
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
              >
                <SettingRow
                  label="Keymap Overlay"
                  helperText="Quickly open the overlay to remap or review shortcuts."
                  align="end"
                >
                  <button
                    onClick={() => setShowKeymap(true)}
                    className="rounded-lg bg-[var(--kali-control)] px-4 py-2 text-sm font-semibold text-[var(--kali-bg)] shadow-md transition-transform hover:scale-105 active:scale-95"
                  >
                    Edit Shortcuts
                  </button>
                </SettingRow>
              </Section>
            </div>
          )}

          {activeTab === "privacy" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              <Section title="Data Management">
                <SettingRow
                  label="Backup Settings"
                  helperText="Export a backup of your settings or import one you saved earlier."
                  align="end"
                >
                  <div className="flex flex-col gap-3 md:flex-row">
                    <button
                      onClick={handleExport}
                      className="flex items-center justify-center gap-2 rounded-lg border border-[var(--kali-panel-border)] bg-[var(--kali-panel)] px-4 py-2 text-sm font-semibold text-[var(--color-text)] transition-colors hover:bg-[var(--kali-panel-border)]"
                    >
                      Export
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center gap-2 rounded-lg bg-[var(--kali-control)] px-4 py-2 text-sm font-semibold text-[var(--kali-bg)] shadow-sm hover:opacity-90"
                    >
                      Import
                    </button>
                  </div>
                </SettingRow>
              </Section>

              <Section
                title="Connectivity"
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
            <SystemInfo />
          )}
        </div>
      </main>

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
