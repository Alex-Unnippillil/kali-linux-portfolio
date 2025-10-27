export type Vector = { x: number; y: number };

export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';

export interface EntityState {
  x: number;
  y: number;
  dir: Vector;
}

export interface GhostState extends EntityState {
  name: GhostName;
}

export type Maze = number[][];

export interface ScatterTargets {
  [key: string]: { x: number; y: number };
}

export const DIRECTIONS: Vector[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

export const DEFAULT_SCATTER_CORNERS: ScatterTargets = {
  blinky: { x: 13, y: 0 },
  pinky: { x: 0, y: 0 },
  inky: { x: 13, y: 6 },
  clyde: { x: 0, y: 6 },
};

export const tileAt = (maze: Maze, tx: number, ty: number) => {
  const row = maze[ty];
  if (!row) return 1;
  const value = row[tx];
  return value === undefined ? 1 : value;
};

export const isTunnelTile = (maze: Maze, tx: number, ty: number) => {
  if (!maze.length) return false;
  const width = maze[0].length;
  if (width === 0) return false;
  if (tx !== 0 && tx !== width - 1) return false;
  return tileAt(maze, tx, ty) !== 1;
};

export interface AvailableDirectionsOptions {
  position: { x: number; y: number };
  direction: Vector;
}

export const getAvailableDirections = (
  maze: Maze,
  { position, direction }: AvailableDirectionsOptions,
) => {
  const reverse = { x: -direction.x, y: -direction.y };
  return DIRECTIONS.filter((candidate) => {
    if (candidate.x === reverse.x && candidate.y === reverse.y) return false;
    const nx = position.x + candidate.x;
    const ny = position.y + candidate.y;
    return tileAt(maze, nx, ny) !== 1;
  });
};

export interface GhostTargetOptions {
  tileSize: number;
  mode: 'scatter' | 'chase';
  frightened: boolean;
  scatterTargets?: ScatterTargets;
}

export const computeGhostTarget = (
  ghost: GhostState,
  pac: EntityState,
  ghosts: GhostState[],
  { tileSize, mode, frightened, scatterTargets = DEFAULT_SCATTER_CORNERS }: GhostTargetOptions,
) => {
  if (frightened) return null;
  if (mode === 'scatter') return scatterTargets[ghost.name] ?? null;

  const px = Math.floor(pac.x / tileSize);
  const py = Math.floor(pac.y / tileSize);
  const pdx = pac.dir.x;
  const pdy = pac.dir.y;

  switch (ghost.name) {
    case 'blinky':
      return { x: px, y: py };
    case 'pinky':
      return { x: px + 4 * pdx, y: py + 4 * pdy };
    case 'inky': {
      const blinky = ghosts.find((g) => g.name === 'blinky') || ghosts[0];
      const bx = Math.floor(blinky.x / tileSize);
      const by = Math.floor(blinky.y / tileSize);
      const tx = px + 2 * pdx;
      const ty = py + 2 * pdy;
      return { x: tx * 2 - bx, y: ty * 2 - by };
    }
    case 'clyde': {
      const gx = Math.floor(ghost.x / tileSize);
      const gy = Math.floor(ghost.y / tileSize);
      const dist = Math.hypot(px - gx, py - gy);
      if (dist > 8) return { x: px, y: py };
      return scatterTargets.clyde;
    }
    default:
      return { x: px, y: py };
  }
};
