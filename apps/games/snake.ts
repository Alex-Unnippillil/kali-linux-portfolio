export const GRID_SIZE = 20;

export interface Point {
  x: number;
  y: number;
}

export const randomFood = (
  snake: Point[],
  obstacles: Point[] = [],
  maxAttempts = 100,
): Point | null => {
  for (let i = 0; i < maxAttempts; i += 1) {
    const pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (
      !snake.some((s) => s.x === pos.x && s.y === pos.y) &&
      !obstacles.some((o) => o.x === pos.x && o.y === pos.y)
    )
      return pos;
  }
  return null;
};

export const randomObstacle = (
  snake: Point[],
  food: Point,
  obstacles: Point[] = [],
  maxAttempts = 100,
): Point | null => {
  for (let i = 0; i < maxAttempts; i += 1) {
    const pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
    if (
      !snake.some((s) => s.x === pos.x && s.y === pos.y) &&
      !(food.x === pos.x && food.y === pos.y) &&
      !obstacles.some((o) => o.x === pos.x && o.y === pos.y)
    )
      return pos;
  }
  return null;
};

export const generateObstacles = (
  count: number,
  snake: Point[],
  food: Point,
): Point[] => {
  const obstacles: Point[] = [];
  for (let i = 0; i < count; i += 1) {
    const pos = randomObstacle(snake, food, obstacles);
    if (!pos) break;
    obstacles.push(pos);
  }
  return obstacles;
};
