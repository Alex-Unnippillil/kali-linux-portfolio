import {
  createInitialState,
  stepSnake,
  type Point,
  randomFood,
} from '../index';

describe('snake engine', () => {
  it('supports wrap movement when enabled', () => {
    const state = createInitialState({
      gridSize: 5,
      snake: [{ x: 0, y: 2 }],
      food: { x: 4, y: 4 },
      obstacles: [],
    });

    const result = stepSnake(state, { x: -1, y: 0 }, {
      wrap: true,
      gridSize: 5,
      randomObstacle: null,
    });

    expect(result.collision).toBe('none');
    expect(result.state.snake[0]).toEqual({ x: 4, y: 2 });
  });

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
    expect(result.state.snake[0]).toEqual({ x: 1, y: 2 });
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
  });

  it('has deterministic food placement with stub random', () => {
    const rand = jest.fn().mockReturnValue(0);
    const food = randomFood([{ x: 0, y: 0 }], [{ x: 1, y: 0 }], 3, rand);
    expect(food).toEqual({ x: 2, y: 0 });
  });

  it('prefers reachable food placement when enabled', () => {
    const state = createInitialState({
      gridSize: 5,
      snake: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
      obstacles: [
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 1, y: 3 },
        { x: 1, y: 4 },
      ],
      ensureReachableFood: true,
      random: () => 0,
    });

    expect(state.food.x).toBe(0);
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
  });
});
