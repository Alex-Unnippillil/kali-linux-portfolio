"use client";

import { useEffect, useRef, useState } from "react";
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

const computeFlowField = (
  start: Vec,
  goal: Vec,
  towers: Tower[],
): Vec[][] | null => {
  const obstacle = new Set(towers.map((t) => `${t.x},${t.y}`));
  const h = (a: Vec) => Math.abs(a.x - goal.x) + Math.abs(a.y - goal.y);
  const key = (p: Vec) => `${p.x},${p.y}`;
  const open: (Vec & { f: number })[] = [{ ...start, f: h(start) }];
  const came = new Map<string, string>();
  const g = new Map<string, number>();
  g.set(key(start), 0);
  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (current.x === goal.x && current.y === goal.y) break;
    for (const d of DIRS) {
      const nx = current.x + d.x;
      const ny = current.y + d.y;
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= GRID_SIZE ||
        ny >= GRID_SIZE ||
        obstacle.has(key({ x: nx, y: ny }))
      )
        continue;
      const nk = key({ x: nx, y: ny });
      const tentative = (g.get(key(current)) ?? 0) + 1;
      if (tentative < (g.get(nk) ?? Infinity)) {
        came.set(nk, key(current));
        g.set(nk, tentative);
        const f = tentative + h({ x: nx, y: ny });
        const existing = open.find((o) => o.x === nx && o.y === ny);
        if (existing) existing.f = f;
        else open.push({ x: nx, y: ny, f });
      }
    }
  }
  if (!came.has(key(goal))) return null;
  const field: Vec[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ x: 0, y: 0 })),
  );
  let cur = key(goal);
  while (cur !== key(start)) {
    const prev = came.get(cur);
    if (!prev) break;
    const [cx, cy] = cur.split(",").map(Number);
    const [px, py] = prev.split(",").map(Number);
    field[px][py] = { x: cx - px, y: cy - py };
    cur = prev;
  }
  return field;
};

interface EnemyInstance extends Enemy {
  pathIndex: number;
  progress: number;
}

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(true);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
  const [towers, setTowers] = useState<Tower[]>([]);
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
  const flowFieldRef = useRef<Vec[][] | null>(null);

  const [waveConfig, setWaveConfig] = useState<
    (keyof typeof ENEMY_TYPES)[][]
  >([Array(5).fill("fast") as (keyof typeof ENEMY_TYPES)[]]);
  const [waveJson, setWaveJson] = useState("");
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
      if (Array.isArray(data)) setWaveConfig(data);
    } catch {
      alert("Invalid wave JSON");
    }
  };
  const exportWaves = () => {
    const json = JSON.stringify(waveConfig, null, 2);
    setWaveJson(json);
    navigator.clipboard
      ?.writeText(json)
      .catch(() => {});
  };

  const togglePath = (x: number, y: number) => {
    const key = `${x},${y}`;
    setPath((p) => {
      const set = pathSetRef.current;
      if (set.has(key)) {
        set.delete(key);
        return p.filter((c) => !(c.x === x && c.y === y));
      }
      set.add(key);
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

  const handleCanvasClick = (e: React.MouseEvent) => {
    const coords = getCanvasCell(e.clientX, e.clientY);
    if (!coords) return;
    const { x, y } = coords;
    const key = `${x},${y}`;
    if (editing) {
      togglePath(x, y);
      return;
    }
    const existing = towers.findIndex((t) => t.x === x && t.y === y);
    if (existing >= 0) {
      setSelected(existing);
      return;
    }
    if (pathSetRef.current.has(key)) return;
    setTowers((ts) => [...ts, { x, y, range: 1, damage: 1, level: 1 }]);
  };

  const handleCanvasMove = (e: React.MouseEvent) => {
    const coords = getCanvasCell(e.clientX, e.clientY);
    if (!coords) {
      setHovered(null);
      return;
    }
    const idx = towers.findIndex((t) => t.x === coords.x && t.y === coords.y);
    setHovered(idx >= 0 ? idx : null);
  };

  const handleCanvasLeave = () => setHovered(null);

  useEffect(() => {
    if (path.length >= 2) {
      flowFieldRef.current = computeFlowField(
        path[0],
        path[path.length - 1],
        towers,
      );
    }
  }, [path, towers]);

  const draw = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = "#555";
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
    if (!path.length) return;
    const wave = waveConfig[waveRef.current - 1] || [];
    const type = wave[enemiesSpawnedRef.current];
    if (!type) return;
    const spec = ENEMY_TYPES[type];
    const enemy = spawnEnemy(enemyPool.current, {
      id: Date.now(),
      x: path[0].x,
      y: path[0].y,
      pathIndex: 0,
      progress: 0,
      health: spec.health,
      resistance: 0,
      baseSpeed: spec.speed,
      slow: null,
      dot: null,
      type,
    });
    if (enemy) enemiesRef.current.push(enemy as EnemyInstance);
  };

  const update = (time: number) => {
    const dt = (time - lastTime.current) / 1000;
    lastTime.current = time;

    if (waveCountdownRef.current !== null) {
      waveCountdownRef.current -= dt;
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
      const currentWave = waveConfig[waveRef.current - 1] || [];
      if (
        spawnTimer.current > 1 &&
        enemiesSpawnedRef.current < currentWave.length
      ) {
        spawnTimer.current = 0;
        spawnEnemyInstance();
        enemiesSpawnedRef.current += 1;
      }
      enemiesRef.current.forEach((en) => {
        const field = flowFieldRef.current;
        if (!field) return;
        const cellX = Math.floor(en.x);
        const cellY = Math.floor(en.y);
        const vec = field[cellX]?.[cellY];
        if (!vec) return;
        const step = (en.baseSpeed * dt) / CELL_SIZE;
        en.x += vec.x * step;
        en.y += vec.y * step;
      });
      enemiesRef.current = enemiesRef.current.filter((e) => {
        const goal = path[path.length - 1];
        const reached =
          Math.floor(e.x) === goal?.x && Math.floor(e.y) === goal?.y;
        return e.health > 0 && !reached;
      });
      towers.forEach((t) => {
        (t as any).cool = (t as any).cool ? (t as any).cool - dt : 0;
        if ((t as any).cool <= 0) {
          const enemy = enemiesRef.current.find(
            (e) => Math.hypot(e.x - t.x, e.y - t.y) <= t.range,
          );
          if (enemy) {
            enemy.health -= t.damage;
            damageNumbersRef.current.push({
              x: enemy.x,
              y: enemy.y,
              value: t.damage,
              life: 1,
            });
            damageTicksRef.current.push({
              x: enemy.x,
              y: enemy.y,
              life: 1,
            });
            (t as any).cool = 1;
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
          if (waveRef.current < waveConfig.length) {
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
    if (!path.length || !waveConfig.length) return;
    setEditing(false);
    waveRef.current = 1;
    waveCountdownRef.current = 3;
    running.current = false;
    enemiesSpawnedRef.current = 0;
    enemiesRef.current = [];
    forceRerender((n) => n + 1);
  };

  const upgrade = (type: "range" | "damage") => {
    if (selected === null) return;
    setTowers((ts) => {
      const t = { ...ts[selected] };
      upgradeTower(t, type);
      const arr = [...ts];
      arr[selected] = t;
      return arr;
    });
  };

  const currentWave = waveConfig[waveRef.current - 1] || [];
  const enemiesRemaining = Math.max(
    currentWave.length - enemiesSpawnedRef.current,
    0,
  ) + enemiesRef.current.length;
  const modeLabel = editing
    ? "Path Editing"
    : running.current
    ? "Defense Active"
    : "Planning";
  const waveStatus = waveCountdownRef.current !== null
    ? `Next wave in ${Math.ceil(waveCountdownRef.current)}s`
    : running.current
    ? `${enemiesRemaining} enemies remaining`
    : `${waveConfig.length} wave${waveConfig.length === 1 ? "" : "s"} queued`;
  const selectedTower = selected !== null ? towers[selected] : null;

  return (
    <GameLayout gameId="tower-defense">
      <div className="p-3 text-gray-100">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col items-center gap-3">
            <div className="relative w-full max-w-[420px]">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="h-auto w-full rounded-lg border border-gray-700 bg-black shadow-inner"
                aria-label="Tower defense map canvas"
                style={{ imageRendering: "pixelated" }}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMove}
                onMouseLeave={handleCanvasLeave}
              />
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 text-[0.7rem] sm:text-xs">
                <div className="flex justify-between gap-2">
                  <div className="rounded-md bg-black/70 px-2 py-1 font-medium uppercase tracking-wide text-gray-100 shadow backdrop-blur">
                    <p className="text-[0.65rem] sm:text-xs">Wave {waveRef.current}</p>
                    <p className="font-normal normal-case text-gray-200">{waveStatus}</p>
                  </div>
                  <div className="rounded-md bg-black/70 px-2 py-1 text-right font-medium uppercase tracking-wide text-gray-100 shadow backdrop-blur">
                    <p className="text-[0.65rem] sm:text-xs">Mode</p>
                    <p className="font-normal normal-case text-gray-200">{modeLabel}</p>
                  </div>
                </div>
                {selectedTower && (
                  <div className="rounded-md bg-black/70 px-2 py-1 text-gray-200 shadow backdrop-blur">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wide">Tower</p>
                    <p className="text-[0.65rem] sm:text-xs">
                      Range {selectedTower.range.toFixed(1)} · Damage {selectedTower.damage.toFixed(1)} · Lv {selectedTower.level}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex w-full max-w-[420px] flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
              <button
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1 font-medium transition hover:bg-gray-700"
                onClick={() => setEditing((e) => !e)}
              >
                {editing ? "Finish Editing" : "Edit Path"}
              </button>
              <button
                className="rounded-md border border-gray-600 bg-emerald-700 px-3 py-1 font-semibold text-white transition enabled:hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={start}
                disabled={running.current || waveCountdownRef.current !== null}
              >
                Launch Wave
              </button>
              <button
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1 font-medium transition hover:bg-gray-700"
                onClick={exportWaves}
              >
                Export Waves
              </button>
              <button
                className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1 font-medium transition hover:bg-gray-700"
                onClick={importWaves}
              >
                Import Waves
              </button>
            </div>
          </div>
          <aside className="w-full rounded-lg border border-gray-700/60 bg-gray-900/60 p-3 shadow-lg backdrop-blur lg:max-w-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-200">
              Wave Designer
            </h2>
            <p className="mt-1 text-[0.7rem] text-gray-300">
              Queue enemy types for each wave. Use the buttons to append foes and adjust difficulty without crowding the playfield.
            </p>
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {waveConfig.map((wave, i) => (
                <div
                  key={i}
                  className="rounded border border-gray-700/70 bg-black/40 p-2"
                >
                  <div className="flex items-center justify-between gap-2 text-[0.7rem] font-medium uppercase tracking-wide text-gray-200">
                    <span>Wave {i + 1}</span>
                    <span className="font-normal normal-case text-gray-300">
                      {wave.length ? wave.join(", ") : "empty"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[0.65rem]">
                    {(Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[]).map((t) => (
                      <button
                        key={t}
                        className="rounded bg-gray-700 px-2 py-1 font-semibold uppercase tracking-wide text-gray-100 transition hover:bg-gray-600"
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
              className="mt-3 w-full rounded-md border border-dashed border-gray-600 bg-gray-800/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-200 transition hover:bg-gray-700/80"
              onClick={addWave}
            >
              Add Wave
            </button>
            <label
              className="mt-3 block text-xs font-semibold uppercase tracking-wide text-gray-300"
              htmlFor="wave-json-editor"
            >
              Wave JSON
            </label>
            <textarea
              id="wave-json-editor"
              aria-label="Wave configuration JSON"
              className="mt-2 h-28 w-full rounded-md border border-gray-700 bg-black/70 p-2 font-mono text-[0.65rem] text-gray-100 focus:border-emerald-500 focus:outline-none"
              value={waveJson}
              onChange={(e) => setWaveJson(e.target.value)}
            />
            {selectedTower && (
              <div className="mt-4 rounded-lg border border-gray-700/60 bg-black/40 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-200">
                  Tower Upgrades
                </h3>
                <div className="mt-2 flex flex-col items-center gap-2">
                  <RangeUpgradeTree tower={selectedTower} />
                  <div className="flex w-full flex-wrap justify-center gap-2 text-[0.65rem]">
                    <button
                      className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1 font-medium transition hover:bg-gray-700"
                      onClick={() => upgrade("range")}
                    >
                      Increase Range
                    </button>
                    <button
                      className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1 font-medium transition hover:bg-gray-700"
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
