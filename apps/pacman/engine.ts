import { random as rngRandom } from '../games/rng';
import type { FruitRuleMode, LevelDefinition, Point, Tile } from './types';

export type Direction = Point;
export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';
export type Mode = 'scatter' | 'chase' | 'fright';
export type GhostBehaviorState =
  | 'active'
  | 'frightened'
  | 'eaten'
  | 'inHouse'
  | 'leavingHouse';

export interface GhostState {
  name: GhostName;
  x: number;
  y: number;
  dir: Direction;
  state: GhostBehaviorState;
}

export interface PacState {
  x: number;
  y: number;
  dir: Direction;
  nextDir: Direction;
  lives: number;
  extraLifeAwarded: boolean;
}

export interface FruitState {
  active: boolean;
  x: number;
  y: number;
  timer: number;
}

export interface GameState {
  maze: Tile[][];
  width: number;
  height: number;
  pac: PacState;
  ghosts: GhostState[];
  mode: Mode;
  modeIndex: number;
  modeTimer: number;
  frightenedTimer: number;
  frightenedCombo: number;
  pelletsRemaining: number;
  totalPellets: number;
  score: number;
  levelTime: number;
  nextFruitIndex: number;
  fruit: FruitState;
  fruitTimes: number[];
  fruitRuleMode: FruitRuleMode;
  fruitPelletThresholds: number[];
  status: 'ready' | 'playing' | 'dead' | 'gameover' | 'complete';
  readyTimer: number;
  deathTimer: number;
  spawns: {
    pac: Point;
    ghosts: Record<GhostName, Point>;
  };
}

export interface EngineOptions {
  speedMultiplier: number;
  pacSpeed: number;
  ghostSpeeds: { scatter: number; chase: number };
  tunnelSpeed: number;
  frightenedDuration: number;
  scatterChaseSchedule: { mode: Exclude<Mode, 'fright'>; duration: number }[];
  randomModeLevel: number;
  levelIndex: number;
  fruitDuration: number;
  turnTolerance: number;
  readyDuration?: number;
  deathDuration?: number;
  random?: () => number;
}

export interface StepInput {
  direction?: Direction | null;
}

export interface StepEvents {
  pellet?: boolean;
  energizer?: boolean;
  fruit?: boolean;
  ghostEaten?: GhostName;
  lifeLost?: boolean;
  gameOver?: boolean;
  levelComplete?: boolean;
  ready?: boolean;
  noPellets?: boolean;
}

export const DIRECTIONS: Direction[] = [
  { x: 0, y: -1 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 0 },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const cloneMaze = (maze: Tile[][]) => maze.map((row) => row.slice());

const add = (a: Point, b: Point) => ({ x: a.x + b.x, y: a.y + b.y });
const tileDistance = (a: Point, b: Point) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const toTile = (p: Point) => ({ x: Math.floor(p.x), y: Math.floor(p.y) });
const isOpposite = (a: Direction, b: Direction) => a.x === -b.x && a.y === -b.y;
const near = (a: Point, b: Point, radius = 0.45) => Math.hypot(a.x - b.x, a.y - b.y) <= radius;

const isWalkable = (maze: Tile[][], x: number, y: number) => {
  if (!maze[y] || typeof maze[y][x] === 'undefined') return false;
  return maze[y][x] !== 1;
};

export const canMove = (maze: Tile[][], tileX: number, tileY: number) => isWalkable(maze, tileX, tileY);

const isNearCenter = (pos: Point, tolerance: number) => {
  const center = { x: Math.floor(pos.x) + 0.5, y: Math.floor(pos.y) + 0.5 };
  return Math.abs(pos.x - center.x) <= tolerance && Math.abs(pos.y - center.y) <= tolerance;
};

const alignToCenter = (pos: Point) => ({ x: Math.floor(pos.x) + 0.5, y: Math.floor(pos.y) + 0.5 });

const isTunnel = (maze: Tile[][], tileX: number, tileY: number) => {
  const width = maze[0]?.length ?? 0;
  return (tileX === 0 || tileX === width - 1) && isWalkable(maze, tileX, tileY);
};

const wrapIfNeeded = (maze: Tile[][], pos: Point) => {
  const width = maze[0]?.length ?? 0;
  if (width === 0) return pos;
  if (pos.x < -0.25) return { ...pos, x: width - 0.5 };
  if (pos.x > width - 0.25) return { ...pos, x: 0.5 };
  return pos;
};

const findSpawn = (maze: Tile[][], fallback: Point) => {
  if (isWalkable(maze, fallback.x, fallback.y)) return { ...fallback };
  for (let y = 0; y < maze.length; y += 1) {
    for (let x = 0; x < maze[y].length; x += 1) {
      if (isWalkable(maze, x, y)) return { x, y };
    }
  }
  return { ...fallback };
};

export const findScatterCorners = (width: number, height: number): Record<GhostName, Point> => ({
  blinky: { x: width - 2, y: 0 },
  pinky: { x: 1, y: 0 },
  inky: { x: width - 2, y: height - 1 },
  clyde: { x: 1, y: height - 1 },
});

export const targetTileForGhost = (ghost: GhostState, pac: PacState, ghosts: GhostState[], corners: Record<GhostName, Point>) => {
  const pacTile = toTile(pac);
  const upQuirk = pac.dir.y < 0 && pac.dir.x === 0 ? { x: -1, y: -1 } : { x: 0, y: 0 };

  switch (ghost.name) {
    case 'blinky':
      return pacTile;
    case 'pinky':
      return {
        x: pacTile.x + pac.dir.x * 4 + upQuirk.x * 4,
        y: pacTile.y + pac.dir.y * 4 + upQuirk.y * 4,
      };
    case 'inky': {
      const blinky = ghosts.find((g) => g.name === 'blinky') ?? ghost;
      const anchor = {
        x: pacTile.x + pac.dir.x * 2 + upQuirk.x * 2,
        y: pacTile.y + pac.dir.y * 2 + upQuirk.y * 2,
      };
      const bTile = toTile(blinky);
      return { x: anchor.x * 2 - bTile.x, y: anchor.y * 2 - bTile.y };
    }
    case 'clyde': {
      const gTile = toTile(ghost);
      if (tileDistance(gTile, pacTile) <= 8) return corners.clyde;
      return pacTile;
    }
    default:
      return pacTile;
  }
};

const fruitScoreForLevel = (levelIndex: number) => {
  const table = [100, 300, 500, 500, 700, 700, 1000, 1000, 2000, 2000];
  return table[Math.min(levelIndex, table.length - 1)];
};

const shouldSpawnFruit = (state: GameState) => {
  if (state.nextFruitIndex >= 2 || state.fruit.active) return false;
  if (state.fruitRuleMode === 'pellet') {
    const threshold = state.fruitPelletThresholds[state.nextFruitIndex];
    if (typeof threshold !== 'number') return false;
    const eaten = state.totalPellets - state.pelletsRemaining;
    if (eaten >= threshold) {
      state.nextFruitIndex += 1;
      return true;
    }
    return false;
  }

  const trigger = state.fruitTimes[state.nextFruitIndex];
  if (typeof trigger !== 'number') return false;
  if (state.levelTime >= trigger) {
    state.nextFruitIndex += 1;
    return true;
  }
  return false;
};

export const createInitialState = (level: LevelDefinition, options: EngineOptions): GameState => {
  const maze = cloneMaze(level.maze);
  const width = maze[0]?.length ?? 0;
  const height = maze.length;
  const pelletsRemaining = maze.flat().filter((tile) => tile === 2 || tile === 3).length;
  const pacSpawn = findSpawn(maze, level.pacStart ?? { x: 1, y: 1 });
  const ghostSpawn = findSpawn(maze, level.ghostStart ?? { x: Math.floor(width / 2), y: Math.floor(height / 2) });
  const fruitRuleMode: FruitRuleMode = level.fruitRuleMode ?? (level.fruitPelletThresholds ? 'pellet' : 'time');

  return {
    maze,
    width,
    height,
    pac: {
      x: pacSpawn.x + 0.5,
      y: pacSpawn.y + 0.5,
      dir: { x: 0, y: 0 },
      nextDir: { x: 0, y: 0 },
      lives: 3,
      extraLifeAwarded: false,
    },
    ghosts: (['blinky', 'pinky', 'inky', 'clyde'] as GhostName[]).map((name, index) => ({
      name,
      x: ghostSpawn.x + 0.5,
      y: ghostSpawn.y + 0.5,
      dir: index % 2 === 0 ? { x: -1, y: 0 } : { x: 1, y: 0 },
      state: 'active',
    })),
    mode: options.scatterChaseSchedule[0]?.mode ?? 'scatter',
    modeIndex: 0,
    modeTimer: options.scatterChaseSchedule[0]?.duration ?? 0,
    frightenedTimer: 0,
    frightenedCombo: 0,
    pelletsRemaining,
    totalPellets: pelletsRemaining,
    score: 0,
    levelTime: 0,
    nextFruitIndex: 0,
    fruit: {
      active: false,
      x: level.fruit?.x ?? Math.floor(width / 2),
      y: level.fruit?.y ?? Math.floor(height / 2),
      timer: 0,
    },
    fruitTimes: level.fruitTimes?.slice() ?? [],
    fruitPelletThresholds: level.fruitPelletThresholds?.slice() ?? [70, 170],
    fruitRuleMode,
    status: 'ready',
    readyTimer: options.readyDuration ?? 1.2,
    deathTimer: 0,
    spawns: {
      pac: pacSpawn,
      ghosts: {
        blinky: ghostSpawn,
        pinky: ghostSpawn,
        inky: ghostSpawn,
        clyde: ghostSpawn,
      },
    },
  };
};

const resetAfterLifeLost = (state: GameState, options: EngineOptions) => {
  state.pac.x = state.spawns.pac.x + 0.5;
  state.pac.y = state.spawns.pac.y + 0.5;
  state.pac.dir = { x: 0, y: 0 };
  state.pac.nextDir = { x: 0, y: 0 };
  state.ghosts = state.ghosts.map((ghost) => ({
    ...ghost,
    x: state.spawns.ghosts[ghost.name].x + 0.5,
    y: state.spawns.ghosts[ghost.name].y + 0.5,
    dir: { x: -1, y: 0 },
    state: 'active',
  }));
  state.modeIndex = 0;
  state.modeTimer = options.scatterChaseSchedule[0]?.duration ?? 0;
  state.frightenedTimer = 0;
  state.frightenedCombo = 0;
  state.status = 'ready';
  state.readyTimer = options.readyDuration ?? 1.2;
};

export const step = (
  state: GameState,
  input: StepInput,
  dt: number,
  options: EngineOptions,
): { state: GameState; events: StepEvents } => {
  const events: StepEvents = {};
  const delta = clamp(dt, 0, 0.2);

  if (state.status === 'gameover' || state.status === 'complete') return { state, events };

  if (state.pelletsRemaining <= 0) {
    state.status = 'complete';
    events.levelComplete = true;
    return { state, events };
  }

  if (state.status === 'ready') {
    if (input.direction) state.pac.nextDir = { ...input.direction };
    state.readyTimer = Math.max(0, state.readyTimer - delta);
    if (state.readyTimer === 0) {
      state.status = 'playing';
      events.ready = true;
    }
    return { state, events };
  }

  if (state.status === 'dead') {
    state.deathTimer = Math.max(0, state.deathTimer - delta);
    if (state.deathTimer === 0) {
      if (state.pac.lives <= 0) {
        state.status = 'gameover';
        events.gameOver = true;
      } else {
        resetAfterLifeLost(state, options);
      }
    }
    return { state, events };
  }

  const random = options.random ?? rngRandom;
  const maze = state.maze;

  if (input.direction) {
    state.pac.nextDir = { ...input.direction };
  }

  state.levelTime += delta;

  const pacTile = toTile(state.pac);
  const pacNearCenter = isNearCenter(state.pac, options.turnTolerance);
  const desiredDir = state.pac.nextDir;
  if ((desiredDir.x !== 0 || desiredDir.y !== 0) && pacNearCenter) {
    const targetTile = add(pacTile, desiredDir);
    if (canMove(maze, targetTile.x, targetTile.y)) {
      state.pac.dir = { ...desiredDir };
      state.pac.x = Math.floor(state.pac.x) + 0.5;
      state.pac.y = Math.floor(state.pac.y) + 0.5;
    }
  }

  const basePacSpeed = options.pacSpeed * options.speedMultiplier;
  const pacSpeed = basePacSpeed * (isTunnel(maze, pacTile.x, pacTile.y) ? options.tunnelSpeed : 1);
  const nextPac = {
    x: state.pac.x + state.pac.dir.x * pacSpeed * delta,
    y: state.pac.y + state.pac.dir.y * pacSpeed * delta,
  };
  const nextPacTile = toTile(nextPac);
  const allowTunnelWrap = state.pac.dir.y === 0 && isTunnel(maze, pacTile.x, pacTile.y) && (nextPacTile.x < 0 || nextPacTile.x >= state.width);
  if (allowTunnelWrap || canMove(maze, nextPacTile.x, nextPacTile.y)) {
    const wrapped = wrapIfNeeded(maze, nextPac);
    state.pac.x = wrapped.x;
    state.pac.y = wrapped.y;
  } else {
    const centered = alignToCenter(state.pac);
    state.pac.x = centered.x;
    state.pac.y = centered.y;
    state.pac.dir = { x: 0, y: 0 };
  }

  const pacCell = toTile(state.pac);
  const tile = state.maze[pacCell.y]?.[pacCell.x];
  if (tile === 2 || tile === 3) {
    state.maze[pacCell.y][pacCell.x] = 0;
    state.pelletsRemaining = Math.max(0, state.pelletsRemaining - 1);
    if (tile === 3) {
      state.score += 50;
      state.frightenedTimer = options.frightenedDuration;
      state.mode = 'fright';
      state.frightenedCombo = 0;
      state.ghosts = state.ghosts.map((ghost) => ({
        ...ghost,
        state: ghost.state === 'active' ? 'frightened' : ghost.state,
      }));
      events.energizer = true;
    } else {
      state.score += 10;
      events.pellet = true;
    }
  }

  if (state.totalPellets === 0) {
    events.noPellets = true;
  }

  if (!state.pac.extraLifeAwarded && state.score >= 10000) {
    state.pac.extraLifeAwarded = true;
    state.pac.lives += 1;
  }

  const prevMode = state.mode;
  if (state.frightenedTimer > 0) {
    state.frightenedTimer = Math.max(0, state.frightenedTimer - delta);
    state.mode = state.frightenedTimer > 0 ? 'fright' : options.scatterChaseSchedule[state.modeIndex]?.mode ?? 'scatter';
  } else {
    state.modeTimer -= delta;
    if (state.modeTimer <= 0 && state.modeIndex < options.scatterChaseSchedule.length - 1) {
      state.modeIndex += 1;
      state.modeTimer = options.scatterChaseSchedule[state.modeIndex].duration;
    }
    state.mode = options.scatterChaseSchedule[state.modeIndex]?.mode ?? 'scatter';
  }
  const modeChanged = prevMode !== state.mode;
  const randomMode = options.levelIndex < options.randomModeLevel;
  const corners = findScatterCorners(state.width, state.height);

  state.ghosts = state.ghosts.map((ghost) => {
    const tilePos = toTile(ghost);
    const nearCenter = isNearCenter(ghost, options.turnTolerance);
    let dir = { ...ghost.dir };
    const forbidReverse = !modeChanged && ghost.state !== 'frightened';

    if (modeChanged && (dir.x !== 0 || dir.y !== 0) && ghost.state !== 'eaten') {
      dir = { x: -dir.x, y: -dir.y };
    }

    if (nearCenter) {
      const choices = DIRECTIONS.filter((candidate) => {
        if (forbidReverse && isOpposite(candidate, dir)) return false;
        return canMove(maze, tilePos.x + candidate.x, tilePos.y + candidate.y);
      });
      const legal = choices.length ? choices : DIRECTIONS.filter((candidate) => canMove(maze, tilePos.x + candidate.x, tilePos.y + candidate.y));

      if (ghost.state === 'eaten') {
        legal.sort((a, b) => tileDistance(add(tilePos, a), state.spawns.ghosts[ghost.name]) - tileDistance(add(tilePos, b), state.spawns.ghosts[ghost.name]));
        dir = legal[0] ?? dir;
      } else if (state.mode === 'fright' || randomMode) {
        const index = Math.floor(random() * legal.length);
        dir = legal[index] ?? dir;
      } else {
        const target = state.mode === 'scatter' ? corners[ghost.name] : targetTileForGhost(ghost, state.pac, state.ghosts, corners);
        legal.sort((a, b) => {
          const da = tileDistance(add(tilePos, a), target);
          const db = tileDistance(add(tilePos, b), target);
          if (da === db) return DIRECTIONS.indexOf(a) - DIRECTIONS.indexOf(b);
          return da - db;
        });
        dir = legal[0] ?? dir;
      }
    }

    const speedBase = state.mode === 'chase' ? options.ghostSpeeds.chase : options.ghostSpeeds.scatter;
    const frightenedSlowdown = ghost.state === 'frightened' ? 0.7 : 1;
    const next = {
      x: ghost.x + dir.x * speedBase * options.speedMultiplier * frightenedSlowdown * delta,
      y: ghost.y + dir.y * speedBase * options.speedMultiplier * frightenedSlowdown * delta,
    };
    const nextTile = toTile(next);
    const canGhostWrap = dir.y === 0 && isTunnel(maze, tilePos.x, tilePos.y) && (nextTile.x < 0 || nextTile.x >= state.width);
    const moved = canGhostWrap || canMove(maze, nextTile.x, nextTile.y) ? wrapIfNeeded(maze, next) : alignToCenter(ghost);
    const atSpawn = tileDistance(toTile(moved), state.spawns.ghosts[ghost.name]) === 0;

    return {
      ...ghost,
      x: moved.x,
      y: moved.y,
      dir,
      state: ghost.state === 'eaten' && atSpawn ? 'active' : state.mode === 'fright' ? ghost.state === 'active' ? 'frightened' : ghost.state : ghost.state === 'frightened' ? 'active' : ghost.state,
    };
  });

  for (const ghost of state.ghosts) {
    const tileCollision = toTile(ghost).x === pacCell.x && toTile(ghost).y === pacCell.y;
    if (!tileCollision && !near(ghost, state.pac)) continue;

    if (ghost.state === 'frightened' || state.mode === 'fright') {
      const comboMultiplier = 2 ** state.frightenedCombo;
      state.score += 200 * comboMultiplier;
      state.frightenedCombo = Math.min(state.frightenedCombo + 1, 3);
      ghost.state = 'eaten';
      events.ghostEaten = ghost.name;
    } else if (ghost.state !== 'eaten') {
      state.pac.lives -= 1;
      events.lifeLost = true;
      state.status = 'dead';
      state.deathTimer = options.deathDuration ?? 1;
      break;
    }
  }

  if (shouldSpawnFruit(state)) {
    state.fruit.active = true;
    state.fruit.timer = options.fruitDuration;
  }

  if (state.fruit.active) {
    state.fruit.timer = Math.max(0, state.fruit.timer - delta);
    if (pacCell.x === state.fruit.x && pacCell.y === state.fruit.y) {
      state.score += fruitScoreForLevel(options.levelIndex);
      state.fruit.active = false;
      events.fruit = true;
    } else if (state.fruit.timer === 0) {
      state.fruit.active = false;
    }
  }

  if (state.pelletsRemaining <= 0) {
    state.status = 'complete';
    events.levelComplete = true;
  }

  return { state, events };
};
