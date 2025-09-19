"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
import {
  contrastRatio,
  getPreferredTextColor,
  normalizeHex,
  MIN_ACCENT_CONTRAST,
} from "../../utils/color";

const DESKTOP_BACKGROUND = "#0f1317";
const MIN_FOCUS_CONTRAST = 3;

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
  const liveRegionRef = useRef<HTMLSpanElement>(null);
  const [customAccent, setCustomAccent] = useState(accent);

  const accentStatus = useMemo<AccentStatus>(() => {
    const normalized = normalizeHex(customAccent);
    if (!normalized) {
      return {
        normalized: null,
        contrast: null,
        textColor: "#ffffff",
        passes: false,
        backgroundContrast: null,
        backgroundPass: false,
      };
    }
    const { text, contrast } = getPreferredTextColor(normalized);
    const backgroundContrast = contrastRatio(normalized, DESKTOP_BACKGROUND);
    const backgroundPass = backgroundContrast >= MIN_FOCUS_CONTRAST;
    const passes = contrast >= MIN_ACCENT_CONTRAST && backgroundPass;
    return {
      normalized,
      contrast,
      textColor: text,
      passes,
      backgroundContrast,
      backgroundPass,
    };
  }, [customAccent]);

  useEffect(() => {
    setCustomAccent(accent);
  }, [accent]);

  useEffect(() => {
    if (!liveRegionRef.current) return;
    const { normalized, contrast, backgroundContrast, textColor, backgroundPass } = accentStatus;
    if (!normalized || contrast === null || backgroundContrast === null) {
      liveRegionRef.current.textContent = 'Select an accent color to preview contrast';
      return;
    }
    const textStatus = contrast >= MIN_ACCENT_CONTRAST ? 'passes' : 'fails';
    const focusStatus = backgroundPass ? 'passes' : 'fails';
    const textLabel = textColor === '#000000' ? 'black' : 'white';
    liveRegionRef.current.textContent = `Text contrast ${contrast.toFixed(2)} to 1 with ${textLabel} ${textStatus}; focus contrast ${backgroundContrast.toFixed(2)} to 1 ${focusStatus}`;
  }, [accentStatus]);

  const tabs = [
    { id: "appearance", label: "Appearance" },
    { id: "accessibility", label: "Accessibility" },
    { id: "privacy", label: "Privacy" },
  ] as const;
  type TabId = (typeof tabs)[number]["id"];
  type AccentStatus = {
    normalized: string | null;
    contrast: number | null;
    textColor: "#000000" | "#ffffff";
    passes: boolean;
    backgroundContrast: number | null;
    backgroundPass: boolean;
  };
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

  const handleAccentSelect = (value: string) => {
    setCustomAccent(value);
    const normalized = normalizeHex(value);
    if (!normalized) return;
    const { contrast } = getPreferredTextColor(normalized);
    const backgroundContrast = contrastRatio(normalized, DESKTOP_BACKGROUND);
    if (contrast >= MIN_ACCENT_CONTRAST && backgroundContrast >= MIN_FOCUS_CONTRAST) {
      setAccent(normalized);
    }
  };

  const handleCustomAccentChange = (value: string) => {
    setCustomAccent(value);
    const normalized = normalizeHex(value);
    if (!normalized) return;
    const { contrast } = getPreferredTextColor(normalized);
    const backgroundContrast = contrastRatio(normalized, DESKTOP_BACKGROUND);
    if (contrast >= MIN_ACCENT_CONTRAST && backgroundContrast >= MIN_FOCUS_CONTRAST) {
      setAccent(normalized);
    }
  };

  const contrastSummary = (() => {
    if (
      !accentStatus.normalized ||
      accentStatus.contrast === null ||
      accentStatus.backgroundContrast === null
    ) {
      return "Pick a color to preview contrast. Accessible choices apply automatically.";
    }
    const textLabel = accentStatus.textColor === "#000000" ? "black" : "white";
    const textPart = `Text contrast ${accentStatus.contrast.toFixed(2)}:1 with ${textLabel} ${
      accentStatus.contrast >= MIN_ACCENT_CONTRAST
        ? `meets the ${MIN_ACCENT_CONTRAST}:1 requirement.`
        : `is below the ${MIN_ACCENT_CONTRAST}:1 requirement.`
    }`;
    const focusPart = `Focus contrast ${accentStatus.backgroundContrast.toFixed(2)}:1 ${
      accentStatus.backgroundPass
        ? `meets the ${MIN_FOCUS_CONTRAST}:1 non-text requirement.`
        : `is below the ${MIN_FOCUS_CONTRAST}:1 non-text requirement.`
    }`;
    if (accentStatus.passes) {
      return `${textPart} ${focusPart}`;
    }
    return `${textPart} ${focusPart} Choose a color that passes both checks.`;
  })();

  const contrastSummaryClass = accentStatus.normalized
    ? accentStatus.passes
      ? "text-green-400"
      : "text-red-400"
    : "text-ubt-grey";

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
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
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
          <div className="flex flex-col items-center gap-4 my-4 text-ubt-grey">
            <div className="flex flex-col items-center gap-2">
              <span id="accent-options-label">Accent palette</span>
              <div
                aria-labelledby="accent-options-label"
                role="radiogroup"
                className="flex gap-2"
              >
                {ACCENT_OPTIONS.map((c) => (
                  <button
                    key={c}
                    aria-label={`select-accent-${c.replace('#', '')}`}
                    role="radio"
                    aria-checked={accent === c}
                    onClick={() => handleAccentSelect(c)}
                    className={`h-8 w-8 rounded-full border-2 ${
                      accent === c ? "border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <label htmlFor="custom-accent" className="text-ubt-grey">
                Custom accent
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="custom-accent"
                  type="color"
                  value={customAccent}
                  onChange={(e) => handleCustomAccentChange(e.target.value)}
                  aria-describedby="accent-contrast-hint"
                  aria-invalid={accentStatus.passes ? undefined : true}
                  className={`h-10 w-16 cursor-pointer rounded border bg-ub-cool-grey ${
                    accentStatus.passes || !accentStatus.normalized
                      ? "border-ubt-cool-grey"
                      : "border-red-500"
                  }`}
                />
                <span id="accent-contrast-hint" className="text-xs text-ubt-grey">
                  Needs ≥ {MIN_ACCENT_CONTRAST}:1 contrast. Text color adjusts automatically.
                </span>
              </div>
            </div>
            <div className="w-full max-w-sm rounded bg-ub-grey p-4 text-left text-ubt-grey">
              <div className="flex items-center justify-between">
                <span>Preview</span>
                <code>{(accentStatus.normalized ?? customAccent).toUpperCase()}</code>
              </div>
              <button
                type="button"
                className="mt-3 w-full rounded px-3 py-2 text-sm transition-colors motion-reduce:transition-none"
                style={{
                  backgroundColor: accentStatus.normalized ?? customAccent,
                  color: accentStatus.textColor,
                }}
                aria-hidden="true"
              >
                Accent sample
              </button>
              <p className={`mt-3 text-xs ${contrastSummaryClass}`}>{contrastSummary}</p>
              <span ref={liveRegionRef} role="status" aria-live="polite" className="sr-only"></span>
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
              className="px-4 py-2 rounded bg-ub-orange"
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
              onClick={() => setShowKeymap(true)}
              className="px-4 py-2 rounded bg-ub-orange"
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
              className="px-4 py-2 rounded bg-ub-orange"
            >
              Export Settings
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded bg-ub-orange"
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
      <KeymapOverlay open={showKeymap} onClose={() => setShowKeymap(false)} />
    </div>
  );
}
