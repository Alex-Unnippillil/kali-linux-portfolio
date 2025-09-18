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
  serializeLevelData,
  deserializeLevelData,
  LevelData,
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
  const [editMode, setEditMode] = useState<"path" | "spawner">("path");
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const [spawners, setSpawners] = useState<Vec[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
  const spawnerSetRef = useRef<Set<string>>(new Set());
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
  const [levelJson, setLevelJson] = useState("");
  useEffect(() => {
    setLevelJson(
      serializeLevelData({
        path,
        spawners,
        towers,
        waves: waveConfig,
      }),
    );
  }, [path, spawners, towers, waveConfig]);
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
  const exportLevel = () => {
    const json = serializeLevelData({
      path,
      spawners,
      towers,
      waves: waveConfig,
    });
    setLevelJson(json);
    navigator.clipboard
      ?.writeText(json)
      .catch(() => {});
  };

  const applyLevelData = (data: LevelData) => {
    pathSetRef.current = new Set(
      data.path.map((cell) => `${cell.x},${cell.y}`),
    );
    spawnerSetRef.current = new Set(
      data.spawners.map((cell) => `${cell.x},${cell.y}`),
    );
    setPath(data.path.map((cell) => ({ ...cell })));
    setSpawners(data.spawners.map((cell) => ({ ...cell })));
    setTowers(data.towers.map((tower) => ({ ...tower })));
    setWaveConfig(data.waves.map((wave) => [...wave]));
    setSelected(null);
    setHovered(null);
    running.current = false;
    waveCountdownRef.current = null;
    waveRef.current = 1;
    spawnTimer.current = 0;
    enemiesSpawnedRef.current = 0;
    enemiesRef.current = [];
    enemyPool.current = createEnemyPool(50);
    damageNumbersRef.current = [];
    damageTicksRef.current = [];
    flowFieldRef.current = null;
    forceRerender((n) => n + 1);
  };

  const importLevel = () => {
    try {
      const data = deserializeLevelData(levelJson);
      applyLevelData(data);
      setLevelJson(serializeLevelData(data));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid level JSON";
      alert(message);
    }
  };

  const cellKey = (x: number, y: number) => `${x},${y}`;

  const togglePath = (x: number, y: number) => {
    const key = cellKey(x, y);
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

  const toggleSpawner = (x: number, y: number) => {
    const key = cellKey(x, y);
    setSpawners((items) => {
      const set = spawnerSetRef.current;
      if (set.has(key)) {
        set.delete(key);
        return items.filter((cell) => !(cell.x === x && cell.y === y));
      }
      set.add(key);
      return [...items, { x, y }];
    });
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    const key = cellKey(x, y);
    if (editing) {
      if (editMode === "path") togglePath(x, y);
      else toggleSpawner(x, y);
      return;
    }
    const existing = towers.findIndex((t) => t.x === x && t.y === y);
    if (existing >= 0) {
      setSelected(existing);
      return;
    }
    if (pathSetRef.current.has(key) || spawnerSetRef.current.has(key)) return;
    setTowers((ts) => [...ts, { x, y, range: 1, damage: 1, level: 1 }]);
  };

  const handleCanvasMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    const idx = towers.findIndex((t) => t.x === x && t.y === y);
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
    ctx.fillStyle = "rgba(0, 255, 255, 0.2)";
    spawners.forEach((cell) => {
      ctx.fillRect(
        cell.x * CELL_SIZE,
        cell.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
      );
      ctx.strokeStyle = "#00ffff";
      ctx.strokeRect(
        cell.x * CELL_SIZE,
        cell.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
      );
    });
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
    const spawnPoint = spawners[0] ?? path[0];
    if (!spawnPoint) return;
    const enemy = spawnEnemy(enemyPool.current, {
      id: Date.now(),
      x: spawnPoint.x,
      y: spawnPoint.y,
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

  return (
    <GameLayout gameId="tower-defense">
      <div className="p-2 space-y-2">
        {waveCountdownRef.current !== null && (
          <div className="text-center bg-gray-700 text-white py-1 rounded">
            Wave {waveRef.current} in {Math.ceil(waveCountdownRef.current)}
          </div>
        )}
        <div className="space-x-2 mb-2">
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "Finish Editing" : "Edit Map"}
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={start}
            disabled={running.current || waveCountdownRef.current !== null}
          >
            Start
          </button>
        </div>
        {editing && (
          <div className="flex space-x-2 text-xs mb-2">
            <label className="inline-flex items-center space-x-1">
              <input
                type="radio"
                checked={editMode === "path"}
                onChange={() => setEditMode("path")}
              />
              <span>Path</span>
            </label>
            <label className="inline-flex items-center space-x-1">
              <input
                type="radio"
                checked={editMode === "spawner"}
                onChange={() => setEditMode("spawner")}
              />
              <span>Spawners</span>
            </label>
          </div>
        )}
        <div className="space-y-1 mb-2 text-xs">
          {waveConfig.map((wave, i) => (
            <div key={i} className="flex items-center space-x-2">
              <span>
                Wave {i + 1}: {wave.join(", ") || "empty"}
              </span>
              {(
                Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[]
              ).map((t) => (
                <button
                  key={t}
                  className="bg-gray-700 px-1 rounded"
                  onClick={() => addEnemyToWave(i, t)}
                >
                  +{t}
                </button>
              ))}
            </div>
          ))}
          <button
            className="bg-gray-700 text-xs px-2 py-1 rounded"
            onClick={addWave}
          >
            Add Wave
          </button>
          <div className="text-xs text-gray-300">
            Level JSON includes path, spawners, towers, and waves.
          </div>
          <textarea
            className="w-full bg-black text-white p-1 rounded h-32"
            value={levelJson}
            onChange={(e) => setLevelJson(e.target.value)}
          />
          <div className="space-x-2">
            <button
              className="px-2 py-1 bg-gray-700 rounded"
              onClick={importLevel}
            >
              Load
            </button>
            <button
              className="px-2 py-1 bg-gray-700 rounded"
              onClick={exportLevel}
            >
              Copy JSON
            </button>
          </div>
        </div>
        <div className="flex">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="bg-black"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={handleCanvasLeave}
          />
          {selected !== null && (
            <div className="ml-2 flex flex-col space-y-1 items-center">
              <RangeUpgradeTree tower={towers[selected]} />
              <button
                className="bg-gray-700 text-xs px-2 py-1 rounded"
                onClick={() => upgrade("range")}
              >
                +Range
              </button>
              <button
                className="bg-gray-700 text-xs px-2 py-1 rounded"
                onClick={() => upgrade("damage")}
              >
                +Damage
              </button>
            </div>
          )}
        </div>
        {!editing && <DpsCharts towers={towers} />}
      </div>
    </GameLayout>
  );
};

export default TowerDefense;
