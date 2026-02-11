import { random as rngRandom } from '../games/rng';
import type { LevelDefinition, Point, Tile } from './types';

export type Direction = Point;

export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';

export type Mode = 'scatter' | 'chase' | 'fright';

export interface GhostState {
  name: GhostName;
  x: number;
  y: number;
  dir: Direction;
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

export type PowerUpType = 'speed' | 'shield';

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
  score: number;
  levelTime: number;
  nextFruitIndex: number;
  fruit: FruitState;
  fruitTimes: number[];
  status: 'playing' | 'dead' | 'gameover' | 'complete';
  deadTimer: number;
  speedTimer: number;
  shieldTimer: number;
  powerMode: PowerUpType | null;
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
  powerUpDuration: number;
  shieldDuration: number;
  speedBoostMultiplier: number;
  deathPauseDuration: number;
  random?: () => number;
}

export interface StepInput {
  direction?: Direction | null;
}

export interface StepEvents {
  pellet?: boolean;
  energizer?: boolean;
  fruit?: boolean;
  powerUp?: PowerUpType;
  shieldUsed?: boolean;
  ghostEaten?: GhostName;
  lifeLost?: boolean;
  gameOver?: boolean;
  levelComplete?: boolean;
  respawned?: boolean;
}

export const DIRECTIONS: Direction[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const SCATTER_CORNERS: Record<GhostName, Point> = {
  blinky: { x: 13, y: 0 },
  pinky: { x: 0, y: 0 },
  inky: { x: 13, y: 6 },
  clyde: { x: 0, y: 6 },
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const cloneMaze = (maze: Tile[][]) => maze.map((row) => row.slice());

const isWalkable = (maze: Tile[][], x: number, y: number) => {
  if (!maze[y] || typeof maze[y][x] === 'undefined') return false;
  return maze[y][x] !== 1;
};

export const canMove = (maze: Tile[][], tileX: number, tileY: number) =>
  isWalkable(maze, tileX, tileY);

const resetEntitiesToSpawn = (state: GameState) => {
  const pac = {
    ...state.pac,
    x: state.spawns.pac.x + 0.5,
    y: state.spawns.pac.y + 0.5,
    dir: { x: 0, y: 0 },
    nextDir: { x: 0, y: 0 },
  };

  const ghosts = state.ghosts.map((ghost) => ({
    ...ghost,
    x: state.spawns.ghosts[ghost.name].x + 0.5,
    y: state.spawns.ghosts[ghost.name].y + 0.5,
    dir: { x: 0, y: -1 },
  }));

  return { pac, ghosts };
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

const isTunnel = (maze: Tile[][], tileX: number, tileY: number) => {
  const width = maze[0]?.length ?? 0;
  if (width === 0) return false;
  if (tileX !== 0 && tileX !== width - 1) return false;
  return isWalkable(maze, tileX, tileY);
};

const wrapIfNeeded = (maze: Tile[][], pos: Point) => {
  const width = maze[0]?.length ?? 0;
  if (width === 0) return pos;
  const min = -0.25;
  const max = width - 0.5 + 0.25;
  if (pos.x < min) {
    return { ...pos, x: width - 0.5 };
  }
  if (pos.x > max) {
    return { ...pos, x: 0.5 };
  }
  return pos;
};

const distance = (a: Point, b: Point) =>
  Math.hypot(a.x - b.x, a.y - b.y);

const isNearCenter = (pos: Point, tolerance: number) => {
  const dx = Math.abs((pos.x % 1) - 0.5);
  const dy = Math.abs((pos.y % 1) - 0.5);
  return dx <= tolerance && dy <= tolerance;
};

const alignToCenter = (pos: Point) => ({
  x: Math.floor(pos.x) + 0.5,
  y: Math.floor(pos.y) + 0.5,
});

const findNearestWalkableTile = (maze: Tile[][], tile: Point) => {
  if (canMove(maze, tile.x, tile.y)) return tile;
  for (const dir of DIRECTIONS) {
    const candidate = { x: tile.x + dir.x, y: tile.y + dir.y };
    if (canMove(maze, candidate.x, candidate.y)) return candidate;
  }
  return tile;
};

const targetFor = (ghost: GhostState, pac: PacState, ghosts: GhostState[]) => {
  const px = Math.floor(pac.x);
  const py = Math.floor(pac.y);
  switch (ghost.name) {
    case 'blinky':
      return { x: px, y: py };
    case 'pinky':
      return { x: px + 4 * pac.dir.x, y: py + 4 * pac.dir.y };
    case 'inky': {
      const blinky = ghosts.find((g) => g.name === 'blinky') || ghost;
      const bx = Math.floor(blinky.x);
      const by = Math.floor(blinky.y);
      const tx = px + 2 * pac.dir.x;
      const ty = py + 2 * pac.dir.y;
      return { x: tx * 2 - bx, y: ty * 2 - by };
    }
    case 'clyde': {
      const dist = Math.hypot(px - Math.floor(ghost.x), py - Math.floor(ghost.y));
      if (dist > 8) return { x: px, y: py };
      return SCATTER_CORNERS.clyde;
    }
    default:
      return { x: px, y: py };
  }
};

export const createInitialState = (
  level: LevelDefinition,
  options: EngineOptions,
): GameState => {
  const maze = cloneMaze(level.maze);
  const width = maze[0]?.length ?? 0;
  const height = maze.length;
  const pelletsRemaining = maze.flat().filter((t) => t === 2 || t === 3 || t === 4).length;
  const pacSpawn = findSpawn(maze, level.pacStart ?? { x: 1, y: 1 });
  const ghostSpawn = findSpawn(maze, level.ghostStart ?? { x: 7, y: 3 });
  const ghostNames: GhostName[] = ['blinky', 'pinky', 'inky', 'clyde'];

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
    ghosts: ghostNames.map((name, index) => ({
      name,
      x: ghostSpawn.x + 0.5,
      y: ghostSpawn.y + 0.5,
      dir: index % 2 === 0 ? { x: 0, y: -1 } : { x: -1, y: 0 },
    })),
    mode: options.scatterChaseSchedule[0]?.mode ?? 'scatter',
    modeIndex: 0,
    modeTimer: options.scatterChaseSchedule[0]?.duration ?? 0,
    frightenedTimer: 0,
    frightenedCombo: 0,
    pelletsRemaining,
    score: 0,
    levelTime: 0,
    nextFruitIndex: 0,
    fruit: {
      active: false,
      x: level.fruit?.x ?? Math.floor(width / 2),
      y: level.fruit?.y ?? Math.floor(height / 2),
      timer: 0,
    },
    fruitTimes: Array.isArray(level.fruitTimes)
      ? level.fruitTimes.slice()
      : [],
    status: 'playing',
    deadTimer: 0,
    speedTimer: 0,
    shieldTimer: 0,
    powerMode: null,
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

export const step = (
  state: GameState,
  input: StepInput,
  dt: number,
  options: EngineOptions,
): { state: GameState; events: StepEvents } => {
  if (state.status === 'dead') {
    state.deadTimer = Math.max(0, state.deadTimer - dt);
    if (state.deadTimer === 0) {
      const reset = resetEntitiesToSpawn(state);
      state.modeIndex = 0;
      state.modeTimer = options.scatterChaseSchedule[0]?.duration ?? 0;
      state.mode = options.scatterChaseSchedule[0]?.mode ?? 'scatter';
      state.frightenedTimer = 0;
      state.frightenedCombo = 0;
      state.status = 'playing';
      return {
        state: {
          ...state,
          ...reset,
        },
        events: { respawned: true },
      };
    }
    return { state, events: {} };
  }

  if (state.status !== 'playing') {
    return { state, events: {} };
  }

  const events: StepEvents = {};
  const rand = options.random ?? rngRandom;
  const maze = state.maze;
  let pac = { ...state.pac };
  let ghosts = state.ghosts.map((g) => ({ ...g }));

  if (input.direction) {
    pac.nextDir = { ...input.direction };
  }

  state.levelTime += dt;
  state.speedTimer = Math.max(0, state.speedTimer - dt);
  state.shieldTimer = Math.max(0, state.shieldTimer - dt);
  if (state.speedTimer === 0 && state.powerMode === 'speed') {
    state.powerMode = null;
  }
  if (state.shieldTimer === 0 && state.powerMode === 'shield') {
    state.powerMode = null;
  }

  let pacTile = { x: Math.floor(pac.x), y: Math.floor(pac.y) };
  const recoveryTile = findNearestWalkableTile(maze, pacTile);
  if (recoveryTile.x !== pacTile.x || recoveryTile.y !== pacTile.y) {
    pac = {
      ...pac,
      x: recoveryTile.x + 0.5,
      y: recoveryTile.y + 0.5,
      dir: { x: 0, y: 0 },
    };
    pacTile = { ...recoveryTile };
  }
  const pacCenter = alignToCenter(pac);
  const canTurn =
    pac.nextDir &&
    (pac.nextDir.x !== 0 || pac.nextDir.y !== 0) &&
    isNearCenter(pac, options.turnTolerance);

  if (canTurn) {
    const nextTile = {
      x: pacTile.x + pac.nextDir.x,
      y: pacTile.y + pac.nextDir.y,
    };
    if (canMove(maze, nextTile.x, nextTile.y)) {
      pac = {
        ...pac,
        dir: pac.nextDir,
        nextDir: { x: 0, y: 0 },
        x: pacCenter.x,
        y: pacCenter.y,
      };
    }
  }

  const pacSpeed =
    options.pacSpeed *
    options.speedMultiplier *
    (state.speedTimer > 0 ? options.speedBoostMultiplier : 1) *
    (isTunnel(maze, pacTile.x, pacTile.y) ? options.tunnelSpeed : 1);

  const nextPac = {
    x: pac.x + pac.dir.x * pacSpeed * dt,
    y: pac.y + pac.dir.y * pacSpeed * dt,
  };
  const nextPacTile = {
    x: Math.floor(nextPac.x),
    y: Math.floor(nextPac.y),
  };

  if (canMove(maze, nextPacTile.x, nextPacTile.y)) {
    pac = { ...pac, ...wrapIfNeeded(maze, nextPac) };
  } else {
    pac = { ...pac, x: pacCenter.x, y: pacCenter.y, dir: { x: 0, y: 0 } };
  }

  const pacCell = {
    x: Math.floor(pac.x),
    y: Math.floor(pac.y),
  };
  if (
    maze[pacCell.y]?.[pacCell.x] === 2 ||
    maze[pacCell.y]?.[pacCell.x] === 3 ||
    maze[pacCell.y]?.[pacCell.x] === 4
  ) {
    const tile = maze[pacCell.y][pacCell.x];
    const updatedMaze = cloneMaze(maze);
    updatedMaze[pacCell.y][pacCell.x] = 0;
    state.maze = updatedMaze;
    state.pelletsRemaining -= 1;
    if (tile === 2) {
      state.score += 10;
      events.pellet = true;
    } else {
      if (tile === 3) {
        state.score += 50;
        state.frightenedTimer = options.frightenedDuration;
        state.frightenedCombo = 0;
        events.energizer = true;
      } else {
        state.score += 200;
        const powerUp: PowerUpType = rand() > 0.5 ? 'speed' : 'shield';
        if (powerUp === 'speed') {
          state.speedTimer = options.powerUpDuration;
        } else {
          state.shieldTimer = options.shieldDuration;
        }
        state.powerMode = powerUp;
        events.powerUp = powerUp;
      }
    }
  }

  if (!pac.extraLifeAwarded && state.score >= 10000) {
    pac.extraLifeAwarded = true;
    pac.lives += 1;
  }

  const prevMode = state.mode;
  if (state.frightenedTimer > 0) {
    state.frightenedTimer = Math.max(0, state.frightenedTimer - dt);
    if (state.frightenedTimer === 0) {
      state.mode = options.scatterChaseSchedule[state.modeIndex]?.mode ?? 'scatter';
      state.frightenedCombo = 0;
    } else {
      state.mode = 'fright';
    }
  } else {
    state.modeTimer -= dt;
    if (state.modeTimer <= 0 && state.modeIndex < options.scatterChaseSchedule.length - 1) {
      state.modeIndex += 1;
      state.modeTimer = options.scatterChaseSchedule[state.modeIndex].duration;
    }
    state.mode = options.scatterChaseSchedule[state.modeIndex]?.mode ?? 'scatter';
  }

  const modeChanged = prevMode !== state.mode;
  const randomMode = options.levelIndex < options.randomModeLevel;

  ghosts = ghosts.map((g) => {
    const gTile = { x: Math.floor(g.x), y: Math.floor(g.y) };
    const speedBase =
      (state.frightenedTimer > 0
        ? options.ghostSpeeds.scatter * 0.7
        : state.mode === 'scatter'
          ? options.ghostSpeeds.scatter
          : options.ghostSpeeds.chase) * options.speedMultiplier;
    const gSpeed =
      speedBase * (isTunnel(maze, gTile.x, gTile.y) ? options.tunnelSpeed : 1);
    let dir = g.dir;
    const forcedTurn = modeChanged && (dir.x !== 0 || dir.y !== 0);
    if (forcedTurn) {
      dir = { x: -dir.x, y: -dir.y };
    }

    if (!forcedTurn && isNearCenter(g, options.turnTolerance)) {
      const rev = { x: -dir.x, y: -dir.y };
      let optionsDirs = DIRECTIONS.filter((d) => {
        if (!modeChanged && d.x === rev.x && d.y === rev.y) return false;
        return canMove(maze, gTile.x + d.x, gTile.y + d.y);
      });
      if (!optionsDirs.length) optionsDirs = DIRECTIONS;
      if (state.frightenedTimer > 0 || randomMode) {
        dir = optionsDirs[Math.floor(rand() * optionsDirs.length)] || dir;
      } else {
        const target =
          state.mode === 'scatter'
            ? SCATTER_CORNERS[g.name] || { x: gTile.x, y: gTile.y }
            : targetFor(g, pac, ghosts);
        optionsDirs.sort((a, b) => {
          const da = distance({ x: gTile.x + a.x, y: gTile.y + a.y }, target);
          const db = distance({ x: gTile.x + b.x, y: gTile.y + b.y }, target);
          return da - db;
        });
        dir = optionsDirs[0] || dir;
      }
    }

    const next = {
      x: g.x + dir.x * gSpeed * dt,
      y: g.y + dir.y * gSpeed * dt,
    };
    const nextTile = { x: Math.floor(next.x), y: Math.floor(next.y) };
    if (canMove(maze, nextTile.x, nextTile.y)) {
      return { ...g, ...wrapIfNeeded(maze, next), dir };
    }
    return { ...g, dir };
  });

  const pacTileCheck = { x: Math.floor(pac.x), y: Math.floor(pac.y) };
  let collisionResolved = false;
  ghosts.forEach((g) => {
    if (collisionResolved) return;
    if (Math.floor(g.x) === pacTileCheck.x && Math.floor(g.y) === pacTileCheck.y) {
      if (state.frightenedTimer > 0) {
        const comboMultiplier = Math.pow(2, state.frightenedCombo);
        state.score += 200 * comboMultiplier;
        state.frightenedCombo = Math.min(state.frightenedCombo + 1, 3);
        events.ghostEaten = g.name;
        const spawn = state.spawns.ghosts[g.name];
        g.x = spawn.x + 0.5;
        g.y = spawn.y + 0.5;
        g.dir = { x: 0, y: -1 };
        collisionResolved = true;
      } else {
        if (state.shieldTimer > 0) {
          state.score += 150;
          state.shieldTimer = 0;
          if (state.powerMode === 'shield') {
            state.powerMode = null;
          }
          events.shieldUsed = true;
          const spawn = state.spawns.ghosts[g.name];
          g.x = spawn.x + 0.5;
          g.y = spawn.y + 0.5;
          g.dir = { x: 0, y: -1 };
          collisionResolved = true;
        } else {
          pac.lives -= 1;
          events.lifeLost = true;
          if (pac.lives <= 0) {
            state.status = 'gameover';
            events.gameOver = true;
          } else {
            state.status = 'dead';
            state.deadTimer = options.deathPauseDuration;
            state.frightenedTimer = 0;
          }
          collisionResolved = true;
        }
      }
    }
  });

  if (!state.fruit.active && levelFruitTimeReached(state)) {
    state.fruit.active = true;
    state.fruit.timer = options.fruitDuration;
  }

  if (state.fruit.active) {
    state.fruit.timer -= dt;
    if (pacTileCheck.x === state.fruit.x && pacTileCheck.y === state.fruit.y) {
      state.fruit.active = false;
      state.score += 100;
      events.fruit = true;
    } else if (state.fruit.timer <= 0) {
      state.fruit.active = false;
    }
  }

  if (state.pelletsRemaining <= 0 && state.status === 'playing') {
    state.status = 'complete';
    events.levelComplete = true;
  }

  return {
    state: {
      ...state,
      pac,
      ghosts,
    },
    events,
  };
};

const levelFruitTimeReached = (state: GameState) => {
  const level = state.levelTime;
  const index = state.nextFruitIndex;
  const levelTimes = state.fruitTimes;
  if (!levelTimes || index >= levelTimes.length) return false;
  if (level >= levelTimes[index]) {
    state.nextFruitIndex += 1;
    return true;
  }
  return false;
};
