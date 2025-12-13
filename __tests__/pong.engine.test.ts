import { createInitialState, DEFAULT_CONFIG, resetBall, step } from '../games/pong/engine';

describe('pong engine', () => {
  it('keeps paddles within bounds when moving up', () => {
    const state = createInitialState(DEFAULT_CONFIG, 1, 'local');
    state.paddles.left.y = 5;
    const inputs = { left: { up: true }, right: { up: false } } as const;
    step(state, inputs, 2, DEFAULT_CONFIG);
    expect(state.paddles.left.y).toBe(0);
    expect(state.paddles.left.vy).toBe(0);
  });

  it('keeps paddles within bounds when moving down', () => {
    const state = createInitialState(DEFAULT_CONFIG, 1, 'local');
    state.paddles.left.y = DEFAULT_CONFIG.HEIGHT - DEFAULT_CONFIG.PADDLE_HEIGHT - 5;
    const inputs = { left: { down: true }, right: { down: false } } as const;
    step(state, inputs, 2, DEFAULT_CONFIG);
    expect(state.paddles.left.y).toBe(DEFAULT_CONFIG.HEIGHT - DEFAULT_CONFIG.PADDLE_HEIGHT);
    expect(state.paddles.left.vy).toBe(0);
  });

  it('increments right score when ball exits left and resets ball', () => {
    const state = createInitialState(DEFAULT_CONFIG, 1, 'local');
    state.ball.x = -DEFAULT_CONFIG.BALL_SIZE - 10;
    state.ball.vx = -100;
    const inputs = { left: {}, right: {} } as const;
    step(state, inputs, 0.016, DEFAULT_CONFIG);
    expect(state.score.right).toBe(1);
    expect(state.ball.x).toBeCloseTo(DEFAULT_CONFIG.WIDTH / 2);
    expect(state.ball.vx).toBeGreaterThan(0);
    expect(state.rally).toBe(0);
  });

  it('increments left score when ball exits right and resets ball', () => {
    const state = createInitialState(DEFAULT_CONFIG, 1, 'local');
    state.ball.x = DEFAULT_CONFIG.WIDTH + DEFAULT_CONFIG.BALL_SIZE + 5;
    state.ball.vx = 120;
    const inputs = { left: {}, right: {} } as const;
    step(state, inputs, 0.016, DEFAULT_CONFIG);
    expect(state.score.left).toBe(1);
    expect(state.ball.x).toBeCloseTo(DEFAULT_CONFIG.WIDTH / 2);
    expect(state.ball.vx).toBeLessThan(0);
    expect(state.rally).toBe(0);
  });

  it('serves toward right after right scores and toward left after left scores', () => {
    const state = createInitialState(DEFAULT_CONFIG, 1, 'local');
    // Simulate right scoring
    resetBall(state, 1, DEFAULT_CONFIG);
    state.ball.x = -DEFAULT_CONFIG.BALL_SIZE - 1;
    step(state, { left: {}, right: {} }, 0.016, DEFAULT_CONFIG);
    expect(state.ball.vx).toBeGreaterThan(0);

    // Simulate left scoring
    resetBall(state, -1, DEFAULT_CONFIG);
    state.ball.x = DEFAULT_CONFIG.WIDTH + DEFAULT_CONFIG.BALL_SIZE + 1;
    step(state, { left: {}, right: {} }, 0.016, DEFAULT_CONFIG);
    expect(state.ball.vx).toBeLessThan(0);
  });
});
