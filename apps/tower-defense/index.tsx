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
  TOWER_TYPES,
} from "../games/tower-defense";

const GRID_SIZE = 10;
const CELL_SIZE = 40;
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE;

type Vec = { x: number; y: number };
type EditorTool = "path" | "spawner" | "tower" | "erase";

const DIRS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const cellKey = (value: Vec) => `${value.x},${value.y}`;

const clampCoord = (value: number) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(GRID_SIZE - 1, Math.max(0, Math.round(value)));
};

const isEnemyType = (
  value: unknown,
): value is keyof typeof ENEMY_TYPES =>
  typeof value === "string" && value in ENEMY_TYPES;

const normalizeVecArray = (value: unknown): Vec[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: Vec[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const { x, y } = item as Record<string, unknown>;
    if (typeof x !== "number" || typeof y !== "number") return;
    const vec = { x: clampCoord(x), y: clampCoord(y) };
    const key = cellKey(vec);
    if (seen.has(key)) return;
    seen.add(key);
    result.push(vec);
  });
  return result;
};

const normalizeTowers = (value: unknown): Tower[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: Tower[] = [];
  value.forEach((item) => {
    if (!item || typeof item !== "object") return;
    const { x, y, range, damage, level, type } = item as Record<string, unknown>;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      typeof range !== "number" ||
      typeof damage !== "number" ||
      typeof level !== "number"
    ) {
      return;
    }
    const vec = { x: clampCoord(x), y: clampCoord(y) };
    const key = cellKey(vec);
    if (seen.has(key)) return;
    seen.add(key);
    const normalized: Tower = {
      x: vec.x,
      y: vec.y,
      range: Math.max(0, range),
      damage: Math.max(0, damage),
      level: Math.max(1, Math.floor(level)),
    };
    if (typeof type === "string" && type in TOWER_TYPES) {
      normalized.type = type as Tower["type"];
    }
    result.push(normalized);
  });
  return result;
};

export type WaveSpawnConfig = {
  spawner: number;
  type: keyof typeof ENEMY_TYPES;
  count: number;
};

export type WaveDefinition = {
  name: string;
  spawns: WaveSpawnConfig[];
};

const normalizeWaveArray = (value: unknown): WaveDefinition[] => {
  if (!Array.isArray(value)) return [];
  return value.map((entry, index) => {
    if (Array.isArray(entry)) {
      const spawns = entry
        .map((type) =>
          isEnemyType(type)
            ? { spawner: 0, type, count: 1 }
            : null,
        )
        .filter(Boolean) as WaveSpawnConfig[];
      return { name: `Wave ${index + 1}`, spawns };
    }
    if (!entry || typeof entry !== "object") {
      return { name: `Wave ${index + 1}`, spawns: [] };
    }
    const obj = entry as Record<string, unknown>;
    const name = typeof obj.name === "string" && obj.name.trim()
      ? obj.name
      : `Wave ${index + 1}`;
    const rawSpawns = Array.isArray(obj.spawns) ? obj.spawns : [];
    const spawns = rawSpawns
      .map((spawn) => {
        if (!spawn || typeof spawn !== "object") return null;
        const spawnObj = spawn as Record<string, unknown>;
        const { spawner, type, count } = spawnObj;
        if (!isEnemyType(type)) return null;
        const spawnerIndex =
          typeof spawner === "number" && Number.isInteger(spawner) && spawner >= 0
            ? spawner
            : 0;
        const normalizedCount =
          typeof count === "number" && Number.isFinite(count)
            ? Math.max(1, Math.floor(count))
            : 1;
        return {
          spawner: spawnerIndex,
          type,
          count: normalizedCount,
        } satisfies WaveSpawnConfig;
      })
      .filter(Boolean) as WaveSpawnConfig[];
    return {
      name,
      spawns,
    };
  });
};

export type LevelData = {
  path: Vec[];
  spawners: Vec[];
  towers: Tower[];
  waves: WaveDefinition[];
};

const sanitizeLevelData = (data: LevelData): LevelData => {
  const path = normalizeVecArray(data.path);
  const spawners = normalizeVecArray(data.spawners);
  const towers = normalizeTowers(data.towers);
  const maxSpawnerIndex = spawners.length > 0 ? spawners.length - 1 : 0;
  const waves = normalizeWaveArray(data.waves).map((wave, index) => ({
    name: wave.name || `Wave ${index + 1}`,
    spawns: wave.spawns
      .filter((spawn) => isEnemyType(spawn.type))
      .map((spawn) => ({
        spawner: Math.min(
          maxSpawnerIndex,
          Math.max(0, Math.floor(spawn.spawner)),
        ),
        type: spawn.type,
        count: Math.max(1, Math.floor(spawn.count)),
      })),
  }));
  return { path, spawners, towers, waves };
};

export const serializeLevel = (data: LevelData) =>
  JSON.stringify(sanitizeLevelData(data), null, 2);

export const deserializeLevel = (json: string): LevelData => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { path: [], spawners: [], towers: [], waves: [] };
  }
  if (!parsed || typeof parsed !== "object") {
    return { path: [], spawners: [], towers: [], waves: [] };
  }
  const obj = parsed as Record<string, unknown>;
  const level: LevelData = {
    path: normalizeVecArray(obj.path),
    spawners: normalizeVecArray(obj.spawners),
    towers: normalizeTowers(obj.towers),
    waves: normalizeWaveArray(obj.waves),
  };
  return sanitizeLevelData(level);
};

const computeFlowField = (
  path: Vec[],
  towers: Tower[],
): Vec[][] | null => {
  if (path.length < 2) return null;
  const goal = path[path.length - 1];
  const pathSet = new Set(path.map(cellKey));
  const obstacles = new Set(towers.map(cellKey));
  if (!pathSet.has(cellKey(goal))) return null;
  const field: Vec[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => ({ x: 0, y: 0 })),
  );
  const visited = new Set<string>([cellKey(goal)]);
  const queue: Vec[] = [goal];
  while (queue.length) {
    const current = queue.shift()!;
    for (const dir of DIRS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;
      if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) continue;
      const neighbor = { x: nx, y: ny };
      const key = cellKey(neighbor);
      if (!pathSet.has(key) || obstacles.has(key) || visited.has(key)) continue;
      field[nx][ny] = { x: current.x - nx, y: current.y - ny };
      visited.add(key);
      queue.push(neighbor);
    }
  }
  return field;
};

interface EnemyInstance extends Enemy {
  pathIndex: number;
  progress: number;
}

type WaveEvent = { spawner: number; type: keyof typeof ENEMY_TYPES };

const toolLabels: Record<EditorTool, string> = {
  path: "Path",
  spawner: "Spawner",
  tower: "Tower",
  erase: "Erase",
};

const defaultWave = (index: number): WaveDefinition => ({
  name: `Wave ${index + 1}`,
  spawns: [],
});

const expandWave = (wave: WaveDefinition): WaveEvent[] => {
  const events: WaveEvent[] = [];
  wave.spawns.forEach((spawn) => {
    const total = Math.max(1, Math.floor(spawn.count));
    const spawnerIndex = Math.max(0, Math.floor(spawn.spawner));
    for (let i = 0; i < total; i += 1) {
      events.push({ spawner: spawnerIndex, type: spawn.type });
    }
  });
  return events;
};

const TowerDefense = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number>();
  const [editing, setEditing] = useState(true);
  const [activeTool, setActiveTool] = useState<EditorTool>("path");
  const [path, setPath] = useState<Vec[]>([]);
  const pathSetRef = useRef<Set<string>>(new Set());
  const [spawners, setSpawners] = useState<Vec[]>([]);
  const spawnerSetRef = useRef<Set<string>>(new Set());
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
  const flowFieldRef = useRef<Vec[][] | null>(null);
  const goalRef = useRef<Vec | null>(null);
  const spawnersRef = useRef<Vec[]>([]);
  const expandedWavesRef = useRef<WaveEvent[][]>([]);

  const [waveConfig, setWaveConfig] = useState<WaveDefinition[]>([
    defaultWave(0),
  ]);
  const [spawnDrafts, setSpawnDrafts] = useState<
    Record<number, WaveSpawnConfig>
  >({ 0: { spawner: 0, type: "fast", count: 1 } });
  const [waveJson, setWaveJson] = useState("");

  useEffect(() => {
    towersRef.current = towers;
  }, [towers]);

  useEffect(() => {
    spawnersRef.current = spawners;
  }, [spawners]);

  useEffect(() => {
    pathSetRef.current = new Set(path.map(cellKey));
  }, [path]);

  useEffect(() => {
    spawnerSetRef.current = new Set(spawners.map(cellKey));
  }, [spawners]);

  useEffect(() => {
    goalRef.current = path.length ? path[path.length - 1] : null;
    flowFieldRef.current = path.length >= 2 ? computeFlowField(path, towers) : null;
  }, [path, towers]);

  useEffect(() => {
    setWaveJson(JSON.stringify(waveConfig, null, 2));
    expandedWavesRef.current = waveConfig.map(expandWave);
  }, [waveConfig]);

  useEffect(() => {
    setSpawnDrafts((drafts) => {
      const next: Record<number, WaveSpawnConfig> = {};
      let changed = Object.keys(drafts).length !== waveConfig.length;
      waveConfig.forEach((_, index) => {
        const existing = drafts[index] ?? { spawner: 0, type: "fast", count: 1 };
        const sanitized: WaveSpawnConfig = {
          spawner:
            spawners.length === 0
              ? 0
              : Math.min(existing.spawner, Math.max(0, spawners.length - 1)),
          type: isEnemyType(existing.type) ? existing.type : "fast",
          count: existing.count > 0 ? Math.floor(existing.count) : 1,
        };
        if (
          !drafts[index] ||
          drafts[index].spawner !== sanitized.spawner ||
          drafts[index].type !== sanitized.type ||
          drafts[index].count !== sanitized.count
        ) {
          changed = true;
        }
        next[index] = sanitized;
      });
      return changed ? next : drafts;
    });
  }, [waveConfig, spawners.length]);

  const resetSimulation = () => {
    running.current = false;
    waveCountdownRef.current = null;
    waveRef.current = 1;
    enemiesSpawnedRef.current = 0;
    spawnTimer.current = 0;
    enemiesRef.current = [];
    damageNumbersRef.current = [];
    damageTicksRef.current = [];
  };

  const shiftSelectionAfterRemoval = (index: number) => {
    setSelected((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  };

  const togglePath = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return;
    const key = cellKey({ x, y });
    setPath((current) => {
      const set = pathSetRef.current;
      if (set.has(key)) {
        set.delete(key);
        return current.filter((cell) => !(cell.x === x && cell.y === y));
      }
      if (spawnerSetRef.current.has(key)) return current;
      if (towersRef.current.some((tower) => tower.x === x && tower.y === y)) {
        return current;
      }
      set.add(key);
      return [...current, { x, y }];
    });
  };

  const toggleSpawner = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return;
    const key = cellKey({ x, y });
    setSpawners((current) => {
      const set = spawnerSetRef.current;
      if (set.has(key)) {
        set.delete(key);
        return current.filter((spawner) => !(spawner.x === x && spawner.y === y));
      }
      if (!pathSetRef.current.has(key)) return current;
      if (towersRef.current.some((tower) => tower.x === x && tower.y === y)) {
        return current;
      }
      set.add(key);
      return [...current, { x, y }];
    });
  };

  const toggleTower = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return;
    const key = cellKey({ x, y });
    setTowers((current) => {
      const index = current.findIndex((tower) => tower.x === x && tower.y === y);
      if (index >= 0) {
        const next = current.filter((_, i) => i !== index);
        shiftSelectionAfterRemoval(index);
        return next;
      }
      if (pathSetRef.current.has(key) || spawnerSetRef.current.has(key)) {
        return current;
      }
      return [...current, { x, y, range: 1, damage: 1, level: 1 }];
    });
  };

  const eraseAt = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return;
    const key = cellKey({ x, y });
    setPath((current) => {
      const set = pathSetRef.current;
      if (!set.has(key)) return current;
      set.delete(key);
      return current.filter((cell) => !(cell.x === x && cell.y === y));
    });
    setSpawners((current) => {
      const set = spawnerSetRef.current;
      if (!set.has(key)) return current;
      set.delete(key);
      return current.filter((spawner) => !(spawner.x === x && spawner.y === y));
    });
    setTowers((current) => {
      const index = current.findIndex((tower) => tower.x === x && tower.y === y);
      if (index === -1) return current;
      const next = current.filter((_, i) => i !== index);
      shiftSelectionAfterRemoval(index);
      return next;
    });
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);
    if (editing) {
      switch (activeTool) {
        case "path":
          togglePath(x, y);
          break;
        case "spawner":
          toggleSpawner(x, y);
          break;
        case "tower":
          toggleTower(x, y);
          break;
        case "erase":
          eraseAt(x, y);
          break;
        default:
          break;
      }
      return;
    }
    const index = towersRef.current.findIndex(
      (tower) => tower.x === x && tower.y === y,
    );
    if (index >= 0) setSelected(index);
  };

  const handleCanvasMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.floor((event.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((event.clientY - rect.top) / CELL_SIZE);
    const index = towersRef.current.findIndex(
      (tower) => tower.x === x && tower.y === y,
    );
    setHovered(index >= 0 ? index : null);
  };

  const handleCanvasLeave = () => setHovered(null);

  const draw = () => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.strokeStyle = "#333";
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

    ctx.fillStyle = "rgba(255,215,0,0.25)";
    ctx.strokeStyle = "rgba(255,215,0,0.6)";
    path.forEach((cell) => {
      ctx.fillRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      ctx.strokeRect(cell.x * CELL_SIZE, cell.y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    });

    ctx.fillStyle = "rgba(0,255,0,0.25)";
    ctx.strokeStyle = "rgba(0,255,0,0.6)";
    spawners.forEach((spawner, index) => {
      ctx.fillRect(
        spawner.x * CELL_SIZE,
        spawner.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
      );
      ctx.strokeRect(
        spawner.x * CELL_SIZE,
        spawner.y * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
      );
      ctx.fillStyle = "rgba(0,255,0,0.8)";
      ctx.font = "12px sans-serif";
      ctx.fillText(
        String(index + 1),
        spawner.x * CELL_SIZE + 4,
        spawner.y * CELL_SIZE + 12,
      );
      ctx.fillStyle = "rgba(0,255,0,0.25)";
    });

    ctx.fillStyle = "rgba(80,160,255,1)";
    towers.forEach((tower, index) => {
      ctx.beginPath();
      ctx.arc(
        tower.x * CELL_SIZE + CELL_SIZE / 2,
        tower.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 3,
        0,
        Math.PI * 2,
      );
      ctx.fill();
      if (selected === index || hovered === index) {
        ctx.strokeStyle = "rgba(255,255,0,0.8)";
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

    ctx.fillStyle = "rgba(255,80,80,1)";
    enemiesRef.current.forEach((enemy) => {
      ctx.beginPath();
      ctx.arc(
        enemy.x * CELL_SIZE + CELL_SIZE / 2,
        enemy.y * CELL_SIZE + CELL_SIZE / 2,
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

    damageNumbersRef.current.forEach((damage) => {
      ctx.fillStyle = `rgba(255,255,255,${damage.life})`;
      ctx.font = "12px sans-serif";
      ctx.fillText(
        damage.value.toString(),
        damage.x * CELL_SIZE + CELL_SIZE / 2,
        damage.y * CELL_SIZE + CELL_SIZE / 2 - (1 - damage.life) * 10,
      );
    });
  };

  const spawnEnemyInstance = () => {
    const currentWave = expandedWavesRef.current[waveRef.current - 1] || [];
    const event = currentWave[enemiesSpawnedRef.current];
    if (!event) return;
    const spawner = spawnersRef.current[event.spawner];
    if (!spawner) return;
    const spec = ENEMY_TYPES[event.type];
    const enemy = spawnEnemy(enemyPool.current, {
      id: Date.now() + enemiesSpawnedRef.current,
      x: spawner.x,
      y: spawner.y,
      pathIndex: 0,
      progress: 0,
      health: spec.health,
      resistance: 0,
      baseSpeed: spec.speed,
      slow: null,
      dot: null,
      type: event.type,
    });
    if (enemy) enemiesRef.current.push(enemy as EnemyInstance);
  };

  const update = (time: number) => {
    const dt = (time - lastTime.current) / 1000;
    lastTime.current = time;

    if (waveCountdownRef.current !== null) {
      waveCountdownRef.current -= dt;
      forceRerender((value) => value + 1);
      if (waveCountdownRef.current <= 0) {
        waveCountdownRef.current = null;
        running.current = true;
        spawnTimer.current = 0;
        enemiesSpawnedRef.current = 0;
      }
    } else if (running.current) {
      spawnTimer.current += dt;
      const currentWave = expandedWavesRef.current[waveRef.current - 1] || [];
      if (
        spawnTimer.current >= 1 &&
        enemiesSpawnedRef.current < currentWave.length
      ) {
        spawnTimer.current = 0;
        spawnEnemyInstance();
        enemiesSpawnedRef.current += 1;
      }

      enemiesRef.current.forEach((enemy) => {
        const field = flowFieldRef.current;
        const goal = goalRef.current;
        if (!field || !goal) return;
        const cellX = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(enemy.x)));
        const cellY = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(enemy.y)));
        const vec = field[cellX]?.[cellY];
        if (!vec) return;
        const step = (enemy.baseSpeed * dt) / CELL_SIZE;
        enemy.x += vec.x * step;
        enemy.y += vec.y * step;
      });

      const goal = goalRef.current;
      enemiesRef.current = enemiesRef.current.filter((enemy) => {
        if (!goal) return enemy.health > 0;
        const reached =
          Math.floor(enemy.x) === goal.x && Math.floor(enemy.y) === goal.y;
        return enemy.health > 0 && !reached;
      });

      towersRef.current.forEach((tower) => {
        const mutableTower = tower as Tower & { cool?: number };
        mutableTower.cool = mutableTower.cool ? mutableTower.cool - dt : 0;
        if ((mutableTower.cool ?? 0) <= 0) {
          const target = enemiesRef.current.find(
            (enemy) => Math.hypot(enemy.x - tower.x, enemy.y - tower.y) <= tower.range,
          );
          if (target) {
            target.health -= tower.damage;
            damageNumbersRef.current.push({
              x: target.x,
              y: target.y,
              value: tower.damage,
              life: 1,
            });
            damageTicksRef.current.push({
              x: target.x,
              y: target.y,
              life: 1,
            });
            mutableTower.cool = 1;
          }
        }
      });

      damageNumbersRef.current.forEach((damage) => {
        damage.y -= dt * 0.5;
        damage.life -= dt * 2;
      });
      damageNumbersRef.current = damageNumbersRef.current.filter(
        (damage) => damage.life > 0,
      );

      damageTicksRef.current.forEach((tick) => {
        tick.life -= dt * 2;
      });
      damageTicksRef.current = damageTicksRef.current.filter(
        (tick) => tick.life > 0,
      );

      if (
        enemiesSpawnedRef.current >= currentWave.length &&
        enemiesRef.current.length === 0
      ) {
        running.current = false;
        if (waveRef.current < expandedWavesRef.current.length) {
          waveRef.current += 1;
          waveCountdownRef.current = 5;
        }
        forceRerender((value) => value + 1);
      }
    }

    draw();
    animationRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    lastTime.current = performance.now();
    animationRef.current = requestAnimationFrame(update);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = () => {
    const hasEnemies = expandedWavesRef.current.some((wave) => wave.length > 0);
    if (path.length < 2 || spawners.length === 0 || !hasEnemies) return;
    setEditing(false);
    resetSimulation();
    waveCountdownRef.current = 3;
    forceRerender((value) => value + 1);
  };

  const upgrade = (type: "range" | "damage") => {
    if (selected === null) return;
    setTowers((current) => {
      const next = [...current];
      const tower = { ...next[selected] };
      upgradeTower(tower, type);
      next[selected] = tower;
      return next;
    });
  };

  const addWave = () => {
    setWaveConfig((waves) => [...waves, defaultWave(waves.length)]);
  };

  const updateWaveName = (index: number, name: string) => {
    setWaveConfig((waves) =>
      waves.map((wave, i) => (i === index ? { ...wave, name } : wave)),
    );
  };

  const addSpawnToWave = (index: number) => {
    if (!spawners.length) return;
    const draft = spawnDrafts[index] ?? { spawner: 0, type: "fast", count: 1 };
    setWaveConfig((waves) =>
      waves.map((wave, i) =>
        i === index
          ? {
              ...wave,
              spawns: [
                ...wave.spawns,
                {
                  spawner: Math.min(
                    Math.max(0, Math.floor(draft.spawner)),
                    spawners.length - 1,
                  ),
                  type: draft.type,
                  count: Math.max(1, Math.floor(draft.count)),
                },
              ],
            }
          : wave,
      ),
    );
  };

  const removeSpawn = (waveIndex: number, spawnIndex: number) => {
    setWaveConfig((waves) =>
      waves.map((wave, i) =>
        i === waveIndex
          ? {
              ...wave,
              spawns: wave.spawns.filter((_, j) => j !== spawnIndex),
            }
          : wave,
      ),
    );
  };

  const updateSpawnDraftValue = (
    index: number,
    value: Partial<WaveSpawnConfig>,
  ) => {
    setSpawnDrafts((drafts) => {
      const current = drafts[index] ?? { spawner: 0, type: "fast", count: 1 };
      const nextDraft: WaveSpawnConfig = {
        spawner:
          value.spawner !== undefined
            ? Math.max(0, Math.floor(value.spawner))
            : current.spawner,
        type: value.type ?? current.type,
        count:
          value.count !== undefined
            ? Math.max(1, Math.floor(value.count))
            : current.count,
      };
      return { ...drafts, [index]: nextDraft };
    });
  };

  const importWaves = () => {
    try {
      const data = JSON.parse(waveJson);
      const normalized = normalizeWaveArray(data);
      setWaveConfig(normalized.length ? normalized : [defaultWave(0)]);
    } catch {
      alert("Invalid wave JSON");
    }
  };

  const exportWaves = () => {
    const json = JSON.stringify(waveConfig, null, 2);
    setWaveJson(json);
    navigator.clipboard?.writeText(json).catch(() => {});
  };

  const handleDownloadLevel = () => {
    const json = serializeLevel({
      path,
      spawners,
      towers,
      waves: waveConfig,
    });
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tower-defense-level.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const applyLevelData = (data: LevelData) => {
    const sanitized = sanitizeLevelData(data);
    setPath(sanitized.path);
    pathSetRef.current = new Set(sanitized.path.map(cellKey));
    setSpawners(sanitized.spawners);
    spawnerSetRef.current = new Set(sanitized.spawners.map(cellKey));
    setTowers(sanitized.towers);
    setWaveConfig(
      sanitized.waves.length ? sanitized.waves : [defaultWave(0)],
    );
    resetSimulation();
    setSelected(null);
    setEditing(true);
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        const level = deserializeLevel(reader.result);
        applyLevelData(level);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleToggleEditing = () => {
    setEditing((prev) => {
      const next = !prev;
      if (next) {
        resetSimulation();
      }
      return next;
    });
  };

  const canStart =
    waveCountdownRef.current === null &&
    !running.current &&
    path.length >= 2 &&
    spawners.length > 0 &&
    expandedWavesRef.current.some((wave) => wave.length > 0);

  return (
    <GameLayout gameId="tower-defense">
      <div className="p-2 space-y-3 text-sm text-gray-200">
        {waveCountdownRef.current !== null && (
          <div className="text-center bg-gray-700 text-white py-1 rounded">
            Wave {waveRef.current} in {Math.max(0, Math.ceil(waveCountdownRef.current))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={handleToggleEditing}
          >
            {editing ? "Play Level" : "Edit Level"}
          </button>
          <button
            className="px-2 py-1 bg-blue-700 rounded disabled:opacity-50"
            onClick={start}
            disabled={!canStart}
          >
            Start
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={handleDownloadLevel}
          >
            Download Level
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={openFilePicker}
          >
            Upload Level
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        {editing && (
          <div className="space-y-2 text-xs text-gray-300">
            <div className="flex flex-wrap gap-2">
              {(Object.keys(toolLabels) as EditorTool[]).map((tool) => (
                <button
                  key={tool}
                  className={`px-2 py-1 rounded border border-gray-700 ${
                    activeTool === tool ? "bg-blue-700" : "bg-gray-800"
                  }`}
                  onClick={() => setActiveTool(tool)}
                >
                  {toolLabels[tool]}
                </button>
              ))}
            </div>
            <p className="text-gray-400">
              Paths define where enemies can walk. Place spawners on the path and
              keep towers on open tiles. Use the erase tool to clear any tile.
            </p>
          </div>
        )}

        <div className="flex gap-2">
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="bg-black"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMove}
            onMouseLeave={handleCanvasLeave}
          />
          {selected !== null && towers[selected] && (
            <div className="ml-2 flex flex-col space-y-2 text-xs">
              <RangeUpgradeTree tower={towers[selected]} />
              <button
                className="bg-gray-700 px-2 py-1 rounded"
                onClick={() => upgrade("range")}
              >
                +Range
              </button>
              <button
                className="bg-gray-700 px-2 py-1 rounded"
                onClick={() => upgrade("damage")}
              >
                +Damage
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3 text-xs">
          <div className="space-y-2">
            {waveConfig.map((wave, index) => (
              <div
                key={index}
                className="border border-gray-700 rounded p-2 space-y-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-gray-100">
                    Wave {index + 1}
                  </span>
                  <input
                    className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-xs flex-1 min-w-[120px]"
                    value={wave.name}
                    onChange={(event) => updateWaveName(index, event.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  {wave.spawns.length === 0 ? (
                    <p className="text-gray-500">
                      No spawns yet. Use the controls below to add enemies.
                    </p>
                  ) : (
                    wave.spawns.map((spawn, spawnIndex) => (
                      <div
                        key={spawnIndex}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <span>
                          Spawner {spawn.spawner + 1} · {spawn.type} × {spawn.count}
                        </span>
                        <button
                          className="px-2 py-1 bg-gray-800 rounded"
                          onClick={() => removeSpawn(index, spawnIndex)}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col text-[10px] uppercase tracking-wide">
                    Spawner
                    <select
                      className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-xs"
                      value={Math.min(
                        spawners.length > 0
                          ? spawnDrafts[index]?.spawner ?? 0
                          : 0,
                        Math.max(0, spawners.length - 1),
                      )}
                      onChange={(event) =>
                        updateSpawnDraftValue(index, {
                          spawner: Number(event.target.value),
                        })
                      }
                    >
                      {spawners.length === 0 ? (
                        <option value={0}>Place a spawner</option>
                      ) : (
                        spawners.map((_, spawnerIndex) => (
                          <option key={spawnerIndex} value={spawnerIndex}>
                            Spawner {spawnerIndex + 1}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <label className="flex flex-col text-[10px] uppercase tracking-wide">
                    Enemy
                    <select
                      className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-xs"
                      value={spawnDrafts[index]?.type ?? "fast"}
                      onChange={(event) =>
                        updateSpawnDraftValue(index, {
                          type: event.target.value as keyof typeof ENEMY_TYPES,
                        })
                      }
                    >
                      {(Object.keys(ENEMY_TYPES) as (keyof typeof ENEMY_TYPES)[]).map(
                        (type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <label className="flex flex-col text-[10px] uppercase tracking-wide">
                    Count
                    <input
                      className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5 text-xs w-16"
                      type="number"
                      min={1}
                      value={spawnDrafts[index]?.count ?? 1}
                      onChange={(event) =>
                        updateSpawnDraftValue(index, {
                          count: Number(event.target.value) || 1,
                        })
                      }
                    />
                  </label>
                  <button
                    className="px-2 py-1 bg-gray-700 rounded disabled:opacity-50"
                    onClick={() => addSpawnToWave(index)}
                    disabled={!spawners.length}
                  >
                    Add Spawn
                  </button>
                </div>
              </div>
            ))}
            <button
              className="px-2 py-1 bg-gray-700 rounded"
              onClick={addWave}
            >
              Add Wave
            </button>
          </div>

          <div className="space-y-1">
            <textarea
              className="w-full bg-black text-white p-2 rounded h-32"
              value={waveJson}
              onChange={(event) => setWaveJson(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="px-2 py-1 bg-gray-700 rounded"
                onClick={importWaves}
              >
                Import JSON
              </button>
              <button
                className="px-2 py-1 bg-gray-700 rounded"
                onClick={exportWaves}
              >
                Copy JSON
              </button>
            </div>
          </div>
        </div>

        {!editing && <DpsCharts towers={towers} />}
      </div>
    </GameLayout>
  );
};

export default TowerDefense;

