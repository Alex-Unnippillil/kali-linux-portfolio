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
  summer: {
    water: '#082f49',
    waterHighlight: '#22d3ee',
    waterShadow: '#022c41',
    ripple: '#38d9a9',
    grass: '#047857',
    grassHighlight: '#10b981',
    pad: '#fef08a',
    padHighlight: '#facc15',
    padShadow: '#b45309',
    frog: '#22c55e',
    frogLight: '#4ade80',
    frogShadow: '#166534',
    frogOutline: '#052e16',
    car: '#fb7185',
    carLight: '#fda4af',
    carShadow: '#be123c',
    carAccent: '#fecdd3',
    log: '#b45309',
    logLight: '#f59e0b',
    logShadow: '#7c2d12',
    roadLight: '#475569',
    roadDark: '#111827',
    laneStripe: '#cbd5f5',
    laneEdge: '#0f172a',
    hudBg: 'rgba(13,23,33,0.85)',
    hudText: '#f1f5f9',
    hudAccent: '#38d9a9',
  },
  autumn: {
    water: '#1f2933',
    waterHighlight: '#60a5fa',
    waterShadow: '#0b1726',
    ripple: '#93c5fd',
    grass: '#9a3412',
    grassHighlight: '#f97316',
    pad: '#fed7aa',
    padHighlight: '#fef3c7',
    padShadow: '#b45309',
    frog: '#65a30d',
    frogLight: '#bef264',
    frogShadow: '#3f6212',
    frogOutline: '#1a2e05',
    car: '#f97316',
    carLight: '#fbbf24',
    carShadow: '#9a3412',
    carAccent: '#fed7aa',
    log: '#92400e',
    logLight: '#f59e0b',
    logShadow: '#78350f',
    roadLight: '#3f3f46',
    roadDark: '#1f1f23',
    laneStripe: '#fbbf24',
    laneEdge: '#111827',
    hudBg: 'rgba(30,23,15,0.85)',
    hudText: '#f5f5f4',
    hudAccent: '#f97316',
  },
  winter: {
    water: '#0e7490',
    waterHighlight: '#5eead4',
    waterShadow: '#0b3b52',
    ripple: '#38bdf8',
    grass: '#e5e7eb',
    grassHighlight: '#f8fafc',
    pad: '#bae6fd',
    padHighlight: '#e0f2fe',
    padShadow: '#0ea5e9',
    frog: '#86efac',
    frogLight: '#bbf7d0',
    frogShadow: '#22c55e',
    frogOutline: '#14532d',
    car: '#64748b',
    carLight: '#cbd5f5',
    carShadow: '#334155',
    carAccent: '#f8fafc',
    log: '#475569',
    logLight: '#94a3b8',
    logShadow: '#1f2937',
    roadLight: '#334155',
    roadDark: '#0f172a',
    laneStripe: '#cbd5f5',
    laneEdge: '#1e293b',
    hudBg: 'rgba(15,23,42,0.86)',
    hudText: '#f1f5f9',
    hudAccent: '#38bdf8',
  },
  neonNight: {
    water: '#060c1d',
    waterHighlight: '#38bdf8',
    waterShadow: '#020617',
    ripple: '#5eead4',
    grass: '#0f172a',
    grassHighlight: '#1d4ed8',
    pad: '#6366f1',
    padHighlight: '#a855f7',
    padShadow: '#312e81',
    frog: '#22d3ee',
    frogLight: '#67e8f9',
    frogShadow: '#0e7490',
    frogOutline: '#082f49',
    car: '#f97316',
    carLight: '#fb7185',
    carShadow: '#7c2d12',
    carAccent: '#facc15',
    log: '#facc15',
    logLight: '#fde68a',
    logShadow: '#b45309',
    roadLight: '#312e81',
    roadDark: '#0b1120',
    laneStripe: '#22d3ee',
    laneEdge: '#1e293b',
    hudBg: 'rgba(8,11,26,0.88)',
    hudText: '#e0f2fe',
    hudAccent: '#a855f7',
  },
  sunsetCruise: {
    water: '#311338',
    waterHighlight: '#f472b6',
    waterShadow: '#1f0730',
    ripple: '#fb7185',
    grass: '#7f1d1d',
    grassHighlight: '#fb7185',
    pad: '#fde68a',
    padHighlight: '#fbbf24',
    padShadow: '#b91c1c',
    frog: '#facc15',
    frogLight: '#fde68a',
    frogShadow: '#d97706',
    frogOutline: '#78350f',
    car: '#fb7185',
    carLight: '#f472b6',
    carShadow: '#9d174d',
    carAccent: '#fee2e2',
    log: '#f97316',
    logLight: '#fbbf24',
    logShadow: '#b45309',
    roadLight: '#4c1d95',
    roadDark: '#2e1065',
    laneStripe: '#facc15',
    laneEdge: '#1e1b4b',
    hudBg: 'rgba(33,14,49,0.88)',
    hudText: '#ffe4e6',
    hudAccent: '#f472b6',
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
  duskGuardian: {
    water: '#111827',
    waterHighlight: '#4f46e5',
    waterShadow: '#0b1220',
    ripple: '#818cf8',
    grass: '#1f2937',
    grassHighlight: '#4b5563',
    pad: '#c4b5fd',
    padHighlight: '#ddd6fe',
    padShadow: '#6d28d9',
    frog: '#c084fc',
    frogLight: '#e9d5ff',
    frogShadow: '#7c3aed',
    frogOutline: '#4c1d95',
    car: '#38bdf8',
    carLight: '#bae6fd',
    carShadow: '#0ea5e9',
    carAccent: '#e0f2fe',
    log: '#a78bfa',
    logLight: '#ddd6fe',
    logShadow: '#6d28d9',
    roadLight: '#312e81',
    roadDark: '#111827',
    laneStripe: '#38bdf8',
    laneEdge: '#1e1b4b',
    hudBg: 'rgba(17,23,42,0.88)',
    hudText: '#ede9fe',
    hudAccent: '#a855f7',
  },
} as const;

export type SkinName = keyof typeof SKINS;

export type SkinGroup = 'vibrant' | 'accessible';

export const SKIN_GROUPS: Record<SkinGroup, SkinName[]> = {
  vibrant: ['spring', 'summer', 'autumn', 'winter', 'neonNight', 'sunsetCruise'],
  accessible: ['highContrast', 'duskGuardian'],
};

export const getDefaultSkin = (): SkinName => {
  const m = new Date().getMonth();
  if (m < 3) return 'winter';
  if (m < 6) return 'spring';
  if (m < 9) return 'summer';
  return 'autumn';
};

export const getRandomSkin = (group?: SkinGroup): SkinName => {
  const names = group ? SKIN_GROUPS[group] : (Object.keys(SKINS) as SkinName[]);
  return names[Math.floor(Math.random() * names.length)];
};
