import {
  DEFAULT_GRID_SIZE,
  stepSnake,
  type SnakeState,
  type Point,
} from '../games/snake/logic';

const baseState = (overrides: Partial<SnakeState> = {}): SnakeState => ({
  snake: [{ x: 0, y: 0 }],
  food: { x: 1, y: 0 },
  obstacles: [],
  rng: 1,
  status: 'RUNNING',
  ...overrides,
});

const cloneState = (state: SnakeState): SnakeState => ({
  snake: state.snake.map((s) => ({ ...s })),
  food: state.food ? { ...state.food } : null,
  obstacles: state.obstacles.map((o) => ({ ...o })),
  rng: state.rng,
  status: state.status,
});

describe('snake logic', () => {
  test('detects wall collisions when wrapping is disabled', () => {
    const state = baseState({ snake: [{ x: 4, y: 2 }], food: null });
    const result = stepSnake(state, { x: 1, y: 0 }, { gridSize: 5 });
    expect(result.collision).toBe('wall');
    expect(result.state.status).toBe('DEAD');
  });

  test('wraps around the grid when enabled', () => {
    const state = baseState({ snake: [{ x: 4, y: 0 }], food: null });
    const result = stepSnake(state, { x: 1, y: 0 }, { gridSize: 5, wrap: true });
    expect(result.collision).toBe('none');
    expect(result.state.snake[0]).toEqual({ x: 0, y: 0 });
  });

  test('detects self collision excluding the tail when not growing', () => {
    const snake: Point[] = [
      { x: 2, y: 1 },
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ];
    const result = stepSnake(baseState({ snake, food: null }), { x: -1, y: 0 });
    expect(result.collision).toBe('self');
    expect(result.state.status).toBe('DEAD');
  });

  test('allows moving into the tail when it will pop', () => {
    const snake: Point[] = [
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ];
    const result = stepSnake(baseState({ snake, food: null }), { x: -1, y: 0 });
    expect(result.collision).toBe('none');
    expect(result.state.snake).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
  });

  test('grows when eating food', () => {
    const state = baseState({ snake: [{ x: 1, y: 1 }], food: { x: 2, y: 1 } });
    const result = stepSnake(state, { x: 1, y: 0 }, { gridSize: DEFAULT_GRID_SIZE });
    expect(result.grew).toBe(true);
    expect(result.state.snake).toHaveLength(2);
  });

  test('spawns food deterministically from the same seed', () => {
    const seededState: SnakeState = {
      snake: [{ x: 1, y: 1 }],
      food: { x: 2, y: 1 },
      obstacles: [],
      rng: 123,
      status: 'RUNNING',
    };
    const resultA = stepSnake(cloneState(seededState), { x: 1, y: 0 });
    const resultB = stepSnake(cloneState(seededState), { x: 1, y: 0 });
    expect(resultA.state.food).toEqual(resultB.state.food);
  });

  test('reports a win when the board fills completely', () => {
    const tinyGrid = 2;
    const state: SnakeState = {
      snake: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
      food: { x: 1, y: 0 },
      obstacles: [],
      rng: 7,
      status: 'RUNNING',
    };
    const result = stepSnake(state, { x: 1, y: 0 }, { gridSize: tinyGrid });
    expect(result.won).toBe(true);
    expect(result.state.status).toBe('WON');
    expect(result.state.food).toBeNull();
  });
});
