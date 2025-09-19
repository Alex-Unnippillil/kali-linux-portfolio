export const DEFAULT_GRID_SIZE = 20;

export interface Point {
  x: number;
  y: number;
}

export interface GameState {
  snake: Point[];
  dir: Point;
  food: Point;
  wrap: boolean;
  gridSize: number;
}

export const randomFood = (snake: Point[], gridSize: number): Point => {
  let pos: Point;
  do {
    pos = {
      x: Math.floor(Math.random() * gridSize),
      y: Math.floor(Math.random() * gridSize),
    };
  } while (snake.some((s) => s.x === pos.x && s.y === pos.y));
  return pos;
};

export const createState = (
  wrap = false,
  gridSize = DEFAULT_GRID_SIZE,
): GameState => {
  const start = {
    x: Math.floor(gridSize / 2),
    y: Math.floor(gridSize / 2),
  };
  return {
    snake: [start],
    dir: { x: 1, y: 0 },
    food: randomFood([start], gridSize),
    wrap,
    gridSize,
  };
};

export const step = (
  state: GameState,
): { state: GameState; gameOver: boolean; ate: boolean } => {
  const snake = [...state.snake];
  let headX = snake[0].x + state.dir.x;
  let headY = snake[0].y + state.dir.y;

  const { gridSize } = state;

  if (state.wrap) {
    headX = (headX + gridSize) % gridSize;
    headY = (headY + gridSize) % gridSize;
  } else if (headX < 0 || headY < 0 || headX >= gridSize || headY >= gridSize) {
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
    food = randomFood(snake, gridSize);
  } else {
    snake.pop();
  }

  return { state: { ...state, snake, food }, gameOver: false, ate };
};

const snakeLogic = {
  DEFAULT_GRID_SIZE,
  randomFood,
  createState,
  step,
};

export default snakeLogic;
