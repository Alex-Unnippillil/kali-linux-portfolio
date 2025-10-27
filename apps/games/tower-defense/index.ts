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
export const RANGE_LEVELS = [1, 1.6, 2.3, 3] as const;
export const DAMAGE_LEVELS = [1, 1.7, 2.5, 3.4] as const;

export const TOWER_TYPES = {
  single: {
    rangeLevels: RANGE_LEVELS,
    damageLevels: DAMAGE_LEVELS,
  },
} as const;

export type TowerType = keyof typeof TOWER_TYPES;

export const getTowerDPS = (tower: Tower) => tower.damage;

export const ENEMY_TYPES = {
  fast: { speed: 48, health: 6 },
  tank: { speed: 26, health: 14 },
};

export type Tower = {
  x: number;
  y: number;
  range: number;
  damage: number;
  level: number;
  type?: TowerType;
  rangeLevel: number;
  damageLevel: number;
};

export const upgradeTower = (tower: Tower, path: 'range' | 'damage') => {
  if (path === 'range') {
    if (tower.rangeLevel >= TOWER_TYPES.single.rangeLevels.length - 1) {
      return tower;
    }
    const updated: Tower = {
      ...tower,
      rangeLevel: tower.rangeLevel + 1,
    };
    updated.range =
      TOWER_TYPES.single.rangeLevels[updated.rangeLevel];
    updated.damage =
      TOWER_TYPES.single.damageLevels[updated.damageLevel];
    updated.level = 1 + updated.rangeLevel + updated.damageLevel;
    return updated;
  }
  if (tower.damageLevel >= TOWER_TYPES.single.damageLevels.length - 1) {
    return tower;
  }
  const updated: Tower = {
    ...tower,
    damageLevel: tower.damageLevel + 1,
  };
  updated.damage =
    TOWER_TYPES.single.damageLevels[updated.damageLevel];
  updated.range = TOWER_TYPES.single.rangeLevels[updated.rangeLevel];
  updated.level = 1 + updated.rangeLevel + updated.damageLevel;
  return updated;
};

