import {
  createInitialState,
  stepSnake,
  type Point,
} from '../index';

describe('snake engine', () => {
  it('detects wall collisions when wrapping is disabled', () => {
    const state = createInitialState({
      gridSize: 5,
      snake: [{ x: 0, y: 0 }],
      food: { x: 2, y: 2 },
      obstacles: [],
    });

    const result = stepSnake(state, { x: -1, y: 0 }, {
      wrap: false,
      gridSize: 5,
      randomObstacle: null,
    });

    expect(result.collision).toBe('wall');
    expect(result.won).toBe(false);
    expect(state.snake[0]).toEqual({ x: 0, y: 0 });
  });

  it('detects self-collisions', () => {
    const snake: Point[] = [
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
    ];
    const state = createInitialState({
      gridSize: 5,
      snake,
      food: { x: 4, y: 4 },
      obstacles: [],
    });

    const result = stepSnake(state, { x: 0, y: 1 }, {
      wrap: false,
      gridSize: 5,
      randomObstacle: null,
    });

    expect(result.collision).toBe('self');
    expect(result.won).toBe(false);
  });

  it('allows moving into the tail when not growing', () => {
    const state = createInitialState({
      gridSize: 5,
      snake: [
        { x: 2, y: 2 },
        { x: 2, y: 3 },
        { x: 1, y: 3 },
        { x: 1, y: 2 },
      ],
      food: { x: 4, y: 4 },
      obstacles: [],
    });

    const result = stepSnake(state, { x: -1, y: 0 }, {
      wrap: false,
      gridSize: 5,
      randomObstacle: null,
    });

    expect(result.collision).toBe('none');
    expect(result.grew).toBe(false);
    expect(result.state.snake).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 3 },
      { x: 1, y: 3 },
    ]);
  });

  it('detects obstacle collisions', () => {
    const state = createInitialState({
      gridSize: 5,
      snake: [
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ],
      food: { x: 4, y: 4 },
      obstacles: [{ x: 2, y: 1 }],
    });

    const result = stepSnake(state, { x: 1, y: 0 }, {
      wrap: false,
      gridSize: 5,
      randomObstacle: null,
    });

    expect(result.collision).toBe('obstacle');
    expect(result.won).toBe(false);
  });

  it('grows the snake and spawns new food and obstacles when eating', () => {
    const state = createInitialState({
      gridSize: 5,
      snake: [
        { x: 2, y: 2 },
        { x: 1, y: 2 },
      ],
      food: { x: 3, y: 2 },
      obstacles: [{ x: 0, y: 0 }],
    });

    const nextFood = { x: 0, y: 1 };
    const newObstacle = { x: 4, y: 4 };
    const randomFood = jest.fn().mockReturnValue(nextFood);
    const randomObstacle = jest.fn().mockReturnValue(newObstacle);

    const result = stepSnake(state, { x: 1, y: 0 }, {
      wrap: false,
      gridSize: 5,
      randomFood,
      randomObstacle,
    });

    expect(result.collision).toBe('none');
    expect(result.grew).toBe(true);
    expect(result.won).toBe(false);
    expect(result.state.snake).toHaveLength(3);
    expect(result.state.food).toEqual(nextFood);
    expect(result.state.obstacles).toContainEqual(newObstacle);
    expect(randomFood).toHaveBeenCalledWith(
      result.state.snake,
      [{ x: 0, y: 0 }],
      5,
      expect.any(Function),
    );
    expect(randomObstacle).toHaveBeenCalledWith(
      result.state.snake,
      nextFood,
      [{ x: 0, y: 0 }],
      5,
      expect.any(Function),
    );
  });

  it('detects a win when no food can be spawned', () => {
    const state = createInitialState({
      gridSize: 2,
      snake: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      food: { x: -1, y: -1 },
      obstacles: [],
    });

    const result = stepSnake(state, { x: 0, y: 1 }, {
      wrap: true,
      gridSize: 2,
      randomObstacle: null,
    });

    expect(result.won).toBe(true);
    expect(result.collision).toBe('none');
  });
});
