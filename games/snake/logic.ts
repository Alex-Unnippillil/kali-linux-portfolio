export const GRID_SIZE = 20;

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  snake: Point[];
  dir: Point;
  food: Point;
  wrap: boolean;
}

export const randomFood = (snake: Point[]): Point => {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
};

export const createState = (wrap = false): GameState => {
  const start = {
    x: Math.floor(GRID_SIZE / 2),
    y: Math.floor(GRID_SIZE / 2),
  };
  return {
    snake: [start],
    dir: { x: 1, y: 0 },
    food: randomFood([start]),
    wrap,
  };
};

export const step = (
  state: GameState,
): { state: GameState; gameOver: boolean; ate: boolean } => {
  const snake = [...state.snake];
  let headX = snake[0].x + state.dir.x;
  let headY = snake[0].y + state.dir.y;

  if (state.wrap) {
    headX = (headX + GRID_SIZE) % GRID_SIZE;
    headY = (headY + GRID_SIZE) % GRID_SIZE;
  } else if (
    headX < 0 ||
    headY < 0 ||
    headX >= GRID_SIZE ||
    headY >= GRID_SIZE
  ) {
    return { state, gameOver: true, ate: false };
  }

  if (snake.some((seg) => seg.x === headX && seg.y === headY)) {
    return { state, gameOver: true, ate: false };
  }

  snake.unshift({ x: headX, y: headY });

  let food = state.food;
  let ate = false;
  if (headX === food.x && headY === food.y) {
    ate = true;
    food = randomFood(snake);
  } else {
    snake.pop();
  }

  return { state: { ...state, snake, food }, gameOver: false, ate };
};

export default {
  GRID_SIZE,
  randomFood,
  createState,
  step,
};
