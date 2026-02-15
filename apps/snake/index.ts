export const GRID_SIZE = 20;

export interface Point {
  x: number;
  y: number;
}

export interface SnakeState {
  snake: Point[];
  food: Point;
  obstacles: Point[];
}

export type CollisionType = 'none' | 'wall' | 'self' | 'obstacle';

export interface StepResult {
  state: SnakeState;
  grew: boolean;
  collision: CollisionType;
  /** True when the board is full and no new food can be spawned. */
  won: boolean;
}

export interface SnakeOptions {
  wrap: boolean;
  gridSize: number;
  random?: () => number;
  randomFood?: typeof randomFood;
  randomObstacle?: typeof randomObstacle | null;
  ensureReachableFood?: boolean;
  obstaclePlacementSafety?: 'off' | 'basic';
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

const canReachCell = (
  start: Point,
  target: Point,
  blocked: Set<string>,
  gridSize: number,
): boolean => {
  if (isNoCell(target)) return false;
  if (start.x === target.x && start.y === target.y) return true;

  const visited = new Set<string>();
  const queue: Point[] = [start];
  visited.add(key(start));

  while (queue.length) {
    const current = queue.shift()!;
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const next of neighbors) {
      if (next.x < 0 || next.y < 0 || next.x >= gridSize || next.y >= gridSize) {
        continue;
      }
      const nextKey = key(next);
      if (visited.has(nextKey) || blocked.has(nextKey)) continue;
      if (next.x === target.x && next.y === target.y) return true;
      visited.add(nextKey);
      queue.push(next);
    }
  }

  return false;
};

const pickReachableFood = (
  snake: Point[],
  obstacles: Point[],
  gridSize: number,
  rand: () => number,
  attempts = 20,
): Point => {
  const occupied = new Set<string>();
  for (const segment of snake) occupied.add(key(segment));
  for (const obstacle of obstacles) occupied.add(key(obstacle));
  const free = listFreeCells(occupied, gridSize);
  if (!free.length) return { ...NO_CELL };

  const head = snake[0];
  const blocked = new Set<string>();
  for (const obstacle of obstacles) blocked.add(key(obstacle));

  const candidates = [...free];
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  for (let i = 0; i < Math.min(attempts, candidates.length); i += 1) {
    const candidate = candidates[i];
    if (canReachCell(head, candidate, blocked, gridSize)) {
      return candidate;
    }
  }

  return pickRandom(free, rand);
};

const isSafeObstacleCandidate = (
  candidate: Point,
  snake: Point[],
  food: Point,
  obstacles: Point[],
  gridSize: number,
): boolean => {
  const head = snake[0];
  const blocked = new Set<string>();
  for (const obstacle of obstacles) blocked.add(key(obstacle));
  blocked.add(key(candidate));
  if (!isNoCell(food)) blocked.add(key(food));

  const neighbors = [
    { x: head.x + 1, y: head.y },
    { x: head.x - 1, y: head.y },
    { x: head.x, y: head.y + 1 },
    { x: head.x, y: head.y - 1 },
  ];

  return neighbors.some((next) => {
    if (next.x < 0 || next.y < 0 || next.x >= gridSize || next.y >= gridSize) {
      return false;
    }
    if (blocked.has(key(next))) return false;
    const reachable = canReachCell(head, next, blocked, gridSize);
    return reachable;
  });
};

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

const generateObstacles = (params: {
  snake: Point[];
  food: Point;
  existing?: Point[];
  count: number;
  gridSize: number;
  generator: typeof randomObstacle;
  random?: () => number;
  obstaclePlacementSafety?: 'off' | 'basic';
}): Point[] => {
  const obstacles: Point[] = [];

  if (params.existing?.length) {
    params.existing.forEach((o) => {
      if (!isNoCell(o)) obstacles.push({ ...o });
    });
  }

  const rand = params.random ?? Math.random;
  const maxTries = 25;

  for (let i = obstacles.length; i < params.count; i += 1) {
    let next: Point = { ...NO_CELL };
    let placed = false;

    for (let attempt = 0; attempt < maxTries; attempt += 1) {
      next = params.generator(
        params.snake,
        params.food,
        obstacles,
        params.gridSize,
        rand,
      );
      if (isNoCell(next)) break;
      if (
        params.obstaclePlacementSafety === 'basic' &&
        !isSafeObstacleCandidate(
          next,
          params.snake,
          params.food,
          obstacles,
          params.gridSize,
        )
      ) {
        continue;
      }
      obstacles.push(next);
      placed = true;
      break;
    }

    if (!placed && isNoCell(next)) break;
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
  ensureReachableFood?: boolean;
  obstaclePlacementSafety?: 'off' | 'basic';
}): SnakeState => {
  const gridSize = params?.gridSize ?? GRID_SIZE;

  const snake: Point[] =
    params?.snake?.map((p) => ({ ...p })) ?? [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 0, y: 2 },
    ];

  const randomFn = params?.random ?? Math.random;
  const obstacleInput = params?.obstacles ?? [];

  const food =
    params?.food ??
    (params?.ensureReachableFood
      ? pickReachableFood(snake, obstacleInput, gridSize, randomFn)
      : params?.randomFood
        ? params.randomFood(snake, obstacleInput, gridSize, randomFn)
        : randomFood(snake, obstacleInput, gridSize, randomFn));

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
    random: randomFn,
    obstaclePlacementSafety: params?.obstaclePlacementSafety ?? 'off',
  });

  return { snake, food, obstacles };
};

export const stepSnake = (
  state: SnakeState,
  dir: Point,
  options: SnakeOptions,
): StepResult => {
  const gridSize = options.gridSize;

  if (isNoCell(state.food)) {
    return { state, grew: false, collision: 'none', won: true };
  }

  const snake = state.snake.map((p) => ({ ...p }));
  const obstacles = state.obstacles.map((o) => ({ ...o }));
  const food = { ...state.food };

  const head = snake[0];
  let newHeadX = head.x + dir.x;
  let newHeadY = head.y + dir.y;

  if (options.wrap) {
    if (newHeadX < 0) newHeadX = gridSize - 1;
    if (newHeadX >= gridSize) newHeadX = 0;
    if (newHeadY < 0) newHeadY = gridSize - 1;
    if (newHeadY >= gridSize) newHeadY = 0;
  } else if (newHeadX < 0 || newHeadX >= gridSize || newHeadY < 0 || newHeadY >= gridSize) {
    return { state, grew: false, collision: 'wall', won: false };
  }

  const grew = newHeadX === food.x && newHeadY === food.y;
  const newHeadKey = `${newHeadX},${newHeadY}`;

  const occupied = new Set<string>();
  for (const obstacle of obstacles) occupied.add(key(obstacle));
  for (let i = 0; i < snake.length; i += 1) {
    if (!grew && i === snake.length - 1) continue;
    occupied.add(key(snake[i]));
  }

  if (occupied.has(newHeadKey)) {
    const obstacleHit = obstacles.some((o) => o.x === newHeadX && o.y === newHeadY);
    return {
      state,
      grew: false,
      collision: obstacleHit ? 'obstacle' : 'self',
      won: false,
    };
  }

  const newSnake: Point[] = [{ x: newHeadX, y: newHeadY }, ...snake];
  if (!grew) newSnake.pop();

  const randomFoodFn = options.randomFood ?? randomFood;
  const randomFn = options.random ?? Math.random;
  const nextFood = grew
    ? options.ensureReachableFood
      ? pickReachableFood(newSnake, obstacles, gridSize, randomFn)
      : randomFoodFn(newSnake, obstacles, gridSize, randomFn)
    : food;

  let won = false;
  const nextObstacles = obstacles.map((o) => ({ ...o }));

  if (grew) {
    if (isNoCell(nextFood)) {
      won = true;
    } else if (options.randomObstacle) {
      const generator = options.randomObstacle;
      const maxTries = options.obstaclePlacementSafety === 'basic' ? 20 : 1;
      for (let attempt = 0; attempt < maxTries; attempt += 1) {
        const nextObs = generator(
          newSnake,
          nextFood,
          nextObstacles,
          gridSize,
          randomFn,
        );
        if (isNoCell(nextObs)) break;
        if (
          options.obstaclePlacementSafety === 'basic' &&
          !isSafeObstacleCandidate(
            nextObs,
            newSnake,
            nextFood,
            nextObstacles,
            gridSize,
          )
        ) {
          continue;
        }
        nextObstacles.push(nextObs);
        break;
      }
    }
  }

  return {
    state: {
      snake: newSnake,
      food: nextFood,
      obstacles: nextObstacles,
    },
    grew,
    collision: 'none',
    won,
  };
};
