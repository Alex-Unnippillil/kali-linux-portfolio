"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

declare global {
  interface Window {
    __towerDefenseTestApi?: {
      setPath?: (cells: Vec[]) => void;
      setWaves?: (waves: (keyof typeof ENEMY_TYPES)[][]) => void;
      start?: () => void;
      fastForward: (totalMs: number, stepMs?: number) => void;
      getState: () => {
        running: boolean;
        wave: number;
        countdown: number | null;
        enemies: number;
      };
    };
  }
}

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
  const rafRef = useRef<number | null>(null);
  const towersRef = useRef<Tower[]>([]);
  const pathRef = useRef(path);
  const waveConfigRef = useRef(waveConfig);

  const [waveConfig, setWaveConfig] = useState<
    (keyof typeof ENEMY_TYPES)[][]
  >([Array(5).fill("fast") as (keyof typeof ENEMY_TYPES)[]]);
  const [waveJson, setWaveJson] = useState("");
  useEffect(() => {
    setWaveJson(JSON.stringify(waveConfig, null, 2));
  }, [waveConfig]);
  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);
  useEffect(() => {
    waveConfigRef.current = waveConfig;
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

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
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

  const draw = useCallback(() => {
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
  }, [hovered, path, selected, towers]);

  const spawnEnemyInstance = useCallback(() => {
    const currentPath = pathRef.current;
    if (!currentPath.length) return;
    const wave = waveConfigRef.current[waveRef.current - 1] || [];
    const type = wave[enemiesSpawnedRef.current];
    if (!type) return;
    const spec = ENEMY_TYPES[type];
    const startCell = currentPath[0];
    if (!startCell) return;
    const enemy = spawnEnemy(enemyPool.current, {
      id: Date.now(),
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
    if (enemy) enemiesRef.current.push(enemy as EnemyInstance);
  }, []);

  const update = useCallback(
    (time: number) => {
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
        const currentWave = waveConfigRef.current[waveRef.current - 1] || [];
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
          const goal = pathRef.current[pathRef.current.length - 1];
          if (!goal) return e.health > 0;
          const reached =
            Math.floor(e.x) === goal.x && Math.floor(e.y) === goal.y;
          return e.health > 0 && !reached;
        });
        const towerList = towersRef.current;
        towerList.forEach((t) => {
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
        damageTicksRef.current = damageTicksRef.current.filter(
          (t) => t.life > 0,
        );
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
    },
    [draw, spawnEnemyInstance],
  );

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const loop = useCallback(
    (time: number) => {
      update(time);
      rafRef.current = requestAnimationFrame(loop);
    },
    [update],
  );

  const resumeLoop = useCallback(() => {
    if (rafRef.current !== null) return;
    lastTime.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);
  }, [loop]);

  const fastForward = useCallback(
    (totalMs: number, stepMs = 16) => {
      if (totalMs <= 0) return;
      stopLoop();
      const step = Math.max(1, stepMs);
      let simulated = lastTime.current;
      const iterations = Math.ceil(totalMs / step);
      for (let i = 0; i < iterations; i += 1) {
        simulated += step;
        update(simulated);
      }
      resumeLoop();
    },
    [resumeLoop, stopLoop, update],
  );

  const setPathFromTest = useCallback((cells: Vec[]) => {
    const seen = new Set<string>();
    const ordered: Vec[] = [];
    cells.forEach((cell) => {
      const clamped = {
        x: Math.max(0, Math.min(GRID_SIZE - 1, cell.x)),
        y: Math.max(0, Math.min(GRID_SIZE - 1, cell.y)),
      };
      const key = `${clamped.x},${clamped.y}`;
      if (seen.has(key)) return;
      seen.add(key);
      ordered.push(clamped);
    });
    pathSetRef.current = new Set(ordered.map((c) => `${c.x},${c.y}`));
    setPath(ordered);
  }, []);

  const setWavesFromTest = useCallback(
    (waves: (keyof typeof ENEMY_TYPES)[][]) => {
      setWaveConfig(waves);
    },
    [],
  );

  const getState = useCallback(
    () => ({
      running: running.current,
      wave: waveRef.current,
      countdown: waveCountdownRef.current,
      enemies: enemiesRef.current.length,
    }),
    [],
  );

  useEffect(() => {
    resumeLoop();
    return () => {
      stopLoop();
    };
  }, [resumeLoop, stopLoop]);

  const start = useCallback(() => {
    if (!pathRef.current.length || !waveConfigRef.current.length) return;
    setEditing(false);
    waveRef.current = 1;
    waveCountdownRef.current = 3;
    running.current = false;
    spawnTimer.current = 0;
    enemiesSpawnedRef.current = 0;
    enemiesRef.current = [];
    damageNumbersRef.current = [];
    damageTicksRef.current = [];
    forceRerender((n) => n + 1);
  }, [forceRerender, setEditing]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const api = {
      setPath: setPathFromTest,
      setWaves: setWavesFromTest,
      start,
      fastForward,
      getState,
    };
    window.__towerDefenseTestApi = api;
    return () => {
      if (window.__towerDefenseTestApi === api) {
        delete window.__towerDefenseTestApi;
      }
    };
  }, [fastForward, getState, setPathFromTest, setWavesFromTest, start]);

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
          <textarea
            className="w-full bg-black text-white p-1 rounded h-24"
            value={waveJson}
            onChange={(e) => setWaveJson(e.target.value)}
          />
          <div className="space-x-2">
            <button
              className="px-2 py-1 bg-gray-700 rounded"
              onClick={importWaves}
            >
              Import
            </button>
            <button
              className="px-2 py-1 bg-gray-700 rounded"
              onClick={exportWaves}
            >
              Export
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
