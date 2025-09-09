export interface LaneDef {
  y: number;
  dir: 1 | -1;
  speed: number;
  spawnRate: number;
  length: number;
}

export interface LaneConfiguration {
  cars: LaneDef[];
  logs: LaneDef[];
}

export const carLaneDefs: LaneDef[] = [
  { y: 4, dir: 1, speed: 1, spawnRate: 2, length: 1 },
  { y: 5, dir: -1, speed: 1.2, spawnRate: 1.8, length: 1 },
];

export const logLaneDefs: LaneDef[] = [
  { y: 1, dir: -1, speed: 0.5, spawnRate: 2.5, length: 2 },
  { y: 2, dir: 1, speed: 0.7, spawnRate: 2.2, length: 2 },
];

export const baseLaneConfig: LaneConfiguration = {
  cars: carLaneDefs,
  logs: logLaneDefs,
};

export const rampLane = (
  base: LaneDef,
  level: number,
  minSpawn: number,
  diffMult = 1,
): LaneDef => ({
  ...base,
  speed: base.speed * diffMult * (1 + (level - 1) * 0.2),
  spawnRate: Math.max(minSpawn, base.spawnRate * (1 - (level - 1) * 0.1)),
});

export const generateLaneConfig = (
  level: number,
  diffMult = 1,
  config: LaneConfiguration = baseLaneConfig,
): LaneConfiguration => ({
  cars: config.cars.map((l) => rampLane(l, level, 0.3, diffMult)),
  logs: config.logs.map((l) => rampLane(l, level, 0.5, diffMult)),
});

export const SKINS = {
  spring: {
    water: '#1e3a8a',
    grass: '#15803d',
    frog: '#22c55e',
    car: '#ef4444',
    log: '#d97706',
  },
  summer: {
    water: '#0ea5e9',
    grass: '#16a34a',
    frog: '#22c55e',
    car: '#dc2626',
    log: '#b45309',
  },
  autumn: {
    water: '#1e3a8a',
    grass: '#9a3412',
    frog: '#65a30d',
    car: '#f97316',
    log: '#92400e',
  },
  winter: {
    water: '#0ea5e9',
    grass: '#e5e7eb',
    frog: '#86efac',
    car: '#6b7280',
    log: '#4b5563',
  },
} as const;

export type SkinName = keyof typeof SKINS;

export const getDefaultSkin = (): SkinName => {
  const m = new Date().getMonth();
  if (m < 3) return 'winter';
  if (m < 6) return 'spring';
  if (m < 9) return 'summer';
  return 'autumn';
};

export const getRandomSkin = (): SkinName => {
  const names = Object.keys(SKINS) as SkinName[];
  return names[Math.floor(Math.random() * names.length)]!;
};
