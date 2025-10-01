"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import { usePerformanceBudgets } from "../../hooks/usePerformanceBudgets";
import { GLOBAL_APP_ID } from "../../utils/performanceBudgets";

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
  const {
    budgets: performanceBudgets,
    metadata: budgetMetadata,
    getBudget,
    setBudget,
    resetBudget,
    defaultBudget,
    overrides,
    clearOverrides,
  } = usePerformanceBudgets();

  const tabs = [
    { id: "appearance", label: "Appearance" },
    { id: "accessibility", label: "Accessibility" },
    { id: "privacy", label: "Privacy" },
    { id: "performance", label: "Performance" },
  ] as const;
  type TabId = (typeof tabs)[number]["id"];
  const [activeTab, setActiveTab] = useState<TabId>("appearance");
  const [selectedAppId, setSelectedAppId] = useState<string>(GLOBAL_APP_ID);
  const [budgetDraft, setBudgetDraft] = useState({
    rows: "",
    mb: "",
    duration: "",
  });
  const [budgetDirty, setBudgetDirty] = useState(false);

  const appOptions = useMemo(() => {
    const entries = Object.entries(budgetMetadata).map(([id, value]) => ({
      id,
      title: value?.title ?? id,
    }));
    return entries.sort((a, b) => {
      if (a.id === GLOBAL_APP_ID) return -1;
      if (b.id === GLOBAL_APP_ID) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [budgetMetadata]);

  const selectedMetadata = budgetMetadata[selectedAppId];
  const selectedTitle = selectedMetadata?.title ?? selectedAppId;
  const customBudget = performanceBudgets[selectedAppId];
  const effectiveBudget = getBudget(selectedAppId);
  const usingDefaultBudget = !customBudget;

  const formatBudgetDraft = useCallback(
    (budget: typeof effectiveBudget) => ({
      rows:
        budget.rows != null && !Number.isNaN(budget.rows)
          ? Math.round(budget.rows).toString()
          : "",
      mb:
        budget.mb != null && !Number.isNaN(budget.mb)
          ? Number(budget.mb.toFixed(2)).toString()
          : "",
      duration:
        budget.duration != null && !Number.isNaN(budget.duration)
          ? Math.round(budget.duration).toString()
          : "",
    }),
    [],
  );

  useEffect(() => {
    if (budgetDirty) return;
    setBudgetDraft(formatBudgetDraft(effectiveBudget));
  }, [effectiveBudget, selectedAppId, budgetDirty, formatBudgetDraft]);

  const handleSelectApp = (value: string) => {
    if (budgetDirty) {
      const confirmed = window.confirm(
        "Discard unsaved performance budget changes?",
      );
      if (!confirmed) return;
    }
    setSelectedAppId(value);
    setBudgetDirty(false);
  };

  const updateDraft = (field: "rows" | "mb" | "duration", value: string) => {
    setBudgetDraft((prev) => ({ ...prev, [field]: value }));
    setBudgetDirty(true);
  };

  const parseDraftValue = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed <= 0) return null;
    return parsed;
  };

  const handleSaveBudget = () => {
    setBudget(selectedAppId, {
      rows: parseDraftValue(budgetDraft.rows),
      mb: parseDraftValue(budgetDraft.mb),
      duration: parseDraftValue(budgetDraft.duration),
    });
    setBudgetDirty(false);
  };

  const handleResetBudget = () => {
    resetBudget(selectedAppId);
    setBudgetDirty(false);
  };

  const formatMetric = (
    metric: { metric: string; value: number; budget?: number },
  ): string => {
    const suffix =
      metric.metric === "mb"
        ? " MB"
        : metric.metric === "duration"
        ? " ms"
        : " rows";
    const formatter = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: metric.metric === "mb" ? 2 : 0,
    });
    const valueText = formatter.format(metric.value) + suffix;
    const budgetText =
      metric.budget != null
        ? formatter.format(metric.budget) + suffix
        : "—";
    return `${metric.metric.toUpperCase()}: ${valueText} (budget ${budgetText})`;
  };

  const describeLimit = (
    value: number | null | undefined,
    metric: "rows" | "mb" | "duration",
  ) => {
    if (value == null) return "Default";
    const formatter = new Intl.NumberFormat(undefined, {
      maximumFractionDigits: metric === "mb" ? 2 : 0,
    });
    const suffix = metric === "mb" ? "MB" : metric === "duration" ? "ms" : "rows";
    return `${formatter.format(value)} ${suffix}`;
  };

  const filteredOverrides = useMemo(() => {
    const entries = selectedAppId === GLOBAL_APP_ID
      ? overrides
      : overrides.filter((entry) => entry.appId === selectedAppId);
    return entries.slice(0, 20);
  }, [overrides, selectedAppId]);

  const appSelectId = "performance-app-select";
  const rowsInputId = "performance-rows-limit";
  const mbInputId = "performance-mb-limit";
  const durationInputId = "performance-duration-limit";

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
      <div className="flex justify-center border-b border-gray-900">
        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />
      </div>
      {activeTab === "appearance" && (
        <>
          <div className="md:w-2/5 w-2/3 h-1/3 m-auto my-4 relative overflow-hidden rounded-lg shadow-inner">
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
            <label
              className="mr-2 text-ubt-grey flex items-center"
              htmlFor="kali-wallpaper-toggle"
            >
              <input
                id="kali-wallpaper-toggle"
                type="checkbox"
                checked={useKaliWallpaper}
                onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                className="mr-2"
                aria-label="Enable Kali gradient wallpaper"
              />
              Kali Gradient Wallpaper
            </label>
          </div>
          {useKaliWallpaper && (
            <p className="text-center text-xs text-ubt-grey/70 px-6 -mt-2 mb-4">
              Your previous wallpaper selection is preserved for when you turn this off.
            </p>
          )}
          <div className="flex justify-center my-4">
            <label htmlFor="wallpaper-slider" className="mr-2 text-ubt-grey">Wallpaper:</label>
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
      {activeTab === "performance" && (
        <div className="px-4 py-6 space-y-6 text-ubt-grey">
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <label className="font-semibold md:w-48" htmlFor={appSelectId}>
              Application
            </label>
            <select
              id={appSelectId}
              value={selectedAppId}
              onChange={(e) => handleSelectApp(e.target.value)}
              className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-gray-800 focus:outline-none focus:ring-2 focus:ring-ub-orange"
            >
              {appOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-4">
            <div className="text-xs text-ubt-grey/70">
              {usingDefaultBudget
                ? `Using default limits (${describeLimit(defaultBudget.rows, "rows")}, ${describeLimit(defaultBudget.mb, "mb")}, ${describeLimit(defaultBudget.duration, "duration")}).`
                : "Custom limits are active for this application."}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm" htmlFor={rowsInputId}>
                  Row limit
                </label>
                <input
                  id={rowsInputId}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={budgetDraft.rows}
                  onChange={(e) => updateDraft("rows", e.target.value)}
                  placeholder={describeLimit(defaultBudget.rows, "rows")}
                  className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-gray-800 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                  aria-label="Row limit"
                />
                <span className="text-xs text-ubt-grey/60">
                  Effective limit: {describeLimit(effectiveBudget.rows, "rows")}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm" htmlFor={mbInputId}>
                  Network budget (MB)
                </label>
                <input
                  id={mbInputId}
                  type="number"
                  min="0"
                  step="0.1"
                  value={budgetDraft.mb}
                  onChange={(e) => updateDraft("mb", e.target.value)}
                  placeholder={describeLimit(defaultBudget.mb, "mb")}
                  className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-gray-800 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                  aria-label="Network budget in megabytes"
                />
                <span className="text-xs text-ubt-grey/60">
                  Effective limit: {describeLimit(effectiveBudget.mb, "mb")}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <label className="font-semibold text-sm" htmlFor={durationInputId}>
                  Duration budget (ms)
                </label>
                <input
                  id={durationInputId}
                  type="number"
                  min="0"
                  value={budgetDraft.duration}
                  onChange={(e) => updateDraft("duration", e.target.value)}
                  placeholder={describeLimit(defaultBudget.duration, "duration")}
                  className="bg-ub-cool-grey text-ubt-grey px-3 py-2 rounded border border-gray-800 focus:outline-none focus:ring-2 focus:ring-ub-orange"
                  aria-label="Duration budget in milliseconds"
                />
                <span className="text-xs text-ubt-grey/60">
                  Effective limit: {describeLimit(effectiveBudget.duration, "duration")}
                </span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleResetBudget}
                className="px-4 py-2 rounded border border-gray-700 bg-transparent text-ubt-grey hover:border-ub-orange"
                disabled={usingDefaultBudget && !budgetDirty}
              >
                Reset to defaults
              </button>
              <button
                onClick={handleSaveBudget}
                className="px-4 py-2 rounded bg-ub-orange text-white disabled:opacity-50"
                disabled={!budgetDirty}
              >
                Save changes
              </button>
            </div>
            <p className="text-xs text-ubt-grey/70">
              Leave fields blank to fall back to the shared default budget.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm">Recent overrides</h3>
              <button
                onClick={clearOverrides}
                className="px-3 py-1 rounded border border-gray-700 text-xs text-ubt-grey hover:border-ub-orange"
                disabled={overrides.length === 0}
              >
                Clear log
              </button>
            </div>
            {filteredOverrides.length === 0 ? (
              <p className="text-xs text-ubt-grey/70">
                No overrides recorded for {selectedTitle} yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {filteredOverrides.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded border border-gray-800 bg-black/25 p-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-ubt-grey/60">
                      <span className="font-semibold text-ubt-grey">
                        {budgetMetadata[entry.appId]?.title ?? entry.appId}
                      </span>
                      <span>· {new Date(entry.timestamp).toLocaleString()}</span>
                      <span>
                        · {entry.decision === "allowed" ? "Allowed" : "Blocked"}
                      </span>
                      {entry.type && <span>· {entry.type}</span>}
                    </div>
                    <ul className="mt-2 space-y-1 text-ubt-grey">
                      {entry.metrics.map((metric) => (
                        <li key={`${entry.id}-${metric.metric}`}>
                          {formatMetric(metric)}
                        </li>
                      ))}
                    </ul>
                    {entry.estimatedImpact && (
                      <p className="mt-2 text-ubt-grey/70">
                        {entry.estimatedImpact}
                      </p>
                    )}
                    {entry.description && (
                      <p className="mt-1 text-ubt-grey/60 italic">
                        {entry.description}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
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
  );
}
