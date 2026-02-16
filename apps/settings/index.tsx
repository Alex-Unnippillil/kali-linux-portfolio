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
import ToggleSwitch from "../../components/ToggleSwitch";
import KaliWallpaper from "../../components/util-components/kali-wallpaper";
import usePersistentState from "../../hooks/usePersistentState";

// Icons --------------------------------------------------------

const Icons = {
  appearance: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  ),
  accessibility: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  ),
  privacy: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  system: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  ),
  menu: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  ),
  close: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  )
};

// Components ---------------------------------------------------

type CardProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

const Card = ({ title, description, children, className }: CardProps) => (
  <div className={`group relative overflow-hidden rounded-2xl border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/40 backdrop-blur-md transition-all hover:bg-[var(--kali-panel)]/60 hover:shadow-lg ${className ?? ""}`}>
    {title && (
      <div className="px-6 py-5 border-b border-[var(--kali-panel-border)]/50">
        <h3 className="text-base font-medium text-[var(--color-text)]">{title}</h3>
        {description && <p className="mt-1 text-sm text-[var(--color-text)]/60">{description}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

type SettingRowProps = {
  label: string;
  children: ReactNode;
  description?: string;
  className?: string;
  labelFor?: string;
  labelId?: string;
  descriptionId?: string;
};

const SettingRow = ({ label, children, description, className = "", labelFor, labelId, descriptionId }: SettingRowProps) => (
  <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between py-2 ${className}`}>
    <div className="flex-1 pr-4">
      {labelFor ? (
        <label htmlFor={labelFor} id={labelId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
      ) : (
        <div id={labelId} className="text-sm font-medium text-[var(--color-text)]">{label}</div>
      )}
      {description && (
        <div id={descriptionId} className="mt-0.5 text-xs text-[var(--color-text)]/50">
          {description}
        </div>
      )}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
);

const ThemeCard = ({ active, theme, onClick }: { active: boolean, theme: string, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-200 ${active
      ? "border-[var(--kali-control)] bg-[var(--kali-control)]/10 ring-1 ring-[var(--kali-control)]"
      : "border-[var(--kali-panel-border)] hover:border-[var(--kali-control)]/50 hover:bg-[var(--kali-panel-border)]/20"
      }`}
  >
    <div className={`h-20 w-full rounded-lg shadow-sm ${theme === 'dark' ? 'bg-neutral-900 border border-neutral-800' :
      theme === 'neon' ? 'bg-black border border-fuchsia-500/50 shadow-[0_0_15px_rgba(217,70,239,0.2)]' :
        theme === 'matrix' ? 'bg-black border border-green-500/50' :
          'bg-neutral-100 border border-neutral-200'
      }`}>
      {/* Mini UI Representation */}
      <div className="p-2 space-y-1.5 opacity-60">
        <div className={`h-2 w-1/3 rounded-full ${theme === 'default' ? 'bg-neutral-300' : 'bg-white/20'}`} />
        <div className={`h-1.5 w-full rounded-full ${theme === 'default' ? 'bg-neutral-200' : 'bg-white/10'}`} />
        <div className={`h-1.5 w-2/3 rounded-full ${theme === 'default' ? 'bg-neutral-200' : 'bg-white/10'}`} />
      </div>
    </div>
    <span className="text-xs font-medium capitalize text-[var(--color-text)]">{theme}</span>
  </button>
);

// Main Component -----------------------------------------------

export default function Settings() {
  const {
    accent, setAccent,
    wallpaper, setWallpaper,
    useKaliWallpaper, setUseKaliWallpaper,
    // density, setDensity, // Unused in new UI but kept in store
    reducedMotion, setReducedMotion,
    fontScale, setFontScale,
    highContrast, setHighContrast,
    largeHitAreas, setLargeHitAreas,
    // pongSpin, setPongSpin, // Specific game setting, maybe hide
    allowNetwork, setAllowNetwork,
    haptics, setHaptics,
    theme, setTheme,
  } = useSettings();

  const [dndEnabled, setDndEnabled] = usePersistentState('cc-dnd-enabled', false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"appearance" | "accessibility" | "privacy" | "system">("appearance");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showKeymap, setShowKeymap] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulated Volume/Brightness state for "Quick Actions"
  const [volume, setVolume] = useState(75);
  const [brightness, setBrightness] = useState(100);

  const wallpapers = ["wall-1", "wall-2", "wall-3", "wall-4", "wall-5", "wall-6", "wall-7", "wall-8"];
  const wallpaperIndex = Math.max(0, wallpapers.indexOf(wallpaper));
  const changeBackground = (name: string) => setWallpaper(name);

  // Import/Export Handlers
  const handleExport = async () => {
    const data = await exportSettingsData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "settings-backup.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (file: File) => {
    const text = await file.text();
    await importSettingsData(text);
    try {
      const parsed = JSON.parse(text);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.accent !== undefined) setAccent(parsed.accent);
      if (parsed.wallpaper !== undefined) setWallpaper(parsed.wallpaper);
      if (parsed.reducedMotion !== undefined) setReducedMotion(parsed.reducedMotion);
      if (parsed.fontScale !== undefined) setFontScale(parsed.fontScale);
      if (parsed.highContrast !== undefined) setHighContrast(parsed.highContrast);
    } catch (e) { console.error("Import failed", e); }
  };

  const handleReset = async () => {
    if (!window.confirm("Reset all settings to default?")) return;
    await resetSettings();
    window.localStorage.clear();
    setAccent(defaults.accent);
    setWallpaper(defaults.wallpaper);
    setUseKaliWallpaper(defaults.useKaliWallpaper);
    setReducedMotion(defaults.reducedMotion);
    setFontScale(defaults.fontScale);
    setHighContrast(defaults.highContrast);
    setLargeHitAreas(defaults.largeHitAreas);
    setAllowNetwork(defaults.allowNetwork);
    setHaptics(defaults.haptics);
    setTheme("default");
  };

  const tabs = [
    { id: "appearance", label: "Appearance", icon: Icons.appearance },
    { id: "accessibility", label: "Accessibility", icon: Icons.accessibility },
    { id: "privacy", label: "Privacy", icon: Icons.privacy },
    { id: "system", label: "System", icon: Icons.system },
  ] as const;

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesQuery = (values: Array<string | undefined>) =>
    !normalizedQuery || values.some((value) => value?.toLowerCase().includes(normalizedQuery));

  const appearanceMatches = {
    theme: matchesQuery(["theme", "appearance", "color scheme", "dark", "neon", "matrix", "default"]),
    quickAdjustments: matchesQuery(["quick adjustments", "brightness", "volume", "audio", "sound"]),
    brightness: matchesQuery(["brightness", "display"]),
    volume: matchesQuery(["volume", "audio", "sound"]),
    accent: matchesQuery(["accent", "color", "highlight"]),
    wallpaper: matchesQuery(["wallpaper", "background", "slideshow", "gradient", "kali"]),
    gradient: matchesQuery(["kali gradient", "overlay", "wallpaper", "background"]),
    slideshow: matchesQuery(["slideshow", "wallpaper", "background"]),
  };

  const accessibilityMatches = {
    displayCard: matchesQuery(["display", "legibility", "zoom", "interface", "contrast", "motion", "hit areas"]),
    zoom: matchesQuery(["interface zoom", "scale", "zoom", "font"]),
    reducedMotion: matchesQuery(["reduced motion", "motion", "animations"]),
    highContrast: matchesQuery(["high contrast", "contrast"]),
    largeHitAreas: matchesQuery(["large hit areas", "hit areas", "touch"]),
    inputCard: matchesQuery(["input", "feedback", "haptic", "keymap", "shortcuts"]),
    haptics: matchesQuery(["haptic", "vibration", "feedback"]),
    keymap: matchesQuery(["keymap", "shortcuts", "keyboard"]),
  };

  const privacyMatches = {
    dataCard: matchesQuery(["data", "synchronization", "local storage", "privacy"]),
    allowNetwork: matchesQuery(["allow network", "network requests", "external data"]),
    backupCard: matchesQuery(["backup", "restore", "export", "import", "settings json"]),
    dangerCard: matchesQuery(["danger", "reset", "factory", "default", "clear settings"]),
  };

  const systemMatches = {
    notifications: matchesQuery(["notifications", "focus", "do not disturb", "dnd"]),
    systemInfo: matchesQuery(["system info", "version", "device", "system"]),
    hardware: matchesQuery(["hardware", "cpu", "ram", "network", "storage"]),
  };

  const appearanceHasResults = Object.values(appearanceMatches).some(Boolean);
  const accessibilityHasResults = Object.values(accessibilityMatches).some(Boolean);
  const privacyHasResults = Object.values(privacyMatches).some(Boolean);
  const systemHasResults = Object.values(systemMatches).some(Boolean);

  return (
    <div className="flex h-full w-full bg-[var(--kali-bg-solid)] text-[var(--color-text)] font-sans overflow-hidden selection:bg-[var(--kali-control)] selection:text-white">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 flex-col bg-[var(--kali-panel)]/95 backdrop-blur-xl border-r border-[var(--kali-panel-border)]
        transform transition-transform duration-300 ease-out md:relative md:translate-x-0
        ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}
      `}>
        <div className="flex items-center justify-between p-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Settings</h1>
            <p className="text-xs text-white/50 mt-1">Kali Portfolio</p>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-full p-2 hover:bg-white/10 md:hidden"
          >
            {Icons.close}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setMobileMenuOpen(false);
              }}
              className={`
                group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200
                ${activeTab === tab.id
                  ? "bg-[var(--kali-control)] text-white shadow-lg shadow-[var(--kali-control)]/20"
                  : "text-white/70 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              <div className={`${activeTab === tab.id ? "opacity-100" : "opacity-70 group-hover:opacity-100"}`}>
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <div className="rounded-xl bg-gradient-to-br from-[var(--kali-control)]/20 to-transparent p-4 border border-[var(--kali-control)]/20">
            <p className="text-xs font-medium text-[var(--kali-control)]">Tips</p>
            <p className="mt-1 text-xs text-white/70">Press <kbd className="font-mono bg-white/10 rounded px-1">Alt</kbd> + <kbd className="font-mono bg-white/10 rounded px-1">F4</kbd> to close windows quickly.</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden flex flex-col relative bg-[var(--kali-bg)]/30">

        {/* Header (Mobile Only) */}
        <div className="md:hidden flex items-center p-4 border-b border-white/10 bg-[var(--kali-panel)]/50 backdrop-blur-md">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-white/10">
            {Icons.menu}
          </button>
          <span className="ml-3 font-semibold text-lg">{tabs.find(t => t.id === activeTab)?.label}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10 scroll-smooth">
          <div className="mx-auto max-w-5xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col gap-3 rounded-2xl border border-[var(--kali-panel-border)] bg-[var(--kali-panel)]/40 px-5 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--color-text)]">Search settings</p>
                <p className="text-xs text-[var(--color-text)]/50">Filter options within {tabs.find((tab) => tab.id === activeTab)?.label}.</p>
              </div>
              <div className="w-full sm:w-72">
                <label htmlFor="settings-search" className="sr-only">Search settings</label>
                <input
                  id="settings-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  aria-label="Search settings"
                  placeholder="Type to filter"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-[var(--color-text)] placeholder:text-white/40 focus:border-[var(--kali-control)] focus:outline-none focus:ring-2 focus:ring-[var(--kali-control)]/40"
                />
              </div>
            </div>

            {normalizedQuery && (
              <>
                {activeTab === "appearance" && !appearanceHasResults && (
                  <Card title="No matches">
                    <p className="text-sm text-[var(--color-text)]/70">No appearance settings match &ldquo;{searchQuery}&rdquo;. Try a broader term.</p>
                  </Card>
                )}
                {activeTab === "accessibility" && !accessibilityHasResults && (
                  <Card title="No matches">
                    <p className="text-sm text-[var(--color-text)]/70">No accessibility settings match &ldquo;{searchQuery}&rdquo;. Try a broader term.</p>
                  </Card>
                )}
                {activeTab === "privacy" && !privacyHasResults && (
                  <Card title="No matches">
                    <p className="text-sm text-[var(--color-text)]/70">No privacy settings match &ldquo;{searchQuery}&rdquo;. Try a broader term.</p>
                  </Card>
                )}
                {activeTab === "system" && !systemHasResults && (
                  <Card title="No matches">
                    <p className="text-sm text-[var(--color-text)]/70">No system settings match &ldquo;{searchQuery}&rdquo;. Try a broader term.</p>
                  </Card>
                )}
              </>
            )}

            {activeTab === "appearance" && (
              <>
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Theme Selector */}
                  {(appearanceMatches.theme || !normalizedQuery) && (
                    <Card title="Theme" className="lg:col-span-2">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {['default', 'dark', 'neon', 'matrix'].map((t) => (
                          <ThemeCard
                            key={t}
                            theme={t}
                            active={theme === t}
                            onClick={() => setTheme(t)}
                          />
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Quick Actions (Simulated) */}
                  {(appearanceMatches.quickAdjustments || appearanceMatches.brightness || appearanceMatches.volume || !normalizedQuery) && (
                    <Card title="Quick Adjustments">
                      <div className="space-y-6">
                        {(appearanceMatches.brightness || appearanceMatches.quickAdjustments || !normalizedQuery) && (
                          <SettingRow
                            label="Brightness"
                            description="Adjust display brightness"
                            labelFor="settings-brightness"
                            descriptionId="settings-brightness-desc"
                          >
                            <input
                              id="settings-brightness"
                              type="range"
                              min="0"
                              max="100"
                              value={brightness}
                              onChange={(e) => setBrightness(Number(e.target.value))}
                              aria-describedby="settings-brightness-desc"
                              aria-label="Brightness"
                              className="w-full sm:w-32 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--kali-control)]"
                            />
                          </SettingRow>
                        )}
                        {(appearanceMatches.volume || appearanceMatches.quickAdjustments || !normalizedQuery) && (
                          <SettingRow
                            label="System Volume"
                            description="Main output volume"
                            labelFor="settings-volume"
                            descriptionId="settings-volume-desc"
                          >
                            <input
                              id="settings-volume"
                              type="range"
                              min="0"
                              max="100"
                              value={volume}
                              onChange={(e) => setVolume(Number(e.target.value))}
                              aria-describedby="settings-volume-desc"
                              aria-label="System volume"
                              className="w-full sm:w-32 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--kali-control)]"
                            />
                          </SettingRow>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Accent Color */}
                  {(appearanceMatches.accent || !normalizedQuery) && (
                    <Card title="Accent Color">
                      <div className="flex flex-wrap gap-4 justify-center py-2">
                        {ACCENT_OPTIONS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setAccent(c)}
                            className={`
                              h-10 w-10 rounded-full border-2 transition-all duration-300 transform hover:scale-110
                              ${accent === c
                                ? "border-white shadow-[0_0_0_4px_rgba(255,255,255,0.1)] scale-110"
                                : "border-transparent opacity-80 hover:opacity-100"
                              }
                            `}
                            style={{ backgroundColor: c }}
                            aria-label={`Set accent color to ${c}`}
                          />
                        ))}
                      </div>
                    </Card>
                  )}
                </section>

                {/* Wallpaper */}
                {(appearanceMatches.wallpaper || appearanceMatches.gradient || appearanceMatches.slideshow || !normalizedQuery) && (
                  <Card title="Wallpaper & Background">
                    <div className="space-y-6">
                      {(appearanceMatches.gradient || appearanceMatches.wallpaper || !normalizedQuery) && (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                          <div>
                            <span className="font-medium text-sm">Kali Gradient Overlay</span>
                            <p className="text-xs text-white/50 mt-0.5">Use the signature Kali Linux gradient background</p>
                          </div>
                          <ToggleSwitch checked={useKaliWallpaper} onChange={setUseKaliWallpaper} ariaLabel="Toggle Kali gradient overlay" />
                        </div>
                      )}

                      {!useKaliWallpaper && (appearanceMatches.wallpaper || !normalizedQuery) && (
                        <div className="space-y-4">
                          <div className="h-48 w-full rounded-xl overflow-hidden border border-white/10 shadow-2xl relative">
                            <div
                              className="absolute inset-0 bg-cover bg-center transition-all duration-500"
                              style={{ backgroundImage: `url(/wallpapers/${wallpaper}.webp)` }}
                            />
                            <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur-md p-3 rounded-lg border border-white/10 flex items-center gap-3">
                              <span className="text-xs font-mono opacity-70">Current: {wallpaper}</span>
                              <label htmlFor="settings-wallpaper-index" className="sr-only">Select wallpaper</label>
                              <input
                                id="settings-wallpaper-index"
                                type="range"
                                min="0"
                                max={wallpapers.length - 1}
                                step="1"
                                value={wallpaperIndex}
                                onChange={(e) => changeBackground(wallpapers[parseInt(e.target.value, 10)])}
                                aria-label="Select wallpaper"
                                className="flex-1 h-1 bg-white/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-2">
                            {wallpapers.map((name) => (
                              <button
                                key={name}
                                onClick={() => changeBackground(name)}
                                className={`
                                  relative aspect-video rounded-lg overflow-hidden border-2 transition-all
                                  ${name === wallpaper ? "border-[var(--kali-control)] opacity-100 ring-2 ring-[var(--kali-control)]/30" : "border-transparent opacity-60 hover:opacity-100"}
                                `}
                                aria-label={`Set wallpaper to ${name}`}
                              >
                                <img src={`/wallpapers/${name}.webp`} className="h-full w-full object-cover" alt={name} />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      {(appearanceMatches.slideshow || appearanceMatches.wallpaper || !normalizedQuery) && (
                        <div className="pt-4 border-t border-white/5">
                          <p className="mb-3 text-sm font-medium">Slideshow</p>
                          <BackgroundSlideshow />
                        </div>
                      )}
                    </div>
                  </Card>
                )}
              </>
            )}

            {activeTab === "accessibility" && (
              <div className="space-y-6">
                {(accessibilityMatches.displayCard || accessibilityMatches.zoom || accessibilityMatches.reducedMotion || accessibilityMatches.highContrast || accessibilityMatches.largeHitAreas || !normalizedQuery) && (
                  <Card title="Display & Legibility">
                    <div className="space-y-6">
                      {(accessibilityMatches.zoom || accessibilityMatches.displayCard || !normalizedQuery) && (
                        <SettingRow
                          label="Interface Zoom"
                          description="Adjust the scale of UI elements"
                          labelFor="settings-interface-zoom"
                          descriptionId="settings-interface-zoom-desc"
                        >
                          <div className="flex items-center gap-3 w-48">
                            <span className="text-xs opacity-50">A</span>
                            <input
                              id="settings-interface-zoom"
                              type="range"
                              min="0.75"
                              max="1.5"
                              step="0.05"
                              value={fontScale}
                              onChange={(e) => setFontScale(parseFloat(e.target.value))}
                              aria-describedby="settings-interface-zoom-desc"
                              aria-label="Interface zoom"
                              className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--kali-control)]"
                            />
                            <span className="text-lg opacity-80 font-bold">A</span>
                          </div>
                        </SettingRow>
                      )}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {(accessibilityMatches.reducedMotion || accessibilityMatches.displayCard || !normalizedQuery) && (
                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-sm font-medium">Reduced Motion</span>
                            <ToggleSwitch checked={reducedMotion} onChange={setReducedMotion} ariaLabel="Toggle reduced motion" />
                          </div>
                        )}
                        {(accessibilityMatches.highContrast || accessibilityMatches.displayCard || !normalizedQuery) && (
                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-sm font-medium">High Contrast</span>
                            <ToggleSwitch checked={highContrast} onChange={setHighContrast} ariaLabel="Toggle high contrast" />
                          </div>
                        )}
                        {(accessibilityMatches.largeHitAreas || accessibilityMatches.displayCard || !normalizedQuery) && (
                          <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                            <span className="text-sm font-medium">Large Hit Areas</span>
                            <ToggleSwitch checked={largeHitAreas} onChange={setLargeHitAreas} ariaLabel="Toggle large hit areas" />
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )}

                {(accessibilityMatches.inputCard || accessibilityMatches.haptics || accessibilityMatches.keymap || !normalizedQuery) && (
                  <Card title="Input & Feedback">
                    {(accessibilityMatches.haptics || accessibilityMatches.inputCard || !normalizedQuery) && (
                      <SettingRow label="Haptic Feedback" description="Vibration on supported devices">
                        <ToggleSwitch checked={haptics} onChange={setHaptics} ariaLabel="Toggle haptic feedback" />
                      </SettingRow>
                    )}
                    {(accessibilityMatches.keymap || accessibilityMatches.inputCard || !normalizedQuery) && (
                      <>
                        <div className="h-px bg-white/5 my-2" />
                        <SettingRow label="Keymap Helper" description="Show keyboard shortcuts overlay">
                          <button
                            onClick={() => setShowKeymap(true)}
                            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors border border-white/5"
                          >
                            Show Shortcuts
                          </button>
                        </SettingRow>
                      </>
                    )}
                  </Card>
                )}
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-6">
                {(privacyMatches.dataCard || privacyMatches.allowNetwork || !normalizedQuery) && (
                  <Card title="Data & Synchronization">
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[var(--kali-control)]/10 to-transparent border border-[var(--kali-control)]/20 mb-6 flex items-start gap-4">
                      <div className="p-2 bg-[var(--kali-control)]/20 rounded-full text-[var(--kali-control)]">
                        {Icons.privacy}
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm">Local Storage Only</h4>
                        <p className="text-xs opacity-70 mt-1 max-w-md">Your settings are saved directly to your browser&apos;s local storage. No data is sent to external servers unless you explicitly enable network requests.</p>
                      </div>
                    </div>

                    {(privacyMatches.allowNetwork || privacyMatches.dataCard || !normalizedQuery) && (
                      <SettingRow label="Allow Network Requests" description="Permit specific apps to fetch external data">
                        <ToggleSwitch checked={allowNetwork} onChange={setAllowNetwork} ariaLabel="Toggle network requests" />
                      </SettingRow>
                    )}
                  </Card>
                )}

                {(privacyMatches.backupCard || !normalizedQuery) && (
                  <Card title="Backup & Restore">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        onClick={handleExport}
                        className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        Export Settings JSON
                      </button>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-3 px-4 rounded-xl bg-[var(--kali-control)]/80 hover:bg-[var(--kali-control)] text-white transition-colors text-sm font-medium flex items-center justify-center gap-2 shadow-lg shadow-[var(--kali-control)]/20"
                      >
                        Import Settings JSON
                      </button>
                    </div>
                    <input
                      type="file"
                      accept="application/json"
                      ref={fileInputRef}
                      aria-label="Import settings JSON"
                      onChange={(e) => {
                        const file = e.target.files && e.target.files[0];
                        if (file) handleImport(file);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </Card>
                )}

                {(privacyMatches.dangerCard || !normalizedQuery) && (
                  <Card title="Danger Zone" description="Resetting clears saved preferences and restores defaults.">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-medium text-red-200">Reset settings</p>
                        <p className="text-xs text-white/60 mt-1 max-w-md">This will remove custom themes, accessibility tweaks, and any stored UI preferences. The change cannot be undone.</p>
                      </div>
                      <button
                        onClick={handleReset}
                        className="px-4 py-2 rounded-xl border border-red-400/40 bg-red-500/10 text-red-200 text-sm font-semibold hover:bg-red-500/20 transition-colors"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  </Card>
                )}
              </div>
            )}

            {activeTab === "system" && (
              <div className="space-y-6">
                {(systemMatches.notifications || !normalizedQuery) && (
                  <Card title="Notifications & Focus">
                    <SettingRow label="Do Not Disturb" description="Silence all notifications and badges">
                      <ToggleSwitch checked={dndEnabled} onChange={setDndEnabled} ariaLabel="Toggle do not disturb" />
                    </SettingRow>
                  </Card>
                )}
                {(systemMatches.systemInfo || !normalizedQuery) && <SystemInfo />}
                {(systemMatches.hardware || !normalizedQuery) && (
                  <Card title="Simulated Hardware">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {["CPU: 12% Util", "RAM: 4.2GB / 16GB", "Network: 1Gbps", "Storage: 45% Free"].map((stat, i) => (
                        <div key={i} className="p-3 rounded-lg bg-black/20 border border-white/5 text-center">
                          <div className="text-xs text-white/40 mb-1">{stat.split(":")[0]}</div>
                          <div className="text-sm font-mono text-[var(--kali-control)]">{stat.split(":")[1]}</div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            )}

          </div>
        </div>
      </main>

      <KeymapOverlay open={showKeymap} onClose={() => setShowKeymap(false)} />
    </div>
  );
}
