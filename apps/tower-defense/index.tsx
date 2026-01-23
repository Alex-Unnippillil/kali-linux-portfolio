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
const INITIAL_GOLD = 30;
const INITIAL_LIVES = 10;
const BASE_TOWER_COST = 10;

const DIRS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

type Vec = { x: number; y: number };

interface EnemyInstance extends Enemy {
  pathIndex: number;
  progress: number;
}

type ShotLine = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
};

type DamageNumber = {
  x: number;
  y: number;
  value: number;
  life: number;
};

type HitRing = {
  x: number;
  y: number;
  life: number;
};

const keyFor = (p: Vec) => `${p.x},${p.y}`;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const getTowerCooldown = (level: number) =>
  clamp(1 - (level - 1) * 0.08, 0.3, 1.2);

const getUpgradeCost = (level: number) => 8 + level * 2;

const getTowerSellValue = (tower: Tower) => {
  let total = BASE_TOWER_COST;
  for (let lvl = 1; lvl < tower.level; lvl += 1) {
    total += getUpgradeCost(lvl);
  }
  return Math.max(1, Math.floor(total * 0.6));
};

const computeRoute = (cells: Vec[]): { path: Vec[]; error: string | null } => {
  if (cells.length < 2) {
    return { path: [], error: "Paint at least two cells to define a route." };
  }
  const start = cells[0];
  const goal = cells[cells.length - 1];
  const passable = new Set(cells.map(keyFor));
  if (!passable.has(keyFor(start)) || !passable.has(keyFor(goal))) {
    return { path: [], error: "Route must include a start and goal cell." };
  }

  const queue: Vec[] = [start];
  const visited = new Set([keyFor(start)]);
  const cameFrom = new Map<string, string>();

  while (queue.length) {
    const current = queue.shift()!;
    if (current.x === goal.x && current.y === goal.y) break;
    for (const dir of DIRS) {
      const next = { x: current.x + dir.x, y: current.y + dir.y };
      if (
        next.x < 0 ||
        next.y < 0 ||
        next.x >= GRID_SIZE ||
        next.y >= GRID_SIZE
      ) {
        continue;
      }
      const nextKey = keyFor(next);
      if (!passable.has(nextKey) || visited.has(nextKey)) continue;
      visited.add(nextKey);
      cameFrom.set(nextKey, keyFor(current));
      queue.push(next);
    }
  }

  if (!cameFrom.has(keyFor(goal))) {
    return {
      path: [],
      error: "Route must connect start to goal (BFS could not link cells).",
    };
  }

  const path: Vec[] = [];
  let cursor = keyFor(goal);
  while (cursor !== keyFor(start)) {
    const [x, y] = cursor.split(",").map(Number);
    path.push({ x, y });
    const prev = cameFrom.get(cursor);
    if (!prev) break;
    cursor = prev;
  }
  path.push(start);
  path.reverse();

  return { path, error: null };
};

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafId = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const uiUpdateRef = useRef(0);

  const [editing, setEditing] = useState(true);
  const [pathCells, setPathCells] = useState<Vec[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
  const pathCellsRef = useRef<Vec[]>(pathCells);
  const [route, setRoute] = useState<Vec[]>([]);
  const routeRef = useRef<Vec[]>(route);
  const [routeError, setRouteError] = useState<string | null>(
    "Paint at least two cells to define a route.",
  );

  const [towers, setTowers] = useState<Tower[]>([]);
  const towersRef = useRef<Tower[]>(towers);
  const [selected, setSelected] = useState<number | null>(null);
  const selectedRef = useRef<number | null>(selected);
  const hoveredRef = useRef<number | null>(null);
  const cursorRef = useRef<Vec>({ x: 0, y: 0 });
  const canvasFocusedRef = useRef(false);

  const [gold, setGold] = useState(INITIAL_GOLD);
  const goldRef = useRef(gold);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const livesRef = useRef(lives);
  const [waveNumber, setWaveNumber] = useState(1);
  const waveNumberRef = useRef(waveNumber);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownRef = useRef<number | null>(countdown);
  const [runComplete, setRunComplete] = useState(false);
  const runCompleteRef = useRef(runComplete);

  const [manualPaused, setManualPaused] = useState(false);
  const [layoutPaused, setLayoutPaused] = useState(false);
  const pausedRef = useRef(false);

  const [spawnInterval, setSpawnInterval] = useState(1);
  const spawnIntervalRef = useRef(spawnInterval);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enemiesRef = useRef<EnemyInstance[]>([]);
  const enemyPool = useRef(createEnemyPool(60));
  const enemiesSpawnedRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const runningRef = useRef(false);

  const damageNumbersRef = useRef<DamageNumber[]>([]);
  const hitRingsRef = useRef<HitRing[]>([]);
  const shotLinesRef = useRef<ShotLine[]>([]);
  const cooldownsRef = useRef<Map<string, number>>(new Map());

  const [waveConfig, setWaveConfig] = useState<
    (keyof typeof ENEMY_TYPES)[][]
  >([Array(5).fill("fast") as (keyof typeof ENEMY_TYPES)[]]);
  const waveConfigRef = useRef(waveConfig);
  const [waveJson, setWaveJson] = useState("");

  useEffect(() => {
    setWaveJson(JSON.stringify(waveConfig, null, 2));
  }, [waveConfig]);

  useEffect(() => {
    pathCellsRef.current = pathCells;
    pathSetRef.current = new Set(pathCells.map(keyFor));
  }, [pathCells]);

  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    goldRef.current = gold;
  }, [gold]);

  useEffect(() => {
    livesRef.current = lives;
  }, [lives]);

  useEffect(() => {
    waveNumberRef.current = waveNumber;
  }, [waveNumber]);

  useEffect(() => {
    countdownRef.current = countdown;
  }, [countdown]);

  useEffect(() => {
    runCompleteRef.current = runComplete;
  }, [runComplete]);

  useEffect(() => {
    pausedRef.current = manualPaused || layoutPaused;
  }, [manualPaused, layoutPaused]);

  useEffect(() => {
    spawnIntervalRef.current = spawnInterval;
  }, [spawnInterval]);

  useEffect(() => {
    waveConfigRef.current = waveConfig;
  }, [waveConfig]);

  useEffect(() => {
    const { path, error } = computeRoute(pathCells);
    setRoute(path);
    routeRef.current = path;
    setRouteError(error);
  }, [pathCells]);

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 2400);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
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
      showToast("Invalid wave JSON.");
    }
  };

  const exportWaves = () => {
    const json = JSON.stringify(waveConfig, null, 2);
    setWaveJson(json);
    navigator.clipboard?.writeText(json).catch(() => {});
    showToast("Wave JSON copied to clipboard.");
  };

  const togglePathCell = (x: number, y: number) => {
    const key = keyFor({ x, y });
    const towerOnCell = towersRef.current.some(
      (tower) => tower.x === x && tower.y === y,
    );
    if (towerOnCell) {
      showToast("Remove the tower before painting this cell.");
      return;
    }
    setPathCells((cells) => {
      const set = new Set(cells.map(keyFor));
      if (set.has(key)) {
        return cells.filter((c) => !(c.x === x && c.y === y));
      }
      return [...cells, { x, y }];
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

  const handlePlacement = (cell: Vec) => {
    const key = keyFor(cell);
    if (pathSetRef.current.has(key)) {
      showToast("Towers cannot be placed on the route.");
      return;
    }
    if (goldRef.current < BASE_TOWER_COST) {
      showToast("Not enough gold to place a tower.");
      return;
    }
    setTowers((ts) => [...ts, { x: cell.x, y: cell.y, range: 1, damage: 1, level: 1 }]);
    setGold((g) => g - BASE_TOWER_COST);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    const coords = getCanvasCell(e.clientX, e.clientY);
    if (!coords) return;
    cursorRef.current = coords;
    if (editing) {
      togglePathCell(coords.x, coords.y);
      return;
    }
    const existing = towersRef.current.findIndex(
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
    const idx = towersRef.current.findIndex(
      (t) => t.x === coords.x && t.y === coords.y,
    );
    hoveredRef.current = idx >= 0 ? idx : null;
  };

  const handleCanvasLeave = () => {
    hoveredRef.current = null;
  };

  const handleCanvasContext = (e: React.MouseEvent) => {
    e.preventDefault();
    const coords = getCanvasCell(e.clientX, e.clientY);
    if (!coords) return;
    const idx = towersRef.current.findIndex(
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
      if (e.key === "ArrowUp") next.y = clamp(current.y - 1, 0, GRID_SIZE - 1);
      if (e.key === "ArrowDown") next.y = clamp(current.y + 1, 0, GRID_SIZE - 1);
      if (e.key === "ArrowLeft") next.x = clamp(current.x - 1, 0, GRID_SIZE - 1);
      if (e.key === "ArrowRight") next.x = clamp(current.x + 1, 0, GRID_SIZE - 1);
      cursorRef.current = next;
      return;
    }

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const current = cursorRef.current;
      if (editing) {
        togglePathCell(current.x, current.y);
      } else {
        const existing = towersRef.current.findIndex(
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
      if (selectedRef.current !== null) {
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

  const spawnEnemyInstance = () => {
    const path = routeRef.current;
    if (!path.length) return;
    const wave = waveConfigRef.current[waveNumberRef.current - 1] || [];
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

  const tickEnemies = (dt: number) => {
    const path = routeRef.current;
    if (!path.length) return;

    const survivors: EnemyInstance[] = [];

    for (const enemy of enemiesRef.current) {
      let { pathIndex, progress } = enemy;
      let x = enemy.x;
      let y = enemy.y;

      let reachedGoal = false;

      while (true) {
        const nextIndex = pathIndex + 1;
        if (!path[nextIndex]) break;
        const current = path[pathIndex];
        const next = path[nextIndex];
        const dx = next.x - current.x;
        const dy = next.y - current.y;
        const segmentLength = Math.hypot(dx, dy) || 1;
        const step = (enemy.baseSpeed * dt) / CELL_SIZE;
        progress += step / segmentLength;
        if (progress < 1) {
          x = current.x + dx * progress;
          y = current.y + dy * progress;
          break;
        }
        progress -= 1;
        pathIndex = nextIndex;
        x = next.x;
        y = next.y;
      }

      if (pathIndex >= path.length - 1) {
        reachedGoal = true;
      }

      if (reachedGoal) {
        enemy.active = false;
        setLives((prev) => Math.max(prev - 1, 0));
        continue;
      }

      enemy.x = x;
      enemy.y = y;
      enemy.pathIndex = pathIndex;
      enemy.progress = progress;
      survivors.push(enemy);
    }

    enemiesRef.current = survivors;
  };

  const towerAttack = (dt: number) => {
    const enemies = enemiesRef.current;
    if (!enemies.length) return;

    const bounty: Record<string, number> = {
      fast: 3,
      tank: 6,
    };

    towersRef.current.forEach((tower) => {
      const key = keyFor({ x: tower.x, y: tower.y });
      const currentCooldown = cooldownsRef.current.get(key) ?? 0;
      const nextCooldown = Math.max(0, currentCooldown - dt);
      cooldownsRef.current.set(key, nextCooldown);
      if (nextCooldown > 0) return;

      const target = enemies.find((enemy) =>
        Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range,
      );
      if (!target) return;

      target.health -= tower.damage;
      cooldownsRef.current.set(key, getTowerCooldown(tower.level));
      shotLinesRef.current.push({
        x1: tower.x,
        y1: tower.y,
        x2: target.x,
        y2: target.y,
        life: 0.25,
      });
      damageNumbersRef.current.push({
        x: target.x,
        y: target.y,
        value: tower.damage,
        life: 1,
      });
      hitRingsRef.current.push({
        x: target.x,
        y: target.y,
        life: 1,
      });
    });

    const survivors: EnemyInstance[] = [];
    enemies.forEach((enemy) => {
      if (enemy.health > 0) {
        survivors.push(enemy);
        return;
      }
      enemy.active = false;
      const reward = bounty[enemy.type ?? 'fast'] ?? 2;
      setGold((prev) => prev + reward);
    });

    enemiesRef.current = survivors;
  };

  const updateEffects = (dt: number) => {
    damageNumbersRef.current.forEach((d) => {
      d.y -= dt * 0.5;
      d.life -= dt * 1.5;
    });
    damageNumbersRef.current = damageNumbersRef.current.filter((d) => d.life > 0);

    hitRingsRef.current.forEach((t) => {
      t.life -= dt * 2;
    });
    hitRingsRef.current = hitRingsRef.current.filter((t) => t.life > 0);

    shotLinesRef.current.forEach((s) => {
      s.life -= dt * 3;
    });
    shotLinesRef.current = shotLinesRef.current.filter((s) => s.life > 0);
  };

  const updateWaveFlow = (dt: number) => {
    if (countdownRef.current !== null) {
      const next = countdownRef.current - dt;
      countdownRef.current = next;
      if (next <= 0) {
        countdownRef.current = null;
        setCountdown(null);
        runningRef.current = true;
        spawnTimerRef.current = 0;
        enemiesSpawnedRef.current = 0;
      } else {
        setCountdown(next);
      }
      return;
    }

    if (!runningRef.current) return;

    spawnTimerRef.current += dt;
    const currentWave = waveConfigRef.current[waveNumberRef.current - 1] || [];
    if (
      spawnTimerRef.current >= spawnIntervalRef.current &&
      enemiesSpawnedRef.current < currentWave.length
    ) {
      spawnTimerRef.current = 0;
      spawnEnemyInstance();
      enemiesSpawnedRef.current += 1;
    }

    if (
      enemiesSpawnedRef.current >= currentWave.length &&
      enemiesRef.current.length === 0
    ) {
      runningRef.current = false;
      if (waveNumberRef.current < waveConfigRef.current.length) {
        waveNumberRef.current += 1;
        setWaveNumber(waveNumberRef.current);
        countdownRef.current = 4;
        setCountdown(4);
      } else {
        runCompleteRef.current = true;
        setRunComplete(true);
      }
    }
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const desiredSize = CANVAS_SIZE * dpr;
    if (canvas.width !== desiredSize || canvas.height !== desiredSize) {
      canvas.width = desiredSize;
      canvas.height = desiredSize;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

    ctx.fillStyle = "rgba(255,255,0,0.18)";
    pathCellsRef.current.forEach((c) => {
      ctx.fillRect(c.x * CELL_SIZE, c.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    if (routeRef.current.length) {
      ctx.strokeStyle = "rgba(0,255,255,0.9)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      routeRef.current.forEach((cell, idx) => {
        const px = cell.x * CELL_SIZE + CELL_SIZE / 2;
        const py = cell.y * CELL_SIZE + CELL_SIZE / 2;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    const start = pathCellsRef.current[0];
    const goal = pathCellsRef.current[pathCellsRef.current.length - 1];
    if (start) {
      ctx.fillStyle = "rgba(0,255,0,0.6)";
      ctx.fillRect(
        start.x * CELL_SIZE + 6,
        start.y * CELL_SIZE + 6,
        CELL_SIZE - 12,
        CELL_SIZE - 12,
      );
    }
    if (goal) {
      ctx.fillStyle = "rgba(255,0,0,0.6)";
      ctx.fillRect(
        goal.x * CELL_SIZE + 6,
        goal.y * CELL_SIZE + 6,
        CELL_SIZE - 12,
        CELL_SIZE - 12,
      );
    }

    towersRef.current.forEach((tower, i) => {
      ctx.fillStyle = "#24f0ff";
      ctx.fillRect(
        tower.x * CELL_SIZE + 8,
        tower.y * CELL_SIZE + 8,
        CELL_SIZE - 16,
        CELL_SIZE - 16,
      );
      if (selectedRef.current === i || hoveredRef.current === i) {
        ctx.strokeStyle = "rgba(255,255,0,0.9)";
        ctx.beginPath();
        ctx.arc(
          tower.x * CELL_SIZE + CELL_SIZE / 2,
          tower.y * CELL_SIZE + CELL_SIZE / 2,
          tower.range * CELL_SIZE,
          0,
          Math.PI * 2,
        );
        ctx.stroke();
      }
    });

    enemiesRef.current.forEach((enemy) => {
      ctx.fillStyle = "#ff4b4b";
      ctx.beginPath();
      ctx.arc(
        enemy.x * CELL_SIZE + CELL_SIZE / 2,
        enemy.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 4,
        0,
        Math.PI * 2,
      );
      ctx.fill();

      const hp = Math.max(0, enemy.health);
      const maxHealth =
        ENEMY_TYPES[enemy.type as keyof typeof ENEMY_TYPES]?.health ?? enemy.health;
      const hpWidth = (CELL_SIZE / 2) * (hp / Math.max(1, maxHealth));
      ctx.fillStyle = "#111";
      ctx.fillRect(
        enemy.x * CELL_SIZE + CELL_SIZE / 4,
        enemy.y * CELL_SIZE + 6,
        CELL_SIZE / 2,
        4,
      );
      ctx.fillStyle = "#4ade80";
      ctx.fillRect(
        enemy.x * CELL_SIZE + CELL_SIZE / 4,
        enemy.y * CELL_SIZE + 6,
        hpWidth,
        4,
      );
    });

    shotLinesRef.current.forEach((shot) => {
      ctx.strokeStyle = `rgba(36,240,255,${shot.life * 2})`;
      ctx.beginPath();
      ctx.moveTo(shot.x1 * CELL_SIZE + CELL_SIZE / 2, shot.y1 * CELL_SIZE + CELL_SIZE / 2);
      ctx.lineTo(shot.x2 * CELL_SIZE + CELL_SIZE / 2, shot.y2 * CELL_SIZE + CELL_SIZE / 2);
      ctx.stroke();
    });

    hitRingsRef.current.forEach((ring) => {
      ctx.strokeStyle = `rgba(255,0,0,${ring.life})`;
      ctx.beginPath();
      ctx.arc(
        ring.x * CELL_SIZE + CELL_SIZE / 2,
        ring.y * CELL_SIZE + CELL_SIZE / 2,
        (CELL_SIZE / 2) * (1 - ring.life * 0.5),
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

    if (canvasFocusedRef.current) {
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(
        cursorRef.current.x * CELL_SIZE + 2,
        cursorRef.current.y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4,
      );
      ctx.setLineDash([]);
    }
  };

  useEffect(() => {
    let active = true;
    const frame = (time: number) => {
      if (!active) return;
      const dt = clamp((time - lastTimeRef.current) / 1000, 0, 0.05);
      lastTimeRef.current = time;

      if (!pausedRef.current) {
        updateWaveFlow(dt);
        if (runningRef.current) {
          tickEnemies(dt);
          towerAttack(dt);
        }
        updateEffects(dt);
      }

      draw();

      if (time - uiUpdateRef.current > 250) {
        uiUpdateRef.current = time;
        setCountdown(countdownRef.current);
      }

      rafId.current = requestAnimationFrame(frame);
    };

    lastTimeRef.current = performance.now();
    rafId.current = requestAnimationFrame(frame);

    return () => {
      active = false;
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const resetRun = () => {
    enemiesRef.current = [];
    enemyPool.current.forEach((enemy) => {
      enemy.active = false;
    });
    enemiesSpawnedRef.current = 0;
    spawnTimerRef.current = 0;
    runningRef.current = false;
    countdownRef.current = null;
    setCountdown(null);
    waveNumberRef.current = 1;
    setWaveNumber(1);
    setGold(INITIAL_GOLD);
    setLives(INITIAL_LIVES);
    setRunComplete(false);
    runCompleteRef.current = false;
    setManualPaused(false);
    damageNumbersRef.current = [];
    hitRingsRef.current = [];
    shotLinesRef.current = [];
    cooldownsRef.current = new Map();
  };

  const start = () => {
    if (routeRef.current.length < 2) {
      showToast("Finish a valid route before launching waves.");
      return;
    }
    setEditing(false);
    resetRun();
    countdownRef.current = 2.5;
    setCountdown(2.5);
  };

  const clearRoute = () => {
    resetRun();
    setEditing(true);
    setPathCells([]);
    setRoute([]);
    routeRef.current = [];
    setRouteError("Paint at least two cells to define a route.");
  };

  const clearTowers = () => {
    setTowers([]);
    setSelected(null);
    cooldownsRef.current = new Map();
  };

  const sellTower = (index: number) => {
    setTowers((ts) => {
      const tower = ts[index];
      if (!tower) return ts;
      setGold((g) => g + getTowerSellValue(tower));
      const next = ts.filter((_, i) => i !== index);
      return next;
    });
    setSelected(null);
  };

  const upgrade = (type: "range" | "damage") => {
    if (selectedRef.current === null) return;
    const tower = towersRef.current[selectedRef.current];
    if (!tower) return;
    const cost = getUpgradeCost(tower.level);
    if (goldRef.current < cost) {
      showToast("Not enough gold for that upgrade.");
      return;
    }
    setGold((g) => g - cost);
    setTowers((ts) => {
      const updated = { ...ts[selectedRef.current!] };
      upgradeTower(updated, type);
      const next = [...ts];
      next[selectedRef.current!] = updated;
      return next;
    });
  };

  const selectedTower = useMemo(
    () => (selected !== null ? towers[selected] : null),
    [selected, towers],
  );

  const currentWave = waveConfig[waveNumber - 1] || [];
  const enemiesRemaining =
    Math.max(currentWave.length - enemiesSpawnedRef.current, 0) +
    enemiesRef.current.length;
  const modeLabel = editing
    ? "Path Editing"
    : runningRef.current
    ? "Defense Active"
    : "Planning";

  const waveStatus = runComplete
    ? "All waves cleared"
    : countdown !== null
    ? `Next wave in ${Math.ceil(countdown)}s`
    : runningRef.current
    ? `${enemiesRemaining} enemies remaining`
    : `${waveConfig.length} wave${waveConfig.length === 1 ? "" : "s"} queued`;

  const instructions = editing
    ? "Click or press Enter/Space to paint route cells. Start is first cell; goal is last."
    : "Place/select towers to defend the route. Right-click or Delete to sell.";

  const routeValid = route.length >= 2 && !routeError;

  return (
    <GameLayout
      gameId="tower-defense"
      onPauseChange={(paused) => setLayoutPaused(paused)}
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
                  <div className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/95 px-2 py-1 font-medium uppercase tracking-wide text-[color:var(--kali-text)] shadow-kali-panel backdrop-blur">
                    <p className="text-[0.65rem] text-[color:var(--kali-text)] opacity-80 sm:text-xs">
                      Wave {waveNumber}
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
                      {lives} lives · {gold} gold
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
            </div>
            <p className="w-full max-w-[420px] text-center text-[0.65rem] text-[color:var(--kali-text)] opacity-80">
              {instructions}
            </p>
            {routeError && (
              <p className="w-full max-w-[420px] rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel)]/80 px-2 py-1 text-center text-[0.65rem] text-kali-severity-high">
                {routeError}
              </p>
            )}
            <div className="flex w-full max-w-[420px] flex-wrap items-center justify-center gap-2 text-xs sm:text-sm">
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-[color:var(--kali-panel-highlight)] px-3 py-1 font-medium text-[color:var(--kali-text)] transition hover:bg-[color:var(--kali-panel)] disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setEditing((e) => !e)}
                disabled={runningRef.current || countdown !== null}
              >
                {editing ? "Finish Editing" : "Edit Route"}
              </button>
              <button
                type="button"
                className="rounded-md border border-[color:var(--kali-border)] bg-kali-severity-high px-3 py-1 font-semibold text-white transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={start}
                disabled={!routeValid || runningRef.current || countdown !== null}
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
              Wave Designer
            </h2>
            <p className="mt-1 text-[0.7rem] text-[color:var(--kali-text)] opacity-80">
              Queue enemy types for each wave. Empty waves advance automatically, and spawn pacing is adjustable below.
            </p>
            <div className="mt-3 space-y-2 max-h-56 overflow-y-auto pr-1">
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
              Spawn Interval ({spawnInterval.toFixed(1)}s)
            </label>
            <input
              id="spawn-interval"
              type="range"
              min={0.4}
              max={1.8}
              step={0.1}
              value={spawnInterval}
              onChange={(e) => setSpawnInterval(Number(e.target.value))}
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
                      disabled={gold < getUpgradeCost(selectedTower.level)}
                    >
                      Increase Range ({getUpgradeCost(selectedTower.level)}g)
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-[color:var(--kali-border)] bg-kali-control px-3 py-1 font-medium text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                      onClick={() => upgrade("damage")}
                      disabled={gold < getUpgradeCost(selectedTower.level)}
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
        {!editing && <DpsCharts towers={towers} />}
      </div>
    </GameLayout>
  );
};

export default TowerDefense;
