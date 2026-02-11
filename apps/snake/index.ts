export const GRID_SIZE = 20;

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  snake: Point[];
  food: Point;
  obstacles: Point[];
  points: number;
  foodsEaten: number;
  shieldCharges: number;
  powerUp: PowerUp | null;
}

export type CollisionType = 'none' | 'wall' | 'self' | 'obstacle';
export type PowerUpType = 'bonus' | 'slow' | 'shield';

export interface PowerUp {
  x: number;
  y: number;
  type: PowerUpType;
  ttl: number;
}

export interface StepResult {
  state: SnakeState;
  grew: boolean;
  collision: CollisionType;
  pointsDelta: number;
  consumedPowerUp: PowerUpType | null;
  shieldSaved: boolean;
  /** True when the board is full and no new food can be spawned. */
  won: boolean;
}

export interface SnakeOptions {
  wrap: boolean;
  gridSize: number;
  random?: () => number;
  randomFood?: typeof randomFood;
  randomObstacle?: typeof randomObstacle | null;
  randomPowerUp?: typeof randomPowerUp | null;
}

const NO_CELL: Point = { x: -1, y: -1 };
const isNoCell = (p: Point) => p.x < 0 || p.y < 0;
const key = (p: Point) => `${p.x},${p.y}`;

const listFreeCells = (occupied: Set<string>, gridSize: number): Point[] => {
  const free: Point[] = [];
  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const k = `${x},${y}`;
      if (!occupied.has(k)) free.push({ x, y });
    }
  }
  return free;
};

const pickRandom = (cells: Point[], rand: () => number = Math.random): Point =>
  cells[Math.floor(rand() * cells.length)] ?? { ...NO_CELL };

export const randomFood = (
  snake: Point[],
  obstacles: Point[] = [],
  gridSize = GRID_SIZE,
  rand: () => number = Math.random,
): Point => {
  const occupied = new Set<string>();
  snake.forEach((p) => occupied.add(key(p)));
  obstacles.forEach((p) => occupied.add(key(p)));
  const free = listFreeCells(occupied, gridSize);
  return free.length ? pickRandom(free, rand) : { ...NO_CELL };
};

export const randomObstacle = (
  snake: Point[],
  food: Point,
  obstacles: Point[] = [],
  gridSize = GRID_SIZE,
  rand: () => number = Math.random,
): Point => {
  const occupied = new Set<string>();
  snake.forEach((p) => occupied.add(key(p)));
  obstacles.forEach((p) => occupied.add(key(p)));
  if (!isNoCell(food)) occupied.add(key(food));
  const free = listFreeCells(occupied, gridSize);
  return free.length ? pickRandom(free, rand) : { ...NO_CELL };
};

export const randomPowerUp = (
  snake: Point[],
  food: Point,
  obstacles: Point[] = [],
  gridSize = GRID_SIZE,
  rand: () => number = Math.random,
): PowerUp | null => {
  const occupied = new Set<string>();
  snake.forEach((p) => occupied.add(key(p)));
  obstacles.forEach((p) => occupied.add(key(p)));
  if (!isNoCell(food)) occupied.add(key(food));
  const free = listFreeCells(occupied, gridSize);
  if (!free.length) return null;
  const point = pickRandom(free, rand);
  const roll = rand();
  const type: PowerUpType =
    roll < 0.4 ? 'bonus' : roll < 0.75 ? 'slow' : 'shield';
  return {
    ...point,
    type,
    ttl: 60,
  };
};

const generateObstacles = (params: {
  snake: Point[];
  food: Point;
  existing?: Point[];
  count: number;
  gridSize: number;
  generator: typeof randomObstacle;
  random?: () => number;
}): Point[] => {
  const obstacles: Point[] = [];

  if (params.existing?.length) {
    params.existing.forEach((o) => {
      if (!isNoCell(o)) obstacles.push({ ...o });
    });
  }

  for (let i = obstacles.length; i < params.count; i += 1) {
    const next = params.generator(
      params.snake,
      params.food,
      obstacles,
      params.gridSize,
      params.random,
    );
    if (isNoCell(next)) break;
    obstacles.push(next);
  }

  return obstacles;
};

export const createInitialState = (params?: {
  gridSize?: number;
  snake?: Point[];
  food?: Point;
  obstacles?: Point[];
  obstacleCount?: number;
  random?: () => number;
  randomFood?: typeof randomFood;
  randomObstacle?: typeof randomObstacle;
  points?: number;
  foodsEaten?: number;
  shieldCharges?: number;
  powerUp?: PowerUp | null;
}): SnakeState => {
  const gridSize = params?.gridSize ?? GRID_SIZE;

  const snake: Point[] =
    params?.snake?.map((p) => ({ ...p })) ?? [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ];

  const food =
    params?.food ??
    (params?.randomFood
      ? params.randomFood(
        snake,
        params?.obstacles ?? [],
        gridSize,
        params?.random,
      )
      : randomFood(snake, params?.obstacles ?? [], gridSize, params?.random));

  const obstacleCount =
    params?.obstacleCount ??
    (params?.obstacles ? params.obstacles.length : 5);
  const obstacleGenerator = params?.randomObstacle ?? randomObstacle;

  const obstacles = generateObstacles({
    snake,
    food,
    existing: params?.obstacles,
    count: obstacleCount,
    gridSize,
    generator: obstacleGenerator,
    random: params?.random,
  });

  return {
    snake,
    food,
    obstacles,
    points: params?.points ?? 0,
    foodsEaten: params?.foodsEaten ?? 0,
    shieldCharges: params?.shieldCharges ?? 0,
    powerUp: params?.powerUp ? { ...params.powerUp } : null,
  };
};

export const stepSnake = (
  state: SnakeState,
  dir: Point,
  options: SnakeOptions,
): StepResult => {
  const gridSize = options.gridSize;

  // If no food can exist, treat as win.
  if (isNoCell(state.food)) {
    return {
      state,
      grew: false,
      collision: 'none',
      won: true,
      pointsDelta: 0,
      consumedPowerUp: null,
      shieldSaved: false,
    };
  }

  const snake = state.snake.map((p) => ({ ...p }));
  const obstacles = state.obstacles.map((o) => ({ ...o }));
  const points = state.points ?? 0;
  const foodsEaten = state.foodsEaten ?? 0;
  const shieldCharges = state.shieldCharges ?? 0;
  const powerUp = state.powerUp ? { ...state.powerUp } : null;
  const obstacleSnapshot = obstacles.map((o) => ({ ...o }));
  const food = { ...state.food };

  const head = snake[0];
  let newHeadX = head.x + dir.x;
  let newHeadY = head.y + dir.y;

  if (options.wrap) {
    if (newHeadX < 0) newHeadX = gridSize - 1;
    if (newHeadX >= gridSize) newHeadX = 0;
    if (newHeadY < 0) newHeadY = gridSize - 1;
    if (newHeadY >= gridSize) newHeadY = 0;
  } else {
    if (
      newHeadX < 0 ||
      newHeadX >= gridSize ||
      newHeadY < 0 ||
      newHeadY >= gridSize
    ) {
      if (!shieldCharges) {
        return {
          state,
          grew: false,
          collision: 'wall',
          won: false,
          pointsDelta: 0,
          consumedPowerUp: null,
          shieldSaved: false,
        };
      }
      return {
        state: { ...state, shieldCharges: shieldCharges - 1 },
        grew: false,
        collision: 'none',
        won: false,
        pointsDelta: 0,
        consumedPowerUp: null,
        shieldSaved: true,
      };
    }
  }

  const grew = newHeadX === food.x && newHeadY === food.y;

  const collisionSegments = grew ? snake : snake.slice(0, -1);
  for (let i = 0; i < collisionSegments.length; i += 1) {
    if (
      collisionSegments[i].x === newHeadX &&
      collisionSegments[i].y === newHeadY
    ) {
      if (!shieldCharges) {
        return {
          state,
          grew: false,
          collision: 'self',
          won: false,
          pointsDelta: 0,
          consumedPowerUp: null,
          shieldSaved: false,
        };
      }
      return {
        state: { ...state, shieldCharges: shieldCharges - 1 },
        grew: false,
        collision: 'none',
        won: false,
        pointsDelta: 0,
        consumedPowerUp: null,
        shieldSaved: true,
      };
    }
  }

  for (let i = 0; i < obstacles.length; i += 1) {
    if (obstacles[i].x === newHeadX && obstacles[i].y === newHeadY) {
      if (!shieldCharges) {
        return {
          state,
          grew: false,
          collision: 'obstacle',
          won: false,
          pointsDelta: 0,
          consumedPowerUp: null,
          shieldSaved: false,
        };
      }
      return {
        state: { ...state, shieldCharges: shieldCharges - 1 },
        grew: false,
        collision: 'none',
        won: false,
        pointsDelta: 0,
        consumedPowerUp: null,
        shieldSaved: true,
      };
    }
  }

  const newSnake: Point[] = [{ x: newHeadX, y: newHeadY }, ...snake];
  if (!grew) newSnake.pop();

  let nextPoints = points;
  let nextFoodsEaten = foodsEaten;
  let nextShieldCharges = shieldCharges;
  let pointsDelta = 0;
  let consumedPowerUp: PowerUpType | null = null;

  const randomFoodFn = options.randomFood ?? randomFood;
  const randomFn = options.random ?? Math.random;
  const nextFood = grew
    ? randomFoodFn(newSnake, obstacleSnapshot, gridSize, randomFn)
    : food;

  if (grew) {
    pointsDelta += 10;
    nextPoints += 10;
    nextFoodsEaten += 1;
  }

  const activePowerUp =
    powerUp && powerUp.ttl > 0 ? { ...powerUp, ttl: powerUp.ttl - 1 } : null;
  let nextPowerUp = activePowerUp && activePowerUp.ttl > 0 ? activePowerUp : null;

  if (nextPowerUp && nextPowerUp.x === newHeadX && nextPowerUp.y === newHeadY) {
    consumedPowerUp = nextPowerUp.type;
    if (nextPowerUp.type === 'bonus') {
      pointsDelta += 25;
    }
    if (nextPowerUp.type === 'slow') {
      pointsDelta += 5;
    }
    if (nextPowerUp.type === 'shield') {
      pointsDelta += 8;
      nextShieldCharges += 1;
    }
    nextPoints += pointsDelta - (grew ? 10 : 0);
    nextPowerUp = null;
  }

  let won = false;
  const nextObstacles = obstacles.map((o) => ({ ...o }));

  if (grew) {
    if (isNoCell(nextFood)) {
      won = true;
    } else if (options.randomObstacle) {
      const generator = options.randomObstacle;
      const nextObs = generator(
        newSnake,
        nextFood,
        obstacleSnapshot,
        gridSize,
        randomFn,
      );
      if (!isNoCell(nextObs)) nextObstacles.push(nextObs);
    }
  }

  if (grew && !nextPowerUp && options.randomPowerUp && randomFn() < 0.35) {
    nextPowerUp = options.randomPowerUp(
      newSnake,
      nextFood,
      nextObstacles,
      gridSize,
      randomFn,
    );
  }

  return {
    state: {
      snake: newSnake,
      food: nextFood,
      obstacles: nextObstacles,
      points: nextPoints,
      foodsEaten: nextFoodsEaten,
      shieldCharges: nextShieldCharges,
      powerUp: nextPowerUp,
    },
    grew,
    collision: 'none',
    pointsDelta,
    consumedPowerUp,
    shieldSaved: false,
    won,
  };
};
