import { createInitialState, stepSnake, type SnakeState } from '../apps/snake';

const baseState = (overrides: Partial<SnakeState> = {}): SnakeState => ({
  snake: [
    { x: 2, y: 2 },
    { x: 1, y: 2 },
    { x: 0, y: 2 },
  ],
  food: { x: 5, y: 5 },
  obstacles: [],
  points: 0,
  foodsEaten: 0,
  shieldCharges: 0,
  powerUp: null,
  ...overrides,
});

describe('snake engine upgrades', () => {
  it('initializes metadata fields', () => {
    const state = createInitialState();
    expect(state.points).toBe(0);
    expect(state.foodsEaten).toBe(0);
    expect(state.shieldCharges).toBe(0);
    expect(state.powerUp).toBeNull();
  });

  it('awards points and food counter when eating', () => {
    const state = baseState({ food: { x: 3, y: 2 } });
    const result = stepSnake(state, { x: 1, y: 0 }, { wrap: false, gridSize: 20 });
    expect(result.grew).toBe(true);
    expect(result.pointsDelta).toBe(10);
    expect(result.state.points).toBe(10);
    expect(result.state.foodsEaten).toBe(1);
  });

  it('consumes power-ups and awards shield charges', () => {
    const state = baseState({
      powerUp: { x: 3, y: 2, type: 'shield', ttl: 30 },
    });
    const result = stepSnake(state, { x: 1, y: 0 }, { wrap: false, gridSize: 20 });
    expect(result.consumedPowerUp).toBe('shield');
    expect(result.pointsDelta).toBe(8);
    expect(result.state.shieldCharges).toBe(1);
    expect(result.state.powerUp).toBeNull();
  });

  it('uses a shield charge to prevent death once', () => {
    const state = baseState({
      snake: [{ x: 0, y: 5 }],
      shieldCharges: 1,
    });
    const result = stepSnake(state, { x: -1, y: 0 }, { wrap: false, gridSize: 20 });
    expect(result.shieldSaved).toBe(true);
    expect(result.collision).toBe('none');
    expect(result.state.shieldCharges).toBe(0);
  });
});
