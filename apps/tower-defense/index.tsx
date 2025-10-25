"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
const SPEED_OPTIONS = [0.5, 1, 2, 4] as const;

const ENEMY_ICONS: Record<keyof typeof ENEMY_TYPES, string> = {
  fast: "⚡",
  tank: "🛡️",
};

type Vec = { x: number; y: number };

type TerrainCell = {
  base: string;
  accent: string;
  elevation: number;
};

type AmbientFirefly = {
  x: number;
  y: number;
  radius: number;
  offset: number;
  drift: number;
};

type AmbientRipple = {
  x: number;
  y: number;
  radius: number;
  phase: number;
};

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
  maxHealth: number;
}

const pseudoRandom = (x: number, y: number) => {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
};

const generateTerrain = (): TerrainCell[][] =>
  Array.from({ length: GRID_SIZE }, (_, gx) =>
    Array.from({ length: GRID_SIZE }, (_, gy) => {
      const noise = pseudoRandom(gx, gy);
      const elevation = 0.4 + noise * 0.6;
      const baseHue = 150 + noise * 30;
      const base = `hsl(${baseHue}, 35%, ${25 + elevation * 25}%)`;
      const accent = `hsl(${baseHue + 10}, 45%, ${15 + elevation * 20}%)`;
      return { base, accent, elevation };
    }),
  );

const createFireflies = (): AmbientFirefly[] =>
  Array.from({ length: 14 }, (_, i) => {
    const column = i % GRID_SIZE;
    const row = Math.floor(i / GRID_SIZE);
    const jitter = pseudoRandom(column + 0.7, row + 0.3 + i * 0.17);
    return {
      x: column + jitter,
      y: row + pseudoRandom(column + 0.13, row + 0.92) * 0.9,
      radius: 0.1 + pseudoRandom(i, column) * 0.18,
      offset: pseudoRandom(row, column) * Math.PI * 2,
      drift: 0.5 + pseudoRandom(i + 10, column + 5) * 1.2,
    };
  });

const createRipples = (): AmbientRipple[] =>
  Array.from({ length: 4 }, (_, i) => ({
    x: 1 + (i % 2) * 4 + pseudoRandom(i, i + 1) * 2,
    y: 1 + Math.floor(i / 2) * 4 + pseudoRandom(i + 2, i + 3) * 2,
    radius: 0.4 + pseudoRandom(i + 4, i + 5) * 0.6,
    phase: pseudoRandom(i + 6, i + 7) * Math.PI * 2,
  }));

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const [editing, setEditing] = useState(true);
  const [path, setPath] = useState<{ x: number; y: number }[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
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
  const waveCountdownInitialRef = useRef<number>(3);
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
  const towerCooldownsRef = useRef(
    new Map<number, { remaining: number; total: number }>(),
  );
  const performanceRef = useRef({ fps: 0, frameMs: 0, enemies: 0 });
  const fpsTrackerRef = useRef({ frames: 0, elapsed: 0 });
  const speedRef = useRef(1);
  const [speed, setSpeed] = useState<typeof SPEED_OPTIONS[number]>(1);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const frameRerenderGate = useRef(0);
  const pathRef = useRef<typeof path>([]);
  const waveConfigRef = useRef<(keyof typeof ENEMY_TYPES)[][]>([]);
  const environmentRef = useRef({
    time: 0,
    fireflies: createFireflies(),
    ripples: createRipples(),
  });
  const animationFrame = useRef<number>();
  const terrain = useMemo(generateTerrain, []);

  const [waveConfig, setWaveConfig] = useState<
    (keyof typeof ENEMY_TYPES)[][]
  >([Array(5).fill("fast") as (keyof typeof ENEMY_TYPES)[]]);
  const [waveJson, setWaveJson] = useState("");

  useEffect(() => {
    setWaveJson(JSON.stringify(waveConfig, null, 2));
    waveConfigRef.current = waveConfig;
  }, [waveConfig]);
  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);
  useEffect(() => {
    pathRef.current = path;
  }, [path]);
  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    ctx.imageSmoothingEnabled = false;
  }, []);

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
    navigator.clipboard?.writeText(json).catch(() => {});
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
    } else {
      flowFieldRef.current = null;
    }
  }, [path, towers]);

  const draw = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const pathSnapshot = pathRef.current;
    const towersSnapshot = towersRef.current;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.save();
    ctx.fillStyle = "#07111d";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    terrain.forEach((column, x) => {
      column.forEach((cell, y) => {
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        const gradient = ctx.createLinearGradient(px, py, px, py + CELL_SIZE);
        gradient.addColorStop(0, cell.base);
        gradient.addColorStop(1, cell.accent);
        ctx.fillStyle = gradient;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = `rgba(255,255,255,${0.04 * cell.elevation})`;
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE / 10);
      });
    });

    const glowPhase = (Math.sin(environmentRef.current.time * 2) + 1) / 2;
    pathSnapshot.forEach((cell, index) => {
      const px = cell.x * CELL_SIZE;
      const py = cell.y * CELL_SIZE;
      const highlight = ctx.createLinearGradient(
        px,
        py,
        px + CELL_SIZE,
        py + CELL_SIZE,
      );
      highlight.addColorStop(
        0,
        `rgba(255, 210, 120, ${0.35 + glowPhase * 0.25})`,
      );
      highlight.addColorStop(
        1,
        `rgba(255, 140, 70, ${0.25 + glowPhase * 0.2})`,
      );
      ctx.fillStyle = highlight;
      ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = `rgba(255, 235, 150, ${0.5 + glowPhase * 0.3})`;
      ctx.lineWidth = 2;
      ctx.strokeRect(px + 1, py + 1, CELL_SIZE - 2, CELL_SIZE - 2);

      if (index < pathSnapshot.length - 1) {
        const next = pathSnapshot[index + 1];
        ctx.strokeStyle = `rgba(255, 200, 120, ${0.3 + glowPhase * 0.2})`;
        ctx.lineWidth = 6;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(
          cell.x * CELL_SIZE + CELL_SIZE / 2,
          cell.y * CELL_SIZE + CELL_SIZE / 2,
        );
        ctx.lineTo(
          next.x * CELL_SIZE + CELL_SIZE / 2,
          next.y * CELL_SIZE + CELL_SIZE / 2,
        );
        ctx.stroke();
      }
    });

    ctx.strokeStyle = "rgba(17, 36, 52, 0.9)";
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

    ctx.globalCompositeOperation = "lighter";
    environmentRef.current.fireflies.forEach((fly) => {
      const px =
        (fly.x + Math.sin(environmentRef.current.time * fly.drift + fly.offset) * 0.15) *
        CELL_SIZE;
      const py =
        (fly.y + Math.cos(environmentRef.current.time * fly.drift + fly.offset) * 0.1) *
        CELL_SIZE;
      const radius = fly.radius * CELL_SIZE;
      const gradient = ctx.createRadialGradient(
        px,
        py,
        0,
        px,
        py,
        radius * 1.8,
      );
      gradient.addColorStop(0, "rgba(255,255,200,0.8)");
      gradient.addColorStop(1, "rgba(255,255,200,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(px, py, radius * 1.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalCompositeOperation = "source-over";

    environmentRef.current.ripples.forEach((ripple) => {
      const radius =
        (ripple.radius +
          Math.sin(environmentRef.current.time * 1.5 + ripple.phase) * 0.2) *
        CELL_SIZE;
      const px = ripple.x * CELL_SIZE;
      const py = ripple.y * CELL_SIZE;
      ctx.strokeStyle = "rgba(112, 177, 255, 0.25)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    towersSnapshot.forEach((t, i) => {
      const centerX = t.x * CELL_SIZE + CELL_SIZE / 2;
      const centerY = t.y * CELL_SIZE + CELL_SIZE / 2;
      const baseGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        4,
        centerX,
        centerY,
        CELL_SIZE / 2.4,
      );
      baseGradient.addColorStop(0, "rgba(160, 220, 255, 0.9)");
      baseGradient.addColorStop(1, "rgba(30, 90, 140, 0.95)");
      ctx.fillStyle = baseGradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, CELL_SIZE / 3.2, 0, Math.PI * 2);
      ctx.fill();

      if (selected === i || hovered === i) {
        ctx.strokeStyle =
          selected === i ? "rgba(80,200,255,0.9)" : "rgba(80,200,255,0.5)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(centerX, centerY, t.range * CELL_SIZE, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const cooldown = towerCooldownsRef.current.get(i);
      if (cooldown && cooldown.remaining > 0) {
        const ratio = 1 - cooldown.remaining / cooldown.total;
        ctx.strokeStyle = "rgba(0, 255, 200, 0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(
          centerX,
          centerY,
          CELL_SIZE / 2.1,
          -Math.PI / 2,
          -Math.PI / 2 + Math.PI * 2 * ratio,
        );
        ctx.stroke();
      }
    });

    enemiesRef.current.forEach((en) => {
      const centerX = en.x * CELL_SIZE + CELL_SIZE / 2;
      const centerY = en.y * CELL_SIZE + CELL_SIZE / 2;
      const gradient = ctx.createRadialGradient(
        centerX,
        centerY,
        2,
        centerX,
        centerY,
        CELL_SIZE / 2.5,
      );
      gradient.addColorStop(0, "rgba(255, 140, 140, 0.95)");
      gradient.addColorStop(1, "rgba(180, 40, 40, 0.95)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, CELL_SIZE / 4, 0, Math.PI * 2);
      ctx.fill();

      const maxHealth = en.maxHealth || en.health || 1;
      const ratio = Math.max(Math.min(en.health / maxHealth, 1), 0);
      const barWidth = CELL_SIZE * 0.6;
      const barX = centerX - barWidth / 2;
      const barY = centerY - CELL_SIZE * 0.35;
      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(barX, barY, barWidth, 4);
      ctx.fillStyle = `rgba(${Math.round(255 - ratio * 120)}, ${Math.round(
        120 + ratio * 100,
      )}, 120, 0.9)`;
      ctx.fillRect(barX, barY, barWidth * ratio, 4);
    });

    damageTicksRef.current.forEach((t) => {
      ctx.strokeStyle = `rgba(255,0,0,${t.life})`;
      ctx.lineWidth = 1;
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
      ctx.font = "bold 12px 'Share Tech Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        d.value.toString(),
        d.x * CELL_SIZE + CELL_SIZE / 2,
        d.y * CELL_SIZE + CELL_SIZE / 2 - (1 - d.life) * 10,
      );
    });

    ctx.restore();
  };

  const spawnEnemyInstance = () => {
    const pathSnapshot = pathRef.current;
    if (!pathSnapshot.length) return;
    const wave = waveConfigRef.current[waveRef.current - 1] || [];
    const type = wave[enemiesSpawnedRef.current];
    if (!type) return;
    const spec = ENEMY_TYPES[type];
    const enemy = spawnEnemy(enemyPool.current, {
      id: Date.now(),
      x: pathSnapshot[0].x,
      y: pathSnapshot[0].y,
      pathIndex: 0,
      progress: 0,
      health: spec.health,
      maxHealth: spec.health,
      resistance: 0,
      baseSpeed: spec.speed,
      slow: null,
      dot: null,
      type,
    });
    if (enemy) enemiesRef.current.push(enemy as EnemyInstance);
  };

  const update = (time: number) => {
    if (!ctxRef.current) {
      animationFrame.current = requestAnimationFrame(update);
      return;
    }
    if (!lastTime.current) {
      lastTime.current = time;
      animationFrame.current = requestAnimationFrame(update);
      return;
    }

    const rawDt = (time - lastTime.current) / 1000;
    lastTime.current = time;
    const clampedDt = Math.min(rawDt, 0.12);
    const dt = pausedRef.current ? 0 : clampedDt * speedRef.current;

    if (!pausedRef.current) {
      environmentRef.current.time += rawDt * speedRef.current;
    }

    if (waveCountdownRef.current !== null) {
      if (!pausedRef.current) {
        waveCountdownRef.current -= dt;
      }
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
      if (
        spawnTimer.current > 1 &&
        enemiesSpawnedRef.current < currentWave.length
      ) {
        spawnTimer.current = 0;
        spawnEnemyInstance();
        enemiesSpawnedRef.current += 1;
      }

      const pathSnapshot = pathRef.current;
      const goal = pathSnapshot[pathSnapshot.length - 1];
      for (let i = enemiesRef.current.length - 1; i >= 0; i -= 1) {
        const en = enemiesRef.current[i];
        const field = flowFieldRef.current;
        if (field) {
          const cellX = Math.floor(en.x);
          const cellY = Math.floor(en.y);
          const vec = field[cellX]?.[cellY];
          if (vec) {
            const step = (en.baseSpeed * dt) / CELL_SIZE;
            en.x += vec.x * step;
            en.y += vec.y * step;
          }
        }
        const reached =
          goal && Math.floor(en.x) === goal.x && Math.floor(en.y) === goal.y;
        if (en.health <= 0 || reached) {
          enemiesRef.current.splice(i, 1);
        }
      }

      towersRef.current.forEach((t, idx) => {
        const cooldown = towerCooldownsRef.current.get(idx);
        if (cooldown) {
          if (!pausedRef.current) {
            cooldown.remaining = Math.max(cooldown.remaining - dt, 0);
          }
          if (cooldown.remaining <= 0) {
            towerCooldownsRef.current.delete(idx);
          }
          return;
        }
        const enemy = enemiesRef.current.find(
          (e) => Math.hypot(e.x - t.x, e.y - t.y) <= t.range,
        );
        if (enemy && dt > 0) {
          enemy.health -= t.damage;
          damageNumbersRef.current.push({
            x: enemy.x,
            y: enemy.y,
            value: t.damage,
            life: 1,
          });
          damageTicksRef.current.push({ x: enemy.x, y: enemy.y, life: 1 });
          towerCooldownsRef.current.set(idx, { remaining: 1, total: 1 });
        }
      });

      for (let i = damageNumbersRef.current.length - 1; i >= 0; i -= 1) {
        const d = damageNumbersRef.current[i];
        if (!pausedRef.current) {
          d.y -= dt * 0.5;
          d.life -= dt * 2;
        }
        if (d.life <= 0) damageNumbersRef.current.splice(i, 1);
      }
      for (let i = damageTicksRef.current.length - 1; i >= 0; i -= 1) {
        const tick = damageTicksRef.current[i];
        if (!pausedRef.current) tick.life -= dt * 2;
        if (tick.life <= 0) damageTicksRef.current.splice(i, 1);
      }

      if (
        enemiesSpawnedRef.current >= currentWave.length &&
        enemiesRef.current.length === 0
      ) {
        running.current = false;
        if (waveRef.current < waveConfigRef.current.length) {
          waveRef.current += 1;
          waveCountdownRef.current = 5;
          waveCountdownInitialRef.current = 5;
        }
        forceRerender((n) => n + 1);
      }
    }

    draw();

    frameRerenderGate.current += 1;
    if (frameRerenderGate.current > 10) {
      frameRerenderGate.current = 0;
      forceRerender((n) => n + 1);
    }

    fpsTrackerRef.current.frames += 1;
    fpsTrackerRef.current.elapsed += rawDt;
    if (fpsTrackerRef.current.elapsed >= 0.5) {
      performanceRef.current = {
        fps: Math.round(
          fpsTrackerRef.current.frames / fpsTrackerRef.current.elapsed,
        ),
        frameMs: Math.round(rawDt * 1000),
        enemies: enemiesRef.current.length,
      };
      fpsTrackerRef.current.frames = 0;
      fpsTrackerRef.current.elapsed = 0;
      forceRerender((n) => n + 1);
    }

    animationFrame.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    lastTime.current = performance.now();
    animationFrame.current = requestAnimationFrame(update);
    return () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    if (!pathRef.current.length || !waveConfigRef.current.length) return;
    setEditing(false);
    setPaused(false);
    waveRef.current = 1;
    waveCountdownRef.current = 3;
    waveCountdownInitialRef.current = 3;
    running.current = false;
    enemiesSpawnedRef.current = 0;
    enemiesRef.current = [];
    towerCooldownsRef.current.clear();
    damageNumbersRef.current = [];
    damageTicksRef.current = [];
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

  const togglePause = () => {
    if (editing) return;
    if (!running.current && waveCountdownRef.current === null) return;
    setPaused((p) => !p);
  };

  const currentWave = waveConfig[waveRef.current - 1] || [];
  const enemiesRemaining = Math.max(
    currentWave.length - enemiesSpawnedRef.current,
    0,
  ) + enemiesRef.current.length;
  const defeated = Math.max(
    enemiesSpawnedRef.current - enemiesRef.current.length,
    0,
  );
  const waveProgress = currentWave.length
    ? Math.min(defeated / currentWave.length, 1)
    : 0;
  const countdownRatio =
    waveCountdownRef.current !== null && waveCountdownInitialRef.current
      ? Math.max(waveCountdownRef.current, 0) /
        waveCountdownInitialRef.current
      : 0;
  const modeLabel = editing
    ? "Path Editing"
    : paused
    ? "Paused"
    : running.current
    ? "Defense Active"
    : "Planning";
  const waveStatus = waveCountdownRef.current !== null
    ? `Next wave in ${Math.ceil(Math.max(waveCountdownRef.current, 0))}s`
    : running.current
    ? `${enemiesRemaining} enemies remaining`
    : `${waveConfig.length} wave${waveConfig.length === 1 ? "" : "s"} queued`;
  const selectedTower = selected !== null ? towers[selected] : null;
  const selectedCooldown =
    selected !== null ? towerCooldownsRef.current.get(selected) : undefined;
  const cooldownRatio = selectedCooldown
    ? 1 - Math.max(selectedCooldown.remaining, 0) / selectedCooldown.total
    : 1;
  const hudMetrics = performanceRef.current;
  const rangeRatio = selectedTower ? Math.min(selectedTower.range / 6, 1) : 0;
  const damageRatio = selectedTower
    ? Math.min(selectedTower.damage / 6, 1)
    : 0;
  const levelRatio = selectedTower
    ? Math.min(selectedTower.level / 8, 1)
    : 0;

  return (
    <GameLayout gameId="tower-defense">
      <div className="p-3 text-[color:var(--kali-text)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex flex-1 flex-col items-center gap-3">
            <div className="relative w-full max-w-[460px]">
              <canvas
                ref={canvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                className="h-auto w-full rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)] shadow-xl shadow-black/40"
                aria-label="Tower defense map canvas"
                style={{ imageRendering: "pixelated" }}
                onClick={handleCanvasClick}
                onMouseMove={handleCanvasMove}
                onMouseLeave={handleCanvasLeave}
              />
              {paused && (
                <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/90 text-center shadow-kali-panel">
                  <h3 className="text-base font-semibold uppercase tracking-wide">
                    Simulation Paused
                  </h3>
                  <p className="mt-2 max-w-[240px] text-xs text-[color:var(--kali-text)]/80">
                    Resume to continue the current wave or adjust the path layout before unpausing.
                  </p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                    <button
                      className="rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 font-semibold text-black transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                      onClick={() => setPaused(false)}
                    >
                      Resume
                    </button>
                    <button
                      className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:-translate-y-0.5 hover:bg-[color:var(--kali-panel)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                      onClick={() => setEditing(true)}
                    >
                      Edit Path
                    </button>
                  </div>
                </div>
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 text-[0.7rem] sm:text-xs">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="pointer-events-auto flex w-full flex-1 flex-col gap-2 rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-3 py-2 shadow-kali-panel backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)]/70">
                          Wave {waveRef.current}
                        </p>
                        <p className="text-[color:var(--kali-text)]/85">{waveStatus}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)]/70">
                          Mode
                        </p>
                        <p className="text-[color:var(--kali-text)]/85">{modeLabel}</p>
                      </div>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full border border-[color:var(--kali-border)]/40 bg-[color:var(--kali-panel)]/70">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400/90 via-emerald-300/90 to-teal-200/90 transition-[width] duration-500"
                        style={{ width: `${waveProgress * 100}%` }}
                        aria-hidden
                      />
                    </div>
                    {waveCountdownRef.current !== null && (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-wide text-[color:var(--kali-text)]/65">
                          <span>Wave Prep</span>
                          <span>{Math.max(waveCountdownRef.current, 0).toFixed(1)}s</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color:var(--kali-border)]/30">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-400/90 to-amber-200/90 transition-[width] duration-300"
                            style={{ width: `${(1 - countdownRatio) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-1 text-[0.6rem] uppercase tracking-wide text-[color:var(--kali-text)]/60">
                      <span>Current wave</span>
                      <div className="flex flex-wrap gap-1 text-base">
                        {currentWave.length ? (
                          currentWave.slice(0, 10).map((type, idx) => (
                            <span
                              key={`${type}-${idx}`}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-[color:var(--kali-panel-highlight)]/70 text-sm shadow-sm"
                              title={`${type} enemy`}
                            >
                              {ENEMY_ICONS[type] ?? "👾"}
                            </span>
                          ))
                        ) : (
                          <span className="rounded-full border border-dashed border-[color:var(--kali-border)] px-2 py-1 text-[0.6rem] normal-case">
                            empty
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="pointer-events-auto w-full max-w-[150px] rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/90 px-3 py-2 text-right shadow-kali-panel">
                    <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)]/70">
                      Performance
                    </p>
                    <p className="text-[color:var(--kali-text)]/85">{hudMetrics.fps} fps</p>
                    <p className="text-[color:var(--kali-text)]/60 text-[0.6rem]">
                      {hudMetrics.frameMs}ms · {hudMetrics.enemies} enemies
                    </p>
                  </div>
                </div>
                {selectedTower && (
                  <div className="pointer-events-auto rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/90 px-3 py-2 shadow-kali-panel backdrop-blur">
                    <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)]/70">
                      Tower
                    </p>
                    <p className="text-[0.65rem] text-[color:var(--kali-text)]/85">
                      Range {selectedTower.range.toFixed(1)} · Damage {selectedTower.damage.toFixed(1)} · Lv {selectedTower.level}
                    </p>
                  </div>
                )}
              </div>
              <div className="pointer-events-auto absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 text-[0.65rem] sm:text-sm">
                <div className="flex items-center gap-2 rounded-full border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/85 px-3 py-1.5 shadow-kali-panel backdrop-blur">
                  <span className="text-[0.6rem] uppercase tracking-wide text-[color:var(--kali-text)]/70">
                    Speed
                  </span>
                  {SPEED_OPTIONS.map((option) => (
                    <button
                      key={option}
                      type="button"
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] ${
                        speed === option
                          ? "bg-kali-control text-black shadow"
                          : "bg-[color:var(--kali-panel-highlight)]/70 text-[color:var(--kali-text)] hover:-translate-y-0.5 hover:bg-[color:var(--kali-panel-highlight)]"
                      }`}
                      onClick={() => setSpeed(option)}
                    >
                      {option}x
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] ${
                      paused
                        ? "bg-kali-severity-high text-white"
                        : "bg-[color:var(--kali-panel-highlight)]/70 text-[color:var(--kali-text)] hover:-translate-y-0.5 hover:bg-[color:var(--kali-panel-highlight)]"
                    }`}
                    onClick={togglePause}
                  >
                    {paused ? "Resume" : "Pause"}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex w-full max-w-[460px] flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
              <button
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)]"
                onClick={() => setEditing((e) => !e)}
              >
                {editing ? "Finish Editing" : "Edit Path"}
              </button>
              <button
                className="rounded-md border border-[color:var(--kali-border)] bg-kali-severity-high px-3 py-1 font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={start}
                disabled={running.current || waveCountdownRef.current !== null}
              >
                Launch Wave
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
          </div>
          <aside className="w-full rounded-lg border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/90 p-3 text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur lg:max-w-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--kali-text)]/90">
              Wave Designer
            </h2>
            <p className="mt-1 text-[0.7rem] text-[color:var(--kali-text)]/80">
              Queue enemy types for each wave. Use the buttons to append foes and adjust difficulty without crowding the playfield.
            </p>
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
              {waveConfig.map((wave, i) => (
                <div
                  key={i}
                  className="rounded border border-[color:var(--kali-border)]/70 bg-[color:var(--kali-panel)]/70 p-2"
                >
                  <div className="flex items-center justify-between gap-2 text-[0.7rem] font-medium uppercase tracking-wide text-[color:var(--kali-text)]/80">
                    <span>Wave {i + 1}</span>
                    <span className="font-normal normal-case text-[color:var(--kali-text)]/70">
                      {wave.length ? wave.join(", ") : "empty"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1 text-[0.65rem]">
                    {(Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[]).map((t) => (
                      <button
                        key={t}
                        className="rounded border border-[color:var(--kali-border)]/60 bg-[color:var(--kali-panel-highlight)] px-2 py-1 font-semibold uppercase tracking-wide text-[color:var(--color-primary)] transition hover:-translate-y-0.5 hover:bg-[color:color-mix(in_srgb,var(--color-primary)_25%,var(--kali-panel))]"
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
              className="mt-3 block text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)]/70"
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
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/85 p-3 shadow transition hover:-translate-y-0.5 hover:shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--kali-panel-highlight)]/70 text-lg">
                      🎯
                    </div>
                    <div>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-wide text-[color:var(--kali-text)]/70">
                        Tower Matrix
                      </p>
                      <p className="text-sm font-semibold text-[color:var(--kali-text)]/90">
                        Level {selectedTower.level}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-3 text-[0.65rem]">
                    <div>
                      <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-wide text-[color:var(--kali-text)]/65">
                        <span>Range</span>
                        <span>{selectedTower.range.toFixed(1)}</span>
                      </div>
                      <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-[color:var(--kali-border)]/40">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-200 transition-[width] duration-300"
                          style={{ width: `${rangeRatio * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-wide text-[color:var(--kali-text)]/65">
                        <span>Damage</span>
                        <span>{selectedTower.damage.toFixed(1)}</span>
                      </div>
                      <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-[color:var(--kali-border)]/40">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink-400 to-orange-300 transition-[width] duration-300"
                          style={{ width: `${damageRatio * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[0.6rem] uppercase tracking-wide text-[color:var(--kali-text)]/65">
                        <span>Cooldown</span>
                        <span>
                          {selectedCooldown && selectedCooldown.remaining > 0
                            ? `${selectedCooldown.remaining.toFixed(1)}s`
                            : "Ready"}
                        </span>
                      </div>
                      <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-[color:var(--kali-border)]/40">
                        <div
                          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-400 to-sky-200 transition-[width] duration-300"
                          style={{ width: `${cooldownRatio * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/80 p-3 shadow-inner">
                  <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--kali-text)]/80">
                    <span>🔭</span> Range Tree
                  </h3>
                  <div className="mt-2 flex justify-center">
                    <RangeUpgradeTree tower={selectedTower} />
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-2 text-[0.65rem]">
                    <button
                      className="rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 font-medium text-black transition-transform duration-150 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
                      onClick={() => upgrade("range")}
                    >
                      Increase Range
                    </button>
                    <button
                      className="rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 font-medium text-black transition-transform duration-150 hover:-translate-y-0.5 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
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
