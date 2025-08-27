import { handleBallBrickCollision, handlePaddleCollision } from "../components/apps/breakout";

describe("breakout mechanics", () => {
  test("ball-brick collision removes brick and increases score", () => {
    const bricks = [{ x: 0, y: 0, w: 50, h: 20, alive: true }];
    const ball = { x: 10, y: 10, vx: 0, vy: 50, r: 5 };
    const score = { current: 0 };
    const powerUps = [];
    const hit = handleBallBrickCollision(ball, bricks, score, powerUps);
    expect(hit).toBe(true);
    expect(bricks[0].alive).toBe(false);
    expect(score.current).toBe(10);
  });

  test("magnet only engages when enabled", () => {
    const paddle = { x: 0, y: 100, w: 100, h: 10 };
    const ball1 = { x: 50, y: 96, vx: 0, vy: 50, r: 5 };
    const magnetHit = handlePaddleCollision(ball1, paddle, true, false);
    expect(magnetHit).toBe(true);
    expect(ball1.stuck).toBe(true);

    const ball2 = { x: 50, y: 96, vx: 0, vy: 50, r: 5 };
    const normalHit = handlePaddleCollision(ball2, paddle, false, false);
    expect(normalHit).toBe(true);
    expect(ball2.stuck).toBeFalsy();
    expect(ball2.vy).toBeLessThan(0);
  });
});
