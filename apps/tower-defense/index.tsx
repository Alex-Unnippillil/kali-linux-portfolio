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
import { computeSmoothedPath } from "./pathing";

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

type Vec = { x: number; y: number };

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
  const [smoothedPath, setSmoothedPath] = useState<Vec[]>([]);
  const smoothedPathRef = useRef<Vec[]>([]);

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
    const smoothed = computeSmoothedPath(path);
    smoothedPathRef.current = smoothed;
    setSmoothedPath(smoothed);
  }, [path]);

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
    if (smoothedPath.length > 1) {
      ctx.strokeStyle = editing
        ? "rgba(0,255,255,0.8)"
        : "rgba(0,255,0,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const first = smoothedPath[0];
      ctx.moveTo(first.x * CELL_SIZE, first.y * CELL_SIZE);
      smoothedPath.slice(1).forEach((p) => {
        ctx.lineTo(p.x * CELL_SIZE, p.y * CELL_SIZE);
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
        en.x * CELL_SIZE,
        en.y * CELL_SIZE,
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
        t.x * CELL_SIZE,
        t.y * CELL_SIZE,
        (CELL_SIZE / 2) * (1 - t.life),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    });
    damageNumbersRef.current.forEach((d) => {
      ctx.fillStyle = `rgba(255,255,255,${d.life})`;
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        d.value.toString(),
        d.x * CELL_SIZE,
        d.y * CELL_SIZE - (1 - d.life) * 10,
      );
    });
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  };

  const spawnEnemyInstance = () => {
    const smoothed = smoothedPathRef.current;
    if (smoothed.length === 0) return;
    const wave = waveConfig[waveRef.current - 1] || [];
    const type = wave[enemiesSpawnedRef.current];
    if (!type) return;
    const spec = ENEMY_TYPES[type];
    const startPoint = smoothed[0];
    const enemy = spawnEnemy(enemyPool.current, {
      id: Date.now(),
      x: startPoint.x,
      y: startPoint.y,
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
      const pathPoints = smoothedPathRef.current;
      enemiesRef.current.forEach((en) => {
        if (pathPoints.length < 2) return;
        let distanceRemaining = (en.baseSpeed * dt) / CELL_SIZE;
        while (distanceRemaining > 0) {
          const nextIndex = en.pathIndex + 1;
          const nextPoint = pathPoints[nextIndex];
          if (!nextPoint) break;
          const dx = nextPoint.x - en.x;
          const dy = nextPoint.y - en.y;
          const dist = Math.hypot(dx, dy);
          if (dist <= 1e-6) {
            en.x = nextPoint.x;
            en.y = nextPoint.y;
            en.pathIndex = nextIndex;
            continue;
          }
          if (distanceRemaining >= dist) {
            en.x = nextPoint.x;
            en.y = nextPoint.y;
            en.pathIndex = nextIndex;
            distanceRemaining -= dist;
          } else {
            const ratio = distanceRemaining / dist;
            en.x += dx * ratio;
            en.y += dy * ratio;
            distanceRemaining = 0;
          }
        }
        if (pathPoints.length > 1) {
          en.progress = en.pathIndex / (pathPoints.length - 1);
        }
      });
      const goalPoint = pathPoints[pathPoints.length - 1];
      enemiesRef.current = enemiesRef.current.filter((e) => {
        if (!goalPoint) return e.health > 0;
        const reached = Math.hypot(e.x - goalPoint.x, e.y - goalPoint.y) < 0.1;
        return e.health > 0 && !reached;
      });
      towers.forEach((t) => {
        (t as any).cool = (t as any).cool ? (t as any).cool - dt : 0;
        if ((t as any).cool <= 0) {
          const enemy = enemiesRef.current.find(
            (e) =>
              Math.hypot(e.x - (t.x + 0.5), e.y - (t.y + 0.5)) <= t.range,
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
    if (smoothedPathRef.current.length < 2 || !waveConfig.length) return;
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
