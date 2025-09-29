"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gamepad, {
  GAMEPAD_PRESETS,
  loadCalibration,
  saveCalibration,
  type AxisRange,
  type ButtonBinding,
  type GamepadActionMap,
  type GamepadActionState,
  type AxisBinding,
  type AxisToButtonBinding,
  type ButtonEvent,
  type AxisEvent,
} from "../../../utils/gamepad";

interface GameRegistryEntry {
  id: string;
  label: string;
}

const DEADZONE_DEFAULT = 0.25;

function formatButtonBinding(binding: ButtonBinding | undefined): string {
  if (!binding) return "Unassigned";
  const normalize = (value: ButtonBinding): string => {
    if (typeof value === "number") return `Button ${value}`;
    if (Array.isArray(value)) return value.map(normalize).join(", ");
    if ("index" in value) return `Button ${value.index}`;
    if ("axis" in value) {
      const dir = value.direction === "positive" ? "+" : "-";
      return `Axis ${value.axis} ${dir}`;
    }
    return "Custom";
  };
  return normalize(binding);
}

function formatAxisBinding(binding: AxisBinding | undefined): string {
  if (!binding) return "Unassigned";
  const invert = binding.invert ? " (invert)" : "";
  return `Axis ${binding.index}${invert}`;
}

function cloneMap(map: GamepadActionMap | undefined): GamepadActionMap | null {
  if (!map) return null;
  return {
    buttons: map.buttons ? { ...map.buttons } : undefined,
    axes: map.axes ? { ...map.axes } : undefined,
  };
}

function ensureAxisArray(length: number, source?: AxisRange[]): AxisRange[] {
  const base = source ? source.map((r) => ({ ...r })) : [];
  while (base.length < length) {
    base.push({ min: -1, max: 1 });
  }
  return base;
}

const GamepadConfigurator = () => {
  const [games, setGames] = useState<GameRegistryEntry[]>(() => gamepad.listActionMaps());
  const [selectedGame, setSelectedGame] = useState<string>(
    () => gamepad.listActionMaps()[0]?.id ?? "",
  );
  const [map, setMap] = useState<GamepadActionMap | null>(() => cloneMap(gamepad.getActionMap(selectedGame)));
  const [snapshot, setSnapshot] = useState<GamepadActionState | null>(null);
  const [listening, setListening] = useState<string | null>(null);
  const [vendor, setVendor] = useState<string>("");
  const [ranges, setRanges] = useState<AxisRange[]>([]);
  const padIdRef = useRef<string | null>(null);

  useEffect(() => {
    const updateGames = () => {
      setGames(gamepad.listActionMaps());
    };
    const listener = () => updateGames();
    updateGames();
    gamepad.on("mapchange", listener);
    return () => {
      gamepad.off("mapchange", listener);
    };
  }, []);

  useEffect(() => {
    const current = gamepad.getActionMap(selectedGame);
    setMap(cloneMap(current));
    const unsubscribe = selectedGame
      ? gamepad.subscribeToActions(selectedGame, (state) => {
          setSnapshot(state);
          const padId = state.raw?.id ?? null;
          if (padId && padId !== padIdRef.current) {
            padIdRef.current = padId;
            const calibration = loadCalibration(padId);
            if (calibration) {
              setVendor(calibration.vendor ?? "");
              setRanges(ensureAxisArray(state.raw?.axes.length ?? calibration.axes.length, calibration.axes));
            } else if (state.raw) {
              setVendor(padId.split("(")[0]?.trim() ?? "");
              setRanges(ensureAxisArray(state.raw.axes.length));
            }
          }
        })
      : () => {};
    return () => {
      unsubscribe();
    };
  }, [selectedGame]);

  const actions = useMemo(() => {
    if (!map) return [] as Array<["buttons" | "axes", string]>;
    const entries: Array<["buttons" | "axes", string]> = [];
    if (map.buttons) {
      Object.keys(map.buttons).forEach((key) => entries.push(["buttons", key]));
    }
    if (map.axes) {
      Object.keys(map.axes).forEach((key) => entries.push(["axes", key]));
    }
    return entries;
  }, [map]);

  useEffect(() => {
    if (!listening || !map) return;
    const isAxisAction = Boolean(map.axes?.[listening]);
    const handleButton = (event: ButtonEvent) => {
      if (!event.pressed) return;
      const next = cloneMap(map) ?? { buttons: {}, axes: {} };
      const nextButtons = { ...(next.buttons ?? {}) };
      nextButtons[listening] = event.index;
      const updated: GamepadActionMap = {
        buttons: nextButtons,
        axes: next.axes,
      };
      setMap(updated);
      gamepad.updateActionMap(selectedGame, updated);
      setListening(null);
    };
    const handleAxis = (event: AxisEvent) => {
      const next = cloneMap(map) ?? { buttons: {}, axes: {} };
      if (isAxisAction) {
        const existing = map.axes?.[listening] as AxisBinding | undefined;
        const binding: AxisBinding = {
          index: event.index,
          deadzone: existing?.deadzone ?? DEADZONE_DEFAULT,
          invert: existing?.invert ?? false,
          scale: existing?.scale,
        };
        const nextAxes = { ...(next.axes ?? {}) };
        nextAxes[listening] = binding;
        const updated: GamepadActionMap = {
          buttons: next.buttons,
          axes: nextAxes,
        };
        setMap(updated);
        gamepad.updateActionMap(selectedGame, updated);
      } else {
        const direction = event.value >= 0 ? "positive" : "negative";
        const binding: AxisToButtonBinding = {
          axis: event.index,
          direction,
          threshold: Math.abs(event.value) || 0.5,
          deadzone: DEADZONE_DEFAULT,
        };
        const nextButtons = { ...(next.buttons ?? {}) };
        nextButtons[listening] = binding;
        const updated: GamepadActionMap = {
          buttons: nextButtons,
          axes: next.axes,
        };
        setMap(updated);
        gamepad.updateActionMap(selectedGame, updated);
      }
      setListening(null);
    };
    gamepad.on("button", handleButton);
    gamepad.on("axis", handleAxis);
    return () => {
      gamepad.off("button", handleButton);
      gamepad.off("axis", handleAxis);
    };
  }, [listening, map, selectedGame]);

  const resetAction = (type: "buttons" | "axes", action: string) => {
    if (!map) return;
    const defaults = gamepad.getActionDefaults(selectedGame);
    const next = cloneMap(map) ?? { buttons: {}, axes: {} };
    if (type === "buttons") {
      const nextButtons = { ...(next.buttons ?? {}) };
      if (defaults?.buttons?.[action]) nextButtons[action] = defaults.buttons[action];
      else delete nextButtons[action];
      next.buttons = nextButtons;
    } else {
      const nextAxes = { ...(next.axes ?? {}) };
      if (defaults?.axes?.[action]) nextAxes[action] = defaults.axes[action];
      else delete nextAxes[action];
      next.axes = nextAxes;
    }
    setMap(next);
    gamepad.updateActionMap(selectedGame, next);
  };

  const applyPreset = (name: string) => {
    const preset = GAMEPAD_PRESETS[name];
    if (!preset || !padIdRef.current) return;
    setRanges(ensureAxisArray(preset.axes.length, preset.axes));
    setVendor(preset.vendor ?? name);
  };

  const captureCurrentAxes = () => {
    if (!snapshot?.raw) return;
    setRanges((prev) => {
      const base = ensureAxisArray(snapshot.raw!.axes.length, prev);
      snapshot.raw!.axes.forEach((value, index) => {
        base[index] = {
          min: Math.min(base[index].min, value),
          max: Math.max(base[index].max, value),
        };
      });
      return base;
    });
  };

  const saveCurrentCalibration = () => {
    if (!padIdRef.current) return;
    const data = { axes: ranges, vendor: vendor || undefined };
    saveCalibration(padIdRef.current, data);
  };

  const hasGames = games.length > 0;

  return (
    <div className="space-y-6 p-4">
      <div>
        <h2 className="text-lg font-semibold">Gamepad bindings</h2>
        {!hasGames && <p className="text-sm text-ubt-grey/70">Launch a game to register its bindings.</p>}
        {hasGames && (
          <div className="mt-2 flex flex-wrap gap-3 items-center">
            <label className="text-sm text-ubt-grey" htmlFor="gamepad-game-select">
              Game
            </label>
            <select
              id="gamepad-game-select"
              value={selectedGame}
              onChange={(e) => setSelectedGame(e.target.value)}
              className="bg-ub-cool-grey border border-ubt-cool-grey rounded px-2 py-1 text-sm"
            >
              {games.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="px-3 py-1 text-sm rounded bg-ub-orange text-white"
              onClick={() => gamepad.resetActionMap(selectedGame)}
            >
              Reset All
            </button>
          </div>
        )}
      </div>

      {map && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm uppercase text-ubt-grey">Actions</h3>
          <div className="space-y-2">
            {actions.map(([type, action]) => (
              <div
                key={`${type}-${action}`}
                className="flex items-center justify-between gap-4 rounded border border-ubt-cool-grey/60 bg-ub-cool-grey/40 px-3 py-2"
              >
                <div>
                  <div className="text-sm font-medium capitalize">{action}</div>
                  <div className="text-xs text-ubt-grey/70">
                    {type === "buttons"
                      ? formatButtonBinding(map.buttons?.[action])
                      : formatAxisBinding(map.axes?.[action])}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setListening(action)}
                    className="text-xs px-3 py-1 rounded border border-ubt-cool-grey text-ubt-grey"
                  >
                    {listening === action ? "Listening..." : "Remap"}
                  </button>
                  <button
                    type="button"
                    onClick={() => resetAction(type, action)}
                    className="text-xs px-3 py-1 rounded border border-ubt-cool-grey text-ubt-grey"
                  >
                    Default
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="font-medium text-sm uppercase text-ubt-grey">Calibration</h3>
        {!snapshot?.raw && <p className="text-sm text-ubt-grey/70">Connect a controller to adjust calibration.</p>}
        {snapshot?.raw && (
          <div className="space-y-3">
            <div className="text-sm">Active controller: {snapshot.raw.id}</div>
            <div className="flex flex-wrap gap-3 items-center text-sm">
              <label className="text-sm" htmlFor="gamepad-vendor">
                Vendor
              </label>
              <input
                id="gamepad-vendor"
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="bg-ub-cool-grey border border-ubt-cool-grey rounded px-2 py-1 text-sm"
                aria-label="Controller vendor"
              />
              <label className="flex items-center gap-2">
                Preset:
                <select
                  value=""
                  onChange={(e) => {
                    applyPreset(e.target.value);
                  }}
                  className="bg-ub-cool-grey border border-ubt-cool-grey rounded px-2 py-1 text-sm"
                  aria-label="Select calibration preset"
                >
                  <option value="">--</option>
                  {Object.keys(GAMEPAD_PRESETS).map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="px-3 py-1 text-xs rounded border border-ubt-cool-grey text-ubt-grey"
                onClick={captureCurrentAxes}
              >
                Capture extremes
              </button>
              <button
                type="button"
                className="px-3 py-1 text-xs rounded bg-ub-orange text-white"
                onClick={saveCurrentCalibration}
              >
                Save calibration
              </button>
            </div>
            <div className="space-y-2">
              {snapshot.raw.axes.map((value, index) => (
                <div key={index} className="text-xs">
                  <div className="flex justify-between">
                    <span>Axis {index}</span>
                    <span>{value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 bg-ubt-cool-grey/30 rounded">
                    <div
                      className="h-2 bg-ub-orange rounded"
                      style={{ width: `${((value + 1) / 2) * 100}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[10px] text-ubt-grey/60">
                    Range: {ranges[index]?.min.toFixed(2) ?? "-"} to {ranges[index]?.max.toFixed(2) ?? "-"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamepadConfigurator;
