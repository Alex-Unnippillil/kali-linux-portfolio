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

export type WaveConfig = (keyof typeof ENEMY_TYPES)[][];

export interface WaveRuntimeOptions {
  spawnInterval?: number;
  countdownDuration?: number;
  interWaveDelay?: number;
}

export interface WaveRuntimeState extends Required<WaveRuntimeOptions> {
  waves: WaveConfig;
  waveIndex: number;
  countdown: number | null;
  spawnTimer: number;
  spawned: number;
  running: boolean;
  completedWaves: number;
}

export interface WaveStepOptions {
  activeEnemies: number;
}

export interface WaveStepResult {
  spawnedTypes: (keyof typeof ENEMY_TYPES)[];
  waveStarted?: number;
  waveFinished?: number;
  allWavesCleared?: boolean;
  countdown?: number | null;
}

const DEFAULT_WAVE_OPTIONS: Required<WaveRuntimeOptions> = {
  spawnInterval: 1,
  countdownDuration: 3,
  interWaveDelay: 5,
};

export const createWaveRuntime = (
  waves: WaveConfig,
  options: WaveRuntimeOptions = {},
): WaveRuntimeState => ({
  waves,
  waveIndex: 0,
  countdown: null,
  spawnTimer: 0,
  spawned: 0,
  running: false,
  completedWaves: 0,
  spawnInterval: options.spawnInterval ?? DEFAULT_WAVE_OPTIONS.spawnInterval,
  countdownDuration:
    options.countdownDuration ?? DEFAULT_WAVE_OPTIONS.countdownDuration,
  interWaveDelay: options.interWaveDelay ?? DEFAULT_WAVE_OPTIONS.interWaveDelay,
});

export const armWaveCountdown = (
  state: WaveRuntimeState,
  duration?: number,
) => {
  state.countdown = duration ?? state.countdownDuration;
  state.running = false;
  state.spawnTimer = 0;
  state.spawned = 0;
};

export const stepWaveRuntime = (
  state: WaveRuntimeState,
  dt: number,
  { activeEnemies }: WaveStepOptions,
): WaveStepResult => {
  const result: WaveStepResult = { spawnedTypes: [] };

  if (state.countdown !== null) {
    state.countdown = Math.max(0, state.countdown - dt);
    if (state.countdown <= 0) {
      state.countdown = null;
      state.running = true;
      state.spawnTimer = 0;
      state.spawned = 0;
      result.waveStarted = state.waveIndex + 1;
    } else {
      result.countdown = state.countdown;
    }
    return result;
  }

  if (!state.running) {
    return result;
  }

  const wave = state.waves[state.waveIndex] ?? [];

  if (wave.length === 0) {
    state.running = false;
    state.waveIndex += 1;
    state.completedWaves += 1;
    result.waveFinished = state.completedWaves;
    if (state.waveIndex >= state.waves.length) {
      result.allWavesCleared = true;
    } else {
      armWaveCountdown(state, state.interWaveDelay);
      result.countdown = state.countdown;
    }
    return result;
  }

  state.spawnTimer += dt;

  while (state.spawned < wave.length && state.spawnTimer >= state.spawnInterval) {
    state.spawnTimer -= state.spawnInterval;
    const type = wave[state.spawned];
    state.spawned += 1;
    result.spawnedTypes.push(type);
  }

  if (state.spawned >= wave.length && activeEnemies === 0) {
    state.running = false;
    state.waveIndex += 1;
    state.completedWaves += 1;
    result.waveFinished = state.completedWaves;
    if (state.waveIndex >= state.waves.length) {
      result.allWavesCleared = true;
    } else {
      armWaveCountdown(state, state.interWaveDelay);
      result.countdown = state.countdown;
    }
  }

  return result;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const HIGH_SCORE_KEY = 'tower-defense:high-score';

const resolveStorage = (storage?: StorageLike): StorageLike | undefined => {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return undefined;
};

export const getHighScore = (storage?: StorageLike): number => {
  const store = resolveStorage(storage);
  if (!store) return 0;
  try {
    const raw = store.getItem(HIGH_SCORE_KEY);
    if (!raw) return 0;
    const value = Number.parseInt(raw, 10);
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
};

export const updateHighScore = (
  score: number,
  storage?: StorageLike,
): number => {
  if (!Number.isFinite(score) || score < 0) {
    return getHighScore(storage);
  }
  const store = resolveStorage(storage);
  if (!store) return score;
  const current = getHighScore(store);
  if (score > current) {
    try {
      store.setItem(HIGH_SCORE_KEY, String(score));
    } catch {
      // ignore persistence errors
    }
    return score;
  }
  return current;
};

