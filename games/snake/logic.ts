export const DEFAULT_GRID_SIZE = 20;

export interface Point {
  x: number;
  y: number;
}

export type Collision = 'none' | 'wall' | 'self' | 'obstacle';
export type Status = 'RUNNING' | 'DEAD' | 'WON';

export type RNGState = number;

export interface SnakeState {
  snake: Point[];
  food: Point | null;
  obstacles: Point[];
  rng: RNGState;
  status: Status;
}

export interface InitialStateOptions {
  gridSize?: number;
  wrap?: boolean;

  snake?: Point[];
  obstacles?: Point[];
  obstacleCount?: number;

  seed?: number;
  addObstacleOnEat?: boolean;
}

export interface StepOptions {
  gridSize?: number;
  wrap?: boolean;
  addObstacleOnEat?: boolean;
}

export interface StepResult {
  state: SnakeState;
  grew: boolean;
  collision: Collision;
  won: boolean;
}

const clonePoints = (points: Point[]): Point[] => points.map((p) => ({ x: p.x, y: p.y }));

export function rngNext(seed: RNGState): RNGState {
  let x = seed >>> 0;
  x ^= (x << 13) >>> 0;
  x ^= (x >>> 17) >>> 0;
  x ^= (x << 5) >>> 0;
  return x >>> 0;
}

export function rngInt(seed: RNGState, maxExclusive: number): [number, RNGState] {
  const next = rngNext(seed);
  return [next % maxExclusive, next];
}

const key = (p: Point): string => `${p.x},${p.y}`;

export function listEmptyCells(
  gridSize: number,
  snake: Point[],
  obstacles: Point[],
  food: Point | null,
): Point[] {
  const occupied = new Set<string>();
  snake.forEach((s) => occupied.add(key(s)));
  obstacles.forEach((o) => occupied.add(key(o)));
  if (food) occupied.add(key(food));

  const out: Point[] = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const k = `${x},${y}`;
      if (!occupied.has(k)) out.push({ x, y });
    }
  }
  return out;
}

export function spawnFood(
  gridSize: number,
  snake: Point[],
  obstacles: Point[],
  rng: RNGState,
): { food: Point | null; rng: RNGState; won: boolean } {
  const empties = listEmptyCells(gridSize, snake, obstacles, null);
  if (empties.length === 0) {
    return { food: null, rng, won: true };
  }
  const [idx, rng2] = rngInt(rng, empties.length);
  return { food: empties[idx], rng: rng2, won: false };
}

export function spawnObstacle(
  gridSize: number,
  snake: Point[],
  food: Point | null,
  obstacles: Point[],
  rng: RNGState,
): { obstacle: Point | null; rng: RNGState } {
  const empties = listEmptyCells(gridSize, snake, obstacles, food);
  if (empties.length === 0) return { obstacle: null, rng };
  const [idx, rng2] = rngInt(rng, empties.length);
  return { obstacle: empties[idx], rng: rng2 };
}

export const createInitialState = (
  options: InitialStateOptions = {},
): SnakeState => {
  const gridSize = options.gridSize ?? DEFAULT_GRID_SIZE;
  const rngSeed = (options.seed ?? Date.now()) >>> 0;
  let rng = rngSeed;

  const baseSnake = options.snake ? clonePoints(options.snake) : [
    {
      x: Math.floor(gridSize / 2),
      y: Math.floor(gridSize / 2),
    },
  ];

  let obstacles = options.obstacles ? clonePoints(options.obstacles) : [];

  if (!options.obstacles && options.obstacleCount && options.obstacleCount > 0) {
    for (let i = 0; i < options.obstacleCount; i += 1) {
      const spawned = spawnObstacle(gridSize, baseSnake, null, obstacles, rng);
      rng = spawned.rng;
      if (!spawned.obstacle) break;
      obstacles = [...obstacles, spawned.obstacle];
    }
  }

  let won = false;
  let food: Point | null = null;
  if (options.food) {
    food = { x: options.food.x, y: options.food.y };
  } else {
    const spawned = spawnFood(gridSize, baseSnake, obstacles, rng);
    food = spawned.food;
    rng = spawned.rng;
    won = spawned.won;
  }

  return {
    snake: baseSnake,
    food,
    obstacles,
    rng,
    status: won ? 'WON' : 'RUNNING',
  };
};

export const stepSnake = (
  state: SnakeState,
  dir: Point,
  options: StepOptions = {},
): StepResult => {
  if (state.status !== 'RUNNING') {
    return {
      state,
      grew: false,
      collision: 'none',
      won: state.status === 'WON',
    };
  }

  const gridSize = options.gridSize ?? DEFAULT_GRID_SIZE;
  const wrap = options.wrap ?? false;
  const addObstacleOnEat = options.addObstacleOnEat ?? false;

  const snake = clonePoints(state.snake);
  const obstacles = clonePoints(state.obstacles);
  const food = state.food ? { ...state.food } : null;

  if (snake.length === 0) {
    return {
      state: { ...state, snake, obstacles, food },
      grew: false,
      collision: 'none',
      won: false,
    };
  }

  const head = snake[0];
  let nx = head.x + dir.x;
  let ny = head.y + dir.y;

  if (wrap) {
    nx = ((nx % gridSize) + gridSize) % gridSize;
    ny = ((ny % gridSize) + gridSize) % gridSize;
  } else if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize) {
    return {
      state: { ...state, snake, obstacles, food, status: 'DEAD' },
      grew: false,
      collision: 'wall',
      won: false,
    };
  }

  const willEat = food !== null && nx === food.x && ny === food.y;
  const bodyForCollision = willEat
    ? snake
    : snake.slice(0, Math.max(0, snake.length - 1));

  if (bodyForCollision.some((p) => p.x === nx && p.y === ny)) {
    return {
      state: { ...state, snake, obstacles, food, status: 'DEAD' },
      grew: false,
      collision: 'self',
      won: false,
    };
  }

  if (obstacles.some((p) => p.x === nx && p.y === ny)) {
    return {
      state: { ...state, snake, obstacles, food, status: 'DEAD' },
      grew: false,
      collision: 'obstacle',
      won: false,
    };
  }

  const nextSnake = [{ x: nx, y: ny }, ...snake];
  if (!willEat) nextSnake.pop();

  let rng = state.rng;
  let nextFood = food;
  let nextObstacles = obstacles;
  let won = false;

  if (willEat) {
    const spawned = spawnFood(gridSize, nextSnake, nextObstacles, rng);
    nextFood = spawned.food;
    rng = spawned.rng;
    won = spawned.won;

    if (addObstacleOnEat && !won) {
      const obstacleSpawn = spawnObstacle(gridSize, nextSnake, nextFood, nextObstacles, rng);
      rng = obstacleSpawn.rng;
      if (obstacleSpawn.obstacle) {
        nextObstacles = [...nextObstacles, obstacleSpawn.obstacle];
      }
    }
  }

  const nextStatus: Status = won ? 'WON' : 'RUNNING';

  return {
    state: {
      snake: nextSnake,
      food: nextFood,
      obstacles: nextObstacles,
      rng,
      status: nextStatus,
    },
    grew: willEat,
    collision: 'none',
    won,
  };
};

export default {
  DEFAULT_GRID_SIZE,
  createInitialState,
  stepSnake,
  rngNext,
  rngInt,
};
