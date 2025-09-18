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
  ACCENT_MIN_CONTRAST,
  contrastRatio,
  getAccessibleTextColor,
  normalizeHex,
} from "../../utils/color";

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
  const [customAccent, setCustomAccent] = useState(accent);
  const [hasPendingCustom, setHasPendingCustom] = useState(false);
  const [accentMessage, setAccentMessage] = useState("");
  const [accentMessageTone, setAccentMessageTone] = useState<
    "info" | "success" | "error" | null
  >(null);

  const tabs = [
    { id: "appearance", label: "Appearance" },
    { id: "accessibility", label: "Accessibility" },
    { id: "privacy", label: "Privacy" },
  ] as const;
  type TabId = (typeof tabs)[number]["id"];
  const [activeTab, setActiveTab] = useState<TabId>("appearance");

  useEffect(() => {
    setCustomAccent(accent);
    setHasPendingCustom(false);
  }, [accent]);

  const normalizedCustom = useMemo(
    () => normalizeHex(customAccent),
    [customAccent]
  );
  const previewColor = normalizedCustom ?? accent;
  const previewText = useMemo(
    () => getAccessibleTextColor(previewColor),
    [previewColor]
  );
  const previewContrast = useMemo(
    () => contrastRatio(previewColor, previewText),
    [previewColor, previewText]
  );
  const customContrast = useMemo(() => {
    if (!normalizedCustom) return null;
    const text = getAccessibleTextColor(normalizedCustom);
    return contrastRatio(normalizedCustom, text);
  }, [normalizedCustom]);
  const meetsContrast = (customContrast ?? 0) >= ACCENT_MIN_CONTRAST;
  const canApplyCustom = Boolean(
    normalizedCustom && normalizedCustom !== accent && meetsContrast,
  );
  const accentIsCustom = !ACCENT_OPTIONS.includes(accent);
  const pendingTone = hasPendingCustom
    ? meetsContrast
      ? "info"
      : "error"
    : null;
  const computedMessageTone = accentMessage ? accentMessageTone : pendingTone;
  const accentMessageClass = computedMessageTone === "error"
    ? "text-red-400"
    : computedMessageTone === "success"
      ? "text-green-400"
      : "text-ubt-grey";
  const accentHelperMessage =
    accentMessage ||
    (hasPendingCustom
      ? meetsContrast
        ? "Press \"Use custom color\" to apply this accent."
        : `Adjust the color until it reaches ${ACCENT_MIN_CONTRAST.toFixed(1)}:1 contrast.`
      : "");

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

  const handlePaletteAccent = (value: string) => {
    const applied = setAccent(value);
    if (applied) {
      setAccentMessage(`Accent updated to ${value}`);
      setAccentMessageTone("success");
      setCustomAccent(value);
      setHasPendingCustom(false);
    } else {
      setAccentMessage(
        `Accent ${value} was skipped because it does not meet accessibility requirements.`,
      );
      setAccentMessageTone("error");
    }
  };

  const handleCustomAccentChange = (value: string) => {
    setCustomAccent(value);
    setHasPendingCustom(true);
    setAccentMessage("");
    setAccentMessageTone(null);
  };

  const applyCustomAccent = () => {
    if (!normalizedCustom) {
      setAccentMessage("Select a color to apply.");
      setAccentMessageTone("info");
      return;
    }
    if (!meetsContrast) {
      setAccentMessage(
        `Accent ${normalizedCustom} needs at least ${ACCENT_MIN_CONTRAST.toFixed(1)}:1 contrast.`,
      );
      setAccentMessageTone("error");
      return;
    }
    const applied = setAccent(normalizedCustom);
    if (applied) {
      setAccentMessage(`Accent updated to ${normalizedCustom}`);
      setAccentMessageTone("success");
      setHasPendingCustom(false);
      setCustomAccent(normalizedCustom);
    } else {
      setAccentMessage(
        `Accent ${normalizedCustom} was rejected because it does not meet accessibility requirements.`,
      );
      setAccentMessageTone("error");
    }
  };

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
      if (parsed.accent !== undefined) {
        const applied = setAccent(parsed.accent);
        if (applied) {
          setAccentMessage(`Accent imported as ${parsed.accent}`);
          setAccentMessageTone("success");
        } else {
          setCustomAccent(parsed.accent);
          setHasPendingCustom(true);
          setAccentMessage(
            `Imported accent ${parsed.accent} did not meet the ${ACCENT_MIN_CONTRAST.toFixed(1)}:1 contrast requirement and was not applied.`,
          );
          setAccentMessageTone("error");
        }
      }
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
    if (setAccent(defaults.accent)) {
      setAccentMessage("Accent reset to default.");
      setAccentMessageTone("info");
    }
    setHasPendingCustom(false);
    setCustomAccent(defaults.accent);
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
          <section className="w-full max-w-2xl px-4 mx-auto my-6">
            <div className="flex flex-col gap-4 rounded border border-gray-900 bg-ub-grey bg-opacity-70 p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="text-base font-semibold text-ubt-grey">Accent</h2>
                  <p className="text-xs text-ubt-grey">
                    Accent tokens recolor focus rings, highlights, and window chrome while your wallpaper stays untouched.
                  </p>
                </div>
                <span className="text-xs uppercase tracking-wide text-ubt-grey">
                  {accentIsCustom ? "Custom color active" : "Preset color"}
                </span>
              </div>
              <div
                aria-label="Accent color palette"
                role="radiogroup"
                className="flex flex-wrap gap-2"
              >
                {ACCENT_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`select-accent-${c}`}
                    role="radio"
                    aria-checked={accent === c}
                    onClick={() => handlePaletteAccent(c)}
                    className={`h-8 w-8 rounded-full border-2 transition-transform focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      accent === c ? "scale-110 border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3 rounded border border-gray-800 bg-black/40 p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="custom-accent" className="text-ubt-grey">
                    Custom accent
                  </label>
                  <input
                    id="custom-accent"
                    type="color"
                    value={normalizedCustom ?? accent}
                    onChange={(e) => handleCustomAccentChange(e.target.value)}
                    aria-label="Custom accent color"
                    className="h-9 w-12 cursor-pointer rounded border border-gray-700 bg-transparent p-1"
                  />
                  <span className="rounded bg-ub-dark px-2 py-1 font-mono text-xs text-ubt-grey">
                    {normalizedCustom ?? customAccent}
                  </span>
                  <button
                    type="button"
                    onClick={applyCustomAccent}
                    disabled={!canApplyCustom}
                    className={`rounded px-3 py-1 text-sm font-medium transition ${
                      canApplyCustom
                        ? "bg-ub-orange text-black hover:brightness-110 focus-visible:outline-none"
                        : "cursor-not-allowed bg-gray-700 text-gray-400 opacity-70"
                    }`}
                  >
                    Use custom color
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-4">
                  <div
                    className="rounded px-3 py-2 text-sm shadow-inner"
                    style={{ backgroundColor: previewColor, color: previewText }}
                  >
                    Preview
                  </div>
                  <p
                    className={`text-sm ${
                      normalizedCustom
                        ? meetsContrast
                          ? "text-green-400"
                          : "text-red-400"
                        : "text-ubt-grey"
                    }`}
                  >
                    {normalizedCustom
                      ? `Contrast ${previewContrast.toFixed(2)}:1 ${
                          meetsContrast
                            ? "Passes WCAG AA"
                            : `Needs ${ACCENT_MIN_CONTRAST.toFixed(1)}:1 to save`
                        }`
                      : "Pick a color to preview contrast."}
                  </p>
                </div>
                {accentHelperMessage && (
                  <p className={`text-sm ${accentMessageClass}`} role="alert">
                    {accentHelperMessage}
                  </p>
                )}
                <span aria-live="polite" className="sr-only">
                  {accentHelperMessage}
                </span>
              </div>
            </div>
          </section>
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
              onClick={() => setShowKeymap(true)}
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
      <KeymapOverlay open={showKeymap} onClose={() => setShowKeymap(false)} />
    </div>
  );
}
