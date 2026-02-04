import {
  BREAKOUT_COLS,
  BREAKOUT_ROWS,
  normalizeLayout,
} from '../components/apps/breakoutPresets';
import {
  BALL_RADIUS,
  createBricks,
  pointsForBrick,
  shouldServeFromPointer,
  stepBallPhysics,
} from '../components/apps/breakout';

describe('breakout layout normalization', () => {
  test('pads and filters invalid cells', () => {
    const raw = [[1, 2, 3, 4], ['x', -1, 2]] as any;
    const normalized = normalizeLayout(raw, BREAKOUT_ROWS, BREAKOUT_COLS);
    expect(normalized).toHaveLength(BREAKOUT_ROWS);
    normalized.forEach((row) => expect(row).toHaveLength(BREAKOUT_COLS));
    expect(normalized[0][0]).toBe(1);
    expect(normalized[0][1]).toBe(2);
    expect(normalized[0][2]).toBe(3);
    expect(normalized[0][3]).toBe(0);
    expect(normalized[1][0]).toBe(0);
    expect(normalized[1][1]).toBe(0);
  });
});

describe('breakout scoring', () => {
  test('assigns points by brick type', () => {
    expect(pointsForBrick(1)).toBe(25);
    expect(pointsForBrick(2)).toBe(50);
    expect(pointsForBrick(3)).toBe(75);
  });
});

describe('breakout input handling', () => {
  test('serves only on small pointer moves', () => {
    expect(shouldServeFromPointer(100, 108)).toBe(true);
    expect(shouldServeFromPointer(100, 140)).toBe(false);
  });
});

describe('breakout physics step', () => {
  test('bounces off a brick deterministically', () => {
    const layout = Array.from({ length: BREAKOUT_ROWS }, () =>
      Array(BREAKOUT_COLS).fill(0),
    );
    layout[0][0] = 1;
    const bricks = createBricks(layout);
    const brick = bricks[0];
    const ball = {
      x: brick.x + brick.w / 2,
      y: brick.y - BALL_RADIUS - 1,
      vx: 0,
      vy: 140,
      stuck: false,
      offset: 0,
      trail: [],
    };

    const { ball: nextBall, hitBrickIndex } = stepBallPhysics({
      ball,
      dt: 0.016,
      speed: 140,
      paddleX: 0,
      paddleWidth: 60,
      bricks,
    });

    expect(hitBrickIndex).toBe(0);
    expect(nextBall.vy).toBeLessThan(0);
  });

  test('reflects off the left wall', () => {
    const bricks: any[] = [];
    const ball = {
      x: BALL_RADIUS - 1,
      y: 120,
      vx: -120,
      vy: 0,
      stuck: false,
      offset: 0,
      trail: [],
    };

    const { ball: nextBall } = stepBallPhysics({
      ball,
      dt: 0.016,
      speed: 120,
      paddleX: 0,
      paddleWidth: 60,
      bricks,
    });

    expect(nextBall.vx).toBeGreaterThan(0);
  });
});
