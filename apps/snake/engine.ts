export type Point = { x: number; y: number };

export interface GameState {
  gridSize: number;
  snake: Point[];
  food: Point;
  wrap: boolean;
  rng: () => number;
}

export const makeRng = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const randomCell = (occupied: Point[], size: number, rng: () => number): Point => {
  let cell: Point;
  do {
    cell = { x: Math.floor(rng() * size), y: Math.floor(rng() * size) };
  } while (occupied.some((p) => p.x === cell.x && p.y === cell.y));
  return cell;
};

export const createGame = (gridSize = 20, seed = Date.now(), wrap = false): GameState => {
  const rng = makeRng(seed);
  const start = { x: Math.floor(gridSize / 2), y: Math.floor(gridSize / 2) };
  const food = randomCell([start], gridSize, rng);
  return { gridSize, snake: [start], food, wrap, rng };
};

export const step = (state: GameState, dir: Point): 'moved' | 'ate' | 'dead' => {
  const head = { x: state.snake[0].x + dir.x, y: state.snake[0].y + dir.y };
  if (state.wrap) {
    head.x = (head.x + state.gridSize) % state.gridSize;
    head.y = (head.y + state.gridSize) % state.gridSize;
  }
  const hitWall = head.x < 0 || head.x >= state.gridSize || head.y < 0 || head.y >= state.gridSize;
  const hitSelf = state.snake.some((s) => s.x === head.x && s.y === head.y);
  if ((!state.wrap && hitWall) || hitSelf) {
    return 'dead';
  }
  state.snake.unshift(head);
  if (head.x === state.food.x && head.y === state.food.y) {
    state.food = randomCell(state.snake, state.gridSize, state.rng);
    return 'ate';
  }
  state.snake.pop();
  return 'moved';
};
