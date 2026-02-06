"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "../../components/apps/GameLayout";
import DpsCharts from "../games/tower-defense/components/DpsCharts";
import RangeUpgradeTree from "../games/tower-defense/components/RangeUpgradeTree";
import { ENEMY_TYPES, Tower } from "../games/tower-defense";
import {
  createTowerDefenseEngine,
  getUpgradeCost,
  Vec,
} from "../games/tower-defense/engine";
import { createTowerDefenseRenderer } from "../games/tower-defense/renderer";
import useGameLoop from "../../components/apps/Games/common/useGameLoop";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const buildPath = (points: Vec[]): Vec[] => {
  if (!points.length) return [];
  const cells: Vec[] = [{ ...points[0] }];
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const next = points[i];
    const dx = Math.sign(next.x - prev.x);
    const dy = Math.sign(next.y - prev.y);
    let cursor = { ...prev };
    while (cursor.x !== next.x || cursor.y !== next.y) {
      cursor = { x: cursor.x + dx, y: cursor.y + dy };
      cells.push({ ...cursor });
    }
  }
  return cells;
};

const QUICK_PLAY_PRESETS = [
  {
    id: "straight",
    name: "Straight Shot",
    summary: "Short lane with fast scouting waves.",
    pathCells: buildPath([
      { x: 0, y: 4 },
      { x: 9, y: 4 },
    ]),
    waveConfig: [
      ["fast", "fast", "fast", "tank"],
      ["fast", "tank", "fast", "fast", "tank"],
      ["tank", "tank", "fast", "fast", "fast", "tank"],
    ] as (keyof typeof ENEMY_TYPES)[][],
    spawnInterval: 0.8,
    startingGold: 35,
    startingLives: 12,
  },
  {
    id: "corner",
    name: "Corner Crawl",
    summary: "Longer path that favors patient builds.",
    pathCells: buildPath([
      { x: 0, y: 1 },
      { x: 9, y: 1 },
      { x: 9, y: 8 },
    ]),
    waveConfig: [
      ["fast", "fast", "tank"],
      ["tank", "fast", "tank", "fast", "fast"],
      ["tank", "tank", "tank"],
    ] as (keyof typeof ENEMY_TYPES)[][],
    spawnInterval: 1.1,
    startingGold: 40,
    startingLives: 14,
  },
  {
    id: "zigzag",
    name: "Zigzag Drift",
    summary: "Bends and turns with mixed pressure.",
    pathCells: buildPath([
      { x: 0, y: 2 },
      { x: 6, y: 2 },
      { x: 6, y: 6 },
      { x: 2, y: 6 },
      { x: 2, y: 9 },
      { x: 9, y: 9 },
    ]),
    waveConfig: [
      ["fast", "fast", "fast", "fast"],
      ["tank", "fast", "tank", "fast"],
      ["fast", "tank", "tank", "fast", "fast"],
    ] as (keyof typeof ENEMY_TYPES)[][],
    spawnInterval: 0.9,
    startingGold: 38,
    startingLives: 13,
  },
];

interface TowerDefenseProps {
  windowMeta?: {
    isFocused?: boolean;
  };
}

const TowerDefense = ({ windowMeta }: TowerDefenseProps = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef(createTowerDefenseRenderer());
  const engineRef = useRef(createTowerDefenseEngine({}));
  const [uiState, setUiState] = useState(engineRef.current.getUiState());

  const [selected, setSelected] = useState<number | null>(null);
  const selectedRef = useRef<number | null>(selected);
  const hoveredRef = useRef<number | null>(null);
  const cursorRef = useRef<Vec>({ x: 0, y: 0 });
  const canvasFocusedRef = useRef(false);

  const [manualPaused, setManualPaused] = useState(false);
  const [layoutPaused, setLayoutPaused] = useState(false);
  const pausedRef = useRef(false);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [waveJson, setWaveJson] = useState("");
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const presetSelectRef = useRef<HTMLSelectElement>(null);

  const uiUpdateRef = useRef(0);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    pausedRef.current = manualPaused || layoutPaused;
  }, [manualPaused, layoutPaused]);

  useEffect(() => {
    setWaveJson(JSON.stringify(uiState.waveConfig, null, 2));
  }, [uiState.waveConfig]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  const syncUiState = useCallback(() => {
    const snapshot = engineRef.current.getUiState();
    setUiState(snapshot);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2400);
  }, []);

  const applyPreset = useCallback(
    (index: number) => {
      const preset = QUICK_PLAY_PRESETS[index];
      if (!preset) return;
      const result = engineRef.current.dispatch({
        type: "apply-preset",
        pathCells: preset.pathCells,
        waveConfig: preset.waveConfig,
        spawnInterval: preset.spawnInterval,
        startingGold: preset.startingGold,
        startingLives: preset.startingLives,
        editing: false,
      });
      if (!result.ok && result.toast) showToast(result.toast);
      setManualPaused(false);
      setSelected(null);
      setSelectedPresetIndex(index);
      syncUiState();
    },
    [showToast, syncUiState],
  );

  useEffect(() => {
    applyPreset(0);
  }, [applyPreset]);

  const getCanvasCell = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(
      ((clientX - rect.left) * scaleX) / uiState.cellSize,
    );
    const y = Math.floor(
      ((clientY - rect.top) * scaleY) / uiState.cellSize,
    );
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    if (x < 0 || y < 0 || x >= uiState.gridSize || y >= uiState.gridSize) {
      return null;
    }
    return { x, y };
  };

  const handlePlacement = (cell: Vec) => {
    const result = engineRef.current.dispatch({ type: "place-tower", cell });
    if (!result.ok) {
      if (result.toast) showToast(result.toast);
      return;
    }
    syncUiState();
    setSelected(engineRef.current.getState().towers.length - 1);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const coords = getCanvasCell(e.clientX, e.clientY);
    if (!coords) return;
    cursorRef.current = coords;
    const state = engineRef.current.getState();
    if (state.editing) {
      const result = engineRef.current.dispatch({
        type: "add-path-cell",
        cell: coords,
      });
      if (!result.ok && result.toast) showToast(result.toast);
      syncUiState();
      return;
    }
    const existing = state.towers.findIndex(
      (tower) => tower.x === coords.x && tower.y === coords.y,
    );
    if (existing >= 0) {
      setSelected(existing);
      return;
    }
    handlePlacement(coords);
  };

  const handleCanvasMove = (e: React.MouseEvent) => {
    const coords = getCanvasCell(e.clientX, e.clientY);
    if (!coords) {
      hoveredRef.current = null;
      return;
    }
    const idx = engineRef.current
      .getState()
      .towers.findIndex((t) => t.x === coords.x && t.y === coords.y);
    hoveredRef.current = idx >= 0 ? idx : null;
  };

  const handleCanvasLeave = () => {
    hoveredRef.current = null;
  };

  const sellTower = (index: number) => {
    const result = engineRef.current.dispatch({ type: "sell-tower", index });
    if (!result.ok && result.toast) showToast(result.toast);
    setSelected(null);
    syncUiState();
  };

  const handleCanvasContext = (e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getCanvasCell(e.clientX, e.clientY);
    if (!coords) return;
    const idx = engineRef.current
      .getState()
      .towers.findIndex(
        (tower) => tower.x === coords.x && tower.y === coords.y,
      );
    if (idx < 0) return;
    sellTower(idx);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (e.key.startsWith("Arrow")) {
      e.preventDefault();
      const current = cursorRef.current;
      const next = { ...current };
      if (e.key === "ArrowUp")
        next.y = clamp(current.y - 1, 0, uiState.gridSize - 1);
      if (e.key === "ArrowDown")
        next.y = clamp(current.y + 1, 0, uiState.gridSize - 1);
      if (e.key === "ArrowLeft")
        next.x = clamp(current.x - 1, 0, uiState.gridSize - 1);
      if (e.key === "ArrowRight")
        next.x = clamp(current.x + 1, 0, uiState.gridSize - 1);
      cursorRef.current = next;
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const current = cursorRef.current;
      if (uiState.editing) {
        const result = engineRef.current.dispatch({
          type: "add-path-cell",
          cell: current,
        });
        if (!result.ok && result.toast) showToast(result.toast);
        syncUiState();
      } else {
        const existing = engineRef.current
          .getState()
          .towers.findIndex(
            (tower) => tower.x === current.x && tower.y === current.y,
          );
        if (existing >= 0) {
          setSelected(existing);
        } else {
          handlePlacement(current);
        }
      }
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (uiState.editing) {
        const result = engineRef.current.dispatch({ type: "undo-path-cell" });
        if (!result.ok && result.toast) showToast(result.toast);
        syncUiState();
      } else if (selectedRef.current !== null) {
        sellTower(selectedRef.current);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setSelected(null);
      return;
    }

    if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      setManualPaused((p) => !p);
    }
  };

  const addWave = () => {
    const waves = [...uiState.waveConfig, []];
    engineRef.current.dispatch({ type: "set-wave-config", waves });
    syncUiState();
  };

  const addEnemyToWave = (
    index: number,
    type: keyof typeof ENEMY_TYPES,
  ) => {
    const waves = uiState.waveConfig.map((wave) => [...wave]);
    waves[index].push(type);
    engineRef.current.dispatch({ type: "set-wave-config", waves });
    syncUiState();
  };

  const importWaves = () => {
    try {
      const data = JSON.parse(waveJson) as (keyof typeof ENEMY_TYPES)[][];
      if (Array.isArray(data)) {
        engineRef.current.dispatch({ type: "set-wave-config", waves: data });
        syncUiState();
      }
    } catch {
      showToast("Invalid wave JSON.");
    }
  };

  const exportWaves = () => {
    const json = JSON.stringify(uiState.waveConfig, null, 2);
    setWaveJson(json);
    navigator.clipboard?.writeText(json).catch(() => {});
    showToast("Wave JSON copied to clipboard.");
  };

  const resetRun = () => {
    engineRef.current.dispatch({ type: "reset-run" });
    setManualPaused(false);
    setSelected(null);
    syncUiState();
  };

  const startRun = () => {
    const { route, routeError } = engineRef.current.getState();
    if (routeError || route.length < 2) {
      showToast("Finish a valid route before launching waves.");
      return;
    }
    engineRef.current.dispatch({ type: "set-editing", editing: false });
    engineRef.current.dispatch({ type: "reset-run" });
    const result = engineRef.current.dispatch({ type: "start-run" });
    if (!result.ok && result.toast) {
      showToast(result.toast);
      engineRef.current.dispatch({ type: "set-editing", editing: true });
    }
    setManualPaused(false);
    syncUiState();
  };

  const returnToBuild = () => {
    engineRef.current.dispatch({ type: "reset-run" });
    engineRef.current.dispatch({ type: "set-editing", editing: true });
    setManualPaused(false);
    setSelected(null);
    syncUiState();
  };

  const clearRoute = () => {
    engineRef.current.dispatch({ type: "reset-run" });
    engineRef.current.dispatch({ type: "clear-path-cells" });
    engineRef.current.dispatch({ type: "set-editing", editing: true });
    setManualPaused(false);
    setSelected(null);
    syncUiState();
  };

  const clearTowers = () => {
    engineRef.current.dispatch({ type: "clear-towers" });
    setSelected(null);
    syncUiState();
  };

  const undoRoute = () => {
    const result = engineRef.current.dispatch({ type: "undo-path-cell" });
    if (!result.ok && result.toast) showToast(result.toast);
    syncUiState();
  };

  const upgrade = (type: "range" | "damage") => {
    if (selectedRef.current === null) return;
    const result = engineRef.current.dispatch({
      type: "upgrade-tower",
      index: selectedRef.current,
      upgrade: type,
    });
    if (!result.ok && result.toast) showToast(result.toast);
    syncUiState();
  };

  useGameLoop((delta) => {
    const dt = clamp(delta, 0, 0.05);
    if (!pausedRef.current) {
      engineRef.current.tick(dt);
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) {
      rendererRef.current.render(ctx, engineRef.current.getState(), {
        hoveredIndex: hoveredRef.current,
        selectedIndex: selectedRef.current,
        cursor: cursorRef.current,
        showCursor: canvasFocusedRef.current,
      });
    }

    uiUpdateRef.current += delta;
    if (uiUpdateRef.current >= 0.25) {
      uiUpdateRef.current = 0;
      syncUiState();
    }
  });

  const selectedTower = useMemo(
    () => (selected !== null ? uiState.towers[selected] : null),
    [selected, uiState.towers],
  );

  const getTowerSellValue = (tower: Tower) => {
    let total = uiState.baseTowerCost;
    for (let lvl = 1; lvl < tower.level; lvl += 1) {
      total += getUpgradeCost(lvl);
    }
    return Math.max(1, Math.floor(total * 0.6));
  };

  const modeLabel = uiState.editing
    ? "Path Editing"
    : uiState.runStatus === "running"
    ? "Defense Active"
    : uiState.runStatus === "countdown"
    ? "Wave Countdown"
    : "Planning";

  const waveStatus = uiState.runStatus === "victory"
    ? "All waves cleared"
    : uiState.runStatus === "defeat"
    ? "Base overrun"
    : uiState.countdown !== null
    ? `Next wave in ${Math.ceil(uiState.countdown)}s`
    : uiState.runStatus === "running"
    ? `${uiState.enemies.length} enemies active`
    : `${uiState.waveConfig.length} wave${
        uiState.waveConfig.length === 1 ? "" : "s"
      } queued`;

  const instructions = uiState.editing
    ? "Click or press Enter/Space to paint route cells in order. Start is first; goal is last."
    : "Place or select towers to defend the exact painted route. Right-click or Delete to sell.";

  const routeValid = uiState.route.length >= 2 && !uiState.routeError;

  const showOverlay =
    uiState.runStatus === "victory" || uiState.runStatus === "defeat";

  return (
    <GameLayout
      gameId="tower-defense"
      onPauseChange={(paused) => setLayoutPaused(paused)}
      isFocused={isFocused}
    >
      <div className="p-3 text-[color:var(--kali-text)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col items-center gap-3">
            <div className="relative w-full max-w-[420px]">
              <canvas
                ref={canvasRef}
                className="h-auto w-full rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] shadow-inner focus:outline-none focus:ring-2 focus:ring-[color:var(--color-primary)]"
                aria-label="Tower defense map canvas"
                style={{ imageRendering: "pixelated" }}
                onClick={handleCanvasClick}
                onContextMenu={handleCanvasContext}
                onMouseMove={handleCanvasMove}
                onMouseLeave={handleCanvasLeave}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  canvasFocusedRef.current = true;
                }}
                onBlur={() => {
                  canvasFocusedRef.current = false;
                }}
                tabIndex={0}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 text-[0.7rem] sm:text-xs">
                <div className="flex justify-between gap-2">
                  <div
                    className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1 font-medium uppercase tracking-wide text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur"
                    data-testid="tower-defense-wave"
                  >
                    <p className="text-[0.65rem] text-[color:var(--kali-text)] opacity-80 sm:text-xs">
                      Wave {uiState.waveNumber}
                    </p>
                    <p className="font-normal normal-case text-[color:var(--kali-text)] opacity-90">
                      {waveStatus}
                    </p>
                  </div>
                  <div className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1 text-right font-medium uppercase tracking-wide text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur">
                    <p className="text-[0.65rem] text-[color:var(--kali-text)] opacity-80 sm:text-xs">
                      Status
                    </p>
                    <p className="font-normal normal-case text-[color:var(--kali-text)] opacity-90">
                      {modeLabel}
                    </p>
                  </div>
                </div>
                <div className="flex items-end justify-between gap-2">
                  <div className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1 text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-80">
                      Lives / Gold
                    </p>
                    <p className="text-[0.65rem] text-[color:var(--kali-text)] opacity-90 sm:text-xs">
                      {uiState.lives} lives · {uiState.gold} gold
                    </p>
                  </div>
                  {selectedTower && (
                    <div className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1 text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur">
                      <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-80">
                        Tower
                      </p>
                      <p className="text-[0.65rem] text-[color:var(--kali-text)] opacity-90 sm:text-xs">
                        Range {selectedTower.range.toFixed(1)} · Damage {selectedTower.damage.toFixed(1)} · Lv {selectedTower.level}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              {toast && (
                <div
                  className="absolute left-1/2 top-3 -translate-x-1/2 rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)] shadow-kali-panel"
                  role="status"
                  aria-live="polite"
                >
                  {toast}
                </div>
              )}
              {showOverlay && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/70 p-4 text-center text-[color:var(--kali-text)]">
                  <div className="w-full max-w-sm space-y-3 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 p-4 shadow-kali-panel">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--kali-text)]">
                      {uiState.runStatus === "victory" ? "Victory" : "Game Over"}
                    </h3>
                    <p className="text-[0.7rem] text-[color:var(--kali-text)] opacity-80">
                      {uiState.runStatus === "victory"
                        ? "All waves cleared. Review your run stats below."
                        : "Lives depleted. Adjust your build or route and try again."}
                    </p>
                    <div className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/80 p-3 text-[0.65rem] text-[color:var(--kali-text)]">
                      <p>Waves cleared: {uiState.stats.wavesCleared}</p>
                      <p>Enemies defeated: {uiState.stats.enemiesDefeated}</p>
                      <p>Enemies leaked: {uiState.stats.enemiesLeaked}</p>
                      <p>
                        Time: {(uiState.stats.elapsedMs / 1000).toFixed(1)}s
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2 text-[0.7rem]">
                      <button
                        type="button"
                        className="rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 font-semibold text-black transition hover:brightness-110"
                        onClick={startRun}
                      >
                        Restart
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-semibold text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                        onClick={returnToBuild}
                      >
                        Return to Build
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-semibold text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                        onClick={() => presetSelectRef.current?.focus()}
                      >
                        Change Preset
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <p className="w-full max-w-[420px] text-center text-[0.65rem] text-[color:var(--kali-text)] opacity-80">
              {instructions}
            </p>
            {uiState.routeError && (
              <p className="w-full max-w-[420px] rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/80 px-2 py-1 text-center text-[0.65rem] text-kali-severity-high">
                {uiState.routeError}
              </p>
            )}
            <div className="flex w-full max-w-[420px] flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  engineRef.current.dispatch({
                    type: "set-editing",
                    editing: !uiState.editing,
                  });
                  syncUiState();
                }}
                disabled={uiState.runStatus === "running" || uiState.countdown !== null}
              >
                {uiState.editing ? "Finish Editing" : "Edit Route"}
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-kali-severity-high px-3 py-1 font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={startRun}
                disabled={!routeValid || uiState.runStatus === "running" || uiState.countdown !== null}
              >
                Start Waves
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={() => setManualPaused((p) => !p)}
              >
                {manualPaused || layoutPaused ? "Resume" : "Pause"}
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={resetRun}
              >
                Reset Run
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={undoRoute}
                disabled={!uiState.pathCells.length}
              >
                Undo Route
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={clearRoute}
              >
                Clear Route
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={clearTowers}
              >
                Clear Towers
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={exportWaves}
              >
                Export Waves
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={importWaves}
              >
                Import Waves
              </button>
            </div>
          </div>
          <aside className="w-full rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/90 p-3 text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur lg:max-w-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-90">
              Quick Play
            </h2>
            <p className="mt-1 text-[0.7rem] text-[color:var(--kali-text)] opacity-80">
              Pick a preset route and wave mix, then start immediately.
            </p>
            <label
              className="mt-3 block text-[0.65rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-70"
              htmlFor="preset-select"
            >
              Preset
            </label>
            <select
              id="preset-select"
              ref={presetSelectRef}
              value={QUICK_PLAY_PRESETS[selectedPresetIndex]?.id}
              onChange={(e) => {
                const index = QUICK_PLAY_PRESETS.findIndex(
                  (preset) => preset.id === e.target.value,
                );
                if (index >= 0) setSelectedPresetIndex(index);
              }}
              className="mt-2 w-full rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-2 py-2 text-xs text-[color:var(--kali-text)]"
            >
              {QUICK_PLAY_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[0.65rem] text-[color:var(--kali-text)] opacity-70">
              {QUICK_PLAY_PRESETS[selectedPresetIndex]?.summary}
            </p>
            <button
              type="button"
              className="mt-3 w-full rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-2 text-xs font-semibold uppercase tracking-wide text-black transition hover:brightness-110"
              onClick={() => applyPreset(selectedPresetIndex)}
            >
              Apply Preset
            </button>
            <h2 className="mt-5 text-sm font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-90">
              Wave Designer
            </h2>
            <p className="mt-1 text-[0.7rem] text-[color:var(--kali-text)] opacity-80">
              Queue enemy types for each wave. Empty waves advance automatically, and spawn pacing is adjustable below.
            </p>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {uiState.waveConfig.map((wave, i) => (
                <div
                  key={i}
                  className="rounded border border-[color:var(--kali-border)]/70 bg-[color:var(--kali-panel)]/70 p-2"
                >
                  <div className="flex items-center justify-between gap-2 text-[0.7rem] font-medium uppercase tracking-wide text-[color:var(--kali-text)] opacity-80">
                    <span>Wave {i + 1}</span>
                    <span className="font-normal normal-case text-[color:var(--kali-text)] opacity-70">
                      {wave.length ? wave.join(", ") : "empty"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[0.65rem]">
                    {(Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        className="rounded border border-[color:var(--kali-border)]/60 bg-[color:var(--kali-panel-highlight)] px-2 py-1 font-semibold uppercase tracking-wide text-[color:var(--color-primary)] transition hover:bg-[color:color-mix(in_srgb,var(--color-primary)_25%,var(--kali-panel))]"
                        onClick={() => addEnemyToWave(i, t)}
                      >
                        +{t}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-md border border-dashed border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
              onClick={addWave}
            >
              Add Wave
            </button>
            <label
              className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-70"
              htmlFor="spawn-interval"
            >
              Spawn Interval ({uiState.spawnInterval.toFixed(1)}s)
            </label>
            <input
              id="spawn-interval"
              type="range"
              min={0.4}
              max={1.8}
              step={0.1}
              value={uiState.spawnInterval}
              onChange={(e) => {
                engineRef.current.dispatch({
                  type: "set-spawn-interval",
                  value: Number(e.target.value),
                });
                syncUiState();
              }}
              className="mt-2 w-full accent-[color:var(--color-primary)]"
            />
            <label
              className="mt-4 block text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-70"
              htmlFor="wave-json-editor"
            >
              Wave JSON
            </label>
            <textarea
              id="wave-json-editor"
              aria-label="Wave configuration JSON"
              className="mt-2 h-28 w-full rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/90 p-2 font-mono text-[0.65rem] text-[color:var(--kali-text)] focus:border-[color:var(--color-primary)] focus:outline-none"
              value={waveJson}
              onChange={(e) => setWaveJson(e.target.value)}
            />
            {selectedTower && (
              <div className="mt-4 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/80 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-90">
                  Tower Upgrades
                </h3>
                <div className="mt-2 flex flex-col items-center gap-2">
                  <RangeUpgradeTree tower={selectedTower} />
                  <div className="flex w-full flex-wrap justify-center gap-2 text-[0.65rem]">
                    <button
                      type="button"
                      className="rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => upgrade("range")}
                      disabled={uiState.gold < getUpgradeCost(selectedTower.level)}
                    >
                      Increase Range ({getUpgradeCost(selectedTower.level)}g)
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => upgrade("damage")}
                      disabled={uiState.gold < getUpgradeCost(selectedTower.level)}
                    >
                      Increase Damage ({getUpgradeCost(selectedTower.level)}g)
                    </button>
                  </div>
                  <p className="text-[0.6rem] text-[color:var(--kali-text)] opacity-70">
                    Sell value: {getTowerSellValue(selectedTower)}g (Right-click/Delete)
                  </p>
                </div>
              </div>
            )}
          </aside>
        </div>
        {!uiState.editing && <DpsCharts towers={uiState.towers} />}
      </div>
    </GameLayout>
  );
};

export default TowerDefense;
