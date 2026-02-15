export type Vec = { x: number; y: number };

export type EnemyTypeKey = 'normal' | 'fast' | 'tank';
export type TowerTypeKey = 'basic' | 'rapid' | 'sniper' | 'splash';
export type TargetingMode = 'first' | 'strongest';

export type EnemySpec = {
  label: string;
  baseHp: number;
  speed: number; // cells per second
  reward: number;
  color: string;
};

export type TowerSpec = {
  label: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // shots per second
  projectileSpeed: number;
  targetingModes: TargetingMode[];
  splashRadius?: number;
  color: string;
  upgradeScaling: {
    damage: number;
    range: number;
    fireRate: number;
  };
};

export type WaveEnemyEntry = {
  type: EnemyTypeKey;
  count: number;
};

export type WaveConfig = {
  id: string;
  enemies: WaveEnemyEntry[];
  spawnInterval: number;
  rewardBonus: number;
};

export const GRID_SIZE = 12;

export const ENEMY_TYPES: Record<EnemyTypeKey, EnemySpec> = {
  normal: {
    label: 'Normal',
    baseHp: 28,
    speed: 1.1,
    reward: 5,
    color: '#fca5a5',
  },
  fast: {
    label: 'Fast',
    baseHp: 16,
    speed: 1.85,
    reward: 4,
    color: '#fde68a',
  },
  tank: {
    label: 'Tank',
    baseHp: 56,
    speed: 0.72,
    reward: 8,
    color: '#c4b5fd',
  },
};

export const TOWER_TYPES: Record<TowerTypeKey, TowerSpec> = {
  basic: {
    label: 'Basic',
    cost: 16,
    range: 2.2,
    damage: 10,
    fireRate: 1,
    projectileSpeed: 8,
    targetingModes: ['first', 'strongest'],
    color: '#38bdf8',
    upgradeScaling: {
      damage: 1.26,
      range: 1.07,
      fireRate: 1.1,
    },
  },
  rapid: {
    label: 'Rapid',
    cost: 20,
    range: 1.95,
    damage: 4,
    fireRate: 2.8,
    projectileSpeed: 11,
    targetingModes: ['first', 'strongest'],
    color: '#4ade80',
    upgradeScaling: {
      damage: 1.22,
      range: 1.06,
      fireRate: 1.12,
    },
  },
  sniper: {
    label: 'Sniper',
    cost: 32,
    range: 3.8,
    damage: 26,
    fireRate: 0.45,
    projectileSpeed: 13,
    targetingModes: ['strongest', 'first'],
    color: '#60a5fa',
    upgradeScaling: {
      damage: 1.34,
      range: 1.1,
      fireRate: 1.08,
    },
  },
  splash: {
    label: 'Splash',
    cost: 28,
    range: 2.35,
    damage: 12,
    fireRate: 0.7,
    projectileSpeed: 7,
    splashRadius: 1,
    targetingModes: ['first', 'strongest'],
    color: '#f97316',
    upgradeScaling: {
      damage: 1.24,
      range: 1.05,
      fireRate: 1.08,
    },
  },
};

export const getUpgradeCost = (towerType: TowerTypeKey, level: number) => {
  const base = Math.floor(TOWER_TYPES[towerType].cost * 0.65);
  return Math.max(8, Math.floor(base + level * 6));
};

export const getTowerStatsAtLevel = (
  type: TowerTypeKey,
  level: number,
): Pick<TowerSpec, 'range' | 'damage' | 'fireRate' | 'splashRadius'> => {
  const spec = TOWER_TYPES[type];
  const lvl = Math.max(1, level);
  const damage = spec.damage * spec.upgradeScaling.damage ** (lvl - 1);
  const range = spec.range * spec.upgradeScaling.range ** (lvl - 1);
  const fireRate = spec.fireRate * spec.upgradeScaling.fireRate ** (lvl - 1);
  const splashRadius = spec.splashRadius ? spec.splashRadius + (lvl - 1) * 0.08 : undefined;
  return { damage, range, fireRate, splashRadius };
};

export const getTowerDPS = (type: TowerTypeKey, level: number) => {
  const stats = getTowerStatsAtLevel(type, level);
  return stats.damage * stats.fireRate;
};
