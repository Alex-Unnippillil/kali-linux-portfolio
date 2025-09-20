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

const ECONOMY = {
  killReward: 5,
  leakPenalty: 8,
  buildCost: 15,
  upgradeCost: 10,
} as const;

export type WaveTelemetryRow = {
  wave: number;
  leaks: number;
  damage: number;
  earned: number;
  spent: number;
};

const formatNet = (value: number) => (value >= 0 ? `+${value}` : `${value}`);

export const formatEconomyValue = (row: WaveTelemetryRow) => {
  const net = row.earned - row.spent;
  return `+${row.earned} / -${row.spent} (${formatNet(net)})`;
};

export const serializeTelemetryToCsv = (rows: WaveTelemetryRow[]) => {
  const header = "Wave,Leaks,Tower Damage,Economy";
  if (!rows.length) return header;
  const lines = rows.map(
    (row) =>
      `${row.wave},${row.leaks},${row.damage},${formatEconomyValue(row)}`,
  );
  return [header, ...lines].join("\n");
};

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
  const telemetryRef = useRef<WaveTelemetryRow[]>([]);
  const currentWaveStatsRef = useRef<WaveTelemetryRow | null>(null);
  const stagedSpendingRef = useRef(0);
  const telemetryDirtyRef = useRef(false);

  const markTelemetryDirty = () => {
    telemetryDirtyRef.current = true;
  };

  const ensureWaveStats = () => {
    if (!currentWaveStatsRef.current) {
      currentWaveStatsRef.current = {
        wave: waveRef.current,
        leaks: 0,
        damage: 0,
        earned: 0,
        spent: stagedSpendingRef.current,
      };
      stagedSpendingRef.current = 0;
      markTelemetryDirty();
    }
    return currentWaveStatsRef.current;
  };

  const recordDamage = (amount: number) => {
    const stats = ensureWaveStats();
    stats.damage += amount;
    markTelemetryDirty();
  };

  const recordKill = (enemyType?: EnemyInstance["type"]) => {
    const stats = ensureWaveStats();
    const reward =
      (enemyType &&
        ENEMY_TYPES[enemyType as keyof typeof ENEMY_TYPES]?.health) ??
      ECONOMY.killReward;
    stats.earned += reward;
    markTelemetryDirty();
  };

  const recordLeak = () => {
    const stats = ensureWaveStats();
    stats.leaks += 1;
    stats.spent += ECONOMY.leakPenalty;
    markTelemetryDirty();
  };

  const recordSpending = (amount: number) => {
    if (!amount) return;
    if (currentWaveStatsRef.current) {
      currentWaveStatsRef.current.spent += amount;
    } else {
      stagedSpendingRef.current += amount;
    }
    markTelemetryDirty();
  };

  const finalizeWaveTelemetry = () => {
    if (!currentWaveStatsRef.current) return;
    const snapshot = { ...currentWaveStatsRef.current };
    const existingIndex = telemetryRef.current.findIndex(
      (row) => row.wave === snapshot.wave,
    );
    if (existingIndex >= 0) telemetryRef.current[existingIndex] = snapshot;
    else telemetryRef.current.push(snapshot);
    telemetryRef.current.sort((a, b) => a.wave - b.wave);
    currentWaveStatsRef.current = null;
    markTelemetryDirty();
  };

  const prepareNextWaveTelemetry = () => {
    currentWaveStatsRef.current = {
      wave: waveRef.current,
      leaks: 0,
      damage: 0,
      earned: 0,
      spent: stagedSpendingRef.current,
    };
    stagedSpendingRef.current = 0;
    markTelemetryDirty();
  };

  const getTelemetryRows = () => {
    const rows = telemetryRef.current.map((row) => ({ ...row }));
    if (currentWaveStatsRef.current) {
      const existingIndex = rows.findIndex(
        (row) => row.wave === currentWaveStatsRef.current?.wave,
      );
      if (existingIndex >= 0)
        rows[existingIndex] = { ...currentWaveStatsRef.current };
      else rows.push({ ...currentWaveStatsRef.current });
    }
    return rows.sort((a, b) => a.wave - b.wave);
  };

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
    recordSpending(ECONOMY.buildCost);
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
        if (reached) {
          recordLeak();
          e.active = false;
          return false;
        }
        if (e.health <= 0) {
          recordKill(e.type);
          e.active = false;
          return false;
        }
        return true;
      });
      towers.forEach((t) => {
        (t as any).cool = (t as any).cool ? (t as any).cool - dt : 0;
        if ((t as any).cool <= 0) {
          const enemy = enemiesRef.current.find(
            (e) => Math.hypot(e.x - t.x, e.y - t.y) <= t.range,
          );
          if (enemy) {
            enemy.health -= t.damage;
            recordDamage(t.damage);
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
        finalizeWaveTelemetry();
        if (waveRef.current < waveConfig.length) {
          waveRef.current += 1;
          waveCountdownRef.current = 5;
          prepareNextWaveTelemetry();
        }
        forceRerender((n) => n + 1);
      }
      }
      if (telemetryDirtyRef.current) {
        telemetryDirtyRef.current = false;
        forceRerender((n) => n + 1);
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
    running.current = false;
    enemiesRef.current = [];
    enemiesSpawnedRef.current = 0;
    spawnTimer.current = 0;
    damageNumbersRef.current = [];
    damageTicksRef.current = [];
    telemetryRef.current = [];
    currentWaveStatsRef.current = null;
    waveRef.current = 1;
    prepareNextWaveTelemetry();
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
    recordSpending(ECONOMY.upgradeCost);
  };

  const exportTelemetry = () => {
    const rows = getTelemetryRows();
    if (!rows.length) return;
    const csv = serializeTelemetryToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tower-defense-telemetry.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const telemetryRows = getTelemetryRows();

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
        <div className="bg-gray-800/80 rounded p-2 text-xs space-y-2 border border-gray-700">
          <div className="flex items-center justify-between">
            <span className="font-semibold uppercase tracking-wide text-gray-300">
              Telemetry
            </span>
            <button
              className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
              onClick={exportTelemetry}
              disabled={telemetryRows.length === 0}
            >
              Export CSV
            </button>
          </div>
          {telemetryRows.length ? (
            <div className="space-y-1">
              <div className="grid grid-cols-4 gap-2 font-semibold text-gray-200">
                <span>Wave</span>
                <span>Leaks</span>
                <span>Damage</span>
                <span>Economy</span>
              </div>
              {telemetryRows.map((row) => (
                <div
                  key={row.wave}
                  className="grid grid-cols-4 gap-2 bg-gray-900/60 rounded px-2 py-1"
                >
                  <span>{row.wave}</span>
                  <span>{row.leaks}</span>
                  <span>{row.damage}</span>
                  <span>{formatEconomyValue(row)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-[11px]">
              Telemetry will populate once a wave completes.
            </p>
          )}
        </div>
      </div>
    </GameLayout>
  );
};

export default TowerDefense;
