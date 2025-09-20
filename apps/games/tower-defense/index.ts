export const GRID_SIZE = 10;
export const START = { x: 0, y: Math.floor(GRID_SIZE / 2) };
export const GOAL = { x: GRID_SIZE - 1, y: Math.floor(GRID_SIZE / 2) };

// ---- pathfinding with caching ----
let cachedKey = '';
let cachedPath: { x: number; y: number }[] = [];
export let pathComputationCount = 0;

export const getPath = (towers: { x: number; y: number }[]) => {
  const key = towers
    .map((t) => `${t.x},${t.y}`)
    .sort()
    .join('|');
  if (key === cachedKey && cachedPath.length) return cachedPath;
  pathComputationCount += 1;
  const path: { x: number; y: number }[] = [];
  for (let x = START.x; x <= GOAL.x; x += 1) {
    path.push({ x, y: START.y });
  }
  cachedKey = key;
  cachedPath = path;
  return path;
};

export const resetPathCache = () => {
  cachedKey = '';
  cachedPath = [];
  pathComputationCount = 0;
};

// ---- simple object pools ----
export type Projectile = {
  active: boolean;
  x: number;
  y: number;
  targetId: number;
  damage: number;
  speed: number;
};

export const createProjectilePool = (size: number): Projectile[] =>
  Array.from({ length: size }, () => ({
    active: false,
    x: 0,
    y: 0,
    targetId: 0,
    damage: 0,
    speed: 0,
  }));

export const fireProjectile = (
  pool: Projectile[],
  data: Omit<Projectile, 'active'>
) => {
  const p = pool.find((pr) => !pr.active);
  if (!p) return null;
  Object.assign(p, data, { active: true });
  return p;
};

export const deactivateProjectile = (p: Projectile) => {
  p.active = false;
};

export type Enemy = {
  active: boolean;
  id: number;
  x: number;
  y: number;
  pathIndex: number;
  progress: number;
  health: number;
  resistance: number;
  baseSpeed: number;
  slow: null | { amount: number; duration: number };
  dot: null | { damage: number; duration: number };
  type?: string;
};

export const createEnemyPool = (size: number): Enemy[] =>
  Array.from({ length: size }, () => ({
    active: false,
    id: 0,
    x: 0,
    y: 0,
    pathIndex: 0,
    progress: 0,
    health: 0,
    resistance: 0,
    baseSpeed: 0,
    slow: null,
    dot: null,
    type: 'basic',
  }));

export const spawnEnemy = (pool: Enemy[], data: Omit<Enemy, 'active'>) => {
  const e = pool.find((en) => !en.active);
  if (!e) return null;
  Object.assign(e, data, { active: true });
  return e;
};

export const deactivateEnemy = (e: Enemy) => {
  e.active = false;
};

// ---- sprite cache ----
const spriteCache: Record<string, HTMLImageElement> = {};
export const loadSprite = (src: string) => {
  if (!spriteCache[src]) {
    const img = new Image();
    img.src = src;
    spriteCache[src] = img;
  }
  return spriteCache[src];
};

export const clearSpriteCache = () => {
  Object.keys(spriteCache).forEach((k) => delete spriteCache[k]);
};

// ---- tower stats and upgrades ----
export const TOWER_TYPES = {
  single: [
    { range: 1, damage: 1 },
    { range: 2, damage: 2 },
    { range: 3, damage: 3 },
  ],
} as const;

export type TowerType = keyof typeof TOWER_TYPES;

export const getTowerDPS = (type: TowerType, level: number) => {

  const stats = TOWER_TYPES[type]?.[level - 1];
  if (!stats) return 0;
  return stats.damage; // 1 shot per second
};

export const ENEMY_TYPES = {
  fast: { speed: 60, health: 5 },
  tank: { speed: 30, health: 15 },
};

export type Tower = {
  x: number;
  y: number;
  range: number;
  damage: number;
  level: number;
  type?: TowerType;
};

export const upgradeTower = (tower: Tower, path: 'range' | 'damage') => {
  tower.level += 1;
  if (path === 'range') tower.range += 1;
  else tower.damage += 1;
};

type LevelVec = { x: number; y: number };

export type LevelData = {
  path: LevelVec[];
  spawners: LevelVec[];
  towers: Tower[];
  waves: (keyof typeof ENEMY_TYPES)[][];
};

const ensureNumber = (value: unknown, label: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid number for ${label}`);
  }
  return value;
};

const cloneVecArray = (arr: LevelVec[]) =>
  arr.map(({ x, y }) => ({ x, y }));

const sanitizeTower = (tower: Tower): Tower => {
  const base: Tower = {
    x: tower.x,
    y: tower.y,
    range: tower.range,
    damage: tower.damage,
    level: tower.level,
  };
  if (tower.type) base.type = tower.type;
  return base;
};

export const serializeLevelData = (data: LevelData) =>
  JSON.stringify(
    {
      path: cloneVecArray(data.path),
      spawners: cloneVecArray(data.spawners),
      towers: data.towers.map(sanitizeTower),
      waves: data.waves.map((wave) => [...wave]),
    },
    null,
    2,
  );

const ensureVecArray = (value: unknown, label: string): LevelVec[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(`Level ${label} must be an array`);
  }
  return value.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Level ${label}[${idx}] must be an object`);
    }
    const record = item as Record<string, unknown>;
    return {
      x: ensureNumber(record.x, `${label}[${idx}].x`),
      y: ensureNumber(record.y, `${label}[${idx}].y`),
    };
  });
};

const ensureTowers = (value: unknown): Tower[] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error('Level towers must be an array');
  }
  return value.map((item, idx) => {
    if (!item || typeof item !== 'object') {
      throw new Error(`Level towers[${idx}] must be an object`);
    }
    const record = item as Record<string, unknown>;
    const tower: Tower = {
      x: ensureNumber(record.x, `towers[${idx}].x`),
      y: ensureNumber(record.y, `towers[${idx}].y`),
      range: ensureNumber(record.range, `towers[${idx}].range`),
      damage: ensureNumber(record.damage, `towers[${idx}].damage`),
      level: ensureNumber(record.level, `towers[${idx}].level`),
    };
    if (record.type !== undefined) {
      if (typeof record.type !== 'string' || !(record.type in TOWER_TYPES)) {
        throw new Error(`Invalid tower type at towers[${idx}]`);
      }
      tower.type = record.type as TowerType;
    }
    return tower;
  });
};

const ensureWaves = (
  value: unknown,
): (keyof typeof ENEMY_TYPES)[][] => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error('Level waves must be an array');
  }
  return value.map((wave, waveIndex) => {
    if (!Array.isArray(wave)) {
      throw new Error(`Level waves[${waveIndex}] must be an array`);
    }
    return wave.map((type, enemyIndex) => {
      if (typeof type !== 'string' || !(type in ENEMY_TYPES)) {
        throw new Error(
          `Invalid enemy type at waves[${waveIndex}][${enemyIndex}]`,
        );
      }
      return type as keyof typeof ENEMY_TYPES;
    });
  });
};

export const deserializeLevelData = (json: string): LevelData => {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (error) {
    throw new Error('Invalid level JSON');
  }
  if (!raw || typeof raw !== 'object') {
    throw new Error('Level JSON must be an object');
  }
  const record = raw as Record<string, unknown>;
  return {
    path: ensureVecArray(record.path, 'path'),
    spawners: ensureVecArray(record.spawners, 'spawners'),
    towers: ensureTowers(record.towers),
    waves: ensureWaves(record.waves),
  };
};
