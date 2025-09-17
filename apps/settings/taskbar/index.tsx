"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import apps from "@/apps.config";
import {
  PINNED_APPS_UPDATED_EVENT,
  applyPinPreset,
  deletePinPreset,
  getActivePinPreset,
  getDefaultPinnedApps,
  loadPinPresets,
  loadPinnedApps,
  savePinnedApps,
  setActivePinPreset,
  upsertPinPreset,
  type PinPreset,
} from "@/src/wm/persistence";

interface AppSummary {
  id: string;
  title: string;
}

const buildAppLookup = (): Record<string, AppSummary> => {
  if (!Array.isArray(apps)) return {};
  return apps.reduce<Record<string, AppSummary>>((acc, app: any) => {
    if (!app || typeof app !== "object") return acc;
    const id = typeof app.id === "string" ? app.id : undefined;
    if (!id) return acc;
    const title = typeof app.title === "string" ? app.title : id;
    acc[id] = { id, title };
    return acc;
  }, {});
};

const APP_LOOKUP = buildAppLookup();

const formatPins = (pins: string[]): string[] =>
  pins.map((id) => APP_LOOKUP[id]?.title ?? id);

const presetSort = (a: PinPreset, b: PinPreset) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

const TaskbarPresets = () => {
  const [currentPins, setCurrentPins] = useState<string[]>([]);
  const [presets, setPresets] = useState<PinPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [activePreset, setActivePresetName] = useState<string | null>(null);

  const refreshPins = useCallback(() => {
    setCurrentPins(loadPinnedApps());
  }, []);

  const refreshPresets = useCallback(() => {
    const stored = loadPinPresets().sort(presetSort);
    setPresets(stored);
    const active = getActivePinPreset();
    setActivePresetName(active);
    if (active) {
      setSelectedPreset(active);
    } else if (stored.length > 0) {
      setSelectedPreset((prev) => prev || stored[0].name);
    } else {
      setSelectedPreset("");
    }
  }, []);

  useEffect(() => {
    refreshPins();
    refreshPresets();
    const handleUpdate = () => {
      refreshPins();
      setActivePresetName(getActivePinPreset());
    };
    window.addEventListener(PINNED_APPS_UPDATED_EVENT, handleUpdate);
    return () => {
      window.removeEventListener(PINNED_APPS_UPDATED_EVENT, handleUpdate);
    };
  }, [refreshPins, refreshPresets]);

  const handleSavePreset = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = newPresetName.trim();
    if (!trimmed) {
      setStatus("Enter a name to save a preset.");
      return;
    }
    const updated = upsertPinPreset(trimmed, currentPins).sort(presetSort);
    setPresets(updated);
    setNewPresetName("");
    setSelectedPreset(trimmed);
    setActivePresetName(trimmed);
    setStatus(`Saved pin preset “${trimmed}”.`);
  };

  const handleApplyPreset = () => {
    if (!selectedPreset) {
      setStatus("Select a preset to apply.");
      return;
    }
    const pins = applyPinPreset(selectedPreset);
    if (pins.length === 0) {
      setStatus("Preset no longer exists.");
      refreshPresets();
      refreshPins();
      return;
    }
    setCurrentPins(pins);
    setActivePresetName(selectedPreset);
    setStatus(`Applied preset “${selectedPreset}”.`);
  };

  const handleDeletePreset = () => {
    if (!selectedPreset) {
      setStatus("Select a preset to delete.");
      return;
    }
    if (!window.confirm(`Delete preset “${selectedPreset}”?`)) {
      return;
    }
    const remaining = deletePinPreset(selectedPreset).sort(presetSort);
    setPresets(remaining);
    const active = getActivePinPreset();
    setActivePresetName(active);
    if (remaining.length > 0) {
      const fallback = active ?? remaining[0].name;
      setSelectedPreset(fallback);
    } else {
      setSelectedPreset("");
    }
    setStatus(`Deleted preset “${selectedPreset}”.`);
  };

  const handleRestoreDefaults = () => {
    const defaults = getDefaultPinnedApps();
    const saved = savePinnedApps(defaults);
    setCurrentPins(saved);
    setActivePresetName(null);
    setSelectedPreset("");
    setActivePinPreset(null);
    setStatus("Restored default pin layout.");
  };

  const handleRefresh = () => {
    refreshPins();
    setStatus("Refreshed current pins.");
  };

  const formattedPins = useMemo(() => formatPins(currentPins), [currentPins]);

  return (
    <div className="flex flex-col gap-4 p-4 text-ubt-grey">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-white">Taskbar presets</h2>
        <p className="text-sm">
          Save groups of pinned apps and quickly swap between them.
        </p>
      </div>

      <div className="rounded border border-black/40 bg-black/40 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Current pins</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              className="rounded bg-ubt-grey/20 px-3 py-1 text-sm text-white hover:bg-ubt-grey/30"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={handleRestoreDefaults}
              className="rounded bg-ub-orange px-3 py-1 text-sm text-white hover:bg-ub-orange/80"
            >
              Restore default
            </button>
          </div>
        </div>
        {formattedPins.length > 0 ? (
          <ul className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {formattedPins.map((title) => (
              <li
                key={title}
                className="rounded border border-white/10 bg-black/30 px-3 py-2 text-sm text-white"
              >
                {title}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm">No apps are pinned right now.</p>
        )}
        {activePreset && (
          <p className="mt-3 text-xs text-ubt-grey/80">
            Active preset: <span className="text-white">{activePreset}</span>
          </p>
        )}
      </div>

      <form
        onSubmit={handleSavePreset}
        className="flex flex-col gap-2 rounded border border-black/40 bg-black/30 p-4 md:flex-row md:items-end"
      >
        <label className="flex w-full flex-col text-sm font-medium text-white md:w-1/2">
          Preset name
          <input
            type="text"
            value={newPresetName}
            onChange={(event) => setNewPresetName(event.target.value)}
            className="mt-1 rounded border border-white/20 bg-black/40 px-3 py-2 text-base text-white focus:border-ub-orange focus:outline-none"
            placeholder="Work profile"
            aria-label="Preset name"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white hover:bg-ub-orange/80"
          >
            Save preset
          </button>
        </div>
      </form>

      <div className="rounded border border-black/40 bg-black/30 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <label className="flex w-full flex-col text-sm font-medium text-white md:w-1/2">
            Choose a saved preset
            <select
              value={selectedPreset}
              onChange={(event) => setSelectedPreset(event.target.value)}
              className="mt-1 rounded border border-white/20 bg-black/40 px-3 py-2 text-base text-white focus:border-ub-orange focus:outline-none"
              aria-label="Saved pin presets"
            >
              <option value="">Select a preset…</option>
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleApplyPreset}
              className="rounded bg-ub-orange px-4 py-2 text-sm font-semibold text-white hover:bg-ub-orange/80 disabled:cursor-not-allowed disabled:bg-white/20"
              disabled={!selectedPreset}
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleDeletePreset}
              className="rounded bg-red-600/80 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-white/20"
              disabled={!selectedPreset}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {status && (
        <div role="status" className="rounded border border-ub-orange bg-ub-orange/10 p-3 text-sm text-white">
          {status}
        </div>
      )}

      <p className="text-xs text-ubt-grey/70">
        Tips: Adjust pins from the desktop by right-clicking apps in the
        dock or app grid. Come back here to save the current layout as a
        reusable preset.
      </p>
    </div>
  );
};

export default TaskbarPresets;
