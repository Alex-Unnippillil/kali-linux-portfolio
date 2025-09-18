"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
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
  createProjectilePool,
  fireProjectile,
  deactivateProjectile,
  Projectile,
  deactivateEnemy,
} from "../games/tower-defense";
import { getProjectileRenderer, resetProjectileRenderer } from "./render/offscreen";

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;
const BACKGROUND_THROTTLE_MS = 1000 / 30;
const PROJECTILE_SPEED = CELL_SIZE * 8;

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

type EnemyInstance = Enemy;

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [editing, setEditing] = useState(true);
  const [path, setPath] = useState<Vec[]>([]);
  const pathRef = useRef(path);
  const pathSetRef = useRef<Set<string>>(new Set());
  const [towers, setTowers] = useState<Tower[]>([]);
  const towersRef = useRef<Tower[]>(towers);
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRef = useRef<number | null>(selected);
  const [hovered, setHovered] = useState<number | null>(null);
  const hoveredRef = useRef<number | null>(hovered);
  const enemiesRef = useRef<EnemyInstance[]>([]);
  const enemyPool = useRef(createEnemyPool(128));
  const projectilePool = useRef(createProjectilePool(256));
  const projectilesRef = useRef<Projectile[]>([]);
  const lastTime = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const running = useRef(false);
  const spawnTimer = useRef(0);
  const waveRef = useRef(1);
  const waveCountdownRef = useRef<number | null>(null);
  const [, forceRerender] = useState(0);
  const enemiesSpawnedRef = useRef(0);
  const enemyIdRef = useRef(0);
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
  const backgroundCanvasRef = useRef<HTMLCanvasElement | OffscreenCanvas | null>(
    null,
  );
  const backgroundCtxRef = useRef<
    CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null
  >(null);
  const backgroundDirtyRef = useRef(true);
  const lastBackgroundRedrawRef = useRef(0);
  const [waveConfig, setWaveConfig] = useState<
    (keyof typeof ENEMY_TYPES)[][]
  >([Array(5).fill("fast") as (keyof typeof ENEMY_TYPES)[]]);
  const waveConfigRef = useRef<(keyof typeof ENEMY_TYPES)[][]>(waveConfig);
  const [waveJson, setWaveJson] = useState("");

  useEffect(() => {
    pathRef.current = path;
    backgroundDirtyRef.current = true;
  }, [path]);

  useEffect(() => {
    towersRef.current = towers;
    backgroundDirtyRef.current = true;
  }, [towers]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    hoveredRef.current = hovered;
  }, [hovered]);

  useEffect(() => {
    waveConfigRef.current = waveConfig;
  }, [waveConfig]);

  useEffect(() => {
    setWaveJson(JSON.stringify(waveConfig, null, 2));
  }, [waveConfig]);

  useEffect(() => {
    const currentPath = pathRef.current;
    if (currentPath.length >= 2) {
      flowFieldRef.current = computeFlowField(
        currentPath[0],
        currentPath[currentPath.length - 1],
        towersRef.current,
      );
    }
  }, [path, towers]);

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

  const handleCanvasClick = (e: MouseEvent) => {
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

  const handleCanvasMove = (e: MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    const idx = towers.findIndex((t) => t.x === x && t.y === y);
    setHovered(idx >= 0 ? idx : null);
  };

  const handleCanvasLeave = () => setHovered(null);

  const ensureBackgroundCanvas = () => {
    if (backgroundCanvasRef.current) return;
    if (typeof document === "undefined") return;
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    if ("dataset" in canvas) {
      canvas.dataset.layer = "tower-defense-background";
    }
    backgroundCanvasRef.current = canvas;
    backgroundCtxRef.current = canvas.getContext("2d");
    backgroundDirtyRef.current = true;
  };

  const redrawBackground = () => {
    const ctx = backgroundCtxRef.current;
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
    pathRef.current.forEach((c) => {
      ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeStyle = "yellow";
      ctx.strokeRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });
    ctx.fillStyle = "blue";
    towersRef.current.forEach((t) => {
      ctx.beginPath();
      ctx.arc(
        t.x * CELL_SIZE + CELL_SIZE / 2,
        t.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
    backgroundDirtyRef.current = false;
  };
  const draw = (time: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    ensureBackgroundCanvas();
    if (
      backgroundDirtyRef.current &&
      time - lastBackgroundRedrawRef.current >= BACKGROUND_THROTTLE_MS
    ) {
      redrawBackground();
      lastBackgroundRedrawRef.current = time;
    }

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    const backgroundCanvas = backgroundCanvasRef.current;
    if (backgroundCanvas) {
      ctx.drawImage(backgroundCanvas as CanvasImageSource, 0, 0);
    }

    const highlight = new Set<number>();
    if (selectedRef.current !== null) highlight.add(selectedRef.current);
    if (hoveredRef.current !== null) highlight.add(hoveredRef.current);
    highlight.forEach((idx) => {
      const tower = towersRef.current[idx];
      if (!tower) return;
      ctx.strokeStyle = "yellow";
      ctx.beginPath();
      ctx.arc(
        tower.x * CELL_SIZE + CELL_SIZE / 2,
        tower.y * CELL_SIZE + CELL_SIZE / 2,
        tower.range * CELL_SIZE,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
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

    damageTicksRef.current.forEach((tick) => {
      ctx.strokeStyle = `rgba(255,0,0,${tick.life})`;
      ctx.beginPath();
      ctx.arc(
        tick.x * CELL_SIZE + CELL_SIZE / 2,
        tick.y * CELL_SIZE + CELL_SIZE / 2,
        (CELL_SIZE / 2) * (1 - tick.life),
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    });

    damageNumbersRef.current.forEach((dmg) => {
      ctx.fillStyle = `rgba(255,255,255,${dmg.life})`;
      ctx.font = "12px sans-serif";
      ctx.fillText(
        dmg.value.toString(),
        dmg.x * CELL_SIZE + CELL_SIZE / 2,
        dmg.y * CELL_SIZE + CELL_SIZE / 2 - (1 - dmg.life) * 10,
      );
    });

    const renderer = getProjectileRenderer(CANVAS_SIZE, CANVAS_SIZE);
    renderer.draw(projectilesRef.current, CELL_SIZE);
    renderer.blit(ctx);
  };

  const spawnEnemyInstance = () => {
    const currentPath = pathRef.current;
    if (!currentPath.length) return;
    const wave = waveConfigRef.current[waveRef.current - 1] || [];
    const type = wave[enemiesSpawnedRef.current];
    if (!type) return;
    const spec = ENEMY_TYPES[type];
    enemyIdRef.current += 1;
    const enemy = spawnEnemy(enemyPool.current, {
      id: enemyIdRef.current,
      x: currentPath[0].x,
      y: currentPath[0].y,
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
    const previous = lastTime.current || time;
    const dt = (time - previous) / 1000;
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
      const currentWave = waveConfigRef.current[waveRef.current - 1] || [];
      spawnTimer.current += dt;
      if (
        spawnTimer.current >= 1 &&
        enemiesSpawnedRef.current < currentWave.length
      ) {
        spawnTimer.current = 0;
        spawnEnemyInstance();
        enemiesSpawnedRef.current += 1;
      }

      const field = flowFieldRef.current;
      if (field) {
        enemiesRef.current.forEach((en) => {
          const cellX = Math.floor(en.x);
          const cellY = Math.floor(en.y);
          const vec = field[cellX]?.[cellY];
          if (!vec) return;
          const step = (en.baseSpeed * dt) / CELL_SIZE;
          en.x += vec.x * step;
          en.y += vec.y * step;
        });
      }

      const currentPath = pathRef.current;
      enemiesRef.current = enemiesRef.current.filter((enemy) => {
        const goal = currentPath[currentPath.length - 1];
        const reached =
          goal && Math.floor(enemy.x) === goal.x && Math.floor(enemy.y) === goal.y;
        const alive = enemy.health > 0 && !reached;
        if (!alive) deactivateEnemy(enemy);
        return alive;
      });

      const activeProjectiles = projectilesRef.current;
      for (let i = activeProjectiles.length - 1; i >= 0; i -= 1) {
        const projectile = activeProjectiles[i];
        if (!projectile.active) {
          activeProjectiles.splice(i, 1);
          continue;
        }
        const target = enemiesRef.current.find(
          (e) => e.id === projectile.targetId && e.health > 0,
        );
        if (!target) {
          deactivateProjectile(projectile);
          activeProjectiles.splice(i, 1);
          continue;
        }
        const targetX = target.x * CELL_SIZE + CELL_SIZE / 2;
        const targetY = target.y * CELL_SIZE + CELL_SIZE / 2;
        const dx = targetX - projectile.x;
        const dy = targetY - projectile.y;
        const dist = Math.hypot(dx, dy);
        const step = projectile.speed * dt;
        if (dist <= step || dist === 0) {
          target.health -= projectile.damage;
          damageNumbersRef.current.push({
            x: target.x,
            y: target.y,
            value: projectile.damage,
            life: 1,
          });
          damageTicksRef.current.push({
            x: target.x,
            y: target.y,
            life: 1,
          });
          deactivateProjectile(projectile);
          activeProjectiles.splice(i, 1);
          continue;
        }
        if (dist > 0) {
          projectile.x += (dx / dist) * step;
          projectile.y += (dy / dist) * step;
        }
      }

      towersRef.current.forEach((tower) => {
        const meta = tower as Tower & { cool?: number };
        meta.cool = meta.cool ? meta.cool - dt : 0;
        if (meta.cool <= 0) {
          const target = enemiesRef.current.find(
            (e) => Math.hypot(e.x - tower.x, e.y - tower.y) <= tower.range,
          );
          if (target) {
            const projectile = fireProjectile(projectilePool.current, {
              x: tower.x * CELL_SIZE + CELL_SIZE / 2,
              y: tower.y * CELL_SIZE + CELL_SIZE / 2,
              targetId: target.id,
              damage: tower.damage,
              speed: PROJECTILE_SPEED,
            });
            if (projectile && !projectilesRef.current.includes(projectile)) {
              projectilesRef.current.push(projectile);
            }
            meta.cool = 1;
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
        enemiesRef.current.length === 0 &&
        projectilesRef.current.length === 0
      ) {
        running.current = false;
        if (waveRef.current < waveConfigRef.current.length) {
          waveRef.current += 1;
          waveCountdownRef.current = 5;
        }
        forceRerender((n) => n + 1);
      }
    }

    draw(time);
    animationFrameRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(update);
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resetProjectileRenderer();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!pathRef.current.length || !waveConfigRef.current.length) return;
    setEditing(false);
    enemiesRef.current = [];
    projectilesRef.current = [];
    enemyPool.current.forEach((enemy) => deactivateEnemy(enemy));
    projectilePool.current.forEach((proj) => deactivateProjectile(proj));
    running.current = false;
    waveRef.current = 1;
    spawnTimer.current = 0;
    enemiesSpawnedRef.current = 0;
    waveCountdownRef.current = 3;
    backgroundDirtyRef.current = true;
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
