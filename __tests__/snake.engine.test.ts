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
  pendingGrowth: 0,
  phaseTicks: 0,
  powerUp: null,
  ...overrides,
});

describe('snake engine upgrades', () => {
  it('initializes metadata fields', () => {
    const state = createInitialState();
    expect(state.points).toBe(0);
    expect(state.foodsEaten).toBe(0);
    expect(state.shieldCharges).toBe(0);
    expect(state.pendingGrowth).toBe(0);
    expect(state.phaseTicks).toBe(0);
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

  it('phase power-up allows safe movement through obstacles', () => {
    const withPhase = baseState({
      powerUp: { x: 3, y: 2, type: 'phase', ttl: 30 },
      obstacles: [{ x: 4, y: 2 }],
    });
    const phasePickup = stepSnake(withPhase, { x: 1, y: 0 }, { wrap: false, gridSize: 20 });
    expect(phasePickup.consumedPowerUp).toBe('phase');
    expect(phasePickup.state.phaseTicks).toBeGreaterThan(0);

    const throughObstacle = stepSnake(
      phasePickup.state,
      { x: 1, y: 0 },
      { wrap: false, gridSize: 20 },
    );
    expect(throughObstacle.collision).toBe('none');
  });

  it('feast power-up queues growth even without new pellet', () => {
    const withFeast = baseState({
      powerUp: { x: 3, y: 2, type: 'feast', ttl: 30 },
    });
    const pickup = stepSnake(withFeast, { x: 1, y: 0 }, { wrap: false, gridSize: 20 });
    expect(pickup.state.pendingGrowth).toBe(2);

    const grown = stepSnake(pickup.state, { x: 1, y: 0 }, { wrap: false, gridSize: 20 });
    expect(grown.grew).toBe(true);
    expect(grown.state.snake).toHaveLength(withFeast.snake.length + 1);
    expect(grown.state.pendingGrowth).toBe(1);
  });
});
