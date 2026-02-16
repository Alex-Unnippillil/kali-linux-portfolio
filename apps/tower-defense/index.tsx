"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GameLayout from "../../components/apps/GameLayout";
import useGameLoop from "../../components/apps/Games/common/useGameLoop";
import DpsCharts from "../games/tower-defense/components/DpsCharts";
import RangeUpgradeTree from "../games/tower-defense/components/RangeUpgradeTree";
import {
  ENEMY_TYPES,
  getTowerDPS,
  getUpgradeCost,
  TOWER_TYPES,
  TowerTypeKey,
  Vec,
} from "../games/tower-defense";
import { createTowerDefenseEngine } from "../games/tower-defense/engine";
import { createTowerDefenseRenderer } from "../games/tower-defense/renderer";

interface TowerDefenseProps {
  windowMeta?: {
    isFocused?: boolean;
  };
}

const TowerDefense = ({ windowMeta }: TowerDefenseProps = {}) => {
  const isFocused = windowMeta?.isFocused ?? true;
  const engineRef = useRef(createTowerDefenseEngine());
  const rendererRef = useRef(createTowerDefenseRenderer());
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [uiState, setUiState] = useState(engineRef.current.getUiState());
  const [toast, setToast] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<Vec | null>(null);
  const [manualPause, setManualPause] = useState(false);

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = manualPause || !isFocused;
  }, [manualPause, isFocused]);

  useEffect(
    () => () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    },
    [],
  );

  const syncUi = useCallback(() => {
    setUiState(engineRef.current.getUiState());
  }, []);

  const showToast = useCallback((message?: string) => {
    if (!message) return;
    setToast(message);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const dispatch = useCallback(
    (action: Parameters<typeof engineRef.current.dispatch>[0]) => {
      const result = engineRef.current.dispatch(action);
      if (!result.ok) showToast(result.toast);
      syncUi();
      return result;
    },
    [showToast, syncUi],
  );

  const getCellFromPointer = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const gridPx = uiState.gridSize * uiState.cellSize;
    const x = Math.floor(((clientX - rect.left) / rect.width) * gridPx / uiState.cellSize);
    const y = Math.floor(((clientY - rect.top) / rect.height) * gridPx / uiState.cellSize);
    if (x < 0 || y < 0 || x >= uiState.gridSize || y >= uiState.gridSize) return null;
    return { x, y };
  };

  useGameLoop((delta) => {
    const dt = Math.max(0, Math.min(0.05, delta));
    if (!pausedRef.current) {
      engineRef.current.tick(dt);
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx) {
      const selectedTower = uiState.towers.find((tower) => tower.id === uiState.selectedTowerId);
      const canBuildAtHover = Boolean(
        hoveredCell &&
          !uiState.path.some((cell) => cell.x === hoveredCell.x && cell.y === hoveredCell.y) &&
          !uiState.towers.some((tower) => tower.x === hoveredCell.x && tower.y === hoveredCell.y),
      );

      rendererRef.current.render(ctx, engineRef.current.getUiState(), {
        selectedTowerId: selectedTower?.id ?? null,
        hoveredCell,
        showCursor: true,
        canBuildAtHover,
      });
    }

    syncUi();
  });

  const selectedTower = useMemo(
    () => uiState.towers.find((tower) => tower.id === uiState.selectedTowerId) ?? null,
    [uiState.selectedTowerId, uiState.towers],
  );

  const selectedTowerCost = selectedTower
    ? getUpgradeCost(selectedTower.type, selectedTower.level)
    : 0;

  const waveInfo = uiState.wavePreview[uiState.waveIndex];

  return (
    <GameLayout gameId="tower-defense" isFocused={isFocused} onPauseChange={(paused) => setManualPause(paused)}>
      <div className="p-3 text-[color:var(--kali-text)]">
        <div className="flex flex-col gap-4 lg:flex-row">
          <section className="relative flex-1 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-2">
            <canvas
              ref={canvasRef}
              aria-label="Tower defense game board"
              className="h-auto w-full rounded-md border border-[color:var(--kali-border)] bg-black/20"
              style={{ imageRendering: "pixelated" }}
              onMouseMove={(event) => setHoveredCell(getCellFromPointer(event.clientX, event.clientY))}
              onMouseLeave={() => setHoveredCell(null)}
              onClick={(event) => {
                const cell = getCellFromPointer(event.clientX, event.clientY);
                if (!cell) return;
                const tower = uiState.towers.find((entry) => entry.x === cell.x && entry.y === cell.y);
                if (tower) {
                  dispatch({ type: "select-tower", towerId: tower.id });
                } else {
                  dispatch({ type: "place-tower", cell });
                }
              }}
            />
            <div className="pointer-events-none absolute inset-x-5 top-4 flex justify-between text-[0.7rem]">
              <div className="rounded border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1">
                Wave {Math.min(uiState.waveIndex + 1, uiState.waveCount)} / {uiState.waveCount}
              </div>
              <div className="rounded border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1">
                {uiState.status.toUpperCase()}
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-4 left-5 rounded border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1 text-[0.7rem]">
              Gold {uiState.gold} · Lives {uiState.lives} · Kills {uiState.kills}
            </div>

            {toast && (
              <p className="absolute left-1/2 top-4 -translate-x-1/2 rounded border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] px-3 py-1 text-[0.65rem]">
                {toast}
              </p>
            )}

            {(uiState.status === "start" || uiState.status === "victory" || uiState.status === "defeat" || uiState.status === "error") && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/65 p-4">
                <div className="w-full max-w-sm rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] p-4 text-center">
                  <h3 className="text-sm font-semibold uppercase">
                    {uiState.status === "start" && "Tower Defense"}
                    {uiState.status === "victory" && "Victory"}
                    {uiState.status === "defeat" && "Defeat"}
                    {uiState.status === "error" && "Map Error"}
                  </h3>
                  <p className="mt-2 text-xs opacity-85">
                    {uiState.status === "start" && "Build towers and survive every wave."}
                    {uiState.status === "victory" && `Final score: ${uiState.score}`}
                    {uiState.status === "defeat" && "Your base was overrun. Try a different build order."}
                    {uiState.status === "error" && (uiState.error ?? "Invalid path configuration.")}
                  </p>
                  <button
                    type="button"
                    className="mt-3 rounded border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 text-xs text-black"
                    onClick={() => {
                      if (uiState.status === "start") dispatch({ type: "start-game" });
                      else {
                        dispatch({ type: "restart" });
                        dispatch({ type: "start-game" });
                      }
                    }}
                  >
                    {uiState.status === "start" ? "Start" : "Restart"}
                  </button>
                </div>
              </div>
            )}
          </section>

          <aside className="w-full space-y-3 rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/90 p-3 text-xs lg:w-[330px]">
            <div>
              <h2 className="font-semibold uppercase tracking-wide">Build Menu</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(TOWER_TYPES) as TowerTypeKey[]).map((towerType) => {
                  const spec = TOWER_TYPES[towerType];
                  const active = uiState.selectedBuildType === towerType;
                  return (
                    <button
                      key={towerType}
                      type="button"
                      className={`rounded border px-2 py-2 text-left ${active ? "border-[color:var(--color-primary)] bg-[color:var(--kali-panel-highlight)]" : "border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]"}`}
                      onClick={() => dispatch({ type: "set-build-type", towerType })}
                    >
                      <p className="font-semibold">{spec.label}</p>
                      <p className="opacity-80">{spec.cost}g · {getTowerDPS(towerType, 1).toFixed(1)} DPS</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded border border-[color:var(--kali-border)] p-2">
              <h3 className="font-semibold uppercase">Wave Control</h3>
              <p className="mt-1 opacity-80">
                {waveInfo
                  ? `Next: ${waveInfo.totalEnemies} enemies · +${waveInfo.rewardBonus}g on clear`
                  : "All waves cleared"}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-[color:var(--kali-border)] bg-kali-control px-2 py-1 text-black disabled:opacity-40"
                  onClick={() => dispatch({ type: "send-wave" })}
                  disabled={!uiState.canSendWave}
                >
                  Send Wave
                </button>
                <button
                  type="button"
                  className="rounded border border-[color:var(--kali-border)] px-2 py-1"
                  onClick={() => dispatch({ type: "toggle-auto-start" })}
                >
                  Auto: {uiState.autoStartWaves ? "On" : "Off"}
                </button>
                <button
                  type="button"
                  className="rounded border border-[color:var(--kali-border)] px-2 py-1"
                  onClick={() => dispatch({ type: "set-time-scale", value: uiState.timeScale === 1 ? 2 : 1 })}
                >
                  Speed {uiState.timeScale}x
                </button>
              </div>
              {waveInfo && (
                <ul className="mt-2 list-disc pl-4 opacity-80">
                  {waveInfo.composition.map((entry) => (
                    <li key={`${entry.type}-${entry.count}`}>{ENEMY_TYPES[entry.type].label}: {entry.count}</li>
                  ))}
                </ul>
              )}
            </div>

            {selectedTower && (
              <div className="rounded border border-[color:var(--kali-border)] p-2">
                <h3 className="font-semibold uppercase">Selected Tower</h3>
                <p className="mt-1 opacity-85">
                  {TOWER_TYPES[selectedTower.type].label} · Lv {selectedTower.level} · {selectedTower.targetingMode}
                </p>
                <p className="opacity-80">
                  DMG {selectedTower.damage.toFixed(1)} · RNG {selectedTower.range.toFixed(1)} · FR {selectedTower.fireRate.toFixed(2)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-[color:var(--kali-border)] bg-kali-control px-2 py-1 text-black disabled:opacity-40"
                    disabled={selectedTower.level >= 3 || uiState.gold < selectedTowerCost}
                    onClick={() => dispatch({ type: "upgrade-tower", towerId: selectedTower.id })}
                  >
                    Upgrade ({selectedTowerCost}g)
                  </button>
                  <button
                    type="button"
                    className="rounded border border-[color:var(--kali-border)] px-2 py-1"
                    onClick={() => dispatch({ type: "cycle-targeting", towerId: selectedTower.id })}
                  >
                    Target: {selectedTower.targetingMode}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-[color:var(--kali-border)] px-2 py-1"
                    onClick={() => dispatch({ type: "sell-tower", towerId: selectedTower.id })}
                  >
                    Sell
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <RangeUpgradeTree tower={selectedTower} />
                  <p className="text-[0.65rem] opacity-80">Upgrade to level 3 for max stats.</p>
                </div>
              </div>
            )}

            <div className="rounded border border-[color:var(--kali-border)] p-2">
              <h3 className="font-semibold uppercase">DPS by Tower Type</h3>
              <DpsCharts towers={uiState.towers} />
            </div>
          </aside>
        </div>
      </div>
    </GameLayout>
  );
};

export default TowerDefense;
