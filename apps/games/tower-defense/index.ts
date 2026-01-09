export type Vec2 = { x: number; y: number };

export const GRID_SIZE = 12;

export const START: Vec2 = { x: 0, y: 5 };
export const GOAL: Vec2 = { x: GRID_SIZE - 1, y: 6 };

export const PATH: Vec2[] = [
  { x: 0, y: 5 },
  { x: 3, y: 5 },
  { x: 3, y: 8 },
  { x: 6, y: 8 },
  { x: 6, y: 3 },
  { x: 9, y: 3 },
  { x: 9, y: 6 },
  { x: 11, y: 6 },
];

export const buildPathCells = () => {
  const cells = new Set<string>();
  for (let i = 0; i < PATH.length - 1; i += 1) {
    const a = PATH[i];
    const b = PATH[i + 1];
    const dx = Math.sign(b.x - a.x);
    const dy = Math.sign(b.y - a.y);
    let x = a.x;
    let y = a.y;
    cells.add(`${x},${y}`);
    while (x !== b.x || y !== b.y) {
      x += dx;
      y += dy;
      cells.add(`${x},${y}`);
    }
  }
  return cells;
};

export const isPathCell = (x: number, y: number, pathCells: Set<string>) =>
  pathCells.has(`${x},${y}`);

export const isBuildableCell = (
  x: number,
  y: number,
  pathCells: Set<string>,
) =>
  x >= 0 &&
  y >= 0 &&
  x < GRID_SIZE &&
  y < GRID_SIZE &&
  !isPathCell(x, y, pathCells);

export type TowerType = "bolt" | "slow" | "pierce";

export type Tower = {
  id: string;
  x: number;
  y: number;
  type: TowerType;
  level: number;
  cooldown: number;
};

export const TOWER_LIBRARY: Record<
  TowerType,
  { cost: number; range: number; damage: number; fireRate: number; color: string }
> = {
  bolt: {
    cost: 20,
    range: 2.4,
    damage: 2,
    fireRate: 1.1,
    color: "#7af0ff",
  },
  slow: {
    cost: 28,
    range: 2,
    damage: 1.5,
    fireRate: 0.9,
    color: "#8ef58e",
  },
  pierce: {
    cost: 35,
    range: 2.8,
    damage: 3,
    fireRate: 0.7,
    color: "#ff9a3c",
  },
};

export const getTowerStats = (tower: Tower) => {
  const base = TOWER_LIBRARY[tower.type];
  const levelScale = 1 + (tower.level - 1) * 0.3;
  return {
    ...base,
    range: base.range * levelScale,
    damage: base.damage * levelScale,
    fireRate: base.fireRate * levelScale,
  };
};

export type EnemyType = "scout" | "brute" | "swarm";

export type Enemy = {
  id: string;
  type: EnemyType;
  pathIndex: number;
  health: number;
  maxHealth: number;
  speed: number;
  reward: number;
  position: Vec2;
  slowTimer?: number;
};

export const ENEMY_LIBRARY: Record<
  EnemyType,
  { health: number; speed: number; reward: number; color: string }
> = {
  scout: { health: 8, speed: 2.6, reward: 3, color: "#6dd7ff" },
  brute: { health: 18, speed: 1.6, reward: 6, color: "#ff6f91" },
  swarm: { health: 5, speed: 3.2, reward: 2, color: "#f7dd72" },
};

export const WAVE_PLAN: EnemyType[][] = [
  ["scout", "scout", "scout", "scout", "scout"],
  ["scout", "scout", "swarm", "swarm", "swarm", "scout"],
  ["brute", "scout", "scout", "swarm", "swarm"],
  ["brute", "brute", "swarm", "swarm", "swarm", "scout", "scout"],
  [
    "brute",
    "brute",
    "swarm",
    "swarm",
    "swarm",
    "swarm",
    "scout",
    "scout",
  ],
];

export const TEXTURES = {
  grid: "linear-gradient(135deg, rgba(48,96,130,0.4) 0%, rgba(24,38,54,0.6) 50%, rgba(12,22,32,0.85) 100%)",
  panel:
    "linear-gradient(180deg, rgba(10,24,38,0.95), rgba(8,16,28,0.9) 60%, rgba(4,10,20,0.95))",
  path: "repeating-linear-gradient(45deg, rgba(0, 255, 255, 0.12) 0 8px, rgba(0, 128, 255, 0.12) 8px 16px)",
};

export const formatWaveNumber = (wave: number) => `Wave ${wave}`;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const distance = (a: Vec2, b: Vec2) =>
  Math.hypot(a.x - b.x, a.y - b.y);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const positionAlongPath = (path: Vec2[], index: number) => {
  const clampedIndex = clamp(index, 0, path.length - 1);
  return path[clampedIndex];
};

export const moveTowards = (current: Vec2, target: Vec2, step: number) => {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  const dist = Math.hypot(dx, dy) || 1;
  const ratio = Math.min(1, step / dist);
  return { x: current.x + dx * ratio, y: current.y + dy * ratio };
};
