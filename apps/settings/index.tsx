"use client";

import { useState, useRef, useEffect } from "react";
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
import BackupMerge from "../../components/common/BackupMerge";
import {
  mergeSnapshots,
  appendAuditEntries,
  loadAuditLog,
  MergeDecisionMap,
  MergeAuditEntry,
  BackupBuckets,
} from "../../utils/backupMerge";
import { getLocalBackupBuckets, applyBackupBuckets } from "../../utils/backupService";

const SUPPORTED_BUCKETS = ["settings", "progress", "keybinds", "replays"] as const;

interface PendingMergeState {
  local: BackupBuckets;
  incoming: BackupBuckets;
  fileName?: string;
}

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
    setLargeHitAreas,
    setPongSpin,
    setAllowNetwork,
    haptics,
    setHaptics,
    theme,
    setTheme,
  } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [pendingMerge, setPendingMerge] = useState<PendingMergeState | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);
  const [mergeStatus, setMergeStatus] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<MergeAuditEntry[]>([]);
  const [lastMergeSnapshot, setLastMergeSnapshot] = useState<BackupBuckets | null>(null);

  useEffect(() => {
    setAuditLog(loadAuditLog());
  }, []);

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

  const applySettingsToContext = (data: Record<string, unknown>) => {
    if (!data) return;
    if (typeof data.accent === "string") setAccent(data.accent);
    if (typeof data.wallpaper === "string") setWallpaper(data.wallpaper);
    if (typeof data.useKaliWallpaper === "boolean")
      setUseKaliWallpaper(data.useKaliWallpaper);
    if (data.density === "regular" || data.density === "compact")
      setDensity(data.density);
    if (typeof data.reducedMotion === "boolean") setReducedMotion(data.reducedMotion);
    if (typeof data.fontScale === "number") setFontScale(data.fontScale);
    if (typeof data.highContrast === "boolean") setHighContrast(data.highContrast);
    if (typeof data.largeHitAreas === "boolean") setLargeHitAreas(data.largeHitAreas);
    if (typeof data.pongSpin === "boolean") setPongSpin(data.pongSpin);
    if (typeof data.allowNetwork === "boolean") setAllowNetwork(data.allowNetwork);
    if (typeof data.haptics === "boolean") setHaptics(data.haptics);
    if (typeof data.theme === "string") setTheme(data.theme);
  };

  const parseBackupPayload = (text: string): BackupBuckets | null => {
    try {
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") return null;
      const source =
        "buckets" in parsed && parsed.buckets && typeof parsed.buckets === "object"
          ? (parsed.buckets as Record<string, unknown>)
          : (parsed as Record<string, unknown>);
      const result: BackupBuckets = {};
      for (const bucket of SUPPORTED_BUCKETS) {
        if (bucket in source) {
          result[bucket] = source[bucket];
        }
      }
      return Object.keys(result).length > 0 ? result : null;
    } catch {
      return null;
    }
  };

  const handleBackupFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseBackupPayload(text);
    if (!parsed) {
      setMergeError("Backup file is invalid or contains no supported buckets.");
      setPendingMerge(null);
      return;
    }
    const localSnapshot = await getLocalBackupBuckets();
    setPendingMerge({ local: localSnapshot, incoming: parsed, fileName: file.name });
    setMergeError(null);
    setMergeStatus(null);
  };

  const handleMergeSubmit = async (decisions: MergeDecisionMap) => {
    if (!pendingMerge) return;
    const { merged, auditEntries } = mergeSnapshots(
      pendingMerge.local,
      pendingMerge.incoming,
      decisions,
    );
    await applyBackupBuckets(merged);
    if (merged.settings && typeof merged.settings === "object") {
      applySettingsToContext(merged.settings as Record<string, unknown>);
    }
    const updatedLog = appendAuditEntries(auditEntries);
    setAuditLog(updatedLog);
    setLastMergeSnapshot(pendingMerge.local);
    setPendingMerge(null);
    setMergeError(null);
    setMergeStatus("Merge applied successfully.");
  };

  const handleMergeCancel = () => {
    setPendingMerge(null);
  };

  const handleUndoMerge = async () => {
    if (!lastMergeSnapshot) return;
    await applyBackupBuckets(lastMergeSnapshot);
    if (lastMergeSnapshot.settings && typeof lastMergeSnapshot.settings === "object") {
      applySettingsToContext(lastMergeSnapshot.settings as Record<string, unknown>);
    }
    setLastMergeSnapshot(null);
    setMergeStatus("Last merge undone.");
  };

  const formatDecision = (entry: MergeAuditEntry) =>
    entry.decision === "incoming" ? "Used backup" : "Kept local";

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
              <label className="mr-2 text-ubt-grey flex items-center">
                <input
                  type="checkbox"
                  checked={useKaliWallpaper}
                  onChange={(e) => setUseKaliWallpaper(e.target.checked)}
                  className="mr-2"
                  aria-label="Use Kali gradient wallpaper"
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
          <div className="flex flex-wrap justify-center gap-3 my-4">
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
          <div className="mx-auto w-full max-w-3xl px-4">
            <div className="rounded border border-gray-900 bg-gray-800/40 p-4 shadow-inner">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-ubt-grey">Backup merge</h3>
                  <p className="text-sm text-ubt-grey/70">
                    Load a backup snapshot and decide how each data bucket should be resolved.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => backupInputRef.current?.click()}
                    className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500"
                  >
                    Load backup
                  </button>
                  <button
                    onClick={handleUndoMerge}
                    disabled={!lastMergeSnapshot}
                    className={`px-3 py-1 rounded border text-sm ${lastMergeSnapshot ? 'border-gray-600 text-ubt-grey hover:bg-gray-800' : 'border-gray-800 text-gray-500 cursor-not-allowed'}`}
                  >
                    Undo last merge
                  </button>
                  {mergeStatus && (
                    <span className="text-xs text-green-300">{mergeStatus}</span>
                  )}
                </div>
              </div>
              {mergeError && (
                <p className="mt-3 text-sm text-red-400">{mergeError}</p>
              )}
              {pendingMerge && (
                <div className="mt-4 space-y-3">
                  <p className="text-xs text-ubt-grey/70">
                    {pendingMerge.fileName
                      ? `Loaded "${pendingMerge.fileName}".`
                      : 'Loaded backup data.'}
                    {" "}
                    Choose how to resolve each bucket below.
                  </p>
                  <BackupMerge
                    localBuckets={pendingMerge.local}
                    incomingBuckets={pendingMerge.incoming}
                    onSubmit={handleMergeSubmit}
                    onCancel={handleMergeCancel}
                  />
                </div>
              )}
              <input
                type="file"
                accept="application/json"
                ref={backupInputRef}
                aria-label="Load backup file"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) await handleBackupFile(file);
                  e.target.value = "";
                }}
              />
              <div className="mt-6 border-t border-gray-900 pt-3">
                <h4 className="text-sm font-semibold text-ubt-grey">Recent merge activity</h4>
                {auditLog.length === 0 ? (
                  <p className="mt-2 text-xs text-ubt-grey/70">No merges recorded yet.</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-xs text-ubt-grey/80">
                    {auditLog
                      .slice(-5)
                      .reverse()
                      .map((entry) => (
                        <li
                          key={entry.id}
                          className="flex flex-col gap-1 rounded border border-gray-900/60 bg-gray-900/40 p-2 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <span>
                            <span className="font-semibold text-ubt-grey">{entry.bucket}</span>
                            {" "}· {formatDecision(entry)} ·{' '}
                            {entry.changedKeys.join(', ')}
                          </span>
                          <time className="text-ubt-grey/60">
                            {new Date(entry.timestamp).toLocaleString()}
                          </time>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
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
