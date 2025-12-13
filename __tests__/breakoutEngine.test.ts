import {
  BALL_RADIUS,
  BreakoutState,
  createState,
  defaultGrid,
  reflectVector,
  stepBreakout,
  sweepAabb,
} from '../components/apps/breakout/engine';

const singleBrickGrid = () => [
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
];

const runSteps = (state: BreakoutState, frames: number) => {
  for (let i = 0; i < frames; i += 1) {
    const result = stepBreakout(state, 1 / 60);
    if (result.levelCleared) return;
  }
};

describe('breakout engine', () => {
  test('deterministic brick clear', () => {
    const grid = singleBrickGrid();
    const stateA = createState({ grid });
    const stateB = createState({ grid });

    [stateA, stateB].forEach((state) => {
      const brick = state.bricks[0];
      const ball = state.balls[0];
      ball.stuck = false;
      ball.x = brick.x + brick.w / 2;
      ball.y = state.paddle.y - BALL_RADIUS - 5;
      ball.vx = 0;
      ball.vy = -220;
      runSteps(state, 180);
    });

    expect(stateA.bricks[0].alive).toBe(false);
    expect(stateA.score).toBe(100);
    expect(stateB.bricks[0].alive).toBe(false);
    expect(stateA.score).toBe(stateB.score);
    expect(stateA.balls[0].vx).toBeCloseTo(stateB.balls[0].vx, 5);
    expect(stateA.balls[0].vy).toBeCloseTo(stateB.balls[0].vy, 5);
  });

  test('high-speed tunneling regression', () => {
    const grid = singleBrickGrid();
    const state = createState({ grid });
    const brick = state.bricks[0];
    const ball = state.balls[0];
    ball.stuck = false;
    ball.x = brick.x + brick.w / 2;
    ball.y = brick.y - 30;
    ball.vx = 0;
    ball.vy = 800;

    stepBreakout(state, 0.05);
    expect(brick.alive).toBe(false);
    expect(ball.vy).toBeLessThan(0);
  });

  test('normal-based reflection', () => {
    const grid = defaultGrid();
    const state = createState({ grid });
    const brick = state.bricks[0];

    const ballLeft = state.balls[0];
    ballLeft.stuck = false;
    ballLeft.x = brick.x + brick.w + 10;
    ballLeft.y = brick.y + brick.h / 2;
    ballLeft.vx = -300;
    ballLeft.vy = 0;
    stepBreakout(state, 0.05);
    expect(ballLeft.vx).toBeGreaterThan(0);

    const topState = createState({ grid });
    const topBrick = topState.bricks[0];
    const topBall = topState.balls[0];
    topBall.stuck = false;
    topBall.x = topBrick.x + topBrick.w / 2;
    topBall.y = topBrick.y - BALL_RADIUS - 1;
    topBall.vx = 0;
    topBall.vy = 300;
    stepBreakout(topState, 0.05);
    expect(topBall.vy).toBeLessThan(0);

    const leftRect = { minX: 10, maxX: 30, minY: 10, maxY: 30 };
    const hit = sweepAabb({ x: 0, y: 0 }, { x: 40, y: 20 }, leftRect);
    expect(hit?.normal).toEqual({ x: 0, y: -1 });

    const downReflection = reflectVector(0, 10, 0, -1);
    expect(downReflection.vy).toBe(-10);
  });

  test('powerup stacking refreshes duration', () => {
    const state = createState();
    const dropX = state.paddle.x + 5;
    state.powerupsFalling.push({ id: 'd1', type: 'magnet', x: dropX, y: state.paddle.y, vy: 0 });
    stepBreakout(state, 0.016);
    const firstExpiry = state.activePowerups.magnet?.expiresAtMs ?? 0;

    state.nowMs = firstExpiry - 1000;
    state.powerupsFalling.push({ id: 'd2', type: 'magnet', x: dropX, y: state.paddle.y, vy: 0 });
    stepBreakout(state, 0.016);
    const secondExpiry = state.activePowerups.magnet?.expiresAtMs ?? 0;

    expect(secondExpiry).toBeGreaterThan(firstExpiry);
  });
});
