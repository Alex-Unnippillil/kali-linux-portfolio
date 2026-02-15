import type { LaneKind } from '../../../components/apps/frogger/types';

export interface LaneDef {
  y: number;
  dir: 1 | -1;
  speed: number;
  spawnRate: number;
  length: number;
  kind: LaneKind;
}

export interface LaneConfiguration {
  cars: LaneDef[];
  logs: LaneDef[];
}

export interface FroggerRuleset {
  id: 'classic' | 'compact';
  label: string;
  homePositions: number[];
  boardWidth: number;
  boardHeight: number;
}

export const RULESETS: FroggerRuleset[] = [
  {
    id: 'classic',
    label: 'Classic Arcade',
    homePositions: [1, 4, 6, 8, 11],
    boardWidth: 13,
    boardHeight: 13,
  },
  {
    id: 'compact',
    label: 'Portfolio Compact',
    homePositions: [1, 4, 6, 8, 11],
    boardWidth: 13,
    boardHeight: 13,
  },
];

export const carLaneDefs: LaneDef[] = [
  { y: 7, dir: 1, speed: 2.2, spawnRate: 1.4, length: 2, kind: 'car' },
  { y: 8, dir: -1, speed: 2.7, spawnRate: 1.2, length: 2, kind: 'car' },
  { y: 9, dir: 1, speed: 3.2, spawnRate: 1.2, length: 2, kind: 'car' },
  { y: 10, dir: -1, speed: 2.8, spawnRate: 1.1, length: 3, kind: 'car' },
  { y: 11, dir: 1, speed: 3.5, spawnRate: 1.05, length: 2, kind: 'car' },
];

export const logLaneDefs: LaneDef[] = [
  { y: 1, dir: -1, speed: 1.5, spawnRate: 1.7, length: 3, kind: 'log' },
  { y: 2, dir: 1, speed: 1.7, spawnRate: 1.8, length: 2, kind: 'turtle' },
  { y: 3, dir: -1, speed: 1.8, spawnRate: 1.5, length: 3, kind: 'log' },
  { y: 4, dir: 1, speed: 1.9, spawnRate: 1.8, length: 2, kind: 'turtle' },
  { y: 5, dir: -1, speed: 2.1, spawnRate: 1.55, length: 3, kind: 'gator' },
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
  speed: base.speed * diffMult * (1 + (level - 1) * 0.08),
  spawnRate: Math.max(minSpawn, base.spawnRate * (1 - (level - 1) * 0.04)),
});

export const generateLaneConfig = (
  level: number,
  diffMult = 1,
  config: LaneConfiguration = baseLaneConfig,
): LaneConfiguration => ({
  cars: config.cars.map((l) => rampLane(l, level, 0.6, diffMult)),
  logs: config.logs.map((l) => rampLane(l, level, 0.8, diffMult)),
});

export const SKINS = {
  spring: {
    water: '#0f172a',
    waterHighlight: '#38bdf8',
    waterShadow: '#082f49',
    ripple: '#38bdf8',
    grass: '#0f766e',
    grassHighlight: '#2dd4bf',
    pad: '#a7f3d0',
    padHighlight: '#d1fae5',
    padShadow: '#0d9488',
    frog: '#22c55e',
    frogLight: '#86efac',
    frogShadow: '#15803d',
    frogOutline: '#052e16',
    car: '#f97316',
    carLight: '#fdba74',
    carShadow: '#7c2d12',
    carAccent: '#fed7aa',
    log: '#d97706',
    logLight: '#fbbf24',
    logShadow: '#78350f',
    roadLight: '#334155',
    roadDark: '#0f172a',
    laneStripe: '#cbd5f5',
    laneEdge: '#0b1120',
    hudBg: 'rgba(15,23,42,0.82)',
    hudText: '#f8fafc',
    hudAccent: '#38bdf8',
  },
  highContrast: {
    water: '#102a43',
    waterHighlight: '#5dfdcb',
    waterShadow: '#0b7285',
    ripple: '#5dfdcb',
    grass: '#0ead69',
    grassHighlight: '#8ce99a',
    pad: '#ffec99',
    padHighlight: '#ffe066',
    padShadow: '#f08c00',
    frog: '#ffe066',
    frogLight: '#fff3bf',
    frogShadow: '#d9480f',
    frogOutline: '#343a40',
    car: '#ff6b6b',
    carLight: '#ffc9c9',
    carShadow: '#c92a2a',
    carAccent: '#ffe3e3',
    log: '#ffd43b',
    logLight: '#fff3bf',
    logShadow: '#d9480f',
    roadLight: '#495057',
    roadDark: '#1b1f22',
    laneStripe: '#ffe066',
    laneEdge: '#212529',
    hudBg: 'rgba(16,32,43,0.9)',
    hudText: '#f8f9fa',
    hudAccent: '#5dfdcb',
  },
} as const;

export type SkinName = keyof typeof SKINS;
export type SkinGroup = 'vibrant' | 'accessible';
export const SKIN_GROUPS: Record<SkinGroup, SkinName[]> = {
  vibrant: ['spring'],
  accessible: ['highContrast'],
};

export const getRandomSkin = (group?: SkinGroup): SkinName => {
  const names = group ? SKIN_GROUPS[group] : (Object.keys(SKINS) as SkinName[]);
  return names[Math.floor(Math.random() * names.length)];
};
