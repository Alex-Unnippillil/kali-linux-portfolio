export const GRID_SIZE = 20;

export const SNAKE_DIFFICULTIES = {
  relaxed: { label: 'Relaxed', delay: 220 },
  normal: { label: 'Normal', delay: 150 },
  fast: { label: 'Fast', delay: 110 },
  extreme: { label: 'Extreme', delay: 80 },
} as const;

export type SnakeDifficulty = keyof typeof SNAKE_DIFFICULTIES;

export const DEFAULT_DIFFICULTY: SnakeDifficulty = 'normal';

export const getDelayForDifficulty = (difficulty: SnakeDifficulty): number =>
  SNAKE_DIFFICULTIES[difficulty]?.delay ??
  SNAKE_DIFFICULTIES[DEFAULT_DIFFICULTY].delay;

export const isSnakeDifficulty = (value: unknown): value is SnakeDifficulty =>
  typeof value === 'string' && value in SNAKE_DIFFICULTIES;

export const WRAP_MODES = {
  bounded: { label: 'Walls', wrap: false },
  toroidal: { label: 'Wrap Around', wrap: true },
} as const;

export type SnakeWrapMode = keyof typeof WRAP_MODES;

export const DEFAULT_WRAP_MODE: SnakeWrapMode = 'bounded';

export const getWrapForMode = (mode: SnakeWrapMode): boolean =>
  WRAP_MODES[mode]?.wrap ?? WRAP_MODES[DEFAULT_WRAP_MODE].wrap;

export const isSnakeWrapMode = (value: unknown): value is SnakeWrapMode =>
  typeof value === 'string' && value in WRAP_MODES;

export interface Point {
  x: number;
  y: number;
}

export type Collision = 'none' | 'wall' | 'self' | 'obstacle';

export interface SnakeState {
  snake: Point[];
  food: Point;
  obstacles: Point[];
}

export interface StepOptions {
  wrap?: boolean;
  gridSize?: number;
  randomFood?: typeof randomFood;
  randomObstacle?: typeof randomObstacle | null;
}

export interface StepResult {
  state: SnakeState;
  grew: boolean;
  collision: Collision;
}

const clonePoints = (points: Point[]): Point[] =>
  points.map((p) => ({ x: p.x, y: p.y }));

export const randomFood = (
  snake: Point[],
  obstacles: Point[] = [],
  gridSize = GRID_SIZE,
): Point => {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
  } while (
    snake.some((s) => s.x === pos.x && s.y === pos.y) ||
    obstacles.some((o) => o.x === pos.x && o.y === pos.y)
  );
  return pos;
};

export const randomObstacle = (
  snake: Point[],
  food: Point,
  obstacles: Point[] = [],
  gridSize = GRID_SIZE,
): Point => {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
  } while (
    snake.some((s) => s.x === pos.x && s.y === pos.y) ||
    (food.x === pos.x && food.y === pos.y) ||
    obstacles.some((o) => o.x === pos.x && o.y === pos.y)
  );
  return pos;
};

export const generateObstacles = (
  count: number,
  snake: Point[],
  food: Point,
  gridSize = GRID_SIZE,
  generator: typeof randomObstacle = randomObstacle,
): Point[] => {
  const obstacles: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    obstacles.push(generator(snake, food, obstacles, gridSize));
  }
  return obstacles;
};

export interface InitialStateOptions {
  gridSize?: number;
  snake?: Point[];
  food?: Point;
  obstacles?: Point[];
  obstacleCount?: number;
  randomFood?: typeof randomFood;
  randomObstacle?: typeof randomObstacle | null;
}

export const createInitialState = (
  options: InitialStateOptions = {},
): SnakeState => {
  const gridSize = options.gridSize ?? GRID_SIZE;
  const randomFoodFn = options.randomFood ?? randomFood;
  const randomObstacleFn =
    options.randomObstacle === undefined ? randomObstacle : options.randomObstacle;

  const baseSnake = options.snake ?? [
    {
      x: Math.floor(gridSize / 2),
      y: Math.floor(gridSize / 2),
    },
  ];
  const snake = clonePoints(baseSnake);

  const baseObstacles = options.obstacles ? clonePoints(options.obstacles) : [];

  const food = options.food
    ? { x: options.food.x, y: options.food.y }
    : randomFoodFn(snake, baseObstacles, gridSize);

  let obstacles = baseObstacles;
  if (!options.obstacles) {
    const count = options.obstacleCount ?? 0;
    if (count > 0 && randomObstacleFn) {
      obstacles = generateObstacles(count, snake, food, gridSize, randomObstacleFn);
    }
  }

  return { snake, food, obstacles };
};

export const stepSnake = (
  state: SnakeState,
  dir: Point,
  options: StepOptions = {},
): StepResult => {
  const gridSize = options.gridSize ?? GRID_SIZE;
  const wrap = options.wrap ?? false;
  const randomFoodFn = options.randomFood ?? randomFood;
  const randomObstacleFn =
    options.randomObstacle === undefined ? randomObstacle : options.randomObstacle;

  const snake = clonePoints(state.snake);
  const obstacles = clonePoints(state.obstacles);
  const food = { x: state.food.x, y: state.food.y };

  if (snake.length === 0) {
    return {
      state: { snake, food, obstacles },
      grew: false,
      collision: 'none',
    };
  }

  let headX = snake[0].x + dir.x;
  let headY = snake[0].y + dir.y;

  if (wrap) {
    headX = ((headX % gridSize) + gridSize) % gridSize;
    headY = ((headY % gridSize) + gridSize) % gridSize;
  } else if (headX < 0 || headY < 0 || headX >= gridSize || headY >= gridSize) {
    return {
      state: { snake, food, obstacles },
      grew: false,
      collision: 'wall',
    };
  }

  const grow = headX === food.x && headY === food.y;
  const body = grow ? snake : snake.slice(0, snake.length - 1);

  if (body.some((seg) => seg.x === headX && seg.y === headY)) {
    return {
      state: { snake, food, obstacles },
      grew: false,
      collision: 'self',
    };
  }

  if (obstacles.some((obs) => obs.x === headX && obs.y === headY)) {
    return {
      state: { snake, food, obstacles },
      grew: false,
      collision: 'obstacle',
    };
  }

  const nextSnake: Point[] = [
    { x: headX, y: headY },
    ...snake.slice(0, grow ? snake.length : Math.max(snake.length - 1, 0)),
  ];

  let nextFood = food;
  let nextObstacles = obstacles;

  if (grow) {
    nextFood = randomFoodFn(nextSnake, obstacles, gridSize);
    if (randomObstacleFn) {
      nextObstacles = [
        ...obstacles,
        randomObstacleFn(nextSnake, nextFood, obstacles, gridSize),
      ];
    }
  }

  return {
    state: { snake: nextSnake, food: nextFood, obstacles: nextObstacles },
    grew: grow,
    collision: 'none',
  };
};

