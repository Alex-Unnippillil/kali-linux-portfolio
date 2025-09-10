import { randomFood, randomObstacle, GRID_SIZE, type Point } from '../snake';

describe('snake helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('randomFood', () => {
    it('returns a free point', () => {
      const snake: Point[] = [{ x: 0, y: 0 }];
      const obstacles: Point[] = [{ x: 1, y: 1 }];
      const values = [0, 0, 0, 0, 0.9, 0.9];
      jest.spyOn(Math, 'random').mockImplementation(() => values.shift()!);
      const food = randomFood(snake, obstacles);
      expect(food).toEqual({ x: 18, y: 18 });
      expect([...snake, ...obstacles]).not.toContainEqual(food);
    });

    it('returns null when board is full', () => {
      const snake: Point[] = [];
      for (let x = 0; x < GRID_SIZE; x += 1) {
        for (let y = 0; y < GRID_SIZE; y += 1) {
          snake.push({ x, y });
        }
      }
      expect(randomFood(snake)).toBeNull();
    });
  });

  describe('randomObstacle', () => {
    it('returns a free point', () => {
      const snake: Point[] = [{ x: 0, y: 0 }];
      const food: Point = { x: 1, y: 1 };
      const obstacles: Point[] = [{ x: 2, y: 2 }];
      const values = [0, 0, 0.05, 0.05, 0.1, 0.1, 0.9, 0.9];
      jest.spyOn(Math, 'random').mockImplementation(() => values.shift()!);
      const obstacle = randomObstacle(snake, food, obstacles);
      expect(obstacle).toEqual({ x: 18, y: 18 });
      expect([...snake, food, ...obstacles]).not.toContainEqual(obstacle);
    });

    it('returns null when no space available', () => {
      const snake: Point[] = [];
      for (let x = 0; x < GRID_SIZE; x += 1) {
        for (let y = 0; y < GRID_SIZE; y += 1) {
          if (x === 0 && y === 0) continue;
          snake.push({ x, y });
        }
      }
      const food: Point = { x: 0, y: 0 };
      expect(randomObstacle(snake, food)).toBeNull();
    });
  });
});
