/** @jest-environment node */
import { Bodies, Body } from 'matter-js';
import { createPinballWorld, constants, type PinballWorld } from '../apps/pinball/physics';
import { FLIPPER_LENGTH, SHOOTER, THEMES } from '../apps/pinball/table';

describe('Pinball real Matter.js simulation', () => {
  const worlds: PinballWorld[] = [];
  const make = () => {
    const world = createPinballWorld(null, { onScore: jest.fn() }, THEMES.space);
    worlds.push(world); return world;
  };
  afterEach(() => { worlds.splice(0).forEach((world) => world.destroy()); jest.restoreAllMocks(); });
  it('keeps the ball locked and never scores or drains before launch', () => {
    const world = make();
    for (let i = 0; i < 600; i += 1) world.step(1 / 60);
    expect(world.inspect().balls[0]).toMatchObject({ ...SHOOTER, vx: 0, vy: 0 });
    expect(world.inspect().state).toMatchObject({ score: 0, ballsRemaining: 3, phase: 'ready' });
  });
  it.each([0.4, 0.8, 1.4])('launch power %s actually reaches the playfield', (power) => {
    const world = make(); world.launchBall(power);
    let reached = false;
    for (let i = 0; i < 480; i += 1) {
      world.step(1 / 120);
      reached ||= world.inspect().balls.some((ball) => ball.x < 350 && ball.y < 400);
    }
    expect(reached).toBe(true);
  });
  it('has frame-rate-independent results at 30, 60, 120 and 144 Hz', () => {
    const snapshots = [30, 60, 120, 144].map((fps) => {
      const world = make(); world.launchBall(0.8);
      for (let i = 0; i < fps; i += 1) world.step(1 / fps);
      return world.inspect();
    });
    snapshots.forEach((snapshot) => {
      expect(snapshot.steps).toBe(120);
      expect(snapshot.state).toEqual(snapshots[0].state);
      expect(snapshot.balls[0].x).toBeCloseTo(snapshots[0].balls[0].x, 5);
      expect(snapshot.balls[0].y).toBeCloseTo(snapshots[0].balls[0].y, 5);
    });
  });
  it('bounds catch-up work and rejects invalid deltas', () => {
    const world = make(); world.launchBall(0.8); world.step(100);
    expect(world.inspect().steps).toBe(constants.MAX_STEPS);
    const before = world.inspect();
    [NaN, Infinity, -1].forEach(world.step);
    expect(world.inspect()).toEqual(before);
  });
  it('rotates both flippers around their endpoints rather than their centres', () => {
    const world = make();
    world.setLeftFlipper(-Math.PI / 4); world.setRightFlipper(Math.PI / 4);
    for (let i = 0; i < 20; i += 1) world.step(1 / 120);
    world.inspect().flippers.forEach((flipper) => {
      expect(flipper.x - Math.cos(flipper.angle) * FLIPPER_LENGTH / 2).toBeCloseTo(flipper.pivot.x, 5);
      expect(flipper.y - Math.sin(flipper.angle) * FLIPPER_LENGTH / 2).toBeCloseTo(flipper.pivot.y, 5);
    });
    expect(world.inspect().flippers[0].angle).toBeLessThan(0);
    world.resetFlippers();
    expect(world.inspect().flippers[0].angle).toBe(constants.DEFAULT_LEFT_ANGLE);
  });
  it('keeps bodies and speeds bounded through repeated launches and resets', () => {
    const world = make(); const initialCount = world.inspect().bodyCount;
    for (let run = 0; run < 5; run += 1) {
      world.resetGame(); world.launchBall(1.4);
      for (let i = 0; i < 1200; i += 1) {
        world.step(1 / 120);
        world.inspect().balls.forEach((ball) => {
          expect(Number.isFinite(ball.x + ball.y)).toBe(true);
          expect(Math.hypot(ball.vx, ball.vy)).toBeLessThanOrEqual(constants.MAX_SPEED + 0.001);
        });
      }
      world.resetGame(); expect(world.inspect().bodyCount).toBe(initialCount);
    }
  });
  it('transfers a powered flipper stroke to a contacting ball', () => {
    const circles = jest.spyOn(Bodies, 'circle');
    const world = make(); world.launchBall(0.8);
    const ball = circles.mock.results.map((result) => result.value).find((body) => body.label === 'ball');
    expect(ball).toBeDefined();
    Body.setPosition(ball, { x: 150, y: 628 }); Body.setVelocity(ball, { x: 0, y: 2 });
    world.setLeftFlipper(-Math.PI / 4);
    for (let i = 0; i < 5; i += 1) world.step(1 / 120);
    expect(Body.getVelocity(ball).y).toBeLessThan(-5);
  });
  it('idempotently destroys the world and stops all later work', () => {
    const world = make(); world.launchBall(1);
    world.destroy(); const steps = world.inspect().steps;
    world.destroy(); world.step(1); world.launchBall(1); world.resetGame();
    expect(world.inspect()).toMatchObject({ steps, bodyCount: 0, balls: [] });
  });
});
