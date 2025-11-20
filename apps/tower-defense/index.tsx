"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import GameLayout from "../../components/apps/GameLayout";
import DpsCharts from "../games/tower-defense/components/DpsCharts";
import RangeUpgradeTree from "../games/tower-defense/components/RangeUpgradeTree";
import {
  ENEMY_TYPES,
  Tower,
  upgradeTower,
  Enemy,
  createEnemyPool,
  spawnEnemy,
  deactivateEnemy,
  TOWER_TYPES,
} from "../games/tower-defense";

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

type Vec = { x: number; y: number };

const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const keyOf = (p: Vec) => `${p.x},${p.y}`;

const DEFAULT_PATH: Vec[] = Array.from({ length: GRID_SIZE }, (_, x) => ({
  x,
  y: Math.floor(GRID_SIZE / 2),
}));

const DEFAULT_WAVES: (keyof typeof ENEMY_TYPES)[][] = [
  ["fast", "fast", "fast", "fast"],
  ["fast", "fast", "tank", "fast"],
  ["fast", "tank", "fast", "tank", "fast", "fast"],
];

const findPath = (
  walkable: Set<string>,
  start: Vec,
  goal: Vec,
  towers: Tower[],
): Vec[] | null => {
  const startKey = keyOf(start);
  const goalKey = keyOf(goal);
  if (!walkable.has(startKey) || !walkable.has(goalKey)) return null;

  const blocked = new Set(towers.map((t) => keyOf({ x: t.x, y: t.y })));
  type Node = Vec & { f: number; g: number };
  const h = (a: Vec) => Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
  const open: Node[] = [{ ...start, f: h(start), g: 0 }];
  const came = new Map<string, string>();
  const gScore = new Map<string, number>([[startKey, 0]]);

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    const currentKey = keyOf(current);
    if (currentKey === goalKey) {
      const path: Vec[] = [goal];
      let cursor = currentKey;
      while (came.has(cursor)) {
        const prevKey = came.get(cursor)!;
        const [px, py] = prevKey.split(",").map(Number);
        path.unshift({ x: px, y: py });
        cursor = prevKey;
      }
      if (path[0].x !== start.x || path[0].y !== start.y) {
        path.unshift(start);
      }
      return path;
    }
    for (const dir of DIRS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
      const neighborKey = `${nx},${ny}`;
      if (!walkable.has(neighborKey) || blocked.has(neighborKey)) continue;
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + 1;
      if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
        came.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeG);
        const existing = open.find((node) => node.x === nx && node.y === ny);
        const fScore = tentativeG + h({ x: nx, y: ny });
        if (existing) {
          existing.g = tentativeG;
          existing.f = fScore;
        } else {
          open.push({ x: nx, y: ny, g: tentativeG, f: fScore });
        }
      }
    }
  }

  return null;
};

interface EnemyInstance extends Enemy {
  pathIndex: number;
  progress: number;
}

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(true);
  const [path, setPath] = useState<Vec[]>(DEFAULT_PATH);
  const pathSetRef = useRef<Set<string>>(new Set(DEFAULT_PATH.map(keyOf)));
  const [towers, setTowers] = useState<Tower[]>([]);
  const towersRef = useRef<Tower[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const enemiesRef = useRef<EnemyInstance[]>([]);
  const enemyPool = useRef(createEnemyPool(50));
  const lastTime = useRef(0);
  const running = useRef(false);
  const spawnTimer = useRef(0);
  const waveRef = useRef(1);
  const waveCountdownRef = useRef<number | null>(null);
  const [, forceRerender] = useState(0);
  const enemiesSpawnedRef = useRef(0);
  const damageNumbersRef = useRef<
    {
      x: number;
      y: number;
      value: number;
      life: number;
    }[]
  >([]);
  const damageTicksRef = useRef<{ x: number; y: number; life: number }[]>([]);
  const computedPathRef = useRef<Vec[] | null>(DEFAULT_PATH);
  const [pathValid, setPathValid] = useState(true);
  const [pathMessage, setPathMessage] = useState<string | null>(null);
  const [waveConfig, setWaveConfig] = useState(DEFAULT_WAVES);
  const waveConfigRef = useRef(DEFAULT_WAVES);
  const [waveJson, setWaveJson] = useState(
    () => JSON.stringify(DEFAULT_WAVES, null, 2),
  );
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);

  useEffect(() => {
    waveConfigRef.current = waveConfig;
  }, [waveConfig]);

  useEffect(() => {
    if (path.length < 2) {
      computedPathRef.current = null;
      setPathValid(false);
      setPathMessage(
        "Select a start and finish tile to define the enemy route.",
      );
      return;
    }
    const walkable = new Set(path.map(keyOf));
    const startCell = path[0];
    const goalCell = path[path.length - 1];
    const solved = findPath(walkable, startCell, goalCell, towersRef.current);
    if (solved && solved.length >= 2) {
      computedPathRef.current = solved;
      setPathValid(true);
      setPathMessage(null);
    } else {
      computedPathRef.current = null;
      setPathValid(false);
      setPathMessage(
        "The highlighted corridor is blocked. Keep a continuous lane from entrance to exit.",
      );
    }
  }, [path, towers]);

  useEffect(() => {
    setWaveJson(JSON.stringify(waveConfig, null, 2));
  }, [waveConfig]);

  const addWave = () => setWaveConfig((w) => [...w, []]);

  const addEnemyToWave = (
    index: number,
    type: keyof typeof ENEMY_TYPES,
  ) => {
    setWaveConfig((w) => {
      const copy = w.map((wave) => [...wave]);
      copy[index].push(type);
      return copy;
    });
  };

  const importWaves = () => {
    try {
      const data = JSON.parse(waveJson) as (keyof typeof ENEMY_TYPES)[][];
      if (Array.isArray(data)) {
        setWaveConfig(data);
        setWaveJson(JSON.stringify(data, null, 2));
      }
    } catch {
      alert("Invalid wave JSON");
    }
  };

  const exportWaves = () => {
    const json = JSON.stringify(waveConfig, null, 2);
    setWaveJson(json);
    navigator.clipboard?.writeText(json).catch(() => {});
  };

  const togglePath = (x: number, y: number) => {
    const cellKey = keyOf({ x, y });
    setPath((p) => {
      const set = pathSetRef.current;
      if (set.has(cellKey)) {
        set.delete(cellKey);
        return p.filter((c) => !(c.x === x && c.y === y));
      }
      set.add(cellKey);
      return [...p, { x, y }];
    });
  };

  const getCanvasCell = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor(((clientX - rect.left) * scaleX) / CELL_SIZE);
    const y = Math.floor(((clientY - rect.top) * scaleY) / CELL_SIZE);
    if (Number.isNaN(x) || Number.isNaN(y)) return null;
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
    return { x, y };
  };

  const handleCanvasClick = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCell(e.clientX, e.clientY);
    if (!coords) return;
    const { x, y } = coords;
    const cellKey = keyOf(coords);
    if (editing) {
      togglePath(x, y);
      return;
    }
    const existing = towers.findIndex((t) => t.x === x && t.y === y);
    if (existing >= 0) {
      setSelected(existing);
      return;
    }
    if (pathSetRef.current.has(cellKey)) return;
    setTowers((ts) => [
      ...ts,
      {
        x,
        y,
        range: TOWER_TYPES.single.rangeLevels[0],
        damage: TOWER_TYPES.single.damageLevels[0],
        level: 1,
        type: "single",
        rangeLevel: 0,
        damageLevel: 0,
      },
    ]);
  };

  const handleCanvasMove = (e: ReactMouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCell(e.clientX, e.clientY);
    if (!coords) {
      setHovered(null);
      return;
    }
    const idx = towers.findIndex((t) => t.x === coords.x && t.y === coords.y);
    setHovered(idx >= 0 ? idx : null);
  };

  const handleCanvasLeave = () => setHovered(null);

  const draw = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(255,255,0,0.2)";
    path.forEach((c) => {
      ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = "yellow";
      ctx.strokeRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    const solved = computedPathRef.current;
    if (solved && solved.length >= 2) {
      ctx.strokeStyle = "rgba(0,200,255,0.6)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      solved.forEach((node, index) => {
        const cx = node.x * CELL_SIZE + CELL_SIZE / 2;
        const cy = node.y * CELL_SIZE + CELL_SIZE / 2;
        if (index === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    ctx.fillStyle = "blue";
    towers.forEach((t, i) => {
      ctx.beginPath();
      ctx.arc(
        t.x * CELL_SIZE + CELL_SIZE / 2,
        t.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (selected === i || hovered === i) {
        ctx.strokeStyle = "yellow";
        ctx.beginPath();
        ctx.arc(
          t.x * CELL_SIZE + CELL_SIZE / 2,
          t.y * CELL_SIZE + CELL_SIZE / 2,
          t.range * CELL_SIZE,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    });

    ctx.fillStyle = "red";
    enemiesRef.current.forEach((en) => {
      ctx.beginPath();
      ctx.arc(
        en.x * CELL_SIZE + CELL_SIZE / 2,
        en.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });

    damageTicksRef.current.forEach((t) => {
      ctx.strokeStyle = `rgba(255,0,0,${t.life})`;
      ctx.beginPath();
      ctx.arc(
        t.x * CELL_SIZE + CELL_SIZE / 2,
        t.y * CELL_SIZE + CELL_SIZE / 2,
        (CELL_SIZE / 2) * (1 - t.life),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    });

    damageNumbersRef.current.forEach((d) => {
      ctx.fillStyle = `rgba(255,255,255,${d.life})`;
      ctx.font = "12px sans-serif";
      ctx.fillText(
        d.value.toString(),
        d.x * CELL_SIZE + CELL_SIZE / 2,
        d.y * CELL_SIZE + CELL_SIZE / 2 - (1 - d.life) * 10,
      );
    });
  };

  const spawnEnemyInstance = () => {
    const activePath = computedPathRef.current;
    if (!activePath || activePath.length < 2) return;
    const wave = waveConfigRef.current[waveRef.current - 1] || [];
    const type = wave[enemiesSpawnedRef.current];
    if (!type) return;
    const spec = ENEMY_TYPES[type];
    const startCell = activePath[0];
    const enemy = spawnEnemy(enemyPool.current, {
      id: Date.now() + Math.random(),
      x: startCell.x,
      y: startCell.y,
      pathIndex: 0,
      progress: 0,
      health: spec.health,
      resistance: 0,
      baseSpeed: spec.speed,
      slow: null,
      dot: null,
      type,
    });
    if (enemy) {
      enemiesRef.current.push(enemy as EnemyInstance);
    }
  };

  const update = (time: number) => {
    const dt = (time - lastTime.current) / 1000;
    lastTime.current = time;

    if (pausedRef.current) {
      draw();
      requestAnimationFrame(update);
      return;
    }

    if (waveCountdownRef.current !== null) {
      waveCountdownRef.current = Math.max(
        0,
        waveCountdownRef.current - dt,
      );
      forceRerender((n) => n + 1);
      if (waveCountdownRef.current <= 0) {
        waveCountdownRef.current = null;
        running.current = true;
        spawnTimer.current = 0;
        enemiesSpawnedRef.current = 0;
        forceRerender((n) => n + 1);
      }
    } else if (running.current) {
      spawnTimer.current += dt;
      const currentWave = waveConfigRef.current[waveRef.current - 1] || [];
      const spawnInterval = Math.max(0.6, 1.2 - (waveRef.current - 1) * 0.1);
      if (
        spawnTimer.current >= spawnInterval &&
        enemiesSpawnedRef.current < currentWave.length
      ) {
        spawnTimer.current = 0;
        spawnEnemyInstance();
        enemiesSpawnedRef.current += 1;
        forceRerender((n) => n + 1);
      }

      const activePath = computedPathRef.current;
      if (activePath && activePath.length >= 2) {
        enemiesRef.current.forEach((en) => {
          let idx = Math.min(en.pathIndex, activePath.length - 2);
          let travel = en.progress + (en.baseSpeed * dt) / CELL_SIZE;

          while (idx < activePath.length - 1) {
            const currentNode = activePath[idx];
            const nextNode = activePath[idx + 1];
            const segmentLength = Math.hypot(
              nextNode.x - currentNode.x,
              nextNode.y - currentNode.y,
            );
            if (segmentLength === 0) {
              idx += 1;
              continue;
            }
            if (travel >= segmentLength) {
              travel -= segmentLength;
              idx += 1;
              en.x = nextNode.x;
              en.y = nextNode.y;
              continue;
            }
            const t = travel / segmentLength;
            en.x = currentNode.x + (nextNode.x - currentNode.x) * t;
            en.y = currentNode.y + (nextNode.y - currentNode.y) * t;
            en.pathIndex = idx;
            en.progress = travel;
            return;
          }

          en.pathIndex = activePath.length - 1;
          en.progress = 0;
          en.x = activePath[activePath.length - 1].x;
          en.y = activePath[activePath.length - 1].y;
        });
      }

      const before = enemiesRef.current.length;
      const goalPath = computedPathRef.current;
      const goal = goalPath ? goalPath[goalPath.length - 1] : null;
      enemiesRef.current = enemiesRef.current.filter((enemy) => {
        const reached =
          goal && Math.floor(enemy.x) === goal.x && Math.floor(enemy.y) === goal.y;
        const alive = enemy.health > 0 && !reached;
        if (!alive) deactivateEnemy(enemy);
        return alive;
      });
      if (enemiesRef.current.length !== before) {
        forceRerender((n) => n + 1);
      }

      towersRef.current.forEach((tower) => {
        const internal = tower as Tower & { cool?: number };
        internal.cool = internal.cool ? internal.cool - dt : 0;
        if ((internal.cool ?? 0) <= 0) {
          const target = enemiesRef.current.find(
            (enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range,
          );
          if (target) {
            target.health -= tower.damage;
            damageNumbersRef.current.push({
              x: target.x,
              y: target.y,
              value: Math.round(tower.damage * 10) / 10,
              life: 1,
            });
            damageTicksRef.current.push({
              x: target.x,
              y: target.y,
              life: 1,
            });
            internal.cool = 1;
          }
        }
      });

      damageNumbersRef.current.forEach((d) => {
        d.y -= dt * 0.5;
        d.life -= dt * 2;
      });
      damageNumbersRef.current = damageNumbersRef.current.filter(
        (d) => d.life > 0,
      );

      damageTicksRef.current.forEach((t) => {
        t.life -= dt * 2;
      });
      damageTicksRef.current = damageTicksRef.current.filter((t) => t.life > 0);

      if (
        enemiesSpawnedRef.current >= currentWave.length &&
        enemiesRef.current.length === 0
      ) {
        running.current = false;
        if (waveRef.current < waveConfigRef.current.length) {
          waveRef.current += 1;
          waveCountdownRef.current = 5;
        }
        forceRerender((n) => n + 1);
      }
    }

    draw();
    requestAnimationFrame(update);
  };

  useEffect(() => {
    lastTime.current = performance.now();
    requestAnimationFrame(update);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!waveConfigRef.current.length) {
      alert("Add at least one wave before launching.");
      return;
    }
    if (!pathValid || !computedPathRef.current || computedPathRef.current.length < 2) {
      setPathMessage(
        "Create a valid path between the entrance and exit before launching.",
      );
      return;
    }
    setEditing(false);
    setSelected(null);
    setHovered(null);
    pausedRef.current = false;
    setPaused(false);
    waveRef.current = 1;
    waveCountdownRef.current = 3;
    running.current = false;
    spawnTimer.current = 0;
    enemiesSpawnedRef.current = 0;
    enemiesRef.current.forEach((enemy) => deactivateEnemy(enemy));
    enemiesRef.current = [];
    enemyPool.current.forEach((enemy) => {
      if (enemy.active) deactivateEnemy(enemy);
    });
    damageNumbersRef.current = [];
    damageTicksRef.current = [];
    lastTime.current = performance.now();
    forceRerender((n) => n + 1);
  };

  const togglePause = () => {
    if (!running.current && waveCountdownRef.current === null) return;
    const next = !pausedRef.current;
    pausedRef.current = next;
    setPaused(next);
    lastTime.current = performance.now();
    forceRerender((n) => n + 1);
  };

  const upgrade = (type: "range" | "damage") => {
    if (selected === null) return;
    setTowers((ts) => {
      const arr = [...ts];
      const current = arr[selected];
      if (!current) return ts;
      const upgraded = upgradeTower(current, type);
      arr[selected] = upgraded;
      return arr;
    });
  };

  const currentWave = waveConfigRef.current[waveRef.current - 1] || [];
  const enemiesRemaining = Math.max(
    currentWave.length - enemiesSpawnedRef.current,
    0,
  ) + enemiesRef.current.length;
  const modeLabel = editing
    ? "Path Editing"
    : paused
    ? "Paused"
    : running.current
    ? "Defense Active"
    : "Planning";
  const waveStatus = paused
    ? "Paused"
    : waveCountdownRef.current !== null
    ? `Next wave in ${Math.ceil(waveCountdownRef.current)}s`
    : running.current
    ? `${enemiesRemaining} enemies remaining`
    : `${waveConfigRef.current.length} wave${
        waveConfigRef.current.length === 1 ? "" : "s"
      } queued`;
  const selectedTower = selected !== null ? towers[selected] : null;

  return (
    <GameLayout gameId="tower-defense">
      <div className="p-3 text-[color:var(--kali-text)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col items-center gap-3">
            <div className="relative w-full max-w-[420px]">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="h-auto w-full rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] shadow-inner"
                aria-label="Tower defense map canvas"
                style={{ imageRendering: "pixelated" }}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMove}
                onMouseLeave={handleCanvasLeave}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 text-[0.7rem] sm:text-xs">
                <div className="flex justify-between gap-2">
                  <div className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1 font-medium uppercase tracking-wide text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur">
                    <p className="text-[0.65rem] text-[color:var(--kali-text)] opacity-80 sm:text-xs">Wave {waveRef.current}</p>
                    <p className="font-normal normal-case text-[color:var(--kali-text)] opacity-90">{waveStatus}</p>
                  </div>
                  <div className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1 text-right font-medium uppercase tracking-wide text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur">
                    <p className="text-[0.65rem] text-[color:var(--kali-text)] opacity-80 sm:text-xs">Mode</p>
                    <p className="font-normal normal-case text-[color:var(--kali-text)] opacity-90">{modeLabel}</p>
                  </div>
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
            <div className="flex w-full max-w-[420px] flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
              <button
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={() => setEditing((e) => !e)}
              >
                {editing ? "Finish Editing" : "Edit Path"}
              </button>
              <button
                className="rounded-md border border-[color:var(--kali-border)] bg-kali-severity-high px-3 py-1 font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={start}
                disabled={
                  running.current ||
                  waveCountdownRef.current !== null ||
                  !pathValid
                }
              >
                Launch Wave
              </button>
              <button
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={togglePause}
                disabled={
                  !pausedRef.current &&
                  !running.current &&
                  waveCountdownRef.current === null
                }
              >
                {paused ? "Resume" : "Pause"}
              </button>
              <button
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={exportWaves}
              >
                Export Waves
              </button>
              <button
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={importWaves}
              >
                Import Waves
              </button>
            </div>
            {!pathValid && pathMessage && (
              <p className="max-w-[420px] rounded-md border border-dashed border-kali-severity-high/60 bg-kali-severity-high/10 px-3 py-2 text-center text-[0.7rem] text-kali-severity-high">
                {pathMessage}
              </p>
            )}
          </div>
          <aside className="w-full rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/90 p-3 text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur lg:max-w-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-90">
              Wave Designer
            </h2>
            <p className="mt-1 text-[0.7rem] text-[color:var(--kali-text)] opacity-80">
              Queue enemy types for each wave. Use the buttons to append foes and adjust difficulty without crowding the playfield.
            </p>
            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
              {waveConfig.map((wave, i) => (
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
              className="mt-3 w-full rounded-md border border-dashed border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
              onClick={addWave}
            >
              Add Wave
            </button>
            <label
              className="mt-3 block text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)] opacity-70"
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
                      className="rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 font-medium text-black transition hover:brightness-110"
                      onClick={() => upgrade("range")}
                    >
                      Increase Range
                    </button>
                    <button
                      className="rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 font-medium text-black transition hover:brightness-110"
                      onClick={() => upgrade("damage")}
                    >
                      Increase Damage
                    </button>
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
        {!editing && <DpsCharts towers={towers} />}
      </div>
    </GameLayout>
  );
};

export default TowerDefense;
